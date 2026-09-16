export type NotificationActionTarget =
  | ""
  | "Dashboard"
  | "Rewards"
  | "Transaction Log";

export type AppNotification = {
  actionTarget: NotificationActionTarget;
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: string;
};

export type NotificationPreferences = {
  emailDigestEnabled: boolean;
};
