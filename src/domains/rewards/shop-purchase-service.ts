import type { PoolClient } from "pg";
import type { ActionResult } from "@/lib/actions/action-results";
import { db } from "@/lib/database/db";
import {
  canApproveShopRequests,
  canRequestShopItems,
} from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";
import { LedgerService } from "@/domains/ledger/ledger-service";
import { NotificationService } from "@/domains/notifications/notification-service";
import type {
  ShopItemRow,
  ShopPurchaseRequest,
  ShopPurchaseRequestRow,
  ShopPurchaseStatus,
  StudentShopRequest,
  StudentShopRequestRow,
} from "@/domains/rewards/shop-types";

const ledgerService = new LedgerService();
const auditService = new AuditService();
const notificationService = new NotificationService();

export class ShopPurchaseService {
  async listPendingPurchaseRequests(
    currentUser: SessionUser,
  ): Promise<ShopPurchaseRequest[]> {
    return this.listStaffShopRequests(currentUser, true);
  }

  async listStaffShopRequests(
    currentUser: SessionUser,
    pendingOnly = false,
  ): Promise<ShopPurchaseRequest[]> {
    if (!canManagePurchases(currentUser)) {
      return [];
    }

    const result = await db.query<ShopPurchaseRequestRow>(
      `
        select
          shop_purchases.id,
          shop_items.name as item_name,
          shop_purchases.price_at_purchase as price,
          shop_purchases.purchased_at,
          shop_purchases.decided_at,
          shop_purchases.decision_note,
          shop_purchases.is_voided,
          shop_purchases.status,
          trim(coalesce(nullif(users.preferred_name, ''), users.first_name) || ' ' || users.last_name) as student_name,
          users.username as student_username
        from shop_purchases
        join shop_items on shop_items.id = shop_purchases.shop_item_id
        join users on users.id = shop_purchases.purchased_by_user_id
        where ($1::boolean = false or shop_purchases.status = 'pending')
          and shop_purchases.is_voided = false
          and shop_purchases.requested_by_api_client_id is null
        order by
          case when shop_purchases.status = 'pending' then 0 else 1 end,
          shop_purchases.purchased_at desc
        limit 50
      `,
      [pendingOnly],
    );

    return result.rows.map(mapPurchaseRequestRow);
  }

  async listStudentShopRequests(
    currentUser: SessionUser,
  ): Promise<StudentShopRequest[]> {
    if (!canRequestShopItems(currentUser)) {
      return [];
    }

    const result = await db.query<StudentShopRequestRow>(
      `
        select
          shop_purchases.id,
          shop_items.name as item_name,
          shop_purchases.price_at_purchase as price,
          shop_purchases.purchased_at,
          shop_purchases.decided_at,
          shop_purchases.decision_note,
          shop_purchases.is_voided,
          shop_purchases.status
        from shop_purchases
        join shop_items on shop_items.id = shop_purchases.shop_item_id
        where shop_purchases.purchased_by_user_id = $1
        order by shop_purchases.purchased_at desc
      `,
      [currentUser.id],
    );

    return result.rows.map(mapStudentShopRequestRow);
  }

