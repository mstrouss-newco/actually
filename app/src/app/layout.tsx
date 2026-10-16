import { Analytics } from "@vercel/analytics/next";
import { AutoUpdate } from "@/lib/auto-update";
import { ErrorReporter } from "@/lib/errors";
import { AutoSync } from "@/lib/auto-sync";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], weight: ["300", "400", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Actually",
  description: "Your order emails, sorted out. Connect Gmail and every order becomes your closet, with returns, points, resale and what your friends love.",
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
          <ErrorReporter />
          <AutoSync />
          <Analytics />
        </div>
      </body>
    </html>
  );
}
