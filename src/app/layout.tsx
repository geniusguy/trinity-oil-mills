import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Great_Vibes } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: 'swap',
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3001'),
  title: "Trinity Oil Mills - Premium Cold-Pressed Oils | Nature • Pure • Best",
  description: "Premium quality cold-pressed oils from Trinity Oil Mills. Discover our range of natural oils: Gingelly, Groundnut, Coconut, Deepam, and Castor oils. Serving quality since 2014.",
  keywords: "cold pressed oil, gingelly oil, groundnut oil, coconut oil, deepam oil, castor oil, natural oil, healthy cooking oil, Tamil Nadu, Chennai",
  authors: [{ name: "Trinity Oil Mills" }],
  icons: {
    icon: [
      { url: '/Trinity-Oil-favicon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/Trinity-Oil-favicon-152x152.png', sizes: '32x32', type: 'image/png' },
      { url: '/Trinity-Oil-favicon-152x152.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/Trinity-Oil-favicon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/Trinity-Oil-favicon-152x152.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/Trinity-Oil-favicon-152x152.png',
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/Trinity-Oil-favicon-152x152.png',
      },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: "Trinity Oil Mills - Premium Cold-Pressed Oils",
    description: "Premium quality cold-pressed oils from Trinity Oil Mills. Nature • Pure • Best",
    images: ['/TrinityOil.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${montserrat.variable} ${greatVibes.variable} antialiased`}
      >
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
