import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n, getLocale } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: "OfficeCare",
    description: `${t("app.tagline1")} ${t("app.tagline2")}`,
    applicationName: "OfficeCare",
    appleWebApp: {
      capable: true,
      title: "OfficeCare",
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#267549",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
