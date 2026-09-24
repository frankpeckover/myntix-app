import { db } from "@/lib/db";
import {
  canCreateLedgerAdjustments,
  canViewAllTransactions,
  canViewStudentBalances,
  canVoidTransactions,
} from "@/lib/permissions";
import type { Role, SessionUser } from "@/lib/session";
import type { ActionResult } from "@/lib/action-results";
import {
  LedgerService,
  type LedgerEntryStatus,
  type LedgerEntryType,
} from "@/domains/ledger/ledger-service";
import { AuditService } from "@/domains/audit/audit-service";
import { ErrorLogService } from "@/domains/audit/error-log-service";
import type { ShopPurchaseStatus } from "@/domains/rewards/shop-service";

export type TransactionLogItem = {
  accountName: string;
  id: string;
  amount: number;
  createdByName: string | null;
  createdByUsername: string | null;
  createdAt: string;
  description: string;
  entryStatus: LedgerEntryStatus;
  isVoided: boolean;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  reason: string;
  reference: string;
  reversalOfLedgerEntryId: string | null;
  source: string;
  studentName: string;
  studentUsername: string;
  type: LedgerEntryType;
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string;
  purchaseStatus: ShopPurchaseStatus | null;
};

export type StudentBalanceItem = {
  balance: number;
  displayName: string;
  email: string;
  firstName: string;
  id: string;
  isActive: boolean;
  lastActivityAt: string | null;
  lastName: string;
  profileImageUrl: string;
  recentChange: number;
  username: string;
};

type TransactionLogRow = {
  account_name: string;
  id: string;
  amount: number;
  created_by_name: string | null;
  created_by_username: string | null;
  created_at: Date;
  description: string;
  entry_status: LedgerEntryStatus;
  is_voided: boolean;
  related_entity_id: string | null;
  related_entity_type: string | null;
  reason: string;
  reversal_of_ledger_entry_id: string | null;
  shop_item_name: string | null;
  student_group_name: string | null;
  student_name: string;
  student_username: string;
  type: LedgerEntryType;
  voided_at: Date | null;
  voided_by_name: string | null;
  void_reason: string;
  purchase_status: ShopPurchaseStatus | null;
  api_client_name: string | null;
};

type StudentBalanceRow = {
  balance: number;
  email: string;
  first_name: string;
  id: string;
  is_active: boolean;
  last_activity_at: Date | null;
  last_name: string;
  preferred_name: string;
  profile_image_url: string;
  recent_change: number;
  username: string;
};

type LedgerVoidRow = {
  entry_type: LedgerEntryType;
  related_entity_id: string | null;
  related_entity_type: string | null;
};

export type CreateLedgerAdjustmentInput = {
  amount: number;
  requestId: string;
  reason: string;
  studentUserId: string;
};

export type CreateLedgerAdjustmentsInput = {
  amount: number;
  requestId: string;
  reason: string;
  studentUserIds: string[];
};

export type CreateGroupLedgerAdjustmentInput = {
  amount: number;
  groupId: string;
  requestId: string;
  reason: string;
};

type GroupAdjustmentMemberRow = {
  first_name: string;
  group_name: string;
  last_name: string;
  username: string;
  user_id: string;
};

type AdjustmentRecipient = {
  balance: number;
  firstName: string;
  lastName: string;
  userId: string;
  username: string;
};

const ledgerService = new LedgerService();
const auditService = new AuditService();
const errorLogService = new ErrorLogService();

export class TransactionService {
  async getStudentBalance(userId: string): Promise<number> {
    const client = await db.connect();

    try {
      return await ledgerService.getAvailableBalance(client, userId);
    } finally {
      client.release();
    }
  }

  async listStudentBalances(role: Role): Promise<StudentBalanceItem[]> {
    if (!canViewStudentBalances({ role })) {
      return [];
    }

    const result = await db.query<StudentBalanceRow>(`
      select
        users.id,
        users.first_name,
        users.preferred_name,
        users.last_name,
        users.profile_image_url,
        users.username,
        users.email,
        users.is_active,
        coalesce(sum(ledger_entries.amount), 0)
          - coalesce(active_holds.held_amount, 0) as balance,
        coalesce(
          sum(ledger_entries.amount) filter (
            where ledger_entries.created_at >= now() - interval '7 days'
          ),
          0
        ) as recent_change,
        max(ledger_entries.created_at) as last_activity_at
      from users
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
      where roles.role_key = 'student'
        and users.is_active = true
      group by
        users.id,
        users.first_name,
        users.preferred_name,
        users.last_name,
        users.profile_image_url,
        users.username,
        users.email,
        users.is_active,
        active_holds.held_amount
      order by users.last_name, users.first_name
    `);

    return result.rows.map(mapStudentBalanceRow);
  }

