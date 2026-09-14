"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  defaultCustomAccentColor,
  type AccentTheme,
  type AccentThemeOption,
} from "@/lib/accent-theme-config";
import type { Role } from "@/lib/session";
import { isAdmin, isStudent } from "@/lib/permissions";
import { useAccentTheme } from "@/lib/use-accent-theme";
import { useThemeMode } from "@/lib/use-theme-mode";
import { useWalletStyle } from "@/lib/use-wallet-style";
import {
  AlertTriangleIcon,
  ClockIcon,
  CogIcon,
  EyeIcon,
  ListIcon,
  LogOutIcon,
  MoonIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SunIcon,
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
  "Settings",
] as const;
const studentNavigationItems = ["Dashboard", "Rewards"] as const;
const adminNavigationItems = [
  "Dashboard",
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

export type NavigationItem = (typeof adminNavigationItems)[number];

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
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();
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
            accentTheme={accentTheme}
            accentThemeOptions={accentThemeOptions}
            customAccentColor={customAccentColor}
            hasTopBorder
            isDarkMode={isDarkMode}
            onAccentThemeChange={setAccentTheme}
            onCustomAccentColorChange={setCustomAccentColor}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onThemeToggle={toggleThemeMode}
            showWalletStyles={role === "student"}
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

  const widthClassName = isExpanded ? "w-56" : "w-14";

  return (
    <>
      <div
        aria-hidden="true"
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${widthClassName}`}
      />
      <nav
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-[90] hidden h-dvh shrink-0 transition-[width] duration-200 lg:block ${widthClassName}`}
      >
        <div className="flex h-full flex-col border-r border-border-subtle bg-surface">
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
            onLogout={onLogout}
            onPasswordChange={onPasswordChange}
            profileImageUrl={profileImageUrl}
            role={role}
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
  onLogout,
  onPasswordChange,
  profileImageUrl,
  role,
  userDisplayName,
}: Pick<
  HeaderNavMenuProps,
  | "onLogout"
  | "onPasswordChange"
  | "profileImageUrl"
  | "role"
  | "userDisplayName"
> & {
  isExpanded: boolean;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();

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
            accentTheme={accentTheme}
            accentThemeOptions={accentThemeOptions}
            customAccentColor={customAccentColor}
            hasTopBorder={false}
            isDarkMode={isDarkMode}
            onAccentThemeChange={setAccentTheme}
            onCustomAccentColorChange={setCustomAccentColor}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onThemeToggle={toggleThemeMode}
            showWalletStyles={role === "student"}
          />
        </NavMenuPanel>
      )}
    </div>
  );
}