  async requestPurchase(
    currentUser: SessionUser,
    itemId: string,
    requestId: string,
  ): Promise<ActionResult> {
    if (!canRequestShopItems(currentUser)) {
      return {
        ok: false,
        message: "Only students can request rewards.",
      };
    }

    if (!isUuid(requestId)) {
      return { ok: false, message: "Invalid reward request." };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      await client.query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        [requestId],
      );
      const existingRequest = await client.query(
        `
          select id
          from shop_purchases
          where purchased_by_user_id = $1
            and request_id = $2
        `,
        [currentUser.id, requestId],
      );

      if (existingRequest.rowCount === 1) {
        await client.query("commit");
        return { ok: true };
      }

      const item = await getShopItemForUpdate(client, itemId);

      if (
        !item ||
        !item.is_active ||
        (!item.is_quantity_unlimited && item.quantity <= 0)
      ) {
        await client.query("rollback");
        return {
          ok: false,
          message: "This item is not available.",
        };
      }

      const hasActiveStudentAccount = await lockActiveStudent(
        client,
        currentUser.id,
      );

      if (!hasActiveStudentAccount) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Student account was not found.",
        };
      }

      const balance = await ledgerService.getAvailableBalance(
        client,
        currentUser.id,
      );

      if (balance < item.price) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Not enough balance to request this reward.",
        };
      }

      const purchaseId = await createPendingPurchase(
        client,
        itemId,
        currentUser.id,
        item.price,
        !item.is_quantity_unlimited,
        requestId,
      );

      const ledgerEntryId = await ledgerService.createEntry(client, {
        amount: -item.price,
        createdByUserId: currentUser.id,
        description: item.name,
        entryType: "shop_hold",
        relatedEntityId: purchaseId,
        relatedEntityType: "shop_purchase",
        status: "pending",
        userId: currentUser.id,
      });

      if (!item.is_quantity_unlimited) {
        await reserveStock(client, itemId);
      }

      await auditService.logWithClient(client, {
        action: "shop_purchase.requested",
        actorUserId: currentUser.id,
        details: {
          itemId,
          itemName: item.name,
          ledgerEntryId,
          price: item.price,
        },
        entityId: purchaseId,
        entityType: "shop_purchase",
      });

      await notificationService.notifyRewardRequested(client);

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Request reward item failed", error);

      return {
        ok: false,
        message: "Could not request reward.",
      };
    } finally {
      client.release();
    }
  }

  async approvePurchaseRequest(
    currentUser: SessionUser,
    purchaseId: string,
  ): Promise<ActionResult> {
    if (!canManagePurchases(currentUser)) {
      return {
        ok: false,
        message: "Only staff can approve reward requests.",
      };
    }

    return decidePurchaseRequest(currentUser.id, purchaseId, "approved", "");
  }

  async denyPurchaseRequest(
    currentUser: SessionUser,
    purchaseId: string,
    decisionNote: string,
  ): Promise<ActionResult> {
    if (!canManagePurchases(currentUser)) {
      return {
        ok: false,
        message: "Only staff can deny reward requests.",
      };
    }

    return decidePurchaseRequest(
      currentUser.id,
      purchaseId,
      "denied",
      decisionNote.trim(),
    );
  }

}

function canManagePurchases(currentUser: SessionUser) {
  return canApproveShopRequests(currentUser);
}

async function getShopItemForUpdate(client: PoolClient, itemId: string) {
  const itemResult = await client.query<ShopItemRow>(
    `
      select id, name, description, price, quantity, is_quantity_unlimited, is_active
      from shop_items
      where id = $1
      for update
    `,
    [itemId],
  );

  return itemResult.rows[0] ?? null;
}

async function lockActiveStudent(client: PoolClient, userId: string) {
  const userResult = await client.query(
    `
      select users.id
      from users
      join roles on roles.id = users.role_id
      where users.id = $1
        and roles.role_key = 'student'
        and users.is_active = true
      for update
    `,
    [userId],
  );

  return userResult.rowCount === 1;
}

