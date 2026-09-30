import type { PoolClient } from "pg";
import { db } from "@/lib/database/db";
import type { ApiClient } from "@/lib/api/api-types";
import { ApiFinanceError } from "@/domains/integrations/api-finance-service";
import { LedgerService } from "@/domains/ledger/ledger-service";
import { AuditService } from "@/domains/audit/audit-service";
import { NotificationService } from "@/domains/notifications/notification-service";

type RewardRow = {
  description: string;
  id: string;
  image_url: string;
  is_quantity_unlimited: boolean;
  name: string;
  price: number;
  quantity: number;
};

type PurchaseRow = {
  account_id: string;
  decision_note: string;
  hold_id: string;
  id: string;
  item_name: string;
  price_at_purchase: number;
  purchased_at: Date;
  purchased_by_user_id: string;
  shop_item_id: string;
  status: "pending" | "approved" | "denied";
  stock_reserved: boolean;
};

const ledgerService = new LedgerService();
const auditService = new AuditService();
const notificationService = new NotificationService();
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ApiPurchaseService {
  async listRewards() {
    const result = await db.query<RewardRow>(
      `
        select id, name, description, image_url, price, quantity,
               is_quantity_unlimited
        from shop_items
        where is_active = true
          and (is_quantity_unlimited = true or quantity > 0)
        order by name
      `,
    );
    return { rewards: result.rows.map(mapReward) };
  }

  async createPurchase(
    apiClient: ApiClient,
    body: Record<string, unknown>,
  ) {
    const accountId = parseUuid(body.accountId, "accountId");
    const rewardId = parseUuid(body.rewardId, "rewardId");
    const client = await db.connect();

    try {
      await client.query("begin");
      const account = await client.query<{ user_id: string }>(
        `
          select accounts.user_id
          from accounts
          join users on users.id = accounts.user_id
          join roles on roles.id = users.role_id
          where accounts.id = $1
            and accounts.is_active = true
            and users.is_active = true
            and roles.is_active = true
            and roles.role_key = 'student'
          for update of accounts, users
        `,
        [accountId],
      );
      if (!account.rows[0]) {
        throw new ApiFinanceError(
          "account_not_found",
          "Active student account was not found.",
          404,
        );
      }

      const rewardResult = await client.query<RewardRow & { is_active: boolean }>(
        `
          select id, name, description, image_url, price, quantity,
                 is_quantity_unlimited, is_active
          from shop_items
          where id = $1
          for update
        `,
        [rewardId],
      );
      const reward = rewardResult.rows[0];
      if (
        !reward ||
        !reward.is_active ||
        (!reward.is_quantity_unlimited && reward.quantity <= 0)
      ) {
        throw new ApiFinanceError(
          "reward_unavailable",
          "The reward is not available.",
          409,
        );
      }

      const availableBalance = await ledgerService.getAvailableBalance(
        client,
        account.rows[0].user_id,
      );
      if (availableBalance < Number(reward.price)) {
        throw new ApiFinanceError(
          "insufficient_funds",
          "The account does not have enough available balance.",
          409,
        );
      }

      const purchaseResult = await client.query<{ id: string }>(
        `
          insert into shop_purchases (
            shop_item_id, purchased_by_user_id, price_at_purchase, status,
            stock_reserved, requested_by_api_client_id
          )
          values ($1, $2, $3, 'pending', $4, $5)
          returning id
        `,
        [
          reward.id,
          account.rows[0].user_id,
          reward.price,
          !reward.is_quantity_unlimited,
          apiClient.id,
        ],
      );
      const purchaseId = purchaseResult.rows[0].id;
      await client.query(
        `
          insert into account_holds (
            account_id, amount, description, status,
            created_by_api_client_id, related_purchase_id
          )
          values ($1, $2, $3, 'active', $4, $5)
        `,
        [accountId, reward.price, reward.name, apiClient.id, purchaseId],
      );
      if (!reward.is_quantity_unlimited) {
        await client.query(
          `update shop_items set quantity = quantity - 1, updated_at = now() where id = $1`,
          [reward.id],
        );
      }
      await logPurchase(client, apiClient, "shop_purchase.api_requested", purchaseId, {
        accountId,
        rewardId,
        price: Number(reward.price),
      });
      const createdResult = await client.query<PurchaseRow>(purchaseSelect(), [
        purchaseId,
        apiClient.id,
      ]);
      const createdPurchase = mapPurchase(
        requirePurchase(createdResult.rows[0]),
      );
      await client.query("commit");

      return createdPurchase;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPurchase(apiClient: ApiClient, purchaseIdValue: string) {
    const purchaseId = parseUuid(purchaseIdValue, "purchaseId");
    const result = await db.query<PurchaseRow>(purchaseSelect(), [
      purchaseId,
      apiClient.id,
    ]);
    return mapPurchase(requirePurchase(result.rows[0]));
  }

  async approvePurchase(
    apiClient: ApiClient,
    purchaseId: string,
    body: Record<string, unknown>,
  ) {
    return this.decidePurchase(apiClient, purchaseId, body, "approved");
  }

  async denyPurchase(
    apiClient: ApiClient,
    purchaseId: string,
    body: Record<string, unknown>,
  ) {
    return this.decidePurchase(apiClient, purchaseId, body, "denied");
  }

  private async decidePurchase(
    apiClient: ApiClient,
    purchaseIdValue: string,
    body: Record<string, unknown>,
    status: "approved" | "denied",
  ) {
    const purchaseId = parseUuid(purchaseIdValue, "purchaseId");
    const note = parseOptionalNote(body.note);
    const client = await db.connect();

    try {
      await client.query("begin");
      const result = await client.query<PurchaseRow>(
        `${purchaseSelect()} for update of shop_purchases, account_holds`,
        [purchaseId, apiClient.id],
      );
      const purchase = requirePurchase(result.rows[0]);
      if (purchase.status !== "pending") {
        throw new ApiFinanceError(
          "purchase_not_pending",
          "The purchase has already been decided.",
          409,
        );
      }

      let ledgerEntryId: string | null = null;
      if (status === "approved") {
        ledgerEntryId = await ledgerService.createEntry(client, {
          amount: -Number(purchase.price_at_purchase),
          description: purchase.item_name,
          entryType: "shop_purchase",
          relatedEntityId: purchase.id,
          relatedEntityType: "shop_purchase",
          status: "posted",
          userId: purchase.purchased_by_user_id,
        });
      } else if (purchase.stock_reserved) {
        await client.query(
          `update shop_items set quantity = quantity + 1, updated_at = now() where id = $1`,
          [purchase.shop_item_id],
        );
      }

      await client.query(
        `
          update account_holds
          set status = $2,
              captured_ledger_entry_id = $3,
              updated_at = now()
          where id = $1
        `,
        [
          purchase.hold_id,
          status === "approved" ? "captured" : "released",
          ledgerEntryId,
        ],
      );
      await client.query(
        `
          update shop_purchases
          set status = $2,
              decided_at = now(),
              decision_note = $3
          where id = $1
        `,
        [purchase.id, status, note],
      );
      await logPurchase(
        client,
        apiClient,
        `shop_purchase.api_${status}`,
        purchase.id,
        { ledgerEntryId, note },
      );
      await notificationService.notifyRewardDecision(client, {
        itemName: purchase.item_name,
        purchaseId: purchase.id,
        status,
        studentUserId: purchase.purchased_by_user_id,
      });
      const updatedResult = await client.query<PurchaseRow>(purchaseSelect(), [
        purchase.id,
        apiClient.id,
      ]);
      const updatedPurchase = mapPurchase(
        requirePurchase(updatedResult.rows[0]),
      );
      await client.query("commit");

      return updatedPurchase;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

function purchaseSelect() {
  return `
    select sp.id, sp.shop_item_id, sp.purchased_by_user_id,
           sp.price_at_purchase, sp.status, sp.decision_note,
           sp.stock_reserved, sp.purchased_at, si.name as item_name,
           accounts.id as account_id, account_holds.id as hold_id
    from shop_purchases sp
    join shop_items si on si.id = sp.shop_item_id
    join accounts on accounts.user_id = sp.purchased_by_user_id
    join account_holds on account_holds.related_purchase_id = sp.id
    where sp.id = $1
      and sp.requested_by_api_client_id = $2
      and sp.is_voided = false
  `;
}

function requirePurchase(row: PurchaseRow | undefined) {
  if (!row) {
    throw new ApiFinanceError(
      "purchase_not_found",
      "Purchase was not found.",
      404,
    );
  }
  return row;
}

function mapReward(row: RewardRow) {
  return {
    rewardId: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    price: Number(row.price),
    quantity: row.is_quantity_unlimited ? null : Number(row.quantity),
    unlimitedQuantity: row.is_quantity_unlimited,
  };
}

function mapPurchase(row: PurchaseRow) {
  return {
    purchaseId: row.id,
    accountId: row.account_id,
    rewardId: row.shop_item_id,
    rewardName: row.item_name,
    amount: Number(row.price_at_purchase),
    status: row.status,
    note: row.decision_note,
    holdId: row.hold_id,
    createdAt: row.purchased_at.toISOString(),
  };
}

function parseUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new ApiFinanceError(
      "invalid_uuid",
      `${field} must be a valid UUID.`,
    );
  }
  return value;
}

function parseOptionalNote(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.trim().length > 500) {
    throw new ApiFinanceError(
      "invalid_note",
      "note must be a string no longer than 500 characters.",
    );
  }
  return value.trim();
}

async function logPurchase(
  client: PoolClient,
  apiClient: ApiClient,
  action: string,
  purchaseId: string,
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
    entityId: purchaseId,
    entityType: "shop_purchase",
  });
}
