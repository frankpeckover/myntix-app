import { createCipheriv } from "crypto";
import type {
  DirectorySyncSnapshot,
  NormalisedDirectoryGroup,
  NormalisedDirectoryUser,
  NormalisedTimetableEntry,
} from "@/domains/integrations/directory-sync-types";

export type TassConnectionConfig = {
  academicYear: number;
  apiVersion: 2 | 3;
  applicationCode: string;
  baseUrl: string;
  companyCode: string;
  semester: number;
  tokenKey: string;
};

type JsonRecord = Record<string, unknown>;

type TassStudent = {
  email: string;
  externalId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  sourceUsername: string;
};

type TassTeacher = TassStudent & {
  teacherCode: string;
};

type TassSubject = {
  classCode: string;
  externalId: string;
  name: string;
  semester: number;
  shortName: string;
  studentExternalIds: string[];
  subjectCode: string;
  yearGroup: string;
  yearNumber: number;
};

const fetchTimeoutMilliseconds = 30_000;
const timetableConcurrency = 4;

export class TassClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TassClientError";
  }
}

export class TassClient {
  constructor(private readonly config: TassConnectionConfig) {}

  async testConnection() {
    const [students, teachers] = await Promise.all([
      this.fetchStudents(),
      this.fetchTeachers(),
    ]);

    return {
      studentCount: students.length,
      teacherCount: teachers.length,
    };
  }

  async fetchSnapshot(): Promise<DirectorySyncSnapshot> {
    const [students, teachers, studentSubjectsResponse] = await Promise.all([
      this.fetchStudents(),
      this.fetchTeachers(),
      this.call("getStudentSubjects", { code: "all", lmsflag: "Y" }),
    ]);
    const subjects = normaliseStudentSubjects(studentSubjectsResponse);
    const groups = buildGroups(subjects);
    const timetableEntries = await this.fetchTeacherTimetables(teachers);

    return {
      groups: mergeTimetableGroups(groups, timetableEntries.groups),
      timetableEntries: timetableEntries.entries,
      users: [
        ...students.map(mapStudentUser),
        ...teachers.map(mapTeacherUser),
      ],
    };
  }

  private async fetchStudents() {
    const response = await this.call("getStudents", {
      currentstatus: "current",
      includephoto: false,
      thumbnail: false,
    });

    return getArray(response, "students").map(normaliseStudent);
  }

  private async fetchTeachers() {
    const response = await this.call("getTeachers", {
      currentstatus: "current",
      includephoto: false,
      thumbnail: false,
    });

    return getArray(response, "teachers").map(normaliseTeacher);
  }

  private async fetchTeacherTimetables(teachers: TassTeacher[]) {
    const snapshots = await mapWithConcurrency(
      teachers.filter((teacher) => teacher.teacherCode),
      timetableConcurrency,
      async (teacher) => {
        const response = await this.call("getTeacherTimetable", {
          semester: String(this.config.semester),
          teacher_code: teacher.teacherCode,
          year_num: String(this.config.academicYear),
        });

        return normaliseTeacherTimetable(response, teacher, this.config);
      },
    );

    return {
      entries: deduplicateBy(snapshots.flatMap((snapshot) => snapshot.entries), (entry) => entry.externalId),
      groups: deduplicateBy(snapshots.flatMap((snapshot) => snapshot.groups), (group) => group.externalId),
    };
  }

  private async call(method: string, params: JsonRecord) {
    const url = normaliseTassApiUrl(this.config.baseUrl);
    const body = new URLSearchParams({
      appcode: this.config.applicationCode,
      company: this.config.companyCode,
      method,
      token: encryptTassToken(params, this.config.tokenKey),
      v: String(this.config.apiVersion),
    });
    let response: Response;

    try {
      response = await fetch(url, {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(fetchTimeoutMilliseconds),
      });
    } catch (error) {
      throw new TassClientError(
        error instanceof Error && error.name === "TimeoutError"
          ? `TASS did not respond to ${method} within 30 seconds.`
          : `Could not connect to TASS for ${method}.`,
      );
    }

    const text = await response.text();

    if (!response.ok) {
      throw new TassClientError(`TASS returned HTTP ${response.status} for ${method}.`);
    }

    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      throw new TassClientError(`TASS returned an unreadable response for ${method}.`);
    }

    if (!isRecord(payload)) {
      throw new TassClientError(`TASS returned an invalid response for ${method}.`);
    }

    const invalid = getRecord(payload, "__invalid");
    const status = getString(payload, "__status");

    if (status.toLowerCase() === "invalid" || Object.keys(invalid).length > 0) {
      const reason = Object.values(invalid).map(String).filter(Boolean).join(" ");
      throw new TassClientError(reason || `TASS rejected the ${method} request.`);
    }

    return payload;
  }
}

export function normaliseTassApiUrl(value: string) {
  const url = new URL(value.trim());

  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new TassClientError("The TASS API URL must use HTTPS in production.");
  }

  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