export function DesktopAccountMenu({
  onLogout,
  onPasswordChange,
  profileImageUrl,
  userDisplayName,
}: Pick<
  HeaderNavMenuProps,
  | "onLogout"
  | "onPasswordChange"
  | "profileImageUrl"
  | "userDisplayName"
>) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();

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
            accentTheme={accentTheme}
            accentThemeOptions={accentThemeOptions}
            customAccentColor={customAccentColor}
            hasTopBorder={false}
            isDarkMode={isDarkMode}
            onAccentThemeChange={setAccentTheme}
            onCustomAccentColorChange={setCustomAccentColor}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onThemeToggle={toggleThemeMode}
            showWalletStyles={false}
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
      className={`flex h-9 w-full items-center text-[0.72rem] font-light tracking-[0.012em] transition ${
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
      className={`flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-light tracking-[0.01em] transition lg:min-h-0 lg:text-xs ${
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
  accentTheme,
  accentThemeOptions,
  customAccentColor,
  hasTopBorder,
  isDarkMode,
  onAccentThemeChange,
  onCustomAccentColorChange,
  onLogout,
  onPasswordChange,
  onThemeToggle,
  showWalletStyles,
}: {
  accentTheme: AccentTheme;
  accentThemeOptions: AccentThemeOption[];
  customAccentColor: string;
  hasTopBorder: boolean;
  isDarkMode: boolean;
  onAccentThemeChange: (accentTheme: AccentTheme) => void;
  onCustomAccentColorChange: (customAccentColor: string) => void;
  onLogout: () => void;
  onPasswordChange: () => void;
  onThemeToggle: () => void;
  showWalletStyles: boolean;
}) {
  const colorInputValue = getColorInputValue(customAccentColor);
  const [isCustomColorPickerOpen, setIsCustomColorPickerOpen] =
    useState(false);

  function handleAccentThemeChange(nextAccentTheme: AccentTheme) {
    if (nextAccentTheme === "custom") {
      setIsCustomColorPickerOpen((currentValue) => !currentValue);
      onAccentThemeChange("custom");
      return;
    }

    setIsCustomColorPickerOpen(false);
    onAccentThemeChange(nextAccentTheme);
  }

  function handleCustomAccentColorChange(nextCustomAccentColor: string) {
    onCustomAccentColorChange(nextCustomAccentColor);
  }

  return (
    <>
      <button
        className={`flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-light tracking-[0.01em] text-text-muted transition hover:bg-surface-muted hover:text-text-control ${
          hasTopBorder ? "mt-2 border-t border-border-subtle" : ""
        }`}
        onClick={onThemeToggle}
        type="button"
      >
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
        <span className="min-w-0 flex-1">Dark theme</span>
        <span
          aria-hidden="true"
          className={`relative h-5 w-9 shrink-0 rounded-full transition ${
            isDarkMode ? "bg-brand" : "bg-border-strong"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
              isDarkMode ? "left-4" : "left-0.5"
            }`}
          />
        </span>
      </button>
      <div className="px-3 py-3">
        <p className="text-xs font-light uppercase tracking-[0.14em] text-text-kicker">
          Accent
        </p>
        <div className="mt-3 flex items-center gap-2">
          {accentThemeOptions.map((option) => (
            <div className="relative" key={option.value}>
              <button
                aria-expanded={
                  option.value === "custom"
                    ? isCustomColorPickerOpen
                    : undefined
                }
                aria-label={`${option.label} accent`}
                aria-pressed={accentTheme === option.value}
                className={`h-7 w-7 rounded-full border transition ${
                  accentTheme === option.value
                    ? "border-foreground ring-2 ring-brand-soft-strong"
                    : "border-border-subtle hover:scale-105"
                }`}
                onClick={() => handleAccentThemeChange(option.value)}
                style={{
                  background:
                    option.value === "custom"
                      ? "conic-gradient(from 45deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)"
                      : option.swatch,
                }}
                title={option.label}
                type="button"
              />
              {option.value === "custom" && isCustomColorPickerOpen && (
                <div className="motion-pop absolute right-0 top-9 z-[120] w-44 border border-border bg-surface p-3 shadow-lg">
                  <label className="block text-xs font-light text-text-muted">
                    Custom colour
                    <input
                      aria-label="Custom accent colour"
                      className="color-swatch-input mt-2 h-9 w-full cursor-pointer rounded-md border border-border bg-transparent p-0"
                      onChange={(event) =>
                        handleCustomAccentColorChange(event.target.value)
                      }
                      type="color"
                      value={colorInputValue}
                    />
                  </label>
                  <input
                    aria-label="Custom accent hex"
                    className="mt-2 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-xs font-light uppercase text-text-control outline-none ring-brand transition placeholder:text-text-muted focus:border-brand focus:ring-2"
                    maxLength={7}
                    onChange={(event) =>
                      handleCustomAccentColorChange(event.target.value)
                    }
                    placeholder="#7AE4B7"
                    value={customAccentColor}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {showWalletStyles && <WalletStylePicker />}
      <button
        className="block w-full border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-light tracking-[0.01em] text-text-muted transition hover:bg-surface-muted hover:text-text-control"
        onClick={onPasswordChange}
        type="button"
      >
        Change password
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

function WalletStylePicker() {
  const {
    setWalletPattern,
    setWalletStyle,
    walletPattern,
    walletPatternOptions,
    walletStyle,
    walletStyleOptions,
  } = useWalletStyle();

  return (
    <div className="border-t border-border-subtle px-3 py-3">
      <p className="text-xs font-light uppercase tracking-[0.14em] text-text-kicker">
        Wallet
      </p>
      <div className="mt-3 flex items-center gap-2">
        {walletStyleOptions.map((option) => (
          <button
            aria-label={`${option.label} wallet`}
            aria-pressed={walletStyle === option.value}
            className={`h-7 w-11 rounded-md border transition ${
              walletStyle === option.value
                ? "border-foreground ring-2 ring-brand-soft-strong"
                : "border-border-subtle hover:scale-105"
            }`}
            key={option.value}
            onClick={() => setWalletStyle(option.value)}
            style={{ background: option.preview }}
            title={option.label}
            type="button"
          />
        ))}
      </div>
      <p className="mt-4 text-xs font-light uppercase tracking-[0.14em] text-text-kicker">
        Pattern
      </p>
      <div className="mt-3 flex items-center gap-2">
        {walletPatternOptions.map((option) => (
          <button
            aria-label={`${option.label} wallet pattern`}
            aria-pressed={walletPattern === option.value}
            className={`h-7 w-9 rounded-md border bg-brand bg-[length:8px_8px] transition ${
              walletPattern === option.value
                ? "border-foreground ring-2 ring-brand-soft-strong"
                : "border-border-subtle hover:scale-105"
            }`}
            key={option.value}
            onClick={() => setWalletPattern(option.value)}
            style={{ backgroundImage: option.preview }}
            title={option.label}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

function getColorInputValue(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  return defaultCustomAccentColor;
}

function NavigationItemIcon({ item }: { item: NavigationItem }) {
  const className = "h-3.5 w-3.5 shrink-0";

  switch (item) {
    case "Dashboard":
      return <WalletIcon className={className} />;
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
    default:
      return <ListIcon className={className} />;
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
