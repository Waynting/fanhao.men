import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AV Number Collector",
  description: "輕鬆管理你的番號收藏",
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
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
