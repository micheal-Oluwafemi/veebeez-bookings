import type { Metadata } from "next";
import { BUSINESS, SITE_URL } from "@/lib/seo/constants";
import FAQSection from "@/components/seo/FAQSection";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Booking FAQs — Wig, Nails & Pedicure | Veebeez — Fola Osibo, Lekki",
  description:
    "12 booking FAQs for Veebeez (VALERIES HQ) in Lekki Phase 1 — bring your own wig, customization, installation, wash & revive, nail art, gel nails, pedicure & more. Open Mon–Sat 9AM–7PM at Fola Osibo Street, Lagos.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: "Veebeez Booking FAQs — Lekki Phase 1, Lagos",
    description: "Wig styling, installation, nail art, gel & pedicure FAQs at Veebeez — Fola Osibo Street, Lekki.",
    url: `${SITE_URL}/faq`,
    type: "website",
  },
};

export default function FAQPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", item: SITE_URL },
          { name: "Booking", item: `${SITE_URL}/` },
          { name: "FAQs", item: `${SITE_URL}/faq` },
        ]}
      />
      <FAQJsonLd />
      {/* SEO: H1 for FAQ page */}
      <div className='sr-only'>
        <h1>Veebeez Booking FAQs — VALERIES HQ, Fola Osibo Street, Lekki Phase 1, Lagos</h1>
        <p>
          {BUSINESS.address.formatted} — Geo {BUSINESS.geo.latitude},{BUSINESS.geo.longitude} — Maps: {BUSINESS.mapsUrl}
        </p>
      </div>
      <FAQSection />
    </>
  );
}