  async listTransactions(userId: string, role: Role): Promise<TransactionLogItem[]> {
    const canViewAllTransactionsForRole = canViewAllTransactions({ role });

    const result = await db.query<TransactionLogRow>(
      `
        select
          accounts.account_name,
          ledger_entries.id,
          ledger_entries.amount,
          ledger_entries.created_at,
          ledger_entries.description,
          ledger_entries.status as entry_status,
          ledger_entries.is_voided,
          ledger_entries.related_entity_id,
          ledger_entries.related_entity_type,
          ledger_entries.description as reason,
          ledger_entries.reversal_of_ledger_entry_id,
          trim(coalesce(nullif(users.preferred_name, ''), users.first_name) || ' ' || users.last_name) as student_name,
          users.username as student_username,
          trim(coalesce(nullif(created_by.preferred_name, ''), created_by.first_name) || ' ' || created_by.last_name) as created_by_name,
          created_by.username as created_by_username,
          ledger_entries.entry_type as type,
          ledger_entries.voided_at,
          trim(coalesce(nullif(voided_by.preferred_name, ''), voided_by.first_name) || ' ' || voided_by.last_name) as voided_by_name,
          ledger_entries.void_reason,
          shop_items.name as shop_item_name,
          student_groups.name as student_group_name,
          api_clients.name as api_client_name,
          shop_purchases.status as purchase_status
        from ledger_entries
        join accounts on accounts.id = ledger_entries.account_id
        join users on users.id = accounts.user_id
        left join users created_by on created_by.id = ledger_entries.created_by_user_id
        left join users voided_by on voided_by.id = ledger_entries.voided_by_user_id
        left join shop_purchases
          on ledger_entries.related_entity_type = 'shop_purchase'
          and shop_purchases.id = ledger_entries.related_entity_id
        left join shop_items on shop_items.id = shop_purchases.shop_item_id
        left join student_groups
          on ledger_entries.related_entity_type = 'student_group'
          and student_groups.id = ledger_entries.related_entity_id
        left join api_clients
          on ledger_entries.related_entity_type = 'api_client'
          and api_clients.id = ledger_entries.related_entity_id
        where $1::boolean = true
          or accounts.user_id = $2
        order by ledger_entries.created_at desc
      `,
      [canViewAllTransactionsForRole, userId],
    );

    return result.rows.map(this.mapTransactionRow);
  }

  async voidTransaction(
    currentUser: SessionUser,
    transactionId: string,
    voidReason: string,
  ): Promise<ActionResult> {
    if (!canVoidTransactions(currentUser)) {
      return {
        ok: false,
        message: "Only admins can void transactions.",
      };
    }

    if (!transactionId) {
      return {
        ok: false,
        message: "Transaction was not found.",
      };
    }

    const reason = voidReason.trim();

    if (!reason) {
      return {
        ok: false,
        message: "Enter a reason for voiding this transaction.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const entryResult = await client.query<LedgerVoidRow>(
        `
          select entry_type, related_entity_id, related_entity_type
          from ledger_entries
          where id = $1
          for update
        `,
        [transactionId],
      );

      const entry = entryResult.rows[0];

      if (!entry || entry.entry_type === "void_reversal") {
        await client.query("rollback");
        return {
          ok: false,
          message: "Transaction was not found or cannot be voided.",
        };
      }

      if (
        entry.related_entity_type === "shop_purchase" &&
        entry.related_entity_id
      ) {
        await this.voidShopPurchaseRecord(client, entry.related_entity_id);
      }

      const voidedEntry = await ledgerService.voidEntry(
        client,
        transactionId,
        currentUser.id,
        reason,
      );

      if (!voidedEntry) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Transaction was not found or is already voided.",
        };
      }

