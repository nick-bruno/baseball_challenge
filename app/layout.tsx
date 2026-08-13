import type { Metadata, Viewport } from "next";
import { Rye, Oswald } from "next/font/google";
import "./globals.css";

const rye = Rye({
  variable: "--font-rye",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The 9-9-9 Challenge",
  description:
    "Nine beers, nine hot dogs, nine innings. Track the carnage live with your section.",
};

export const viewport: Viewport = {
  themeColor: "#0f2a1d",
  // The counters are giant on purpose; don't let a double-tap zoom the page.
  maximumScale: 1,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rye.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