function encryptTassToken(params: JsonRecord, tokenKey: string) {
  let key: Buffer;

  try {
    key = Buffer.from(tokenKey.trim(), "base64");
  } catch {
    throw new TassClientError("The TASS token key is not valid Base64.");
  }

  if (![16, 24, 32].includes(key.length)) {
    throw new TassClientError("The TASS token key has an invalid length.");
  }

  const cipher = createCipheriv(`aes-${key.length * 8}-ecb`, key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([
    cipher.update(JSON.stringify(params), "utf8"),
    cipher.final(),
  ]).toString("base64");
}

function normaliseStudent(value: unknown): TassStudent {
  const record = asRecord(value);
  const general = getRecord(record, "general_details");
  const school = getRecord(record, "school_details");
  const externalId = getString(general, "student_code");

  if (!externalId) {
    throw new TassClientError("A TASS student is missing its student code.");
  }

  return {
    email: getString(school, "email_address").trim().toLowerCase(),
    externalId: `student:${externalId}`,
    firstName: getString(general, "first_name") || firstGivenName(getString(general, "given_names")),
    lastName: getString(general, "preferred_surname") || getString(general, "surname") || "Student",
    preferredName: getString(general, "preferred_name"),
    sourceUsername: getString(general, "portal_user_code"),
  };
}

function normaliseTeacher(value: unknown): TassTeacher {
  const record = asRecord(value);
  const employeeCode = getString(record, "employee_code");
  const teacherCode = getString(record, "teacher_code");

  if (!employeeCode) {
    throw new TassClientError("A TASS teacher is missing its employee code.");
  }

  return {
    email: (getString(record, "school_email_address") || getString(record, "email_address")).trim().toLowerCase(),
    externalId: `teacher:${employeeCode}`,
    firstName: getString(record, "first_name") || firstGivenName(getString(record, "given_names")),
    lastName: getString(record, "surname") || getString(record, "employee_surname") || "Teacher",
    preferredName: getString(record, "preferred_name"),
    sourceUsername: getString(record, "portal_user_code"),
    teacherCode,
  };
}

function mapStudentUser(student: TassStudent): NormalisedDirectoryUser {
  return { ...student, role: "student" };
}

function mapTeacherUser(teacher: TassTeacher): NormalisedDirectoryUser {
  return {
    email: teacher.email,
    externalId: teacher.externalId,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    preferredName: teacher.preferredName,
    role: "teacher",
    sourceUsername: teacher.sourceUsername,
  };
}

function normaliseStudentSubjects(payload: JsonRecord) {
  const subjects = new Map<string, TassSubject>();

  for (const [studentCode, value] of Object.entries(payload)) {
    if (studentCode.startsWith("__") || studentCode === "token" || !Array.isArray(value)) {
      continue;
    }

    for (const subjectValue of value) {
      const subject = asRecord(subjectValue);
      const yearNumber = getNumber(subject, "year_num");
      const semester = getNumber(subject, "semester");
      const yearGroup = getString(subject, "year_grp_desc") || getString(subject, "year_grp");
      const subjectCode = getString(subject, "sub_code");
      const classCode = getString(subject, "class");
      const externalId = createGroupExternalId({
        classCode,
        semester,
        subjectCode,
        yearGroup,
        yearNumber,
      });
      const existing = subjects.get(externalId);

      if (existing) {
        existing.studentExternalIds.push(`student:${studentCode}`);
        continue;
      }

      subjects.set(externalId, {
        classCode,
        externalId,
        name: getString(subject, "sub_long") || getString(subject, "sub_short") || subjectCode,
        semester,
        shortName: getString(subject, "sub_short"),
        studentExternalIds: [`student:${studentCode}`],
        subjectCode,
        yearGroup,
        yearNumber,
      });
    }
  }

  return [...subjects.values()];
}

function buildGroups(subjects: TassSubject[]): NormalisedDirectoryGroup[] {
  return subjects.map((subject) => ({
    description: `TASS ${subject.yearNumber} semester ${subject.semester} class ${subject.subjectCode}`,
    externalId: subject.externalId,
    name: buildGroupName(subject.yearGroup, subject.shortName || subject.name, subject.classCode),
    studentExternalIds: [...new Set(subject.studentExternalIds)],
  }));
}

function normaliseTeacherTimetable(
  payload: JsonRecord,
  teacher: TassTeacher,
  config: TassConnectionConfig,
) {
  const entries: NormalisedTimetableEntry[] = [];
  const groups: NormalisedDirectoryGroup[] = [];

  for (const timetableValue of getArray(payload, "teacher_timetable")) {
    const timetable = asRecord(timetableValue);
    const timetableId = getString(timetable, "TT_ID");
    const days = getRecord(timetable, "DAYS");
    const standardDays = getRecord(timetable, "STRDAYS");

    for (const [dayCode, dayValue] of Object.entries(days)) {
      const day = asRecord(dayValue);
      const periods = getRecord(day, "PERIODS");
      const dayOfWeek = getDayOfWeek(dayCode, standardDays);

      if (dayOfWeek === null) {
        continue;
      }

      for (const [periodCode, periodValue] of Object.entries(periods)) {
        const period = asRecord(periodValue);
        const startTime = extractTime(getString(period, "PRD_START"));
        const endTime = extractTime(getString(period, "PRD_END"));

        if (!startTime || !endTime || startTime >= endTime) {
          continue;
        }

        for (const subjectValue of getArray(period, "SUBJECTS")) {
          const subject = asRecord(subjectValue);
          const subjectCode = getString(subject, "SUB_CODE");
          const classCode = getString(subject, "CLASS");
          const yearGroup = getString(subject, "YEAR_GRP") || getString(subject, "SUBTAB_YEAR_GRP_DESC");
          const groupExternalId = createGroupExternalId({
            classCode,
            semester: getNumber(timetable, "SEMESTER") || config.semester,
            subjectCode,
            yearGroup,
            yearNumber: getNumber(timetable, "YEAR_NUM") || config.academicYear,
          });
          const externalId = [teacher.externalId, timetableId, dayCode, periodCode, groupExternalId].join("|");

          groups.push({
            description: `TASS ${config.academicYear} semester ${config.semester} class ${subjectCode}`,
            externalId: groupExternalId,
            name: buildGroupName(
              yearGroup,
              getString(subject, "SUB_SHORT") || getString(subject, "SUB_DESC") || subjectCode,
              classCode,
            ),
            studentExternalIds: [],
          });
          entries.push({
            dayOfWeek,
            endTime,
            externalId,
            groupExternalId,
            startTime,
            teacherExternalId: teacher.externalId,
          });
        }
      }
    }
  }

  return { entries, groups };
}

function mergeTimetableGroups(
  subjectGroups: NormalisedDirectoryGroup[],
  timetableGroups: NormalisedDirectoryGroup[],
) {
  const merged = new Map(subjectGroups.map((group) => [group.externalId, group]));

  for (const group of timetableGroups) {
    if (!merged.has(group.externalId)) {
      merged.set(group.externalId, group);
    }
  }

  return [...merged.values()];
}

function createGroupExternalId(input: {
  classCode: string;
  semester: number;
  subjectCode: string;
  yearGroup: string;
  yearNumber: number;
}) {
  return [input.yearNumber, input.semester, input.yearGroup, input.subjectCode, input.classCode]
    .map((part) => String(part).trim().toLowerCase())
    .join("|");
}

function buildGroupName(yearGroup: string, subject: string, classCode: string) {
  return [yearGroup ? `Year ${yearGroup}` : "", subject, classCode]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTime(value: string) {
  return value.match(/(?:^|\s)(\d{2}:\d{2})(?::\d{2})?/)?.[1] ?? "";
}

function getDayOfWeek(dayCode: string, standardDays: JsonRecord) {
  const description = getString(getRecord(standardDays, dayCode), "DAY_DESC").toLowerCase();
  const namedDays = [
    ["sunday", 0],
    ["monday", 1],
    ["tuesday", 2],
    ["wednesday", 3],
    ["thursday", 4],
    ["friday", 5],
    ["saturday", 6],
  ] as const;
  const namedDay = namedDays.find(([name]) => description.includes(name));

  if (namedDay) {
    return namedDay[1];
  }

  const numericDay = Number(dayCode);
  return Number.isInteger(numericDay) && numericDay >= 0 && numericDay <= 6
    ? numericDay
    : null;
}

function firstGivenName(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

function getArray(record: JsonRecord, key: string) {
  const value = getValue(record, key);
  return Array.isArray(value) ? value : [];
}

function getRecord(record: JsonRecord, key: string): JsonRecord {
  const value = getValue(record, key);
  return isRecord(value) ? value : {};
}

function getString(record: JsonRecord, key: string) {
  const value = getValue(record, key);
  return value === null || value === undefined ? "" : String(value).trim();
}

function getNumber(record: JsonRecord, key: string) {
  const value = Number(getValue(record, key));
  return Number.isFinite(value) ? value : 0;
}

function getValue(record: JsonRecord, key: string) {
  const matchingKey = Object.keys(record).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  return matchingKey ? record[matchingKey] : undefined;
}

function asRecord(value: unknown): JsonRecord {
  if (!isRecord(value)) {
    throw new TassClientError("TASS returned an unexpected data structure.");
  }
  return value;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deduplicateBy<T>(values: T[], getKey: (value: T) => string) {
  return [...new Map(values.map((value) => [getKey(value), value])).values()];
}

async function mapWithConcurrency<Input, Output>(
  values: Input[],
  concurrency: number,
  callback: (value: Input) => Promise<Output>,
) {
  const results = new Array<Output>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}
