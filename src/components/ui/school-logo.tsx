import { appConfig } from "@/lib/config/app-config";

type SchoolLogoSize = "small" | "medium" | "large";

type SchoolLogoProps = {
  logoUrl: string;
  name: string;
  size?: SchoolLogoSize;
};

const sizeClassNames: Record<SchoolLogoSize, string> = {
  large: "h-16 w-16",
  medium: "h-12 w-12",
  small: "h-8 w-8",
};

export function SchoolLogo({
  logoUrl,
  name,
  size = "medium",
}: SchoolLogoProps) {
  const sizeClassName = sizeClassNames[size];

  if (logoUrl) {
    return (
      <div
        aria-label={`${name} logo`}
        className={`${sizeClassName} shrink-0 bg-contain bg-center bg-no-repeat`}
        role="img"
        style={{ backgroundImage: `url("${logoUrl}")` }}
      />
    );
  }

  return (
    <div
      aria-label={`${name} initials`}
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-md border border-border-subtle bg-panel-soft text-sm font-bold text-text-control`}
      role="img"
    >
      {getInitials(name)}
    </div>
  );
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || appConfig.initials;
}
