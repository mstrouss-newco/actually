import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Actually",
  description: "All your orders in one place.",
};

export const viewport: Viewport = { themeColor: "#EDEAE6", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <div className="stage">
          <div className="phone">{children}</div>
        </div>
      </body>
    </html>
  );
}
