"use server";

import { canManageShopItems } from "@/lib/auth/permissions";
import {
  requireShopManager,
  requireUser,
} from "@/lib/actions/action-auth";
import { ShopItemService } from "@/domains/rewards/shop-item-service";
import { ShopPurchaseService } from "@/domains/rewards/shop-purchase-service";
import type {
  ImportShopItemsInput,
  SaveShopItemInput,
} from "@/domains/rewards/shop-service";

const shopItemService = new ShopItemService();
const shopPurchaseService = new ShopPurchaseService();

export async function listShopItems(includeInactive = false) {
  const currentUser = await requireUser();
  const canIncludeInactive = canManageShopItems(currentUser);

  return shopItemService.listItems(includeInactive && canIncludeInactive);
}

export async function saveShopItem(input: SaveShopItemInput) {
  const currentUser = await requireShopManager();
  return shopItemService.saveItem(currentUser, input);
}

export async function importShopItems(input: ImportShopItemsInput) {
  const currentUser = await requireShopManager();
  return shopItemService.importItems(currentUser, input);
}

export async function uploadShopItemImage(formData: FormData) {
  await requireShopManager();

  const file = formData.get("image");

  if (!(file instanceof File)) {
    return {
      ok: false as const,
      message: "Choose an item image.",
    };
  }

  return shopItemService.uploadImage(file);
}

export async function removeShopItem(itemId: string) {
  const currentUser = await requireShopManager();
  return shopItemService.removeItem(currentUser, itemId);
}

export async function setShopItemActive(itemId: string, isActive: boolean) {
  const currentUser = await requireShopManager();
  return shopItemService.setItemActive(currentUser, itemId, isActive);
}

export async function requestShopItem(itemId: string, requestId: string) {
  const currentUser = await requireUser();
  return shopPurchaseService.requestPurchase(currentUser, itemId, requestId);
}

export async function listPendingShopRequests() {
  const currentUser = await requireUser();
  return shopPurchaseService.listPendingPurchaseRequests(currentUser);
}

export async function listStaffShopRequests() {
  const currentUser = await requireUser();
  return shopPurchaseService.listStaffShopRequests(currentUser);
}

export async function listStudentShopRequests() {
  const currentUser = await requireUser();
  return shopPurchaseService.listStudentShopRequests(currentUser);
}

export async function approveShopRequest(purchaseId: string) {
  const currentUser = await requireUser();
  return shopPurchaseService.approvePurchaseRequest(currentUser, purchaseId);
}

export async function denyShopRequest(
  purchaseId: string,
  decisionNote: string,
) {
  const currentUser = await requireUser();
  return shopPurchaseService.denyPurchaseRequest(
    currentUser,
    purchaseId,
    decisionNote,
  );
}
