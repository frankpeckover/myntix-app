"use client";

import { useEffect, useState } from "react";
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from "@/lib/actions";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { BellIcon } from "@/components/ui/icons";

export function NotificationPreferences() {
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyNotificationPreferences()
      .then((preferences) => {
        if (isMounted) {
          setEmailDigestEnabled(preferences.emailDigestEnabled);
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
      await updateMyNotificationPreferences({ emailDigestEnabled });
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
            In-app alerts are always available. Choose whether to receive a daily email when reward requests need attention.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <div>
          <p className="text-sm font-medium text-text-control">Daily reward digest</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Only sent when reward requests are awaiting approval.
          </p>
        </div>
        <button
          aria-checked={emailDigestEnabled}
          aria-label="Daily reward digest"
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            emailDigestEnabled ? "bg-brand" : "bg-surface-muted"
          }`}
          disabled={isLoading}
          onClick={() => setEmailDigestEnabled((current) => !current)}
          role="switch"
          type="button"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              emailDigestEnabled ? "left-5.5" : "left-0.5"
            }`}
          />
        </button>
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
