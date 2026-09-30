export type AccentTheme =
  | "teal"
  | "blue"
  | "purple"
  | "orange"
  | "custom";

export type AccentThemeOption = {
  label: string;
  swatch: string;
  value: AccentTheme;
};

export const accentThemeStorageKey = "app-accent-theme";
export const customAccentColorStorageKey = "app-custom-accent-color";
export const defaultAccentTheme: AccentTheme = "teal";
export const defaultCustomAccentColor = "#7ae4b7";

export const accentThemeOptions: AccentThemeOption[] = [
  {
    label: "Teal",
    swatch: "#183f3d",
    value: "teal",
  },
  {
    label: "Blue",
    swatch: "#2563eb",
    value: "blue",
  },
  {
    label: "Purple",
    swatch: "#7c3aed",
    value: "purple",
  },
  {
    label: "Orange",
    swatch: "#c05f24",
    value: "orange",
  },
  {
    label: "Custom",
    swatch: defaultCustomAccentColor,
    value: "custom",
  },
];
