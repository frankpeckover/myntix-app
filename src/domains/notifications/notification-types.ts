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
  rewardRequestMode: RewardRequestNotificationMode;
};

export type RewardRequestNotificationMode =
  | "off"
  | "in_app"
  | "in_app_digest";