      await auditService.logWithClient(client, {
        action: "ledger_entry.voided",
        actorUserId: currentUser.id,
        details: {
          reason,
          relatedEntityId: entry.related_entity_id,
          relatedEntityType: entry.related_entity_type,
          type: entry.entry_type,
        },
        entityId: transactionId,
        entityType: "ledger_entry",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Void transaction failed", error);

      return {
        ok: false,
        message: "Could not void transaction.",
      };
    } finally {
      client.release();
    }
  }

  async createLedgerAdjustment(
    currentUser: SessionUser,
    input: CreateLedgerAdjustmentInput,
  ): Promise<ActionResult> {
    return this.createLedgerAdjustments(currentUser, {
      amount: input.amount,
      requestId: input.requestId,
      reason: input.reason,
      studentUserIds: [input.studentUserId],
    });
  }

  async createLedgerAdjustments(
    currentUser: SessionUser,
    input: CreateLedgerAdjustmentsInput,
  ): Promise<ActionResult> {
    const reason = input.reason.trim();
    const studentUserIds = [...new Set(input.studentUserIds)];

    if (!canCreateLedgerAdjustments(currentUser)) {
      return {
        ok: false,
        message: "Only teachers can create ledger adjustments.",
      };
    }

    if (studentUserIds.length === 0 || !reason) {
      return {
        ok: false,
        message: "Select at least one student and enter a reason.",
      };
    }

    if (!Number.isInteger(input.amount) || input.amount === 0) {
      return {
        ok: false,
        message: "Enter a whole number amount that is not zero.",
      };
    }

    if (!isUuid(input.requestId)) {
      return { ok: false, message: "Invalid transaction request." };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const previousResult = await getPreviousAdjustmentResult(
        client,
        input.requestId,
      );

      if (previousResult.found) {
        await client.query("commit");
        return { ok: true, message: previousResult.message };
      }

      const balanceCap = await ledgerService.getBalanceCap(client);
      const studentsResult = await client.query<{
          first_name: string;
          last_name: string;
          user_id: string;
          username: string;
        }>(
          `
            select users.id as user_id, users.first_name, users.last_name, users.username
            from users
            join roles on roles.id = users.role_id
            where users.id = any($1::uuid[])
              and users.is_active = true
              and roles.role_key = 'student'
            order by users.id
          `,
          [studentUserIds],
        );

      if (studentsResult.rows.length !== studentUserIds.length) {
        await client.query("rollback");
        return {
          ok: false,
          message: "One or more selected students could not be found.",
        };
      }

      const adjustmentRecipients: AdjustmentRecipient[] = [];

      for (const student of studentsResult.rows) {
        adjustmentRecipients.push({
          balance: await ledgerService.getAvailableBalance(
            client,
            student.user_id,
          ),
          firstName: student.first_name,
          lastName: student.last_name,
          userId: student.user_id,
          username: student.username,
        });
      }

      const createdLedgerEntryIds: string[] = [];
      let cappedAtBalanceCapCount = 0;
      let skippedZeroBalanceCount = 0;
      let reducedToZeroCount = 0;

      for (const recipient of adjustmentRecipients) {
        const actualAmount = getActualAdjustmentAmount(
          input.amount,
          recipient.balance,
          balanceCap,
        );

        if (actualAmount === 0) {
          skippedZeroBalanceCount += 1;
          continue;
        }

        if (input.amount < 0 && actualAmount !== input.amount) {
          reducedToZeroCount += 1;
        }

        if (input.amount > 0 && actualAmount !== input.amount) {
          cappedAtBalanceCapCount += 1;
        }

        const ledgerEntryId = await ledgerService.createEntry(client, {
          amount: actualAmount,
          createdByUserId: currentUser.id,
          description: reason,
          entryType: actualAmount > 0 ? "reward" : "penalty",
          status: "posted",
          userId: recipient.userId,
        });

        createdLedgerEntryIds.push(ledgerEntryId);
      }

      await auditService.logWithClient(client, {
        action:
          createdLedgerEntryIds.length === 1
            ? "ledger_entry.created"
            : "ledger_entry.multiple_created",
        actorUserId: currentUser.id,
        details: {
          amount: input.amount,
          balanceCap,
          cappedAtBalanceCapCount,
          ledgerEntryIds: createdLedgerEntryIds,
          reason,
          reducedToZeroCount,
          skippedZeroBalanceCount,
          studentUserIds,
        },
        entityId: createdLedgerEntryIds[0],
        entityType: "ledger_entry",
      });

      const resultMessage = getAdjustmentResultMessage({
        amount: input.amount,
        cappedAtBalanceCapCount,
        createdCount: createdLedgerEntryIds.length,
        reason,
        reducedToZeroCount,
        skippedZeroBalanceCount,
        targetLabel:
          studentUserIds.length === 1
            ? formatDisplayName(
                adjustmentRecipients[0]?.firstName ?? "",
                adjustmentRecipients[0]?.lastName ?? "",
              ) || "student"
            : `${studentUserIds.length} students`,
      });

      await saveAdjustmentResult(
        client,
        input.requestId,
        currentUser.id,
        resultMessage,
      );
      await client.query("commit");
      return { ok: true, message: resultMessage };
    } catch (error) {
      await client.query("rollback");
      console.error("Create ledger adjustment failed", error);

      return {
        ok: false,
        message: "Could not create transaction.",
      };
    } finally {
      client.release();
    }
  }

