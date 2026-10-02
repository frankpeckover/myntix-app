"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAuditLogPanel } from "@/components/admin/audit-log-panel";
import { AdminDashboardPanel } from "@/components/admin/dashboard-panel";
import { AdminErrorLogPanel } from "@/components/admin/error-log-panel";
import { AdminGroupsPanel } from "@/components/admin/groups-panel";
import { AdminSettingsPanel } from "@/components/admin/settings-panel";
import { AdminTimetablePanel } from "@/components/admin/timetable-panel";
import { AdminUsersPanel } from "@/components/admin/users-panel";
import { CreditAnalyticsPanel } from "@/components/analytics/panel";
import {
  DesktopSideNav,
  HeaderNavMenu,
  type NavigationItem,
} from "@/components/layout/app-nav";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { ShopPanel } from "@/components/rewards/shop-panel";
import { PreferencesPanel } from "@/components/preferences/preferences-panel";
import { StudentDashboardPanel } from "@/components/student/dashboard-panel";
import { TeacherDashboardPanel } from "@/components/teacher/dashboard-panel";
import { TeacherTimetablePanel } from "@/components/teacher/timetable-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { NotificationCentre } from "@/components/notifications/notification-centre";
import { AppBrand } from "@/components/ui/app-brand";
import { AppFooter } from "@/components/ui/app-footer";
import { GlobalMaintenanceBanner } from "@/components/ui/global-maintenance-banner";
import { SchoolLogo } from "@/components/ui/school-logo";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { getSchoolInfo } from "@/lib/actions";
import { appConfig } from "@/lib/config/app-config";
import {
  canManageGroups,
  canManageSchoolSettings,
  canManageUsers,
  canViewAuditLog,
  isAdmin,
  isStudent,
  isTeacher,
} from "@/lib/auth/permissions";
import { defaultCurrencyName } from "@/lib/config/school-defaults";
import { type SessionUser } from "@/lib/auth/session";
import type { SchoolInfo } from "@/domains/organisation/school-service";

type DashboardShellProps = {
  maintenanceMessage: string;
  user: SessionUser;
  onLogout: () => void;
};

type TeacherGroupNavigation = {
  groupId: string;
  groupName: string;
  version: number;
};

