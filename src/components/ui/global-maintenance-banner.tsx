"use client";

import { useEffect, useState } from "react";

type GlobalMaintenanceBannerProps = {
  message: string;
};

export function GlobalMaintenanceBanner({
  message,
}: GlobalMaintenanceBannerProps) {
  const [maintenanceMessage, setMaintenanceMessage] = useState(message.trim());

  useEffect(() => {
    let isMounted = true;

    async function refreshAnnouncement() {
      try {
        const response = await fetch("/api/platform-announcement", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { message?: unknown };

        if (isMounted && typeof payload.message === "string") {
          setMaintenanceMessage(payload.message.trim());
        }
      } catch {
        // Keep the last known notice when the refresh cannot reach the server.
      }
    }

    const interval = window.setInterval(refreshAnnouncement, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!maintenanceMessage) {
    return null;
  }

  return (
    <section className="border-b border-accent/25 bg-accent-soft px-4 py-3 text-accent">
      <div className="mx-auto flex max-w-7xl items-start gap-3 text-sm">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface/75 font-semibold">
          i
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Service Notice</p>
          <p className="mt-1 whitespace-pre-wrap leading-6 text-text-control">
            {maintenanceMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
