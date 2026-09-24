"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function updateStatus() {
      setIsOffline(!navigator.onLine);
    }

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning shadow-sm"
      role="status"
    >
      You are offline. Changes are paused until your connection returns.
    </div>
  );
}
