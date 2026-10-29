"use client";

import { memo, useState } from "react";

type UserAvatarProps = {
  displayName: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  tone?: "brand" | "neutral";
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export const UserAvatar = memo(function UserAvatar({
  displayName,
  imageUrl,
  size = "md",
  tone = "brand",
}: UserAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const cleanedImageUrl = imageUrl?.trim();
  const shouldShowImage = Boolean(cleanedImageUrl && failedImageUrl !== cleanedImageUrl);
  const toneClassName =
    tone === "neutral"
      ? "bg-panel-soft text-text-control"
      : "bg-brand-soft text-brand";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${toneClassName} ${sizeClasses[size]}`}
      title={displayName}
    >
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- User-uploaded avatar sources are runtime data, not fixed build assets.
        <img
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          onError={() => setFailedImageUrl(cleanedImageUrl ?? null)}
          src={cleanedImageUrl}
        />
      ) : (
        getInitials(displayName)
      )}
    </span>
  );
});

function getInitials(displayName: string) {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0])
    .join("");

  return initials.toUpperCase() || "?";
}
