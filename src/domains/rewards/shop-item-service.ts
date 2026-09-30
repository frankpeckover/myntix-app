import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ActionResult } from "@/lib/actions/action-results";
import { db } from "@/lib/database/db";
import { canManageShopItems } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";
import type {
  ImportShopItemsInput,
  ImportShopItemsResult,
  SaveShopItemInput,
  ShopItem,
  ShopItemRow,
} from "@/domains/rewards/shop-types";

const auditService = new AuditService();
const imageUploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "shop-items",
);
const imagePublicPath = "/uploads/shop-items";
const bytesPerKilobyte = 1024;
const kilobytesPerMegabyte = 1024;
const maxImageFileSizeMegabytes = 2;
const maxImageFileSizeBytes =
  maxImageFileSizeMegabytes * kilobytesPerMegabyte * bytesPerKilobyte;
const allowedImageTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type UploadShopItemImageResult =
  | {
      ok: true;
      imageUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export class ShopItemService {
  async listItems(includeInactive = false): Promise<ShopItem[]> {
    const result = await db.query<ShopItemRow>(
      `
        select id, name, description, image_url, price, quantity, is_quantity_unlimited, is_active
        from shop_items
        where $1::boolean = true or is_active = true
        order by name
      `,
      [includeInactive],
    );

    return result.rows.map(mapShopItemRow);
  }

  async saveItem(
    currentUser: SessionUser,
    input: SaveShopItemInput,
  ): Promise<ActionResult> {
    if (!canManageShopItems(currentUser)) {
      return {
        ok: false,
        message: "Only staff can manage reward items.",
      };
    }

    const name = input.name.trim();
    const description = input.description.trim();
    const imageUrl = input.imageUrl.trim();

    if (!name) {
      return {
        ok: false,
        message: "Enter an item name.",
      };
    }

    if (input.price < 0 || input.quantity < 0) {
      return {
        ok: false,
        message: "Price and quantity cannot be negative.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      let itemId = input.id;

      if (input.id) {
        await updateItem(
          client,
          input.id,
          name,
          description,
          imageUrl,
          input.price,
          input.quantity,
          input.isQuantityUnlimited,
        );
      } else {
        itemId = await createItem(
          client,
          name,
          description,
          imageUrl,
          input.price,
          input.quantity,
          input.isQuantityUnlimited,
        );
      }

      await auditService.logWithClient(client, {
        action: input.id ? "shop_item.updated" : "shop_item.created",
        actorUserId: currentUser.id,
        details: {
          name,
          hasImage: Boolean(imageUrl),
          price: input.price,
          quantity: input.quantity,
          isQuantityUnlimited: input.isQuantityUnlimited,
        },
        entityId: itemId,
        entityType: "shop_item",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Save reward item failed", error);

      return {
        ok: false,
        message: "Could not save reward item.",
      };
    } finally {
      client.release();
    }
  }

  async removeItem(currentUser: SessionUser, itemId: string): Promise<ActionResult> {
    return this.setItemActive(currentUser, itemId, false);
  }

  async setItemActive(
    currentUser: SessionUser,
    itemId: string,
    isActive: boolean,
  ): Promise<ActionResult> {
    if (!canManageShopItems(currentUser)) {
      return {
        ok: false,
        message: "Only staff can manage reward items.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      await client.query(
        `
          update shop_items
          set is_active = $2,
              updated_at = now()
          where id = $1
        `,
        [itemId, isActive],
      );

      await auditService.logWithClient(client, {
        action: isActive ? "shop_item.enabled" : "shop_item.archived",
        actorUserId: currentUser.id,
        entityId: itemId,
        entityType: "shop_item",
      });

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      console.error("Update reward item status failed", error);

      return {
        ok: false,
        message: isActive
          ? "Could not enable reward item."
          : "Could not archive reward item.",
      };
    } finally {
      client.release();
    }

    return { ok: true };
  }

  async importItems(
    currentUser: SessionUser,
    input: ImportShopItemsInput,
  ): Promise<ImportShopItemsResult> {
    if (!canManageShopItems(currentUser)) {
      return {
        createdCount: 0,
        errors: [
          {
            message: "Only staff can manage reward items.",
            name: "",
            rowNumber: 0,
          },
        ],
        updatedCount: 0,
      };
    }

    const client = await db.connect();
    const errors: ImportShopItemsResult["errors"] = [];
    let createdCount = 0;
    let updatedCount = 0;

    try {
      await client.query("begin");

      for (const [index, item] of input.items.entries()) {
        const rowNumber = index + 2;
        const name = item.name.trim();
        const description = item.description.trim();
        const imageUrl = item.imageUrl.trim();

        if (!name) {
          errors.push({
            message: "Item name is required.",
            name,
            rowNumber,
          });
          continue;
        }

        if (item.price < 0 || item.quantity < 0) {
          errors.push({
            message: "Price and quantity cannot be negative.",
            name,
            rowNumber,
          });
          continue;
        }

        const existingItem = await client.query<{ id: string }>(
          `
            select id
            from shop_items
            where lower(name) = lower($1)
            limit 1
          `,
          [name],
        );

        if (existingItem.rowCount && existingItem.rows[0]) {
          await updateItem(
            client,
            existingItem.rows[0].id,
            name,
            description,
            imageUrl,
            item.price,
            item.quantity,
            item.isQuantityUnlimited,
          );
          updatedCount += 1;
        } else {
          await createItem(
            client,
            name,
            description,
            imageUrl,
            item.price,
            item.quantity,
            item.isQuantityUnlimited,
          );
          createdCount += 1;
        }
      }

      await auditService.logWithClient(client, {
        action: "shop_item.imported",
        actorUserId: currentUser.id,
        details: {
          createdCount,
          errorCount: errors.length,
          updatedCount,
        },
        entityType: "shop_item",
      });

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      console.error("Import reward items failed", error);

      return {
        createdCount: 0,
        errors: [
          {
            message: "Could not import reward items.",
            name: "",
            rowNumber: 0,
          },
        ],
        updatedCount: 0,
      };
    } finally {
      client.release();
    }

    return {
      createdCount,
      errors,
      updatedCount,
    };
  }

  async uploadImage(file: File): Promise<UploadShopItemImageResult> {
    if (!file || file.size === 0) {
      return {
        ok: false,
        message: "Choose an item image.",
      };
    }

    if (file.size > maxImageFileSizeBytes) {
      return {
        ok: false,
        message: `Image must be ${maxImageFileSizeMegabytes} MB or smaller.`,
      };
    }

    const extension = allowedImageTypes.get(file.type);

    if (!extension) {
      return {
        ok: false,
        message: "Image must be a PNG, JPG, WebP, or GIF file.",
      };
    }

    try {
      await mkdir(imageUploadDirectory, { recursive: true });

      const fileName = `${randomUUID()}.${extension}`;
      const filePath = path.join(imageUploadDirectory, fileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, fileBytes);

      return {
        ok: true,
        imageUrl: `${imagePublicPath}/${fileName}`,
      };
    } catch (error) {
      console.error("Upload reward item image failed", error);

      return {
        ok: false,
        message: "Could not upload item image.",
      };
    }
  }
}

async function createItem(
  client: import("pg").PoolClient,
  name: string,
  description: string,
  imageUrl: string,
  price: number,
  quantity: number,
  isQuantityUnlimited: boolean,
) {
  const result = await client.query<{ id: string }>(
    `
      insert into shop_items (
        name,
        description,
        image_url,
        price,
        quantity,
        is_quantity_unlimited
      )
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [name, description, imageUrl, price, quantity, isQuantityUnlimited],
  );

  return result.rows[0].id;
}

async function updateItem(
  client: import("pg").PoolClient,
  itemId: string,
  name: string,
  description: string,
  imageUrl: string,
  price: number,
  quantity: number,
  isQuantityUnlimited: boolean,
) {
  await client.query(
    `
      update shop_items
      set name = $1,
          description = $2,
          image_url = $3,
          price = $4,
          quantity = $5,
          is_quantity_unlimited = $6,
          updated_at = now()
      where id = $7
    `,
    [name, description, imageUrl, price, quantity, isQuantityUnlimited, itemId],
  );
}

function mapShopItemRow(item: ShopItemRow): ShopItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.image_url,
    price: item.price,
    quantity: item.quantity,
    isQuantityUnlimited: item.is_quantity_unlimited,
    isActive: item.is_active,
  };
}
