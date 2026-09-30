import type { ActionResult } from "@/lib/actions/action-results";
import { db } from "@/lib/database/db";
import { isStudent } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

export type StudentGoal = {
  id: string;
  targetAmount: number;
  title: string;
  updatedAt: string;
};

export type SaveStudentGoalInput = {
  targetAmount: number;
  title: string;
};

type StudentGoalRow = {
  id: string;
  target_amount: number;
  title: string;
  updated_at: Date;
};

const auditService = new AuditService();
const defaultGoalTitle = "Savings goal";

export class StudentGoalService {
  async getGoal(userId: string): Promise<StudentGoal | null> {
    const result = await db.query<StudentGoalRow>(
      `
        select id, title, target_amount, updated_at
        from student_goals
        where user_id = $1
        limit 1
      `,
      [userId],
    );

    const goal = result.rows[0];

    return goal ? mapStudentGoalRow(goal) : null;
  }

  async saveGoal(
    currentUser: SessionUser,
    input: SaveStudentGoalInput,
  ): Promise<ActionResult> {
    if (!isStudent(currentUser)) {
      return {
        ok: false,
        message: "Only students can save goals.",
      };
    }

    const title = input.title.trim() || defaultGoalTitle;
    const targetAmount = Math.floor(input.targetAmount);

    if (targetAmount <= 0) {
      return {
        ok: false,
        message: "Enter a goal amount greater than 0.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const result = await client.query<{ id: string }>(
        `
          insert into student_goals (user_id, title, target_amount)
          values ($1, $2, $3)
          on conflict (user_id) do update
          set title = excluded.title,
              target_amount = excluded.target_amount,
              updated_at = now()
          returning id
        `,
        [currentUser.id, title, targetAmount],
      );

      await auditService.logWithClient(client, {
        action: "student_goal.saved",
        actorUserId: currentUser.id,
        details: {
          targetAmount,
          title,
        },
        entityId: result.rows[0].id,
        entityType: "student_goal",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Save student goal failed", error);

      return {
        ok: false,
        message: "Could not save goal.",
      };
    } finally {
      client.release();
    }
  }
}

function mapStudentGoalRow(row: StudentGoalRow): StudentGoal {
  return {
    id: row.id,
    targetAmount: Number(row.target_amount),
    title: row.title,
    updatedAt: row.updated_at.toISOString(),
  };
}
