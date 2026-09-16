"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions";
import type {
  AppNotification,
  NotificationActionTarget,
} from "@/domains/notifications/notification-types";
import { BellIcon, CheckIcon } from "@/components/ui/icons";

type NotificationCentreProps = {
  onNavigate: (target: Exclude<NotificationActionTarget, "">) => void;
};

const refreshIntervalMs = 60_000;

export function NotificationCentre({ onNavigate }: NotificationCentreProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const refresh = useCallback(async () => {
    try {
      setNotifications(await listMyNotifications());
    } catch {
      // Notifications are supplementary; a failed refresh should not interrupt the app.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, refreshIntervalMs);

    function handleFocus() {
      void refresh();
    }

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function openNotification(notification: AppNotification) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
    }

    if (notification.actionTarget) {
      onNavigate(notification.actionTarget);
      setIsOpen(false);
    }
  }

  async function markAllRead() {
    setIsLoading(true);
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true })),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative ml-auto shrink-0 lg:ml-0" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-muted hover:text-text-control"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <BellIcon className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          aria-label="Notifications"
          className="motion-pop fixed inset-x-3 top-16 z-[220] max-h-[min(32rem,calc(100dvh-5rem))] overflow-hidden rounded-md border border-border bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96"
          role="dialog"
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-text-control">Notifications</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {unreadCount > 0 ? `${unreadCount} unread` : "You are up to date"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-brand-ink transition hover:bg-brand-soft disabled:opacity-60"
                disabled={isLoading}
                onClick={markAllRead}
                type="button"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[calc(min(32rem,100dvh-5rem)-4.25rem)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <BellIcon className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-3 text-sm font-medium text-text-control">No notifications</p>
                <p className="mt-1 text-xs text-text-muted">Important updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  className={`flex w-full gap-3 border-b border-border-subtle px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-hover ${
                    notification.isRead ? "" : "bg-brand-soft/40"
                  }`}
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.isRead ? "bg-border" : "bg-brand"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-control">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-text-muted">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function formatRelativeTime(value: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return `${Math.floor(elapsedHours / 24)}d ago`;
}
