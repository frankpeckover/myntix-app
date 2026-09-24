"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/session";
import { isAdmin, isStudent } from "@/lib/permissions";
import {
  AlertTriangleIcon,
  ClockIcon,
  CogIcon,
  EyeIcon,
  KeyRoundIcon,
  ListIcon,
  LogOutIcon,
  PlusIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { AppBrand } from "@/components/ui/app-brand";
import { UserAvatar } from "@/components/ui/user-avatar";

const defaultNavigationItems = [
  "Dashboard",
  "Timetable",
  "Analytics",
  "Rewards",
  "Transaction Log",
] as const;
const studentNavigationItems = ["Dashboard", "Rewards"] as const;
const adminNavigationItems = [
  "Dashboard",
  "Credit Management",
  "Users",
  "Groups",
  "Timetable",
  "Analytics",
  "Rewards",
  "Transaction Log",
  "Audit Log",
  "Error Log",
  "Settings",
] as const;

export type NavigationItem =
  | (typeof adminNavigationItems)[number]
  | "Preferences";

type NavigationSection = {
  items: readonly NavigationItem[];
  title: string | null;
};

type HeaderNavMenuProps = {
  activeItem: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
  onLogout: () => void;
  onPasswordChange: () => void;
  profileImageUrl: string;
  role: Role;
  userDisplayName: string;
};

export function HeaderNavMenu({
  activeItem,
  onItemChange,
  onLogout,
  onPasswordChange,
  profileImageUrl,
  role,
  userDisplayName,
}: HeaderNavMenuProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigationSections = getNavigationSections(role);

  function closeMenus() {
    setIsMobileMenuOpen(false);
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        closeMenus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  function handleItemChange(item: NavigationItem) {
    onItemChange(item);
    closeMenus();
  }

  function handleLogout() {
    closeMenus();
    onLogout();
  }

  function handlePasswordChange() {
    closeMenus();
    onPasswordChange();
  }

  function handlePreferences() {
    handleItemChange("Preferences");
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="relative order-2 z-[100] ml-auto flex items-center gap-2 lg:order-none lg:ml-0"
      ref={navRef}
    >
      <button
        aria-expanded={isMobileMenuOpen}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-control transition hover:bg-surface-muted lg:hidden"
        onClick={() =>
          setIsMobileMenuOpen((currentValue) => !currentValue)
        }
        type="button"
      >
        <UserAvatar
          displayName={userDisplayName}
          imageUrl={profileImageUrl}
          size="sm"
        />
      </button>

      {isMobileMenuOpen && (
        <NavMenuPanel>
          {navigationSections.map((section) => (
            <NavMenuSection
              activeItem={activeItem}
              key={section.title ?? "main"}
              onItemChange={handleItemChange}
              section={section}
            />
          ))}

          <AccountMenuItems
            hasTopBorder
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onPreferences={handlePreferences}
          />
        </NavMenuPanel>
      )}
    </nav>
  );
}

export function DesktopSideNav({
  activeItem,
  onItemChange,
  onLogout,
  onPasswordChange,
  profileImageUrl,
  role,
  userDisplayName,
}: HeaderNavMenuProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigationSections = getNavigationSections(role);

  function handleItemChange(item: NavigationItem) {
    onItemChange(item);
  }

  const widthClassName = isExpanded ? "w-64" : "w-14";

  return (
    <>
      <div
        aria-hidden="true"
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${widthClassName}`}
      />
      <nav
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-[90] hidden h-dvh shrink-0 overflow-hidden rounded-r-3xl border-r border-border-subtle transition-[width] duration-200 lg:block ${widthClassName}`}
      >
        <div className="flex h-full flex-col bg-surface">
          <div
            className={`flex h-14 items-center gap-4 border-b border-border-subtle ${
              isExpanded ? "justify-between px-5" : "justify-center px-3"
            }`}
          >
            {isExpanded && (
              <div className="min-w-0">
                <AppBrand showNameOnMobile variant="wordmark" />
              </div>
            )}
            <button
              aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-text-muted transition hover:text-text-control"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              title={isExpanded ? "Collapse navigation" : "Expand navigation"}
              type="button"
            >
              {isExpanded ? (
                <SidebarCollapseIcon className="h-4 w-4" />
              ) : (
                <SidebarExpandIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-3 pt-6">
            {navigationSections.map((section) => (
              <SideNavSection
                activeItem={activeItem}
                isExpanded={isExpanded}
                key={section.title ?? "main"}
                onItemChange={handleItemChange}
                section={section}
              />
            ))}
          </div>

          <SideNavAccountMenu
            isExpanded={isExpanded}
            onItemChange={onItemChange}
            onLogout={onLogout}
            onPasswordChange={onPasswordChange}
            profileImageUrl={profileImageUrl}
            userDisplayName={userDisplayName}
          />
        </div>
      </nav>
    </>
  );
}

function SideNavSection({
  activeItem,
  isExpanded,
  onItemChange,
  section,
}: {
  activeItem: NavigationItem;
  isExpanded: boolean;
  onItemChange: (item: NavigationItem) => void;
  section: NavigationSection;
}) {
  const isTitledSection = Boolean(section.title);

  return (
    <div
      className={
        isTitledSection
          ? "mt-6 border-t border-border-subtle pt-4 first:mt-0"
          : ""
      }
    >
      {section.title && (
        <p
          className={`mb-1 px-5 text-[0.64rem] font-light uppercase tracking-[0.16em] text-text-kicker ${
            isExpanded ? "block" : "hidden"
          }`}
        >
          {section.title}
        </p>
      )}
      {section.items.map((item) => (
        <SideNavButton
          isActive={activeItem === item}
          isExpanded={isExpanded}
          item={item}
          key={item}
          onItemChange={onItemChange}
        />
      ))}
    </div>
  );
}

function SideNavAccountMenu({
  isExpanded,
  onItemChange,
  onLogout,
  onPasswordChange,
  profileImageUrl,
  userDisplayName,
}: Pick<
  HeaderNavMenuProps,
  | "onLogout"
  | "onItemChange"
  | "onPasswordChange"
  | "profileImageUrl"
  | "userDisplayName"
> & {
  isExpanded: boolean;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  function closeMenu() {
    setIsAccountMenuOpen(false);
  }

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  function handleLogout() {
    closeMenu();
    onLogout();
  }

  function handlePasswordChange() {
    closeMenu();
    onPasswordChange();
  }

  function handlePreferences() {
    closeMenu();
    onItemChange("Preferences");
  }

  return (
    <div
      className="relative border-t border-border-subtle px-2 py-3"
      ref={menuRef}
    >
      <button
        aria-expanded={isAccountMenuOpen}
        aria-label="Open account menu"
        className={`flex h-10 w-full items-center text-xs font-light tracking-[0.01em] transition ${
          isAccountMenuOpen
            ? "bg-brand-soft text-foreground"
            : "text-text-muted hover:bg-surface-muted hover:text-text-control"
        } ${isExpanded ? "justify-start gap-2.5 px-3" : "justify-center px-0"}`}
        onClick={() => setIsAccountMenuOpen((currentValue) => !currentValue)}
        type="button"
      >
        <UserAvatar
          displayName={userDisplayName}
          imageUrl={profileImageUrl}
          size="sm"
        />
        {isExpanded && <span className="truncate">{userDisplayName}</span>}
      </button>

      {isAccountMenuOpen && (
        <NavMenuPanel align="left" placement="up">
          <AccountMenuItems
            hasTopBorder={false}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onPreferences={handlePreferences}
          />
        </NavMenuPanel>
      )}
    </div>
  );
}

export function DesktopAccountMenu({
  onItemChange,
  onLogout,
  onPasswordChange,
  profileImageUrl,
  userDisplayName,
}: Pick<
  HeaderNavMenuProps,
  | "onLogout"
  | "onItemChange"
  | "onPasswordChange"
  | "profileImageUrl"
  | "userDisplayName"
>) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  function closeMenu() {
    setIsAccountMenuOpen(false);
  }

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  function handleLogout() {
    closeMenu();
    onLogout();
  }

  function handlePasswordChange() {
    closeMenu();
    onPasswordChange();
  }

  function handlePreferences() {
    closeMenu();
    onItemChange("Preferences");
  }

  return (
    <div className="relative hidden lg:block" ref={menuRef}>
      <button
        aria-expanded={isAccountMenuOpen}
        aria-label="Open account menu"
        className={`flex h-10 items-center gap-2 rounded-md px-2 text-xs font-light transition ${
          isAccountMenuOpen
            ? "bg-brand text-white shadow-sm"
            : "text-text-control hover:bg-brand-soft hover:text-brand-ink"
        }`}
        onClick={() => setIsAccountMenuOpen((currentValue) => !currentValue)}
        type="button"
      >
        <UserAvatar
          displayName={userDisplayName}
          imageUrl={profileImageUrl}
          size="sm"
        />
      </button>

      {isAccountMenuOpen && (
        <NavMenuPanel align="right">
          <AccountMenuItems
            hasTopBorder={false}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onPreferences={handlePreferences}
          />
        </NavMenuPanel>
      )}
    </div>
  );
}

function SideNavButton({
  isActive,
  isExpanded,
  item,
  onItemChange,
}: {
  isActive: boolean;
  isExpanded: boolean;
  item: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      aria-label={item}
      className={`group flex h-9 w-full items-center text-[0.72rem] font-light tracking-[0.012em] transition ${
        isActive
          ? "bg-brand-soft text-foreground"
          : "text-text-muted hover:bg-surface-muted hover:text-text-control"
      } ${isExpanded ? "justify-start gap-2.5 px-5" : "justify-center px-0"}`}
      onClick={() => onItemChange(item)}
      title={item}
      type="button"
    >
      <NavigationItemIcon item={item} />
      {isExpanded && <span className="truncate">{item}</span>}
    </button>
  );
}

function NavMenuPanel({
  align = "right",
  children,
  placement = "down",
}: {
  align?: "left" | "right";
  children: ReactNode;
  placement?: "down" | "up";
}) {
  return (
    <div
      className={`motion-pop fixed inset-x-3 top-16 z-[110] max-h-[calc(100dvh-5rem)] overflow-y-auto border border-border bg-surface p-2 shadow-lg lg:absolute lg:inset-x-auto lg:top-auto lg:w-64 ${
        align === "left" ? "lg:left-0" : "lg:right-0"
      } ${placement === "up" ? "lg:bottom-12" : "lg:top-12"}`}
    >
      {children}
    </div>
  );
}

function MenuItemButton({
  isActive,
  item,
  onItemChange,
}: {
  isActive: boolean;
  item: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={`group flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-light tracking-[0.01em] transition lg:min-h-0 lg:text-xs ${
        isActive
          ? "bg-brand-soft text-foreground"
          : "text-text-muted hover:bg-surface-muted hover:text-text-control"
      }`}
      onClick={() => onItemChange(item)}
      type="button"
    >
      <NavigationItemIcon item={item} />
      <span>{item}</span>
    </button>
  );
}

function NavMenuSection({
  activeItem,
  onItemChange,
  section,
}: {
  activeItem: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
  section: NavigationSection;
}) {
  const isTitledSection = Boolean(section.title);

  return (
    <div
      className={
        isTitledSection
          ? "mt-3 border-t border-border-subtle pt-3"
          : ""
      }
    >
      {section.title && (
        <p className="px-3 pb-1 text-[0.64rem] font-light uppercase tracking-[0.16em] text-text-kicker">
          {section.title}
        </p>
      )}
      {section.items.map((item) => (
        <MenuItemButton
          isActive={activeItem === item}
          item={item}
          key={item}
          onItemChange={onItemChange}
        />
      ))}
    </div>
  );
}

function AccountMenuItems({
  hasTopBorder,
  onLogout,
  onPasswordChange,
  onPreferences,
}: {
  hasTopBorder: boolean;
  onLogout: () => void;
  onPasswordChange: () => void;
  onPreferences: () => void;
}) {
  return (
    <>
      <button
        className={`flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-light tracking-[0.01em] text-text-muted transition hover:bg-surface-muted hover:text-text-control ${
          hasTopBorder ? "mt-2 border-t border-border-subtle" : ""
        }`}
        onClick={onPreferences}
        type="button"
      >
        <SlidersHorizontalIcon className="h-4 w-4 shrink-0" />
        <span>Preferences</span>
      </button>
      <button
        className="flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-light tracking-[0.01em] text-text-muted transition hover:bg-surface-muted hover:text-text-control"
        onClick={onPasswordChange}
        type="button"
      >
        <KeyRoundIcon className="h-4 w-4 shrink-0" />
        <span>Change password</span>
      </button>
      <button
        className="flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-light tracking-[0.01em] text-text-muted transition hover:bg-surface-muted hover:text-text-control"
        onClick={onLogout}
        type="button"
      >
        <LogOutIcon />
        <span>Sign out</span>
      </button>
    </>
  );
}

function NavigationItemIcon({ item }: { item: NavigationItem }) {
  const className = `h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transform-none ${getNavigationIconMotionClassName(item)}`;

  switch (item) {
    case "Dashboard":
      return <WalletIcon className={className} />;
    case "Credit Management":
      return <PlusIcon className={className} />;
    case "Analytics":
      return <TrendingUpIcon className={className} />;
    case "Rewards":
      return <TrophyIcon className={className} />;
    case "Transaction Log":
      return <ListIcon className={className} />;
    case "Users":
      return <UserIcon className={className} />;
    case "Groups":
      return <UsersIcon className={className} />;
    case "Timetable":
      return <ClockIcon className={className} />;
    case "Audit Log":
      return <EyeIcon className={className} />;
    case "Error Log":
      return <AlertTriangleIcon className={className} />;
    case "Settings":
      return <CogIcon className={className} />;
    case "Preferences":
      return <SlidersHorizontalIcon className={className} />;
    default:
      return <ListIcon className={className} />;
  }
}

function getNavigationIconMotionClassName(item: NavigationItem) {
  switch (item) {
    case "Analytics":
      return "group-hover:-translate-y-0.5 group-hover:scale-110";
    case "Rewards":
      return "group-hover:-translate-y-0.5 group-hover:scale-110";
    case "Settings":
      return "group-hover:rotate-45";
    case "Error Log":
      return "group-hover:scale-110";
    default:
      return "group-hover:translate-x-0.5 group-hover:scale-105";
  }
}

function getNavigationSections(role: Role): NavigationSection[] {
  return [
    {
      items: getPrimaryNavigationItems(role),
      title: null,
    },
  ];
}

function getPrimaryNavigationItems(role: Role): readonly NavigationItem[] {
  const userRole = { role };

  if (isAdmin(userRole)) {
    return adminNavigationItems;
  }

  if (isStudent(userRole)) {
    return studentNavigationItems;
  }

  return defaultNavigationItems;
}
