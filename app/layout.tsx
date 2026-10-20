import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// The real root layout (<html>, providers) is app/[locale]/layout.tsx, so it can set lang per
// locale. This one only exists for the routes outside [locale]: icons, OG image, manifest, robots.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  category: "utilities",
  // Codes like FC2-PPV-1234567 must not turn into phone links on iOS
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  colorScheme: "light",
  // Lets env(safe-area-inset-*) work, which black-translucent needs in standalone mode
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
