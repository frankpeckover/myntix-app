import {
  accentThemeOptions,
  defaultAccentTheme,
  defaultCustomAccentColor,
  type AccentTheme,
} from "@/lib/theme/accent-theme-config";

const darkTextColor = "#111827";
const lightTextColor = "#ffffff";
const darkThemeAccentWeight = 0.72;
const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function syncBrandForeground() {
  const root = document.documentElement;
  const accentTheme = getAccentTheme(root.dataset.accent);
  const customAccentColor = getCustomAccentColor(root);
  const accentColor = getAccentColor(accentTheme, customAccentColor);
  const isDarkMode = root.dataset.theme === "dark";
  const brandColor = isDarkMode
    ? mixHexColors(accentColor, lightTextColor, darkThemeAccentWeight)
    : accentColor;

  root.style.setProperty(
    "--brand-foreground",
    getMostReadableTextColor(brandColor),
  );
}

function getAccentTheme(value: string | undefined): AccentTheme {
  return (
    accentThemeOptions.find((option) => option.value === value)?.value ??
    defaultAccentTheme
  );
}

function getCustomAccentColor(root: HTMLElement) {
  const customAccentColor = root.style
    .getPropertyValue("--custom-accent-primary")
    .trim();

  return hexColorPattern.test(customAccentColor)
    ? customAccentColor
    : defaultCustomAccentColor;
}

function getAccentColor(
  accentTheme: AccentTheme,
  customAccentColor: string,
) {
  if (accentTheme === "custom") {
    return customAccentColor;
  }

  return accentThemeOptions.find((option) => option.value === accentTheme)!
    .swatch;
}

function getMostReadableTextColor(backgroundColor: string) {
  return getContrastRatio(backgroundColor, lightTextColor) >=
    getContrastRatio(backgroundColor, darkTextColor)
    ? lightTextColor
    : darkTextColor;
}

function getContrastRatio(firstColor: string, secondColor: string) {
  const firstLuminance = getRelativeLuminance(firstColor);
  const secondLuminance = getRelativeLuminance(secondColor);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: string) {
  const { blue, green, red } = parseHexColor(color);
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map(
    toLinearColorChannel,
  );

  return (
    0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue
  );
}

function toLinearColorChannel(channel: number) {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function mixHexColors(firstColor: string, secondColor: string, firstWeight: number) {
  const first = parseHexColor(firstColor);
  const second = parseHexColor(secondColor);
  const secondWeight = 1 - firstWeight;

  return toHexColor({
    blue: first.blue * firstWeight + second.blue * secondWeight,
    green: first.green * firstWeight + second.green * secondWeight,
    red: first.red * firstWeight + second.red * secondWeight,
  });
}

function parseHexColor(color: string) {
  return {
    blue: Number.parseInt(color.slice(5, 7), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    red: Number.parseInt(color.slice(1, 3), 16),
  };
}

function toHexColor({
  blue,
  green,
  red,
}: {
  blue: number;
  green: number;
  red: number;
}) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}
