// Verified via Google Maps + OSM Nominatim reverse (6.4424022,3.4676606)
// Google Maps: VALERIES HQ (VEEBEEZ SALON) https://www.google.com/maps/place/VALERIES+HQ+(VEEBEEZ+SALON)/@6.4424075,3.4650857,17z
// OSM: Fola Osibo Street, Maroko, Lekki Phase I, Eti Osa, Lagos, 101244, Nigeria
// Site's canonical string: "Dulux paints Admiralty-Lekki, Fola Osibo Road, Lagos, Nigeria" — normalized below

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://booking.thevaleriebrand.co";
export const SITE_NAME = "Veebeez — The Valerie Brand";

export const BUSINESS = {
  name: "VALERIES HQ (Veebeez Salon)",
  legalName: "The Valerie Brand",
  alternateName: "Veebeez",
  description:
    "Hair, braids, nails, pedicure, lashes & wig services at Lekki Phase 1, Lagos. Book your collection, stylist and time online — secure your spot in seconds.",
  // Canonical NAP — use everywhere to fix inconsistent "Dulux paints" vs "Fola Osibo"
  address: {
    streetAddress:
      "Dulux Paints Building, Fola Osibo Street, off Admiralty Way",
    addressLocality: "Lekki Phase I",
    addressRegion: "Lagos",
    postalCode: "101244",
    addressCountry: "NG",
    countryName: "Nigeria",
    // Display string used in UI + schema
    formatted:
      "Dulux Paints Building, Fola Osibo Street, off Admiralty Way, Lekki Phase I, Lagos 101244, Nigeria",
    short: "Fola Osibo Street, Lekki Phase I, Lagos",
  },
  geo: {
    latitude: 6.4424022,
    longitude: 3.4676606,
  },
  // From Google Maps place_id: ChIJ... (0x103bf44f838ea241:0x44ff549dead5226e)
  mapsUrl:
    "https://www.google.com/maps/place/VALERIES+HQ+(VEEBEEZ+SALON)/@6.4424075,3.4650857,17z/data=!3m1!4b1!4m6!3m5!1s0x103bf44f838ea241:0x44ff549dead5226e!8m2!3d6.4424022!4d3.4676606!16s%2Fg%2F11c6rjfwck",
  openingHours: ["Mo-Sa 09:00-19:00"] as const,
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "09:00",
      closes: "19:00",
    },
  ],
  telephone: "0806 894 2333",
  telephoneIntl: "+2348068942333",
  // WhatsApp link used in booking-confirmation
  whatsapp: "https://wa.me/2348068942333",
  priceRange: "₦₦",
  currenciesAccepted: "NGN",
  paymentAccepted: "Bank transfer, Card — no cash",
  url: SITE_URL,
  logo: `${SITE_URL}/imgs/logo.svg`,
  // OG image: user-provided storefront photo VALERIES HQ (853x1280, 139KB)
  image: `${SITE_URL}/og-img.jpg`,
  ogImage: {
    url: `${SITE_URL}/og-img.jpg`,
    width: 853,
    height: 1280,
    alt: "VALERIES HQ (Veebeez Salon) — Fola Osibo Street, Lekki Phase 1, Lagos — storefront",
  },
  sameAs: [
    "https://www.google.com/maps/place/VALERIES+HQ+(VEEBEEZ+SALON)/@6.4424075,3.4650857,17z",
  ],
  areaServed: {
    "@type": "City",
    name: "Lagos",
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  // For structured data keywords
  knowsAbout: [
    "Hair braiding",
    "Wig styling",
    "Wig installation",
    "Nail art",
    "Manicure",
    "Pedicure",
    "Gel nails",
    "Lash extensions",
  ],
} as const;