export function DashboardShell({
  maintenanceMessage,
  user,
  onLogout,
}: DashboardShellProps) {
  const [activeNavItem, setActiveNavItem] =
    useState<NavigationItem>("Dashboard");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [teacherGroupNavigation, setTeacherGroupNavigation] =
    useState<TeacherGroupNavigation | null>(null);
  const [greeting, setGreeting] = useState("Hello");
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: appConfig.defaultSchoolName,
    address: "",
    balanceCap: null,
    contactEmail: "",
    currencyName: defaultCurrencyName,
    logoUrl: "",
    phone: "",
    website: "",
    timezone: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSchoolInfo() {
      try {
        const loadedSchoolInfo = await getSchoolInfo();

        if (isMounted) {
          setSchoolInfo(loadedSchoolInfo);
        }
      } catch {
        // Keep the local fallback so the app still renders.
      }
    }

    loadSchoolInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    window.queueMicrotask(() => {
      setGreeting(getTimeOfDayGreeting(new Date()));
    });
  }, []);

  useEffect(() => {
    const title = getBrowserTabTitle(activeNavItem, user);

    function applyTitle() {
      if (document.title !== title) {
        document.title = title;
      }
    }

    applyTitle();

    const titleObserver = new MutationObserver(applyTitle);
    titleObserver.observe(document.head, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => titleObserver.disconnect();
  }, [activeNavItem, user]);

  const schoolName = schoolInfo.name.trim() || appConfig.defaultSchoolName;
  const shellRoleClassName = getShellRoleClassName(user);
  const clearTeacherGroupNavigation = useCallback(() => {
    setTeacherGroupNavigation(null);
  }, []);

  return (
    <div className={`app-shell-surface min-h-screen overflow-x-hidden bg-background text-foreground ${shellRoleClassName}`}>
      <OfflineBanner />
      <GlobalMaintenanceBanner message={maintenanceMessage} />
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden">
        <DesktopSideNav
          activeItem={activeNavItem}
          onItemChange={setActiveNavItem}
          onLogout={onLogout}
          onPasswordChange={() => setIsPasswordModalOpen(true)}
          profileImageUrl={user.profileImageUrl}
          role={user.role}
          userDisplayName={user.displayName}
        />

        <main
          className="mx-auto flex min-w-0 flex-1 flex-col px-3 py-1.5 sm:px-6 sm:py-2 lg:max-w-[calc(96rem-17rem)] lg:px-8"
          id="main-content"
          tabIndex={-1}
        >
          <h1 className="sr-only">{getCurrentPageHeading(activeNavItem, user)}</h1>
          <header className="relative z-50 pb-1.5 pt-3 sm:pb-2 sm:pt-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3 lg:flex-nowrap">
              <div className="lg:hidden">
                <AppBrand />
              </div>
              <p className="order-3 w-full min-w-0 basis-full truncate pt-0.5 text-left text-base font-medium text-text-control sm:pt-1 sm:text-xl lg:order-none lg:w-auto lg:basis-auto lg:flex-1 lg:pt-0 lg:text-left lg:text-2xl">
                {greeting}, {getGreetingName(user)}!
              </p>
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                <SchoolLogo
                  logoUrl={schoolInfo.logoUrl}
                  name={schoolName}
                  size="medium"
                />
                <span className="max-w-52 truncate text-sm font-medium text-text-muted">
                  {schoolName}
                </span>
              </div>
              <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-none lg:ml-0">
                <NotificationCentre
                  onNavigate={(target) => setActiveNavItem(target)}
                />
                <HeaderNavMenu
                  activeItem={activeNavItem}
                  onItemChange={setActiveNavItem}
                  onLogout={onLogout}
                  onPasswordChange={() => setIsPasswordModalOpen(true)}
                  profileImageUrl={user.profileImageUrl}
                  role={user.role}
                  userDisplayName={user.displayName}
                />
              </div>
            </div>
          </header>

        {isAdmin(user) && activeNavItem === "Dashboard" && (
          <AdminDashboardPanel
            currencyName={schoolInfo.currencyName}
            onNavigate={setActiveNavItem}
            schoolName={schoolName}
            userId={user.id}
          />
        )}

        {canManageUsers(user) && activeNavItem === "Users" && (
          <AdminUsersPanel schoolName={schoolName} />
        )}

        {canManageGroups(user) && activeNavItem === "Groups" && (
          <AdminGroupsPanel />
        )}

        {canManageGroups(user) && activeNavItem === "Timetable" && (
          <AdminTimetablePanel />
        )}

        {isTeacher(user) && activeNavItem === "Dashboard" && (
          <TeacherDashboardPanel
            currencyName={schoolInfo.currencyName}
            groupNavigation={teacherGroupNavigation}
            onGroupNavigationConsumed={clearTeacherGroupNavigation}
            schoolName={schoolName}
          />
        )}

        {!isStudent(user) && activeNavItem === "Analytics" && (
          <CreditAnalyticsPanel
            currencyName={schoolInfo.currencyName}
          />
        )}

        {isStudent(user) && activeNavItem === "Dashboard" && (
          <StudentDashboardPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
            onBrowseRewards={() => setActiveNavItem("Rewards")}
            onOpenTransactionHistory={() => setActiveNavItem("Transaction History")}
            schoolLogoUrl={schoolInfo.logoUrl}
            schoolName={schoolName}
          />
        )}

        {isAdmin(user) && activeNavItem === "Credit Management" && (
          <TeacherDashboardPanel
            currencyName={schoolInfo.currencyName}
            groupNavigation={teacherGroupNavigation}
            onGroupNavigationConsumed={clearTeacherGroupNavigation}
            schoolName={schoolName}
            showAllStudentsByDefault
          />
        )}

        {isTeacher(user) && activeNavItem === "Timetable" && (
          <TeacherTimetablePanel
            onOpenGroup={(groupId, groupName) => {
              setTeacherGroupNavigation((current) => ({
                groupId,
                groupName,
                version: (current?.version ?? 0) + 1,
              }));
              setActiveNavItem("Dashboard");
            }}
          />
        )}

        {activeNavItem === "Rewards" && (
          <ShopPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
          />
        )}

        {(activeNavItem === "Transaction Log" ||
          (isStudent(user) && activeNavItem === "Transaction History")) && (
          <TransactionLogPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
          />
        )}

        {canViewAuditLog(user) && activeNavItem === "Audit Log" && (
          <AdminAuditLogPanel />
        )}

        {canViewAuditLog(user) && activeNavItem === "Error Log" && (
          <AdminErrorLogPanel />
        )}

        {canManageSchoolSettings(user) && activeNavItem === "Settings" && (
          <AdminSettingsPanel
            onSchoolInfoUpdated={setSchoolInfo}
          />
        )}

        {activeNavItem === "Preferences" && (
          <PreferencesPanel user={user} />
        )}

        {isPasswordModalOpen && (
          <ChangePasswordModal
            onClose={() => setIsPasswordModalOpen(false)}
          />
        )}

        <AppFooter
          contactEmail={schoolInfo.contactEmail}
          schoolName={schoolName}
        />
        </main>
      </div>
    </div>
  );
}

function getGreetingName(user: SessionUser) {
  return user.firstName.trim() || user.displayName.trim() || user.username;
}

function getBrowserTabTitle(activeNavItem: NavigationItem, user: SessionUser) {
  return `${getCurrentPageHeading(activeNavItem, user)} | ${appConfig.name}`;
}

function getCurrentPageHeading(activeNavItem: NavigationItem, user: SessionUser) {
  if (activeNavItem === "Dashboard") {
    return getRoleDashboardTitle(user);
  }

  return activeNavItem;
}

function getRoleDashboardTitle(user: SessionUser) {
  if (isAdmin(user)) {
    return "Admin Dashboard";
  }

  if (isTeacher(user)) {
    return "Teacher Dashboard";
  }

  return "Student Dashboard";
}

function getShellRoleClassName(user: SessionUser) {
  if (isAdmin(user)) {
    return "professional-shell admin-shell";
  }

  if (isTeacher(user)) {
    return "professional-shell teacher-shell";
  }

  return "student-shell";
}

function getTimeOfDayGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
