import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { appConfig } from "@/lib/app-config";
import {
  accentThemeStorageKey,
  customAccentColorStorageKey,
  defaultCustomAccentColor,
  defaultAccentTheme,
} from "@/lib/accent-theme-config";
import { themeStorageKey } from "@/lib/theme-config";
import "./globals.css";
import { SessionChecker } from "@/components/session-checker";

const lato = Lato({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["300", "400", "700", "900"],
});

const themeInitScript = `
(() => {
  try {
    const savedTheme = window.localStorage.getItem(${JSON.stringify(
      themeStorageKey,
    )});
    document.documentElement.dataset.theme =
      savedTheme === "dark" ? "dark" : "light";
    const savedAccent = window.localStorage.getItem(${JSON.stringify(
      accentThemeStorageKey,
    )});
    const savedCustomAccent = window.localStorage.getItem(${JSON.stringify(
      customAccentColorStorageKey,
    )});
    const customAccent =
      /^#[0-9a-f]{6}$/i.test(savedCustomAccent || "")
        ? savedCustomAccent
        : ${JSON.stringify(defaultCustomAccentColor)};
    document.documentElement.dataset.accent =
      ["teal", "blue", "purple", "orange", "custom"].includes(savedAccent)
        ? savedAccent
        : ${JSON.stringify(defaultAccentTheme)};
    document.documentElement.style.setProperty(
      "--custom-accent-primary",
      customAccent
    );
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.accent = ${JSON.stringify(
      defaultAccentTheme,
    )};
    document.documentElement.style.setProperty(
      "--custom-accent-primary",
      ${JSON.stringify(defaultCustomAccentColor)}
    );
  }
})();
`;

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  icons: {
    apple: "/brand/myntix-stacked-coins.png",
    icon: "/brand/myntix-stacked-coins.png",
  },
  robots: {
    follow: false,
    googleBot: {
      follow: false,
      index: false,
    },
    index: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${lato.variable} min-h-full flex flex-col`}>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-brand"
          href="#main-content"
        >
          Skip to main content
        </a>
        <SessionChecker />
        {children}
      </body>
    </html>
  );
}
