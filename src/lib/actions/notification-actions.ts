"use server";

import { requireUser } from "@/lib/actions/action-auth";
import { NotificationService } from "@/domains/notifications/notification-service";
import type { NotificationPreferences } from "@/domains/notifications/notification-types";

const notificationService = new NotificationService();

export async function listMyNotifications() {
  const currentUser = await requireUser();
  return notificationService.listForUser(currentUser);
}

export async function markNotificationRead(notificationId: string) {
  const currentUser = await requireUser();
  await notificationService.markRead(currentUser, notificationId);
}

export async function markAllNotificationsRead() {
  const currentUser = await requireUser();
  await notificationService.markAllRead(currentUser);
}

export async function getMyNotificationPreferences() {
  const currentUser = await requireUser();
  return notificationService.getPreferences(currentUser);
}

export async function updateMyNotificationPreferences(
  preferences: NotificationPreferences,
) {
  const currentUser = await requireUser();
  await notificationService.updatePreferences(currentUser, preferences);
  return { ok: true as const };
}
