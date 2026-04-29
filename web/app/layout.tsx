import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";

// Variable Fraunces — full variable font with optical-size + soft axes.
// We control weight/style at the CSS layer via font-variation-settings.
const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.SCRAPE_PUBLIC_URL || "http://localhost:3000";
const DESCRIPTION =
  "Production-grade web scraping infrastructure. Tiered escalation through anti-bot, residential proxies, CAPTCHA, and AI extraction.";

export const metadata: Metadata = {
  title: { default: "Scrape — The Web, Excavated.", template: "%s · Scrape" },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: "Scrape",
  keywords: ["web scraping", "anti-bot bypass", "Cloudflare", "DataDome", "residential proxy", "CAPTCHA solver", "Camoufox", "curl_cffi", "data extraction"],
  openGraph: {
    title: "Scrape — The Web, Excavated.",
    description: "Strip the surface. Read the strata. Extract the signal.",
    siteName: "Scrape",
    type: "website",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Scrape — The Web, Excavated.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scrape — The Web, Excavated.",
    images: ["/opengraph-image"],
  },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg text-fg font-mono antialiased selection:bg-rust selection:text-paper">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
