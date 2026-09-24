import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/action-results";
import type { SessionUser } from "@/lib/session";
import { AuditService } from "@/domains/audit/audit-service";

export type TimetableEntry = {
  id: string;
  teacherUserId: string;
  teacherName: string;
  groupId: string;
  groupName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
};

export type TimetableTeacher = {
  id: string;
  displayName: string;
  username: string;
};

export type CurrentClassStudent = {
  balance: number;
  firstName: string;
  id: string;
  displayName: string;
  lastName: string;
  profileImageUrl: string;
  username: string;
};

export type CurrentClass = {
  entryId: string;
  groupId: string;
  groupName: string;
  startTime: string;
  endTime: string;
  students: CurrentClassStudent[];
};

export type CreateTimetableEntryInput = {
  teacherUserId: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type UpdateTimetableEntryInput = CreateTimetableEntryInput & {
  id: string;
};

type TimetableEntryRow = {
  id: string;
  teacher_user_id: string;
  teacher_name: string;
  group_id: string;
  group_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: Date;
};

type TimetableTeacherRow = {
  id: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
  username: string;
};

type CurrentClassRow = {
  id: string;
  group_id: string;
  group_name: string;
  start_time: string;
  end_time: string;
};

type CurrentClassStudentRow = {
  balance: number;
  id: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
  profile_image_url: string;
  username: string;
};

const auditService = new AuditService();

export class TimetableService {
  async listTeacherEntries(currentUser: SessionUser): Promise<TimetableEntry[]> {
    const result = await db.query<TimetableEntryRow>(
      `
        select
          timetable_entries.id,
          timetable_entries.teacher_user_id,
          trim(coalesce(nullif(teachers.preferred_name, ''), teachers.first_name) || ' ' || teachers.last_name) as teacher_name,
          timetable_entries.group_id,
          student_groups.name as group_name,
          timetable_entries.day_of_week,
          timetable_entries.start_time::text as start_time,
          timetable_entries.end_time::text as end_time,
          timetable_entries.is_active,
          timetable_entries.created_at
        from timetable_entries
        join users teachers on teachers.id = timetable_entries.teacher_user_id
        join student_groups on student_groups.id = timetable_entries.group_id
        where timetable_entries.teacher_user_id = $1
          and timetable_entries.is_active = true
          and student_groups.is_active = true
        order by timetable_entries.day_of_week, timetable_entries.start_time
      `,
      [currentUser.id],
    );

    return result.rows.map(mapTimetableEntryRow);
  }

  async listEntries(includeInactive = false): Promise<TimetableEntry[]> {
    const result = await db.query<TimetableEntryRow>(
      `
        select
          timetable_entries.id,
          timetable_entries.teacher_user_id,
          trim(coalesce(nullif(teachers.preferred_name, ''), teachers.first_name) || ' ' || teachers.last_name) as teacher_name,
          timetable_entries.group_id,
          student_groups.name as group_name,
          timetable_entries.day_of_week,
          timetable_entries.start_time::text as start_time,
          timetable_entries.end_time::text as end_time,
          timetable_entries.is_active,
          timetable_entries.created_at
        from timetable_entries
        join users teachers on teachers.id = timetable_entries.teacher_user_id
        join student_groups on student_groups.id = timetable_entries.group_id
        where $1::boolean = true
          or timetable_entries.is_active = true
        order by timetable_entries.day_of_week,
          timetable_entries.start_time,
          teacher_name,
          student_groups.name
      `,
      [includeInactive],
    );

    return result.rows.map(mapTimetableEntryRow);
  }

  async listTeachers(): Promise<TimetableTeacher[]> {
    const result = await db.query<TimetableTeacherRow>(`
      select
        users.id,
        users.first_name,
        users.preferred_name,
        users.last_name,
        users.username
      from users
      join roles on roles.id = users.role_id
      where roles.role_key = 'teacher'
        and users.is_active = true
        and roles.is_active = true
      order by users.last_name, users.first_name
    `);

    return result.rows.map((teacher) => ({
      id: teacher.id,
      displayName: formatDisplayName(
        teacher.first_name,
        teacher.last_name,
        teacher.preferred_name,
      ),
      username: teacher.username,
    }));
  }

  async createEntry(
    input: CreateTimetableEntryInput,
    currentUser: SessionUser,
  ): Promise<ActionResult> {
    const validationMessage = validateTimetableEntry(input);

    if (validationMessage) {
      return {
        ok: false,
        message: validationMessage,
      };
    }

    try {
      const result = await db.query<{ id: string }>(
        `
          insert into timetable_entries (
            teacher_user_id,
            group_id,
            day_of_week,
            start_time,
            end_time
          )
          select $1, $2, $3, $4::time, $5::time
          from users teachers
          join roles teacher_roles on teacher_roles.id = teachers.role_id
          join student_groups on student_groups.id = $2
          where teachers.id = $1
            and teacher_roles.role_key = 'teacher'
            and teachers.is_active = true
            and student_groups.is_active = true
          returning id
        `,
        [
          input.teacherUserId,
          input.groupId,
          input.dayOfWeek,
          input.startTime,
          input.endTime,
        ],
      );

      const entryId = result.rows[0]?.id;

      if (!entryId) {
        return {
          ok: false,
          message: "Select an active teacher and group.",
        };
      }

      await auditService.log({
        action: "timetable_entry.created",
        actorUserId: currentUser.id,
        details: {
          dayOfWeek: input.dayOfWeek,
          endTime: input.endTime,
          groupId: input.groupId,
          startTime: input.startTime,
          teacherUserId: input.teacherUserId,
        },
        entityId: entryId,
        entityType: "timetable_entry",
      });

      return { ok: true };
    } catch (error) {
      console.error("Create timetable entry failed", error);

      return {
        ok: false,
        message: getTimetableErrorMessage(error),
      };
    }
  }

  async updateEntry(
    input: UpdateTimetableEntryInput,
    currentUser: SessionUser,
  ): Promise<ActionResult> {
    if (!input.id) {
      return {
        ok: false,
        message: "Timetable entry was not found.",
      };
    }

    const validationMessage = validateTimetableEntry(input);

    if (validationMessage) {
      return {
        ok: false,
        message: validationMessage,
      };
    }

    try {
      const result = await db.query(
        `
          update timetable_entries
          set teacher_user_id = $1,
              group_id = $2,
              day_of_week = $3,
              start_time = $4::time,
              end_time = $5::time,
              updated_at = now()
          where id = $6
            and exists (
              select 1
              from users teachers
              join roles teacher_roles on teacher_roles.id = teachers.role_id
              where teachers.id = $1
                and teacher_roles.role_key = 'teacher'
                and teachers.is_active = true
            )
            and exists (
              select 1
              from student_groups
              where student_groups.id = $2
                and student_groups.is_active = true
            )
        `,
        [
          input.teacherUserId,
          input.groupId,
          input.dayOfWeek,
          input.startTime,
          input.endTime,
          input.id,
        ],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "Select an active teacher and group.",
        };
      }

      await auditService.log({
        action: "timetable_entry.updated",
        actorUserId: currentUser.id,
        details: {
          dayOfWeek: input.dayOfWeek,
          endTime: input.endTime,
          groupId: input.groupId,
          startTime: input.startTime,
          teacherUserId: input.teacherUserId,
        },
        entityId: input.id,
        entityType: "timetable_entry",
      });

      return { ok: true };
    } catch (error) {
      console.error("Update timetable entry failed", error);

      return {
        ok: false,
        message: getTimetableErrorMessage(error),
      };
    }
  }

  async deleteEntry(
    entryId: string,
    currentUser: SessionUser,
  ): Promise<ActionResult> {
    if (!entryId) {
      return {
        ok: false,
        message: "Timetable entry was not found.",
      };
    }

    try {
      const result = await db.query(
        `
          delete from timetable_entries
          where id = $1
        `,
        [entryId],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "Timetable entry was not found.",
        };
      }

      await auditService.log({
        action: "timetable_entry.deleted",
        actorUserId: currentUser.id,
        entityId: entryId,
        entityType: "timetable_entry",
      });

      return { ok: true };
    } catch (error) {
      console.error("Delete timetable entry failed", error);

      return {
        ok: false,
        message: "Could not delete timetable entry.",
      };
    }
  }

  async getCurrentClass(currentUser: SessionUser): Promise<CurrentClass | null> {
    const classResult = await db.query<CurrentClassRow>(
      `
        select
          timetable_entries.id,
          timetable_entries.group_id,
          student_groups.name as group_name,
          timetable_entries.start_time::text as start_time,
          timetable_entries.end_time::text as end_time
        from timetable_entries
        join student_groups on student_groups.id = timetable_entries.group_id
        cross join lateral (
          select now() at time zone coalesce(
            nullif((select timezone from school_info where id = 1), ''),
            'UTC'
          ) as local_now
        ) school_clock
        where timetable_entries.teacher_user_id = $1
          and timetable_entries.day_of_week = extract(dow from school_clock.local_now)::int
          and timetable_entries.start_time <= school_clock.local_now::time
          and timetable_entries.end_time > school_clock.local_now::time
          and timetable_entries.is_active = true
          and student_groups.is_active = true
        order by timetable_entries.start_time desc
        limit 1
      `,
      [currentUser.id],
    );

    const currentClass = classResult.rows[0];

    if (!currentClass) {
      return null;
    }

    const studentsResult = await db.query<CurrentClassStudentRow>(
      `
        select
          users.id,
          users.first_name,
          users.preferred_name,
          users.last_name,
          users.profile_image_url,
          users.username,
          (
            coalesce(sum(ledger_entries.amount), 0)
            - coalesce(active_holds.held_amount, 0)
          )::integer as balance
        from student_group_memberships
        join users on users.id = student_group_memberships.user_id
        join roles on roles.id = users.role_id
        left join accounts on accounts.user_id = users.id
        left join ledger_entries
          on ledger_entries.account_id = accounts.id
          and ledger_entries.status in ('pending', 'posted')
          and not (
            ledger_entries.status = 'pending'
            and ledger_entries.is_voided = true
          )
        left join lateral (
          select coalesce(sum(account_holds.amount), 0) as held_amount
          from account_holds
          where account_holds.account_id = accounts.id
            and account_holds.status = 'active'
            and (
              account_holds.expires_at is null
              or account_holds.expires_at > now()
            )
        ) active_holds on true
        where student_group_memberships.group_id = $1
          and roles.role_key = 'student'
          and users.is_active = true
        group by users.id, users.first_name, users.preferred_name, users.last_name,
                 users.profile_image_url, users.username,
                 active_holds.held_amount
        order by users.last_name, users.first_name
      `,
      [currentClass.group_id],
    );

    return {
      entryId: currentClass.id,
      endTime: currentClass.end_time,
      groupId: currentClass.group_id,
      groupName: currentClass.group_name,
      startTime: currentClass.start_time,
      students: studentsResult.rows.map((student) => ({
        balance: student.balance,
        firstName: student.first_name,
        id: student.id,
        displayName: formatDisplayName(
          student.first_name,
          student.last_name,
          student.preferred_name,
        ),
        lastName: student.last_name,
        profileImageUrl: student.profile_image_url,
        username: student.username,
      })),
    };
  }
}

function validateTimetableEntry(input: CreateTimetableEntryInput) {
  if (!input.teacherUserId || !input.groupId) {
    return "Select a teacher and group.";
  }

  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return "Select a day.";
  }

  if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) {
    return "Enter a valid start and end time.";
  }

  if (input.startTime >= input.endTime) {
    return "End time must be after start time.";
  }

  return null;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function formatDisplayName(firstName: string, lastName: string, preferredName = "") {
  return `${preferredName || firstName} ${lastName}`.trim();
}

function mapTimetableEntryRow(row: TimetableEntryRow): TimetableEntry {
  return {
    id: row.id,
    teacherUserId: row.teacher_user_id,
    teacherName: row.teacher_name,
    groupId: row.group_id,
    groupName: row.group_name,
    dayOfWeek: row.day_of_week,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function getTimetableErrorMessage(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : null;

  if (errorCode === "23505") {
    return "That timetable entry already exists.";
  }

  return "Could not create timetable entry.";
}
