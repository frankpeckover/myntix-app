import { db } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";

export type TeacherDashboardSummary = {
  issuedTotals: TeacherIssuedTotals;
};

export type TeacherIssuedTotals = {
  thisWeek: TeacherIssuedPeriodTotals;
  thisYear: TeacherIssuedPeriodTotals;
  today: TeacherIssuedPeriodTotals;
};

export type TeacherIssuedPeriodTotals = {
  given: number;
  removed: number;
};

type TeacherIssuedTotalsRow = {
  given_this_week: string;
  given_this_year: string;
  given_today: string;
  removed_this_week: string;
  removed_this_year: string;
  removed_today: string;
};

export class TeacherDashboardService {
  async getSummary(currentUser: SessionUser): Promise<TeacherDashboardSummary> {
    const totalsResult = await db.query<TeacherIssuedTotalsRow>(
      `
        select
          coalesce(sum(amount) filter (
            where amount > 0
              and created_at >= date_trunc('day', now())
          ), 0) as given_today,
          coalesce(sum(abs(amount)) filter (
            where amount < 0
              and created_at >= date_trunc('day', now())
          ), 0) as removed_today,
          coalesce(sum(amount) filter (
            where amount > 0
              and created_at >= date_trunc('week', now())
          ), 0) as given_this_week,
          coalesce(sum(abs(amount)) filter (
            where amount < 0
              and created_at >= date_trunc('week', now())
          ), 0) as removed_this_week,
          coalesce(sum(amount) filter (
            where amount > 0
              and created_at >= date_trunc('year', now())
          ), 0) as given_this_year,
          coalesce(sum(abs(amount)) filter (
            where amount < 0
              and created_at >= date_trunc('year', now())
          ), 0) as removed_this_year
        from ledger_entries
        where created_by_user_id = $1
          and status = 'posted'
          and is_voided = false
          and entry_type in ('reward', 'penalty')
      `,
      [currentUser.id],
    );

    const totals = totalsResult.rows[0];

    return {
      issuedTotals: {
        thisWeek: {
          given: toNumber(totals.given_this_week),
          removed: toNumber(totals.removed_this_week),
        },
        thisYear: {
          given: toNumber(totals.given_this_year),
          removed: toNumber(totals.removed_this_year),
        },
        today: {
          given: toNumber(totals.given_today),
          removed: toNumber(totals.removed_today),
        },
      },
    };
  }
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}
