import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n, getLocale } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [{ t }, theme] = await Promise.all([getI18n(), getTheme()]);
  return {
    title: "OfficeCare",
    description: `${t("app.tagline1")} ${t("app.tagline2")}`,
    applicationName: "OfficeCare",
    appleWebApp: {
      capable: true,
      title: "OfficeCare",
      statusBarStyle: theme === "dark" ? "black-translucent" : "default",
    },
    formatDetection: { telephone: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    themeColor: theme === "dark" ? "#101614" : "#267549",
    colorScheme: theme,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html lang={locale} data-theme={theme} className="h-full antialiased">
      <body className="min-h-full">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
