"use client";

import { useEffect, useState } from "react";
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from "@/lib/actions";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { BellIcon } from "@/components/ui/icons";
import { PreferencesSection } from "@/components/preferences/preferences-section";
import type { RewardRequestNotificationMode } from "@/domains/notifications/notification-types";

const rewardRequestOptions: Array<{
  label: string;
  value: RewardRequestNotificationMode;
}> = [
  { label: "Off", value: "off" },
  { label: "In-app", value: "in_app" },
  { label: "In-app + weekly digest", value: "in_app_digest" },
];

export function NotificationPreferences() {
  const [rewardRequestMode, setRewardRequestMode] =
    useState<RewardRequestNotificationMode>("off");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyNotificationPreferences()
      .then((preferences) => {
        if (isMounted) {
          setRewardRequestMode(preferences.rewardRequestMode);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Could not load notification preferences.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function savePreferences() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateMyNotificationPreferences({ rewardRequestMode });
      setMessage("Notification preferences saved.");
    } catch {
      setError("Could not save notification preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PreferencesSection
      description="Choose how you want to be reminded when reward requests are waiting."
      icon={<BellIcon />}
      title="Notifications"
    >
      <FixedNotification error={error} message={message} />
      <div className="flex flex-col gap-4 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <label className="text-sm font-medium text-text-control" htmlFor="reward-request-notifications">
            Reward request notifications
          </label>
          <p className="mt-0.5 text-xs text-text-muted">
            Alerts are grouped. Email is sent at most once every seven days.
          </p>
        </div>
        <select
          className="theme-input h-10 w-full px-3 text-sm sm:w-64"
          disabled={isLoading}
          id="reward-request-notifications"
          onChange={(event) =>
            setRewardRequestMode(
              event.target.value as RewardRequestNotificationMode,
            )
          }
          value={rewardRequestMode}
        >
          {rewardRequestOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
          disabled={isLoading || isSaving}
          onClick={savePreferences}
          type="button"
        >
          {isSaving ? "Saving..." : "Save notifications"}
        </button>
      </div>
    </PreferencesSection>
  );
}
