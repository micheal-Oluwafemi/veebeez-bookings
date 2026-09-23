import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ReactLenis from "lenis/react";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import FeedbackFab from "@/components/feedback/FeedbackFab";
import { BUSINESS, SITE_URL } from "@/lib/seo/constants";
import {
  BeautySalonJsonLd,
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "@/components/seo/JsonLd";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const viewport: Viewport = {
  themeColor: "#A57865",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Veebeez Salon Lekki | Hair, Braids, Nails & Wigs",
    template: "%s | Veebeez",
  },
  description:
    "Book hair, braids, nails, pedicure, lashes & wig styling at Veebeez — Fola Osibo Street, Lekki Phase 1, Lagos. Mon–Sat 9AM–7PM. Secure your spot in seconds.",
  keywords: [
    "Veebeez",
    "Valerie Brand",
    "hair salon Lekki",
    "braids Lekki",
    "wig installation Lagos",
    "wig styling Lekki",
    "nail art Lekki",
    "gel nails Lagos",
    "pedicure Lekki Phase 1",
    "Fola Osibo salon",
    "Admiralty Way salon",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: BUSINESS.legalName,
    title: "Veebeez Salon Lekki | Hair, Braids, Nails & Wigs",
    description:
      "Book hair, braids, nails, pedicure, lashes & wig services at Veebeez — Fola Osibo Street, Lekki Phase 1. Secure your spot in seconds.",
    images: [
      {
        url: "/og-img.jpg",
        width: 853,
        height: 1280,
        alt: "VALERIES HQ (Veebeez Salon) — Fola Osibo Street, Lekki Phase 1, Lagos — storefront with Welcome to Veebeez signage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veebeez Salon Lekki | Hair, Braids, Nails & Wigs",
    description: "Book hair, braids, nails, pedicure & wig services at Veebeez — Fola Osibo Street, Lekki.",
    images: ["/og-img.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    // add when available: google: "...", other: {...}
  },
  category: "Beauty Salon",
  other: {
    "geo.position": `${BUSINESS.geo.latitude};${BUSINESS.geo.longitude}`,
    "geo.placename": BUSINESS.address.formatted,
    "geo.region": "NG-LA",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang='en-NG'
      className={cn(
        "antialiased",
        plusJakartaSans.variable,
        "font-plus-jakarta-sans",
        inter.variable,
      )}>
      <head>
        {/* Preconnect for Contabo S3 + backend for faster LCP */}
        <link rel='preconnect' href='https://eu2.contabostorage.com' crossOrigin='anonymous' />
        <link rel='dns-prefetch' href='https://eu2.contabostorage.com' />
        <link rel='preconnect' href='https://backend.thevaleriebrand.co' crossOrigin='anonymous' />
      </head>
      <body className='min-h-screen bg-background text-foreground antialiased'>
        {/* Structured data for GEO/AIO — BeautySalon with verified address (FAQPage lives only on /faq) */}
        <BeautySalonJsonLd />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <ReactLenis
          root
          options={{
            lerp: 0.1,
            duration: 1.2,
            smoothWheel: true,
            gestureOrientation: "vertical",
          }}>
          <Providers>
            <Navbar />
            <main>{children}</main>
            <FeedbackFab />
          </Providers>
        </ReactLenis>
      </body>
    </html>
  );
}
