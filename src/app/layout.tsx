import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { appConfig } from "@/lib/config/app-config";
import "./globals.css";
import { SessionChecker } from "@/components/auth/session-checker";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700", "800"],
});

const themeInitScript = `
(() => {
  document.documentElement.dataset.theme = "light";
  document.documentElement.dataset.accent = "teal";
  document.documentElement.dataset.walletStyle = "classic";
  document.documentElement.dataset.walletPattern = "none";
  document.documentElement.dataset.dashboardTheme = "clean";
  document.documentElement.dataset.tableDensity = "default";
  document.documentElement.style.setProperty("--custom-accent-primary", "#7ae4b7");
})();
`;

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  icons: {
    apple: "/brand/myntix-favicon.png",
    icon: "/brand/myntix-favicon.png",
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
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
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
