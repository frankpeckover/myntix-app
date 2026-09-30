import { db } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

export type ImportTimetableEntryInput = {
  day: string;
  endTime: string;
  groupName: string;
  startTime: string;
  teacherUsername: string;
};

export type ImportTimetableEntriesInput = {
  entries: ImportTimetableEntryInput[];
};

export type ImportTimetableEntriesResult = {
  createdCount: number;
  duplicateCount: number;
  errors: ImportTimetableEntryError[];
  ok: true;
};

export type ImportTimetableEntryError = {
  groupName: string;
  message: string;
  rowNumber: number;
  teacherUsername: string;
};

type TimetableTeacherRow = {
  id: string;
  is_active: boolean;
  role_key: string;
};

type TimetableGroupRow = {
  id: string;
  is_active: boolean;
};

const auditService = new AuditService();

export class TimetableImportService {
  async importEntries(
    input: ImportTimetableEntriesInput,
    currentUser: SessionUser,
  ): Promise<ImportTimetableEntriesResult> {
    const errors: ImportTimetableEntryError[] = [];
    let createdCount = 0;
    let duplicateCount = 0;

    const client = await db.connect();

    try {
      await client.query("begin");

      for (const [index, entry] of input.entries.entries()) {
        const rowNumber = index + 2;
        const teacherUsername = entry.teacherUsername.trim().toLowerCase();
        const groupName = entry.groupName.trim();
        const dayOfWeek = parseDayOfWeek(entry.day);
        const startTime = normaliseTime(entry.startTime);
        const endTime = normaliseTime(entry.endTime);

        if (!teacherUsername || !groupName) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Teacher username and group name are required."));
          continue;
        }

        if (dayOfWeek === null) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Day must be a weekday name or number from 0 to 6."));
          continue;
        }

        if (!startTime || !endTime || startTime >= endTime) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Start and end times must be valid, and end must be after start."));
          continue;
        }

        const teacher = await findTeacher(client, teacherUsername);

        if (!teacher) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Teacher does not exist."));
          continue;
        }

        if (teacher.role_key !== "teacher") {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "User is not a teacher."));
          continue;
        }

        if (!teacher.is_active) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Teacher is inactive."));
          continue;
        }

        const group = await findGroup(client, groupName);

        if (!group) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Group does not exist."));
          continue;
        }

        if (!group.is_active) {
          errors.push(createImportError(rowNumber, groupName, teacherUsername, "Group is archived."));
          continue;
        }

        const wasCreated = await createTimetableEntryIfMissing({
          client,
          dayOfWeek,
          endTime,
          groupId: group.id,
          startTime,
          teacherUserId: teacher.id,
        });

        if (wasCreated) {
          createdCount += 1;
        } else {
          duplicateCount += 1;
        }
      }

      await auditService.logWithClient(client, {
        action: "timetable_entry.imported",
        actorUserId: currentUser.id,
        details: {
          createdCount,
          duplicateCount,
          errorCount: errors.length,
        },
        entityType: "timetable_entry",
      });

      await client.query("commit");

      return {
        createdCount,
        duplicateCount,
        errors,
        ok: true,
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Import timetable failed", error);

      return {
        createdCount,
        duplicateCount,
        errors: [
          ...errors,
          createImportError(0, "", "", "Could not import timetable entries."),
        ],
        ok: true,
      };
    } finally {
      client.release();
    }
  }
}

async function findTeacher(
  client: import("pg").PoolClient,
  username: string,
) {
  const result = await client.query<TimetableTeacherRow>(
    `
      select users.id, users.is_active, roles.role_key
      from users
      join roles on roles.id = users.role_id
      where users.username = $1
    `,
    [username],
  );

  return result.rows[0] ?? null;
}

async function findGroup(
  client: import("pg").PoolClient,
  groupName: string,
) {
  const result = await client.query<TimetableGroupRow>(
    `
      select id, is_active
      from student_groups
      where lower(name) = lower($1)
    `,
    [groupName],
  );

  return result.rows[0] ?? null;
}

async function createTimetableEntryIfMissing({
  client,
  dayOfWeek,
  endTime,
  groupId,
  startTime,
  teacherUserId,
}: {
  client: import("pg").PoolClient;
  dayOfWeek: number;
  endTime: string;
  groupId: string;
  startTime: string;
  teacherUserId: string;
}) {
  const result = await client.query(
    `
      insert into timetable_entries (
        teacher_user_id,
        group_id,
        day_of_week,
        start_time,
        end_time
      )
      select $1, $2, $3, $4::time, $5::time
      where not exists (
        select 1
        from timetable_entries
        where teacher_user_id = $1
          and group_id = $2
          and day_of_week = $3
          and start_time = $4::time
          and end_time = $5::time
          and is_active = true
      )
    `,
    [teacherUserId, groupId, dayOfWeek, startTime, endTime],
  );

  return (result.rowCount ?? 0) > 0;
}

function parseDayOfWeek(value: string) {
  const normalisedValue = value.trim().toLowerCase();

  if (/^[0-6]$/.test(normalisedValue)) {
    return Number(normalisedValue);
  }

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayIndex = days.indexOf(normalisedValue);

  return dayIndex === -1 ? null : dayIndex;
}

function normaliseTime(value: string) {
  const trimmedValue = value.trim();

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(trimmedValue)) {
    return trimmedValue.slice(0, 5);
  }

  return null;
}

function createImportError(
  rowNumber: number,
  groupName: string,
  teacherUsername: string,
  message: string,
): ImportTimetableEntryError {
  return {
    groupName,
    message,
    rowNumber,
    teacherUsername,
  };
}
