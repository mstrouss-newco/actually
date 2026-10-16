import { Analytics } from "@vercel/analytics/next";
import { AutoUpdate } from "@/lib/auto-update";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Actually",
  description: "All your orders in one place.",
  // Opened from the Home Screen, it runs full screen without Safari's bars.
  appleWebApp: { capable: true, title: "Actually", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#EDEAE6", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <div className="stage">
          <div className="phone">{children}</div>
          <AutoUpdate />
          <Analytics />
        </div>
      </body>
    </html>
  );
}
