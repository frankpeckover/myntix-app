"use client";

import { useEffect } from "react";
import { getCurrentSessionUser } from "@/lib/actions";
import { notifySessionExpired } from "@/lib/auth/session-expiry-event";

const sessionCheckIntervalMs = 60_000;
const unauthenticatedErrorText = "Not authenticated.";

export function SessionChecker() {
  useEffect(() => {
    let isMounted = true;
    let isChecking = false;

    async function checkSession() {
      if (isChecking || !navigator.onLine) {
        return;
      }

      isChecking = true;

      try {
        const currentUser = await getCurrentSessionUser();

        if (isMounted && currentUser === null) {
          notifySessionExpired();
        }
      } catch (error) {
        if (isUnauthenticatedError(error)) {
          notifySessionExpired();
        }
      } finally {
        isChecking = false;
      }
    }

    const intervalId = window.setInterval(checkSession, sessionCheckIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isUnauthenticatedError(event.reason)) {
        return;
      }

      event.preventDefault();
      notifySessionExpired();
    }

    function handleWindowError(event: ErrorEvent) {
      if (!isUnauthenticatedError(event.error ?? event.message)) {
        return;
      }

      event.preventDefault();
      notifySessionExpired();
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("online", checkSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("online", checkSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

function isUnauthenticatedError(error: unknown) {
  if (error instanceof Error) {
    return error.message.includes(unauthenticatedErrorText);
  }

  if (typeof error === "string") {
    return error.includes(unauthenticatedErrorText);
  }

  return false;
}
