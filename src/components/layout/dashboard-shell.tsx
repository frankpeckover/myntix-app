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
  DesktopAccountMenu,
  DesktopSideNav,
  HeaderNavMenu,
  NavigationItemIcon,
  type NavigationItem,
} from "@/components/layout/app-nav";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { ShopPanel } from "@/components/rewards/shop-panel";
import { StaffRewardRequestsPage } from "@/components/rewards/staff-reward-requests-page";
import { PreferencesPanel } from "@/components/preferences/preferences-panel";
import { StudentDashboardPanel } from "@/components/student/dashboard-panel";
import { TeacherDashboardPanel } from "@/components/teacher/dashboard-panel";
import { TeacherHomePanel } from "@/components/teacher/home-panel";
import { TeacherTimetablePanel } from "@/components/teacher/timetable-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { NotificationCentre } from "@/components/notifications/notification-centre";
import { AppBrand } from "@/components/ui/app-brand";
import { AppFooter } from "@/components/ui/app-footer";
import { GlobalMaintenanceBanner } from "@/components/ui/global-maintenance-banner";
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
import { VoiceCreditAssistant } from "@/components/voice/voice-credit-assistant";
import { UserPreferencesProvider } from "@/components/preferences/user-preferences-provider";
import type { UserPreferences } from "@/lib/theme/user-preferences";

