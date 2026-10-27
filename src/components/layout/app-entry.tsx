"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { logoutUser } from "@/lib/actions";
import { appConfig } from "@/lib/config/app-config";
import { isAdmin, isTeacher } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { sessionExpiredEventName } from "@/lib/auth/session-expiry-event";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ToastViewport } from "@/components/ui/toast-viewport";
import type { UserPreferences } from "@/lib/theme/user-preferences";

// Password managers can inject controls before hydration; mount this form on the client.
const LoginCard = dynamic(
  () => import("@/components/auth/login-card").then((module) => module.LoginCard),
  { ssr: false },
);

type AppEntryProps = {
  initialUser: SessionUser | null;
  initialPreferences: UserPreferences | null;
  maintenanceMessage: string;
  returnTo?: string | null;
};

export function AppEntry({
  initialUser,
  initialPreferences,
  maintenanceMessage,
  returnTo=null,
}: AppEntryProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title =
      user === null ? `Sign In | ${appConfig.name}` : getDashboardTitle(user);
  }, [user]);

  useEffect(()=>{if(user&&returnTo)window.location.assign(returnTo)},[user,returnTo]);

  useEffect(() => {
    function handleSessionExpired() {
      setUser((currentUser) => {
        if (currentUser) {
          setSessionMessage("Your session has expired. Please sign in again.");
        }

        return null;
      });
    }

    window.addEventListener(sessionExpiredEventName, handleSessionExpired);

    return () => {
      window.removeEventListener(sessionExpiredEventName, handleSessionExpired);
    };
  }, []);

  async function handleLogout() {
    await logoutUser();
    setSessionMessage(null);
    setUser(null);
  }

  function handleLogin(nextUser: SessionUser) {
    setSessionMessage(null);
    if(returnTo){window.location.assign(returnTo);return}
    setUser(nextUser);
  }

  if (user === null) {
    return (
      <>
        <ToastViewport />
        <LoginCard
          initialMessage={sessionMessage}
          initialMessageTone={sessionMessage ? "warning" : "success"}
          maintenanceMessage={maintenanceMessage}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <>
      <ToastViewport />
      <DashboardShell
        initialPreferences={user === initialUser ? initialPreferences : null}
        maintenanceMessage={maintenanceMessage}
        onLogout={handleLogout}
        user={user}
      />
    </>
  );
}

function getDashboardTitle(user: SessionUser) {
  if (isAdmin(user)) {
    return `Admin Dashboard | ${appConfig.name}`;
  }

  if (isTeacher(user)) {
    return `Teacher Dashboard | ${appConfig.name}`;
  }

  return `Student Dashboard | ${appConfig.name}`;
}
