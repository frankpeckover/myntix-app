import { db } from "@/lib/database/db";
import { isStudent } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/actions/action-results";
import type { SessionUser } from "@/lib/auth/session";

export type UnseenTransaction = {
  amount: number;
  createdAt: string;
  id: string;
  reason: string;
};

type UnseenTransactionRow = {
  amount: number;
  created_at: Date;
  description: string;
  id: string;
};

const notificationLookbackDays = 30;
const maximumNotificationsPerLogin = 8;

export class TransactionNotificationService {
  async listUnseen(currentUser: SessionUser): Promise<UnseenTransaction[]> {
    if (!isStudent(currentUser)) {
      throw new Error("Only students can view transaction notifications.");
    }

    try {
      const result = await db.query<UnseenTransactionRow>(
        `
          select ledger_entries.id,
                 ledger_entries.amount,
                 ledger_entries.description,
                 ledger_entries.created_at
          from ledger_entries
          join accounts on accounts.id = ledger_entries.account_id
          left join ledger_entry_receipts
            on ledger_entry_receipts.ledger_entry_id = ledger_entries.id
           and ledger_entry_receipts.user_id = $1
          where accounts.user_id = $1
            and ledger_entries.status = 'posted'
            and ledger_entry_receipts.ledger_entry_id is null
            and ledger_entries.created_at >=
              now() - ($2::integer * interval '1 day')
          order by ledger_entries.created_at desc, ledger_entries.id desc
          limit $3
        `,
        [currentUser.id, notificationLookbackDays, maximumNotificationsPerLogin],
      );

      return result.rows.map((row) => ({
        amount: Number(row.amount),
        createdAt: row.created_at.toISOString(),
        id: row.id,
        reason: row.description,
      }));
    } catch (error) {
      if (isMissingReceiptTableError(error)) {
        return [];
      }

      throw error;
    }
  }

  async markSeen(
    currentUser: SessionUser,
    ledgerEntryIds: string[],
  ): Promise<ActionResult> {
    if (!isStudent(currentUser)) {
      return { ok: false, message: "Only students can update notifications." };
    }

    const validIds = [...new Set(ledgerEntryIds)].filter(isUuid);

    if (validIds.length === 0) {
      return { ok: false, message: "No transaction notifications were selected." };
    }

    try {
      await db.query(
        `
          insert into ledger_entry_receipts (ledger_entry_id, user_id)
          select ledger_entries.id, $1
          from ledger_entries
          join accounts on accounts.id = ledger_entries.account_id
          where accounts.user_id = $1
            and ledger_entries.id = any($2::uuid[])
          on conflict (ledger_entry_id, user_id) do nothing
        `,
        [currentUser.id, validIds],
      );

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: isMissingReceiptTableError(error)
          ? "Transaction notifications are unavailable until the school database is updated."
          : "Could not mark transaction notifications as seen.",
      };
    }
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isMissingReceiptTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  );
}