type DashboardShellProps = {
  initialPreferences: UserPreferences | null;
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
  initialPreferences,
  maintenanceMessage,
  user,
  onLogout,
}: DashboardShellProps) {
  const [activeNavItem, setActiveNavItem] =
    useState<NavigationItem>("Dashboard");
  const [transactionHistoryDateFilter, setTransactionHistoryDateFilter] =
    useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [teacherGroupNavigation, setTeacherGroupNavigation] =
    useState<TeacherGroupNavigation | null>(null);
  const [greeting, setGreeting] = useState("Hello");
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: appConfig.defaultSchoolName,
    address: "",
    balanceCap: null,
    transactionCap: null,
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

  function navigateTo(target: NavigationItem) {
    if (target !== "Transaction History") {
      setTransactionHistoryDateFilter(null);
    }
    setActiveNavItem(target);
  }

  return (
    <UserPreferencesProvider
      initialPreferences={initialPreferences}
      userId={user.id}
    >
    <div className={`app-shell-surface min-h-screen overflow-x-clip bg-background text-foreground ${shellRoleClassName}`}>
      <OfflineBanner />
      <GlobalMaintenanceBanner message={maintenanceMessage} />
      <div className="flex min-h-screen w-full min-w-0 overflow-x-clip">
        <DesktopSideNav
          activeItem={activeNavItem}
          onItemChange={navigateTo}
          onLogout={onLogout}
          onPasswordChange={() => setIsPasswordModalOpen(true)}
          profileImageUrl={user.profileImageUrl}
          role={user.role}
          schoolLogoUrl={schoolInfo.logoUrl}
          schoolName={schoolName}
          userDisplayName={user.displayName}
        />

        <main
          className="mx-auto flex min-w-0 flex-1 flex-col px-3 py-1.5 sm:px-6 sm:py-2 lg:max-w-[calc(104rem-17rem)] lg:px-8"
          id="main-content"
          tabIndex={-1}
        >
          <header className="relative z-50 pb-1.5 pt-3 sm:pb-2 sm:pt-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3 lg:flex-nowrap">
              <div className="lg:hidden">
                <AppBrand />
              </div>
              <p className="order-3 w-full min-w-0 basis-full truncate pt-0.5 text-left text-base font-medium text-text-control sm:pt-1 sm:text-xl lg:order-none lg:w-auto lg:basis-auto lg:flex-1 lg:pt-0 lg:text-left lg:text-2xl">
                {greeting}, {getGreetingName(user)}!
              </p>
              <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-none lg:ml-0">
                {!isStudent(user) && (
                  <VoiceCreditAssistant
                    currencyName={schoolInfo.currencyName}
                    transactionCap={schoolInfo.transactionCap}
                  />
                )}
                <NotificationCentre
                  onNavigate={navigateTo}
                />
                <DesktopAccountMenu
                  onItemChange={navigateTo}
                  onLogout={onLogout}
                  onPasswordChange={() => setIsPasswordModalOpen(true)}
                  profileImageUrl={user.profileImageUrl}
                  userDisplayName={user.displayName}
                />
                <HeaderNavMenu
                  activeItem={activeNavItem}
                  onItemChange={navigateTo}
                  onLogout={onLogout}
                  onPasswordChange={() => setIsPasswordModalOpen(true)}
                  profileImageUrl={user.profileImageUrl}
                  role={user.role}
                  schoolLogoUrl={schoolInfo.logoUrl}
                  schoolName={schoolName}
                  userDisplayName={user.displayName}
                />
              </div>
            </div>
          </header>

          <div className="mb-1.5 flex min-h-0 items-center pt-2 pb-0 sm:mb-2 sm:pt-3">
            <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
              <span className="shrink-0 text-brand" aria-hidden="true">
                <NavigationItemIcon
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  item={activeNavItem}
                />
              </span>
              <div className="min-w-0">
                <h1 className="min-w-0 truncate text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {getCurrentPageHeading(activeNavItem, user)}
                </h1>
                <p className="mt-1 text-sm leading-5 text-text-muted">
                  {getCurrentPageDescription(activeNavItem, user)}
                </p>
              </div>
            </div>
          </div>

        {isAdmin(user) && activeNavItem === "Dashboard" && (
          <AdminDashboardPanel
            currencyName={schoolInfo.currencyName}
            onNavigate={navigateTo}
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
          <TeacherHomePanel
            onNavigateToCredits={() => navigateTo("Credit Management")}
            onNavigateToRequests={() => navigateTo("Reward Requests")}
            onNavigateToTimetable={() => navigateTo("Timetable")}
            onOpenCurrentClass={(groupId, groupName) => {
              setTeacherGroupNavigation((current) => ({
                groupId,
                groupName,
                version: (current?.version ?? 0) + 1,
              }));
              navigateTo("Credit Management");
            }}
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
            onBrowseRewards={() => navigateTo("Rewards")}
            onOpenTransactionHistory={(date) => {
              setTransactionHistoryDateFilter(date ?? null);
              setActiveNavItem("Transaction History");
            }}
            schoolLogoUrl={schoolInfo.logoUrl}
            schoolName={schoolName}
          />
        )}

        {!isStudent(user) && activeNavItem === "Credit Management" && (
          <TeacherDashboardPanel
            currencyName={schoolInfo.currencyName}
            groupNavigation={teacherGroupNavigation}
            onGroupNavigationConsumed={clearTeacherGroupNavigation}
            showAllStudentsByDefault={isAdmin(user)}
            transactionCap={schoolInfo.transactionCap}
          />
        )}

        {!isStudent(user) && activeNavItem === "Reward Requests" && (
          <StaffRewardRequestsPage currencyName={schoolInfo.currencyName} />
        )}

        {isTeacher(user) && activeNavItem === "Timetable" && (
          <TeacherTimetablePanel
            onOpenGroup={(groupId, groupName) => {
              setTeacherGroupNavigation((current) => ({
                groupId,
                groupName,
                version: (current?.version ?? 0) + 1,
              }));
              navigateTo("Credit Management");
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
            initialDateFilter={
              isStudent(user) ? transactionHistoryDateFilter ?? undefined : undefined
            }
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
    </UserPreferencesProvider>
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

function getCurrentPageDescription(
  activeNavItem: NavigationItem,
  user: SessionUser,
) {
  switch (activeNavItem) {
    case "Dashboard":
      if (isAdmin(user)) {
        return "A snapshot of your school's accounts, balances and activity.";
      }
      if (isTeacher(user)) {
        return "See your current class and jump into everyday tasks.";
      }
      return "Check your balance, recent activity and available rewards.";
    case "Credit Management":
      return "Issue or remove credits for individual students or groups.";
    case "Reward Requests":
      return "Review student requests and approve or decline them.";
    case "Analytics":
      return "Explore student balances and ledger activity over time.";
    case "Rewards":
      if (isStudent(user)) {
        return "Browse rewards you can request with your credits.";
      }
      return isAdmin(user)
        ? "Browse and manage rewards in the school shop."
        : "Browse the rewards available in your school shop.";
    case "Transaction Log":
    case "Transaction History":
      return isStudent(user)
        ? "Review your complete credit history."
        : "Review credit activity across the school.";
    case "Users":
      return "Create, update and manage school accounts.";
    case "Groups":
      return "Organise students into classes and teaching groups.";
    case "Timetable":
      return isAdmin(user)
        ? "Manage the school's timetable and class assignments."
        : "See your weekly classes and open a class to manage credits.";
    case "Audit Log":
      return "Review a record of administrative changes.";
    case "Error Log":
      return "Review application errors recorded for your school.";
    case "Settings":
      return "Configure school-wide rules, access and appearance.";
    case "Preferences":
      return "Personalise your appearance and everyday workflow.";
  }
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
