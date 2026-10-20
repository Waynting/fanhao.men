import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import "../globals.css";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SyncProvider } from "@/components/sync-provider";
import { routing } from "@/i18n/routing";
import { pageMetadata, SITE_NAME, titleSeparator } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    ...(await pageMetadata({})({ params })),
    title: { default: t("siteTitle"), template: `%s${titleSeparator(locale)}${SITE_NAME}` },
    keywords: t("keywords").split(","),
    appleWebApp: {
      capable: true,
      title: t("appleTitle"),
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Lets the pages under this layout render statically
  setRequestLocale(locale);
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" richColors />
          <ServiceWorkerRegister />
          <SyncProvider />
        </NextIntlClientProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
