"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/auth/session";
import { getPrimaryNavigationItems, type NavigationItem } from "@/lib/navigation/dashboard-navigation";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CoinStackIcon,
  CogIcon,
  EyeIcon,
  KeyRoundIcon,
  ListIcon,
  LogOutIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { AppBrand } from "@/components/ui/app-brand";
import { SchoolLogo } from "@/components/ui/school-logo";
import { UserAvatar } from "@/components/ui/user-avatar";

export type { NavigationItem } from "@/lib/navigation/dashboard-navigation";

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
  schoolLogoUrl: string;
  schoolName: string;
  userDisplayName: string;
};

export function HeaderNavMenu({
  activeItem,
  onItemChange,
  onLogout,
  onPasswordChange,
  profileImageUrl,
  role,
  schoolLogoUrl,
  schoolName,
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
          <div className="mb-2 flex items-center gap-3 border-b border-border-subtle px-3 py-2.5">
            <SchoolLogo logoUrl={schoolLogoUrl} name={schoolName} size="small" />
            <span className="min-w-0 truncate text-sm font-medium text-text-control">
              {schoolName}
            </span>
          </div>
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
  role,
  schoolLogoUrl,
  schoolName,
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
            className={`flex h-[4.5rem] items-center gap-3 ${
              isExpanded ? "justify-between pl-7 pr-5" : "justify-center px-3"
            }`}
          >
            {isExpanded && (
              <div className="min-w-0">
                <AppBrand showNameOnMobile variant="wordmark" />
              </div>
            )}
            <button
              aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
              aria-controls="primary-navigation-links"
              aria-expanded={isExpanded}
              className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-text-muted transition-colors hover:bg-brand-soft hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              title={isExpanded ? "Collapse navigation" : "Expand navigation"}
              type="button"
            >
              {isExpanded ? (
                <ChevronLeftIcon className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" />
              ) : (
                <ChevronRightIcon className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              )}
            </button>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-3 pt-6"
            id="primary-navigation-links"
          >
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

          <div
            className={`flex shrink-0 items-center border-t border-border-subtle py-3 ${
              isExpanded ? "gap-3 px-5" : "justify-center px-2"
            }`}
            title={!isExpanded ? schoolName : undefined}
          >
            <SchoolLogo logoUrl={schoolLogoUrl} name={schoolName} size="small" />
            {isExpanded && (
              <span className="min-w-0 truncate text-sm font-medium text-text-control">
                {schoolName}
              </span>
            )}
          </div>
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
      <div className="space-y-1.5">
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
      className={`group mx-2 flex h-9 w-[calc(100%_-_1rem)] items-center rounded-md border border-transparent text-[0.72rem] font-light tracking-[0.012em] transition ${
        isActive
          ? "border-brand-soft-strong bg-brand-soft text-brand-ink shadow-sm"
          : "text-text-muted hover:bg-panel-soft hover:text-text-control"
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
      className={`group flex min-h-11 w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left text-sm font-light tracking-[0.01em] transition lg:min-h-0 lg:text-xs ${
        isActive
          ? "border-brand-soft-strong bg-brand-soft text-brand-ink"
          : "text-text-muted hover:bg-panel-soft hover:text-text-control"
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
      <div className="space-y-1.5">
        {section.items.map((item) => (
          <MenuItemButton
            isActive={activeItem === item}
            item={item}
            key={item}
            onItemChange={onItemChange}
          />
        ))}
      </div>
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
    <div
      className={`${hasTopBorder ? "mt-2 border-t border-border-subtle pt-2" : ""} space-y-1.5`}
    >
      <button
        className="flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-light tracking-[0.01em] text-text-muted transition hover:bg-surface-muted hover:text-text-control"
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
    </div>
  );
}

export function NavigationItemIcon({
  className,
  item,
}: {
  className?: string;
  item: NavigationItem;
}) {
  const iconClassName =
    className ??
    `h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transform-none ${getNavigationIconMotionClassName(item)}`;

  switch (item) {
    case "Dashboard":
      return <WalletIcon className={iconClassName} />;
    case "Credit Management":
      return <CoinStackIcon className={iconClassName} />;
    case "Reward Requests":
      return <ShoppingCartIcon className={iconClassName} />;
    case "Analytics":
      return <TrendingUpIcon className={iconClassName} />;
    case "Rewards":
      return <TrophyIcon className={iconClassName} />;
    case "Transaction Log":
    case "Transaction History":
      return <ListIcon className={iconClassName} />;
    case "Users":
      return <UserIcon className={iconClassName} />;
    case "Groups":
      return <UsersIcon className={iconClassName} />;
    case "Timetable":
      return <ClockIcon className={iconClassName} />;
    case "Audit Log":
      return <EyeIcon className={iconClassName} />;
    case "Error Log":
      return <AlertTriangleIcon className={iconClassName} />;
    case "Settings":
      return <CogIcon className={iconClassName} />;
    case "Preferences":
      return <SlidersHorizontalIcon className={iconClassName} />;
    default:
      return <ListIcon className={iconClassName} />;
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
