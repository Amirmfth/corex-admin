import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

import { routing, AppLocale } from "../../i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_LOCALE = routing.defaultLocale as AppLocale;

function resolveLocale(candidate: string | null): AppLocale {
  if (!candidate) {
    return DEFAULT_LOCALE;
  }

  return (routing.locales as readonly string[]).includes(candidate)
    ? (candidate as AppLocale)
    : DEFAULT_LOCALE;
}

export const metadata: Metadata = {
  title: "Corex Admin",
  description: "Inventory and sales console",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-next-intl-locale"));
  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--surface)] text-[var(--foreground)]`}
      >
        {children}
      </body>
    </html>
  );
}
