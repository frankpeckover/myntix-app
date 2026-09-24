import type { PoolClient } from "pg";

export type LedgerEntryType =
  | "reward"
  | "penalty"
  | "credit"
  | "debit"
  | "hold"
  | "shop_hold"
  | "shop_purchase"
  | "shop_refund"
  | "manual_adjustment"
  | "void_reversal";

export type LedgerEntryStatus = "pending" | "posted" | "voided";

type CreateLedgerEntryInput = {
  amount: number;
  createdAt?: Date;
  createdByUserId?: string;
  description: string;
  entryType: LedgerEntryType;
  relatedEntityId?: string;
  relatedEntityType?: string;
  status: Extract<LedgerEntryStatus, "pending" | "posted">;
  userId: string;
};

type LedgerEntryRow = {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  entry_type: LedgerEntryType;
  is_voided: boolean;
  related_entity_id: string | null;
  related_entity_type: string | null;
  status: LedgerEntryStatus;
};

const primaryAccountName = "Primary account";

export class LedgerService {
  async getBalanceCap(client: PoolClient) {
    const result = await client.query<{ balance_cap: number | null }>(
      `
        select balance_cap
        from school_info
        where id = 1
        limit 1
      `,
    );

    const balanceCap = result.rows[0]?.balance_cap;

    return balanceCap === null || balanceCap === undefined
      ? null
      : Number(balanceCap);
  }

  async ensureStudentAccount(client: PoolClient, userId: string) {
    const existingAccount = await client.query<{ id: string }>(
      `
        select accounts.id
        from accounts
        join users on users.id = accounts.user_id
        join roles on roles.id = users.role_id
        where users.id = $1
          and roles.role_key = 'student'
        for update
      `,
      [userId],
    );

    if (existingAccount.rows[0]) {
      return existingAccount.rows[0].id;
    }

    const newAccount = await client.query<{ id: string }>(
      `
        insert into accounts (user_id, account_name)
        select users.id, $2
        from users
        join roles on roles.id = users.role_id
        where users.id = $1
          and roles.role_key = 'student'
        returning id
      `,
      [userId, primaryAccountName],
    );

    const accountId = newAccount.rows[0]?.id;

    if (!accountId) {
      throw new Error("Student account could not be created.");
    }

    return accountId;
  }

  async getAvailableBalance(client: PoolClient, userId: string) {
    await client.query(
      `
        select id
        from accounts
        where user_id = $1
        for update
      `,
      [userId],
    );

    const result = await client.query<{ balance: number }>(
      `
        select
          coalesce((
            select sum(ledger_entries.amount)
            from ledger_entries
            where ledger_entries.account_id = accounts.id
              and ledger_entries.status in ('pending', 'posted')
              and not (
                ledger_entries.status = 'pending'
                and ledger_entries.is_voided = true
              )
          ), 0)
          -
          coalesce((
            select sum(account_holds.amount)
            from account_holds
            where account_holds.account_id = accounts.id
              and account_holds.status = 'active'
              and (
                account_holds.expires_at is null
                or account_holds.expires_at > now()
              )
          ), 0) as balance
        from accounts
        where accounts.user_id = $1
      `,
      [userId],
    );

    return Number(result.rows[0]?.balance ?? 0);
  }

  async createEntry(client: PoolClient, input: CreateLedgerEntryInput) {
    const accountId = await this.ensureStudentAccount(client, input.userId);

    const result = await client.query<{ id: string }>(
      `
        insert into ledger_entries (
          account_id,
          amount,
          entry_type,
          status,
          description,
          related_entity_type,
          related_entity_id,
          created_by_user_id,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, now()))
        returning id
      `,
      [
        accountId,
        input.amount,
        input.entryType,
        input.status,
        input.description,
        input.relatedEntityType ?? null,
        input.relatedEntityId ?? null,
        input.createdByUserId ?? null,
        input.createdAt ?? null,
      ],
    );

    return result.rows[0].id;
  }

  async postRelatedEntry(
    client: PoolClient,
    relatedEntityType: string,
    relatedEntityId: string,
    entryType: LedgerEntryType,
  ) {
    await client.query(
      `
        update ledger_entries
        set status = 'posted',
            entry_type = $1
        where related_entity_type = $2
          and related_entity_id = $3
          and reversal_of_ledger_entry_id is null
          and status = 'pending'
          and is_voided = false
      `,
      [entryType, relatedEntityType, relatedEntityId],
    );
  }

  async voidEntry(
    client: PoolClient,
    ledgerEntryId: string,
    voidedByUserId: string | null,
    voidReason: string,
  ) {
    const entry = await this.getLedgerEntryForUpdate(client, ledgerEntryId);

    if (!entry || entry.is_voided || entry.entry_type === "void_reversal") {
      return null;
    }

    await client.query(
      `
        update ledger_entries
        set status = case
              when status = 'pending' then 'voided'
              else status
            end,
            is_voided = true,
            voided_by_user_id = $1,
            voided_at = now(),
            void_reason = $2
        where id = $3
      `,
      [voidedByUserId, voidReason, entry.id],
    );

    if (entry.status === "posted") {
      await this.createReversalEntry(client, entry);
    }

    return entry;
  }

  async voidRelatedEntry(
    client: PoolClient,
    relatedEntityType: string,
    relatedEntityId: string,
    voidedByUserId: string | null,
    voidReason: string,
  ) {
    const result = await client.query<{ id: string }>(
      `
        select id
        from ledger_entries
        where related_entity_type = $1
          and related_entity_id = $2
          and reversal_of_ledger_entry_id is null
          and is_voided = false
        order by created_at desc
        limit 1
        for update
      `,
      [relatedEntityType, relatedEntityId],
    );

    const entryId = result.rows[0]?.id;

    if (!entryId) {
      return null;
    }

    return this.voidEntry(client, entryId, voidedByUserId, voidReason);
  }

  private async getLedgerEntryForUpdate(
    client: PoolClient,
    ledgerEntryId: string,
  ) {
    const result = await client.query<LedgerEntryRow>(
      `
        select
          id,
          account_id,
          amount,
          description,
          entry_type,
          is_voided,
          related_entity_id,
          related_entity_type,
          status
        from ledger_entries
        where id = $1
        for update
      `,
      [ledgerEntryId],
    );

    return result.rows[0] ?? null;
  }

  private async createReversalEntry(client: PoolClient, entry: LedgerEntryRow) {
    await client.query(
      `
        insert into ledger_entries (
          account_id,
          amount,
          entry_type,
          status,
          description,
          related_entity_type,
          related_entity_id,
          created_at,
          reversal_of_ledger_entry_id
        )
        select
          $1,
          $2,
          'void_reversal',
          'posted',
          $3,
          $4,
          $5,
          now(),
          $6
        where not exists (
          select 1
          from ledger_entries
          where reversal_of_ledger_entry_id = $6
        )
      `,
      [
        entry.account_id,
        -entry.amount,
        `Reversal: ${entry.description}`,
        entry.related_entity_type,
        entry.related_entity_id,
        entry.id,
      ],
    );
  }
}