  async createGroupLedgerAdjustment(
    currentUser: SessionUser,
    input: CreateGroupLedgerAdjustmentInput,
  ): Promise<ActionResult> {
    const reason = input.reason.trim();

    if (!canCreateLedgerAdjustments(currentUser)) {
      return {
        ok: false,
        message: "Only teachers can create ledger adjustments.",
      };
    }

    if (!input.groupId || !reason) {
      return {
        ok: false,
        message: "Select a group and enter a reason.",
      };
    }

    if (!Number.isInteger(input.amount) || input.amount === 0) {
      return {
        ok: false,
        message: "Enter a whole number amount that is not zero.",
      };
    }

    if (!isUuid(input.requestId)) {
      return { ok: false, message: "Invalid transaction request." };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const previousResult = await getPreviousAdjustmentResult(
        client,
        input.requestId,
      );

      if (previousResult.found) {
        await client.query("commit");
        return { ok: true, message: previousResult.message };
      }

      const membersResult = await client.query<GroupAdjustmentMemberRow>(
        `
          select
            users.first_name,
            student_groups.name as group_name,
            users.last_name,
            users.username,
            users.id as user_id
          from student_groups
          join student_group_memberships
            on student_group_memberships.group_id = student_groups.id
          join users on users.id = student_group_memberships.user_id
          join roles on roles.id = users.role_id
          where student_groups.id = $1
            and student_groups.is_active = true
            and roles.role_key = 'student'
            and users.is_active = true
          order by users.id
        `,
        [input.groupId],
      );

      if (membersResult.rows.length === 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Select an active group with at least one active student.",
        };
      }

      const groupName = membersResult.rows[0].group_name;
      const description = `${reason} (Group: ${groupName})`;
      const balanceCap = await ledgerService.getBalanceCap(client);

      const createdLedgerEntryIds: string[] = [];
      let cappedAtBalanceCapCount = 0;
      let skippedZeroBalanceCount = 0;
      let reducedToZeroCount = 0;

      for (const member of membersResult.rows) {
        const balance = await ledgerService.getAvailableBalance(
          client,
          member.user_id,
        );
        const actualAmount = getActualAdjustmentAmount(
          input.amount,
          balance,
          balanceCap,
        );

        if (actualAmount === 0) {
          skippedZeroBalanceCount += 1;
          continue;
        }

        if (input.amount < 0 && actualAmount !== input.amount) {
          reducedToZeroCount += 1;
        }

        if (input.amount > 0 && actualAmount !== input.amount) {
          cappedAtBalanceCapCount += 1;
        }

        const ledgerEntryId = await ledgerService.createEntry(client, {
          amount: actualAmount,
          createdByUserId: currentUser.id,
          description,
          entryType: actualAmount > 0 ? "reward" : "penalty",
          relatedEntityId: input.groupId,
          relatedEntityType: "student_group",
          status: "posted",
          userId: member.user_id,
        });

        createdLedgerEntryIds.push(ledgerEntryId);
      }

      await auditService.logWithClient(client, {
        action: "ledger_entry.group_created",
        actorUserId: currentUser.id,
        details: {
          amount: input.amount,
          balanceCap,
          cappedAtBalanceCapCount,
          groupId: input.groupId,
          groupName,
          ledgerEntryIds: createdLedgerEntryIds,
          memberCount: membersResult.rows.length,
          reason,
          reducedToZeroCount,
          skippedZeroBalanceCount,
        },
        entityId: input.groupId,
        entityType: "student_group",
      });

      const resultMessage = getAdjustmentResultMessage({
        amount: input.amount,
        cappedAtBalanceCapCount,
        createdCount: createdLedgerEntryIds.length,
        reason,
        reducedToZeroCount,
        skippedZeroBalanceCount,
        targetLabel: groupName,
      });

      await saveAdjustmentResult(
        client,
        input.requestId,
        currentUser.id,
        resultMessage,
      );
      await client.query("commit");
      return { ok: true, message: resultMessage };
    } catch (error) {
      await client.query("rollback");
      console.error("Create group ledger adjustment failed", error);
      await errorLogService.log({
        context: {
          amount: input.amount,
          groupId: input.groupId,
          reason,
          userId: currentUser.id,
          username: currentUser.username,
        },
        error,
        source: "TransactionService.createGroupLedgerAdjustment",
      });

      return {
        ok: false,
        message: "Could not create group transaction.",
      };
    } finally {
      client.release();
    }
  }

  private mapTransactionRow(row: TransactionLogRow): TransactionLogItem {
    return {
      accountName: formatAccountName(row.account_name),
      id: row.id,
      amount: row.amount,
      createdByName: row.created_by_name,
      createdByUsername: row.created_by_username,
      createdAt: row.created_at.toISOString(),
      description: formatLedgerType(row.type),
      entryStatus: row.entry_status,
      isVoided: row.is_voided || row.entry_status === "voided",
      relatedEntityId: row.related_entity_id,
      relatedEntityType: row.related_entity_type,
      reason: row.reason,
      reference: formatReference(row),
      reversalOfLedgerEntryId: row.reversal_of_ledger_entry_id,
      source: formatSource(row),
      studentName: row.student_name,
      studentUsername: row.student_username,
      type: row.type,
      voidedAt: row.voided_at ? row.voided_at.toISOString() : null,
      voidedByName: row.voided_by_name,
      voidReason: row.void_reason,
      purchaseStatus: row.purchase_status,
    };
  }

  private async voidShopPurchaseRecord(
    client: import("pg").PoolClient,
    purchaseId: string,
  ) {
    const result = await client.query<{
      shop_item_id: string;
      status: ShopPurchaseStatus;
    }>(
      `
        update shop_purchases
        set is_voided = true,
            voided_at = now()
        where id = $1
          and is_voided = false
        returning shop_item_id, status
      `,
      [purchaseId],
    );

    const purchase = result.rows[0];

    if (purchase?.status === "pending" || purchase?.status === "approved") {
      await client.query(
        `
          update shop_items
          set quantity = quantity + 1,
              updated_at = now()
          where id = $1
        `,
        [purchase.shop_item_id],
      );
    }
  }
}

