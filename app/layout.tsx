import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SyncProvider } from "@/components/sync-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AV Number Collector",
  description: "輕鬆管理你的番號收藏",
  appleWebApp: {
    capable: true,
    title: "番號收藏",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="zh-Hant">
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" richColors />
        <ServiceWorkerRegister />
        <SyncProvider />
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
