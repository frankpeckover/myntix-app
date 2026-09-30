"use client";

import { useEffect, useState } from "react";
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from "@/lib/actions";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { BellIcon } from "@/components/ui/icons";
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
    <section className="theme-panel p-5">
      <FixedNotification error={error} message={message} />
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-panel-soft text-text-muted">
          <BellIcon />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text-control">Notifications</h2>
          <p className="mt-1 text-sm text-text-muted">
            Choose how you want to be reminded when reward requests are waiting.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <div>
          <label className="text-sm font-medium text-text-control" htmlFor="reward-request-notifications">
            Reward request notifications
          </label>
          <p className="mt-0.5 text-xs text-text-muted">
            Alerts are grouped. Email is sent at most once every seven days.
          </p>
        </div>
        <select
          className="min-h-9 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-control outline-none ring-brand focus:border-brand focus:ring-2"
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
    </section>
  );
}
