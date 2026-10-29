"use client";

import type { SessionUser } from "@/lib/auth/session";
import {
  avatarOptions,
  hasSchoolProfilePhoto,
} from "@/lib/theme/avatar-config";
import { PreferencesSection } from "@/components/preferences/preferences-section";
import { useUserPreferences } from "@/components/preferences/user-preferences-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserIcon } from "@/components/ui/icons";

export function AvatarPreferences({ user }: { user: SessionUser }) {
  const { preferences, updatePreferences } = useUserPreferences();
  const hasPhoto = hasSchoolProfilePhoto(user.profileImageUrl);

  return (
    <PreferencesSection
      title="Profile avatar"
      icon={<UserIcon />}
      description={
        hasPhoto
          ? "Your school photo takes priority. Your avatar is used when no school photo is set."
          : "Choose an avatar or keep your initials. No photo or upload needed."
      }
    >
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        role="group"
        aria-label="Profile avatar"
      >
        {avatarOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preferences.avatar === option.value}
            aria-label={`Use ${option.label.toLowerCase()} avatar`}
            className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-md border p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              preferences.avatar === option.value
                ? "border-brand bg-brand-soft ring-1 ring-brand"
                : "border-border-subtle bg-surface hover:border-border-strong hover:bg-panel-soft"
            }`}
            onClick={() => updatePreferences({ avatar: option.value })}
          >
            <UserAvatar
              displayName={user.displayName}
              imageUrl={option.imageUrl}
              size="lg"
            />
            <span className="text-xs font-medium text-text-control">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </PreferencesSection>
  );
}
