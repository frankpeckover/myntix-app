import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import type { ApiClient } from "@/lib/api/api-types";
import { AuditService } from "@/domains/audit/audit-service";
import { LedgerService } from "@/domains/ledger/ledger-service";

type AccountRow = {
  account_id: string;
  account_name: string;
  email: string;
  first_name: string;
  last_name: string;
  user_id: string;
  username: string;
};

type Balances = {
  availableBalance: number;
  heldAmount: number;
  ledgerBalance: number;
};

type BalanceRow = {
  available_balance: number;
  held_amount: number;
  ledger_balance: number;
};

type HoldRow = {
  account_id: string;
  amount: number;
  captured_ledger_entry_id: string | null;
  created_at: Date;
  description: string;
  expires_at: Date | null;
  id: string;
  status: "active" | "captured" | "released";
  updated_at: Date;
};

type LedgerRow = {
  amount: number;
  created_at: Date;
  description: string;
  entry_type: string;
  id: string;
  reversal_of_ledger_entry_id: string | null;
  status: string;
};

const auditService = new AuditService();
const ledgerService = new LedgerService();
const maxApiAmount = 1_000_000;
const maxDescriptionLength = 500;
const defaultLedgerPageSize = 50;
const maxLedgerPageSize = 100;
const apiRelatedEntityType = "api_client";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ApiFinanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export class ApiFinanceService {
  async resolveStudent(emailValue: unknown) {
    const email = parseEmail(emailValue);
    const result = await db.query<AccountRow>(
      accountSelect("lower(users.email) = $1"),
      [email],
    );

    return mapAccount(requireAccount(result.rows[0]));
  }

  async getAccount(accountId: string) {
    assertUuid(accountId, "accountId");
    const client = await db.connect();

    try {
      const account = await getAccount(client, accountId);
      return {
        ...mapAccount(account),
        ...(await getBalances(client, account.account_id)),
      };
    } finally {
      client.release();
    }
  }

  async getBalance(accountId: string) {
    assertUuid(accountId, "accountId");
    const client = await db.connect();

    try {
      await getAccount(client, accountId);
      return { accountId, ...(await getBalances(client, accountId)) };
    } finally {
      client.release();
    }
  }

  async listLedger(accountId: string, requestUrl: string) {
    assertUuid(accountId, "accountId");
    const url = new URL(requestUrl);
    const limit = parseLimit(url.searchParams.get("limit"));
    const before = parseBefore(url.searchParams.get("before"));
    const client = await db.connect();

    try {
      await getAccount(client, accountId);
      const result = await client.query<LedgerRow>(
        `
          select id, amount, entry_type, status, description, created_at,
                 reversal_of_ledger_entry_id
          from ledger_entries
          where account_id = $1
            and status = 'posted'
            and ($2::timestamptz is null or created_at < $2)
          order by created_at desc, id desc
          limit $3
        `,
        [accountId, before, limit + 1],
      );
      const hasMore = result.rows.length > limit;
      const entries = result.rows.slice(0, limit);

      return {
        accountId,
        entries: entries.map(mapLedgerEntry),
        nextBefore: hasMore
          ? entries.at(-1)?.created_at.toISOString() ?? null
          : null,
      };
    } finally {
      client.release();
    }
  }

  async createCredit(
    apiClient: ApiClient,
    accountId: string,
    body: Record<string, unknown>,
  ) {
    return this.createMovement(apiClient, accountId, body, 1, "credit");
  }

  async createDebit(
    apiClient: ApiClient,
    accountId: string,
    body: Record<string, unknown>,
  ) {
    return this.createMovement(apiClient, accountId, body, -1, "debit");
  }

  async createHold(
    apiClient: ApiClient,
    accountId: string,
    body: Record<string, unknown>,
  ) {
    assertUuid(accountId, "accountId");
    const amount = parsePositiveInteger(body.amount, "amount");
    const description = parseDescription(body.description);
    const expiresAt = parseFutureDate(body.expiresAt);
    const client = await db.connect();

    try {
      await client.query("begin");
      const account = await getAccount(client, accountId, true);
      const balances = await getBalances(client, accountId);

      if (balances.availableBalance < amount) {
        throw new ApiFinanceError(
          "insufficient_funds",
          "The account does not have enough available balance.",
          409,
        );
      }

      const result = await client.query<HoldRow>(
        `
          insert into account_holds (
            account_id, amount, description, status, expires_at,
            created_by_api_client_id
          )
          values ($1, $2, $3, 'active', $4, $5)
          returning id, account_id, amount, description, status, expires_at,
                    captured_ledger_entry_id, created_at, updated_at
        `,
        [accountId, amount, description, expiresAt, apiClient.id],
      );
      const hold = result.rows[0];
      await logAction(
        client,
        apiClient,
        "finance_api.hold_created",
        hold.id,
        "account_hold",
        { accountId, amount, studentUserId: account.user_id },
      );
      await client.query("commit");

      return {
        ...mapHold(hold),
        availableBalance: balances.availableBalance - amount,
      };
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async getHold(apiClient: ApiClient, holdId: string) {
    assertUuid(holdId, "holdId");
    const result = await db.query<HoldRow>(
      `
        select id, account_id, amount, description, status, expires_at,
               captured_ledger_entry_id, created_at, updated_at
        from account_holds
        where id = $1 and created_by_api_client_id = $2
      `,
      [holdId, apiClient.id],
    );
    return mapHold(requireHold(result.rows[0]));
  }

  async captureHold(
    apiClient: ApiClient,
    holdId: string,
    body: Record<string, unknown>,
  ) {
    return this.completeHold(apiClient, holdId, body, "captured");
  }

  async releaseHold(
    apiClient: ApiClient,
    holdId: string,
    body: Record<string, unknown>,
  ) {
    return this.completeHold(apiClient, holdId, body, "released");
  }

  async reverseEntry(
    apiClient: ApiClient,
    entryId: string,
    body: Record<string, unknown>,
  ) {
    assertUuid(entryId, "entryId");
    const reason = parseDescription(body.reason);
    const client = await db.connect();

    try {
      await client.query("begin");
      const result = await client.query<
        LedgerRow & { account_id: string; user_id: string }
      >(
        `
          select le.id, le.account_id, le.amount, le.entry_type, le.status,
                 le.description, le.created_at, le.reversal_of_ledger_entry_id,
                 accounts.user_id
          from ledger_entries le
          join accounts on accounts.id = le.account_id
          where le.id = $1
            and le.related_entity_type = $2
            and le.related_entity_id = $3
            and le.status = 'posted'
            and le.entry_type in ('credit', 'debit')
          for update of le, accounts
        `,
        [entryId, apiRelatedEntityType, apiClient.id],
      );
      const entry = result.rows[0];

      if (!entry) {
        throw new ApiFinanceError(
          "entry_not_found",
          "Reversible ledger entry was not found.",
          404,
        );
      }

      const duplicate = await client.query(
        `select 1 from ledger_entries where reversal_of_ledger_entry_id = $1 limit 1`,
        [entryId],
      );
      if (duplicate.rowCount) {
        throw new ApiFinanceError(
          "already_reversed",
          "This ledger entry has already been reversed.",
          409,
        );
      }

      const balances = await getBalances(client, entry.account_id);
      const reversalAmount = -Number(entry.amount);
      await validateMovement(client, balances, reversalAmount);
      const reversalId = await ledgerService.createEntry(client, {
        amount: reversalAmount,
        description: `Reversal: ${entry.description} (${reason})`,
        entryType: "void_reversal",
        relatedEntityId: apiClient.id,
        relatedEntityType: apiRelatedEntityType,
        status: "posted",
        userId: entry.user_id,
      });
      await client.query(
        `update ledger_entries set reversal_of_ledger_entry_id = $2 where id = $1`,
        [reversalId, entryId],
      );
      const updatedBalances = await getBalances(client, entry.account_id);
      await logAction(
        client,
        apiClient,
        "finance_api.entry_reversed",
        reversalId,
        "ledger_entry",
        { accountId: entry.account_id, originalEntryId: entryId, reason },
      );
      await client.query("commit");

      return {
        accountId: entry.account_id,
        entryId: reversalId,
        reversedEntryId: entryId,
        amount: reversalAmount,
        ...updatedBalances,
      };
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async createMovement(
    apiClient: ApiClient,
    accountId: string,
    body: Record<string, unknown>,
    direction: 1 | -1,
    entryType: "credit" | "debit",
  ) {
    assertUuid(accountId, "accountId");
    const amount = parsePositiveInteger(body.amount, "amount") * direction;
    const description = parseDescription(body.description);
    const client = await db.connect();

    try {
      await client.query("begin");
      const account = await getAccount(client, accountId, true);
      const balances = await getBalances(client, accountId);
      await validateMovement(client, balances, amount);
      const entryId = await ledgerService.createEntry(client, {
        amount,
        description,
        entryType,
        relatedEntityId: apiClient.id,
        relatedEntityType: apiRelatedEntityType,
        status: "posted",
        userId: account.user_id,
      });
      const updatedBalances = await getBalances(client, accountId);
      await logAction(
        client,
        apiClient,
        `finance_api.${entryType}_created`,
        entryId,
        "ledger_entry",
        { accountId, amount, studentUserId: account.user_id },
      );
      await client.query("commit");

      return {
        accountId,
        entryId,
        amount,
        description,
        ...updatedBalances,
      };
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async completeHold(
    apiClient: ApiClient,
    holdId: string,
    body: Record<string, unknown>,
    status: "captured" | "released",
  ) {
    assertUuid(holdId, "holdId");
    const description = parseOptionalDescription(body.description);
    const client = await db.connect();

    try {
      await client.query("begin");
      const result = await client.query<HoldRow & { user_id: string }>(
        `
          select h.id, h.account_id, h.amount, h.description, h.status,
                 h.expires_at, h.captured_ledger_entry_id, h.created_at,
                 h.updated_at, accounts.user_id
          from account_holds h
          join accounts on accounts.id = h.account_id
          where h.id = $1 and h.created_by_api_client_id = $2
          for update of h, accounts
        `,
        [holdId, apiClient.id],
      );
      const hold = requireHold(result.rows[0]);

      if (
        hold.status !== "active" ||
        (hold.expires_at && hold.expires_at <= new Date())
      ) {
        throw new ApiFinanceError(
          "hold_not_active",
          "The hold is no longer active.",
          409,
        );
      }

      let ledgerEntryId: string | null = null;
      if (status === "captured") {
        ledgerEntryId = await ledgerService.createEntry(client, {
          amount: -Number(hold.amount),
          description: description || hold.description,
          entryType: "debit",
          relatedEntityId: apiClient.id,
          relatedEntityType: apiRelatedEntityType,
          status: "posted",
          userId: result.rows[0].user_id,
        });
      }

      const updated = await client.query<HoldRow>(
        `
          update account_holds
          set status = $2,
              captured_ledger_entry_id = $3,
              updated_at = now()
          where id = $1
          returning id, account_id, amount, description, status, expires_at,
                    captured_ledger_entry_id, created_at, updated_at
        `,
        [holdId, status, ledgerEntryId],
      );
      const balances = await getBalances(client, hold.account_id);
      await logAction(
        client,
        apiClient,
        `finance_api.hold_${status}`,
        holdId,
        "account_hold",
        { accountId: hold.account_id, ledgerEntryId },
      );
      await client.query("commit");

      return { ...mapHold(updated.rows[0]), ...balances };
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }
}

function accountSelect(whereClause: string, forUpdate = false) {
  return `
    select accounts.id as account_id, accounts.account_name, users.id as user_id,
           users.email, users.first_name, users.last_name, users.username
    from accounts
    join users on users.id = accounts.user_id
    join roles on roles.id = users.role_id
    where ${whereClause}
      and accounts.is_active = true
      and users.is_active = true
      and roles.is_active = true
      and roles.role_key = 'student'
    ${forUpdate ? "for update of accounts, users" : ""}
  `;
}

async function getAccount(
  client: PoolClient,
  accountId: string,
  forUpdate = false,
) {
  const result = await client.query<AccountRow>(
    accountSelect("accounts.id = $1", forUpdate),
    [accountId],
  );
  return requireAccount(result.rows[0]);
}

function requireAccount(account: AccountRow | undefined) {
  if (!account) {
    throw new ApiFinanceError(
      "account_not_found",
      "Active student account was not found.",
      404,
    );
  }
  return account;
}

function requireHold<T extends HoldRow>(hold: T | undefined): T {
  if (!hold) {
    throw new ApiFinanceError("hold_not_found", "Hold was not found.", 404);
  }
  return hold;
}

async function getBalances(
  client: PoolClient,
  accountId: string,
): Promise<Balances> {
  const result = await client.query<BalanceRow>(
    `
      with ledger as (
        select
          coalesce(sum(amount) filter (where status = 'posted'), 0) as ledger_balance,
          coalesce(sum(amount) filter (
            where status in ('pending', 'posted')
              and not (status = 'pending' and is_voided = true)
          ), 0) as spendable_before_api_holds
        from ledger_entries
        where account_id = $1
      ), holds as (
        select coalesce(sum(amount), 0) as held_amount
        from account_holds
        where account_id = $1
          and status = 'active'
          and (expires_at is null or expires_at > now())
      )
      select ledger.ledger_balance,
             holds.held_amount,
             ledger.spendable_before_api_holds - holds.held_amount as available_balance
      from ledger cross join holds
    `,
    [accountId],
  );
  const row = result.rows[0];
  return {
    availableBalance: Number(row?.available_balance ?? 0),
    heldAmount: Number(row?.held_amount ?? 0),
    ledgerBalance: Number(row?.ledger_balance ?? 0),
  };
}

async function validateMovement(
  client: PoolClient,
  balances: Balances,
  amount: number,
) {
  if (amount < 0 && balances.availableBalance + amount < 0) {
    throw new ApiFinanceError(
      "insufficient_funds",
      "The account does not have enough available balance.",
      409,
    );
  }
  if (amount > 0) {
    const cap = await ledgerService.getBalanceCap(client);
    if (cap !== null && balances.ledgerBalance + amount > cap) {
      throw new ApiFinanceError(
        "balance_cap_exceeded",
        "The credit would exceed the organisation balance cap.",
        409,
      );
    }
  }
}

function mapAccount(row: AccountRow) {
  return {
    accountId: row.account_id,
    accountName: row.account_name,
    student: {
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
    },
  };
}

function mapHold(row: HoldRow) {
  return {
    holdId: row.id,
    accountId: row.account_id,
    amount: Number(row.amount),
    description: row.description,
    status: row.status,
    expiresAt: row.expires_at?.toISOString() ?? null,
    capturedLedgerEntryId: row.captured_ledger_entry_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapLedgerEntry(row: LedgerRow) {
  return {
    entryId: row.id,
    amount: Number(row.amount),
    type: row.entry_type,
    status: row.status,
    description: row.description,
    reversalOfEntryId: row.reversal_of_ledger_entry_id,
    createdAt: row.created_at.toISOString(),
  };
}

function parsePositiveInteger(value: unknown, field: string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(amount) || amount <= 0 || amount > maxApiAmount) {
    throw new ApiFinanceError(
      "invalid_amount",
      `${field} must be a positive whole number no greater than ${maxApiAmount}.`,
    );
  }
  return amount;
}

function parseDescription(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiFinanceError(
      "invalid_description",
      "description is required.",
    );
  }
  const description = value.trim();
  if (description.length > maxDescriptionLength) {
    throw new ApiFinanceError(
      "invalid_description",
      `description cannot exceed ${maxDescriptionLength} characters.`,
    );
  }
  return description;
}

function parseOptionalDescription(value: unknown) {
  return value === undefined || value === null || value === ""
    ? ""
    : parseDescription(value);
}

function parseEmail(value: unknown) {
  if (typeof value !== "string" || !emailPattern.test(value.trim())) {
    throw new ApiFinanceError(
      "invalid_email",
      "email must be a valid email address.",
    );
  }
  return value.trim().toLowerCase();
}

function parseFutureDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiFinanceError(
      "invalid_expiry",
      "expiresAt must be an ISO date string.",
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    throw new ApiFinanceError(
      "invalid_expiry",
      "expiresAt must be a valid future date.",
    );
  }
  return date;
}

function parseLimit(value: string | null) {
  if (!value) return defaultLedgerPageSize;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLedgerPageSize) {
    throw new ApiFinanceError(
      "invalid_limit",
      `limit must be between 1 and ${maxLedgerPageSize}.`,
    );
  }
  return limit;
}

function parseBefore(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiFinanceError(
      "invalid_cursor",
      "before must be a valid ISO date string.",
    );
  }
  return date;
}

function assertUuid(value: string, field: string) {
  if (!uuidPattern.test(value)) {
    throw new ApiFinanceError(
      "invalid_uuid",
      `${field} must be a valid UUID.`,
    );
  }
}

async function logAction(
  client: PoolClient,
  apiClient: ApiClient,
  action: string,
  entityId: string,
  entityType: string,
  details: Record<string, unknown>,
) {
  await auditService.logWithClient(client, {
    action,
    actorUserId: null,
    details: {
      ...details,
      apiClientId: apiClient.id,
      apiClientName: apiClient.name,
    },
    entityId,
    entityType,
  });
}

async function rollback(client: PoolClient) {
  await client.query("rollback").catch(() => undefined);
}