function formatLedgerType(type: LedgerEntryType) {
  const labels: Record<LedgerEntryType, string> = {
    manual_adjustment: "Manual adjustment",
    credit: "Credit",
    debit: "Debit",
    hold: "Hold",
    penalty: "Penalty",
    reward: "Reward",
    shop_hold: "Reward hold",
    shop_purchase: "Reward redemption",
    shop_refund: "Reward refund",
    void_reversal: "Void reversal",
  };

  return labels[type];
}

function mapStudentBalanceRow(row: StudentBalanceRow): StudentBalanceItem {
  return {
    balance: Number(row.balance),
    displayName: formatDisplayName(
      row.first_name,
      row.last_name,
      row.preferred_name,
    ),
    email: row.email,
    firstName: row.first_name,
    id: row.id,
    isActive: row.is_active,
    lastActivityAt: row.last_activity_at
      ? row.last_activity_at.toISOString()
      : null,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    recentChange: Number(row.recent_change),
    username: row.username,
  };
}

function formatDisplayName(
  firstName: string,
  lastName: string,
  preferredName = "",
) {
  return `${preferredName || firstName} ${lastName}`.trim();
}

async function getPreviousAdjustmentResult(
  client: import("pg").PoolClient,
  requestId: string,
) {
  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1, 0))",
    [requestId],
  );

  const result = await client.query<{ result_message: string | null }>(
    `
      select result_message
      from ledger_adjustment_requests
      where id = $1
    `,
    [requestId],
  );

  return {
    found: result.rowCount === 1,
    message: result.rows[0]?.result_message ?? undefined,
  };
}