async function createPendingPurchase(
  client: PoolClient,
  itemId: string,
  userId: string,
  price: number,
  stockReserved: boolean,
  requestId: string,
) {
  const purchaseResult = await client.query<{ id: string }>(
    `
      insert into shop_purchases (
        shop_item_id,
        purchased_by_user_id,
        price_at_purchase,
        status,
        stock_reserved,
        request_id
      )
      values ($1, $2, $3, 'pending', $4, $5)
      returning id
    `,
    [itemId, userId, price, stockReserved, requestId],
  );

  return purchaseResult.rows[0].id;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function reserveStock(client: PoolClient, itemId: string) {
  await client.query(
    `
      update shop_items
      set quantity = quantity - 1,
          updated_at = now()
      where id = $1
    `,
    [itemId],
  );
}

async function restoreReservedStock(client: PoolClient, itemId: string) {
  await client.query(
    `
      update shop_items
      set quantity = quantity + 1,
          updated_at = now()
      where id = $1
    `,
    [itemId],
  );
}

async function decidePurchaseRequest(
  decidedByUserId: string,
  purchaseId: string,
  status: Extract<ShopPurchaseStatus, "approved" | "denied">,
  decisionNote: string,
): Promise<ActionResult> {
  const client = await db.connect();

  try {
    await client.query("begin");

    const result = await client.query<{
      price_at_purchase: number;
      purchased_by_user_id: string;
      shop_item_id: string;
      stock_reserved: boolean;
    }>(
      `
        update shop_purchases
        set status = $1,
            decided_by_user_id = $2,
            decided_at = now(),
            decision_note = $3
        where id = $4
          and status = 'pending'
          and is_voided = false
        returning shop_item_id, purchased_by_user_id, price_at_purchase, stock_reserved
      `,
      [status, decidedByUserId, decisionNote, purchaseId],
    );

    const purchase = result.rows[0];

    if (!purchase) {
      await client.query("rollback");
      return {
        ok: false,
        message: "Request was not found or has already been actioned.",
      };
    }

    if (status === "denied") {
      if (purchase.stock_reserved) {
        await restoreReservedStock(client, purchase.shop_item_id);
      }
      await ledgerService.voidRelatedEntry(
        client,
        "shop_purchase",
        purchaseId,
        decidedByUserId,
        decisionNote,
      );
    } else {
      await ledgerService.postRelatedEntry(
        client,
        "shop_purchase",
        purchaseId,
        "shop_purchase",
      );
    }

    const itemResult = await client.query<{ name: string }>(
      `select name from shop_items where id = $1`,
      [purchase.shop_item_id],
    );
    const itemName = itemResult.rows[0]?.name ?? "Your reward";

    await auditService.logWithClient(client, {
      action:
        status === "approved"
          ? "shop_purchase.approved"
          : "shop_purchase.denied",
      actorUserId: decidedByUserId,
      details: {
        decisionNote,
        price: purchase.price_at_purchase,
        purchasedByUserId: purchase.purchased_by_user_id,
        shopItemId: purchase.shop_item_id,
      },
      entityId: purchaseId,
      entityType: "shop_purchase",
    });
    await notificationService.notifyRewardDecision(client, {
      itemName,
      purchaseId,
      status,
      studentUserId: purchase.purchased_by_user_id,
    });

    await client.query("commit");
    return { ok: true };
  } catch (error) {
    await client.query("rollback");
    console.error("Decide reward request failed", error);

    return {
      ok: false,
      message: "Could not update reward request.",
    };
  } finally {
    client.release();
  }
}

function mapPurchaseRequestRow(
  purchase: ShopPurchaseRequestRow,
): ShopPurchaseRequest {
  return {
    decidedAt: purchase.decided_at ? purchase.decided_at.toISOString() : null,
    decisionNote: purchase.decision_note,
    id: purchase.id,
    isVoided: purchase.is_voided,
    itemName: purchase.item_name,
    price: purchase.price,
    purchasedAt: purchase.purchased_at.toISOString(),
    status: purchase.status,
    studentName: purchase.student_name,
    studentUsername: purchase.student_username,
  };
}

function mapStudentShopRequestRow(
  request: StudentShopRequestRow,
): StudentShopRequest {
  return {
    id: request.id,
    itemName: request.item_name,
    price: request.price,
    purchasedAt: request.purchased_at.toISOString(),
    decidedAt: request.decided_at ? request.decided_at.toISOString() : null,
    decisionNote: request.decision_note,
    isVoided: request.is_voided,
    status: request.status,
  };
}
