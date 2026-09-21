import { BUSINESS, SITE_URL } from "@/lib/seo/constants";
import { BOOKING_FAQS } from "@/data/faq-booking";

// Generic helper to render JSON-LD script
function Script({ data }: { data: unknown }) {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function BeautySalonJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": ["BeautySalon", "HairSalon", "NailSalon"],
    "@id": `${SITE_URL}/#beautysalon`,
    name: BUSINESS.name,
    alternateName: BUSINESS.alternateName,
    description: BUSINESS.description,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    telephone: (BUSINESS as unknown as { telephoneIntl: string }).telephoneIntl ?? BUSINESS.telephone,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: BUSINESS.currenciesAccepted,
    paymentAccepted: BUSINESS.paymentAccepted,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.streetAddress,
      addressLocality: BUSINESS.address.addressLocality,
      addressRegion: BUSINESS.address.addressRegion,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    hasMap: BUSINESS.mapsUrl,
    openingHoursSpecification: BUSINESS.openingHoursSpecification,
    openingHours: BUSINESS.openingHours,
    areaServed: BUSINESS.areaServed,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BUSINESS.rating.value,
      bestRating: BUSINESS.rating.bestRating,
      reviewCount: BUSINESS.rating.reviewCount,
    },
    sameAs: BUSINESS.sameAs,
    knowsAbout: [...BUSINESS.knowsAbout],
  };
  return <Script data={data} />;
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.alternateName,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    sameAs: BUSINESS.sameAs,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.streetAddress,
      addressLocality: BUSINESS.address.addressLocality,
      addressRegion: BUSINESS.address.addressRegion,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.addressCountry,
    },
  };
  return <Script data={data} />;
}

export function FAQJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: BOOKING_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
  return <Script data={data} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; item: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.item,
    })),
  };
  return <Script data={data} />;
}

export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.alternateName,
    description: BUSINESS.description,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-NG",
  };
  return <Script data={data} />;
}