async function saveAdjustmentResult(
  client: import("pg").PoolClient,
  requestId: string,
  actorUserId: string,
  resultMessage?: string,
) {
  await client.query(
    `
      insert into ledger_adjustment_requests (
        id,
        actor_user_id,
        result_message
      )
      values ($1, $2, $3)
    `,
    [requestId, actorUserId, resultMessage ?? null],
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getActualAdjustmentAmount(
  requestedAmount: number,
  currentBalance: number,
  balanceCap: number | null = null,
) {
  if (requestedAmount > 0) {
    if (balanceCap === null) {
      return requestedAmount;
    }

    const remainingCapacity = Math.max(balanceCap - currentBalance, 0);

    return Math.min(requestedAmount, remainingCapacity);
  }

  const requestedRemoval = Math.abs(requestedAmount);
  const actualRemoval = Math.min(Math.max(currentBalance, 0), requestedRemoval);

  return actualRemoval === 0 ? 0 : -actualRemoval;
}

function getAdjustmentResultMessage({
  amount,
  cappedAtBalanceCapCount,
  createdCount,
  reason,
  reducedToZeroCount,
  skippedZeroBalanceCount,
  targetLabel,
}: {
  amount: number;
  cappedAtBalanceCapCount: number;
  createdCount: number;
  reason: string;
  reducedToZeroCount: number;
  skippedZeroBalanceCount: number;
  targetLabel: string;
}) {
  if (amount > 0) {
    if (cappedAtBalanceCapCount === 0 && skippedZeroBalanceCount === 0) {
      return undefined;
    }

    if (createdCount === 0) {
      return `No value added to ${targetLabel}; all selected students were already at the balance cap.`;
    }

    const summaryParts = [
      `${createdCount} adjusted`,
      `${cappedAtBalanceCapCount} capped`,
    ];

    if (skippedZeroBalanceCount > 0) {
      summaryParts.push(`${skippedZeroBalanceCount} already at cap`);
    }

    return `Added up to ${amount} for ${reason}. ${summaryParts.join(", ")}.`;
  }

  if (reducedToZeroCount === 0 && skippedZeroBalanceCount === 0) {
    return undefined;
  }

  const requestedRemoval = Math.abs(amount);

  if (createdCount === 0) {
    return `No value removed from ${targetLabel}; all selected students were already at zero.`;
  }

  const summaryParts = [
    `${createdCount} adjusted`,
    reducedToZeroCount > 0 ? `${reducedToZeroCount} reduced to zero` : "",
    skippedZeroBalanceCount > 0
      ? `${skippedZeroBalanceCount} already at zero`
      : "",
  ].filter(Boolean);

  return `Removed up to ${requestedRemoval} from ${targetLabel} for ${reason}. ${summaryParts.join(", ")}.`;
}

function formatReference(row: TransactionLogRow) {
  if (row.reversal_of_ledger_entry_id) {
    return `Reversal of ${row.reversal_of_ledger_entry_id}`;
  }

  if (row.related_entity_type && row.related_entity_id) {
    return `${formatRelatedEntityType(row.related_entity_type)} ${row.related_entity_id}`;
  }

  return row.id;
}

function formatSource(row: TransactionLogRow) {
  if (row.shop_item_name) {
    return `Reward: ${row.shop_item_name}`;
  }

  if (row.student_group_name) {
    return `Group: ${row.student_group_name}`;
  }

  if (row.api_client_name) {
    return row.api_client_name;
  }

  if (row.created_by_name) {
    return `Entered by ${row.created_by_name}`;
  }

  return "System";
}

function formatRelatedEntityType(entityType: string) {
  return entityType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAccountName(accountName: string) {
  return accountName === "Student account" ? "Primary account" : accountName;
}
