/**
 * Booking-only FAQs — filtered from user-provided list.
 * Excluded: café (33-38), product/delivery/wholesale (retail).
 * Kept: 12 wig + nail/pedicure booking questions (21-32).
 * Each entry optimized for conversational/GEO queries.
 */
export interface FAQItem {
  question: string;
  answer: string;
  category: "wig" | "nails" | "pedicure";
  keywords: string[];
}

export const BOOKING_FAQS: FAQItem[] = [
  {
    question: "Can I bring my own wig for styling?",
    answer:
      "Yes. You can bring your own wig for selected services, including styling and customization at Veebeez, Lekki Phase 1. Simply select the relevant wig service when booking and bring your wig on the appointment day.",
    category: "wig",
    keywords: ["bring own wig", "wig styling Lekki", "wig customization Lagos"],
  },
  {
    question: "Do you customize wigs?",
    answer:
      "Yes. Depending on the wig, customization at Veebeez can include adjustments and styling to create a more natural, personalized finish — such as plucking, tinting the lace, cutting and styling to suit your face.",
    category: "wig",
    keywords: ["wig customization", "customize wig Lekki", "natural finish wig"],
  },
  {
    question: "Can you install my wig?",
    answer:
      "Yes. Our wig services in Lekki can include professional installation for a secure and polished look. Choose ‘Wig Installation’ when booking and our stylists will ensure a seamless, flat install.",
    category: "wig",
    keywords: ["wig installation", "install wig Lekki", "professional wig install Lagos"],
  },
  {
    question: "Can you wash and revive an old wig?",
    answer:
      "Yes, depending on its condition. We can assess your wig at our Fola Osibo Street salon and recommend suitable restoration — including washing, deep treatment, and restyling to revive an old or worn wig.",
    category: "wig",
    keywords: ["wash old wig", "revive wig", "wig restoration Lekki", "wig treatment Lagos"],
  },
  {
    question: "How do I choose the right wig?",
    answer:
      "Our team at Veebeez can help you select a wig based on your preferred style, length, texture, colour, and desired level of maintenance. Book a consultation or ask during your appointment — we stock guidance for different hair types and lifestyles.",
    category: "wig",
    keywords: ["choose right wig", "wig consultation Lekki", "wig texture length"],
  },
  {
    question: "Do you offer nail art?",
    answer:
      "Yes. You can request customized nail art and designs at Veebeez. More detailed designs may require additional time, so please mention your preferred design when booking so we can allocate enough time.",
    category: "nails",
    keywords: ["nail art Lekki", "custom nail designs Lagos", "nail art booking"],
  },
  {
    question: "Can I get a manicure and pedicure during the same visit?",
    answer:
      "Yes. You can combine manicure and pedicure services where scheduling allows at our Lekki salon. We recommend booking both in advance so enough time can be reserved in one visit.",
    category: "nails",
    keywords: ["manicure and pedicure", "combo nails Lekki", "book manicure pedicure together"],
  },
  {
    question: "Do you offer gel or long-lasting nail finishes?",
    answer:
      "Yes, selected long-lasting nail finishes including gel are available at Veebeez. Our nail professionals in Lekki can recommend the most suitable option for your nails and lifestyle.",
    category: "nails",
    keywords: ["gel nails Lekki", "long-lasting nail finish", "gel polish Lagos"],
  },
  {
    question: "Can I come with existing polish or extensions?",
    answer:
      "Yes, but removal may be required before your new service at Veebeez. Please mention existing polish or extensions when booking so the appropriate time can be allocated for safe removal.",
    category: "nails",
    keywords: ["nail polish removal", "extension removal Lekki", "come with existing nails"],
  },
  {
    question: "What does a pedicure include?",
    answer:
      "A pedicure at Veebeez typically includes nail grooming, shaping, cuticle care, exfoliation, and finishing. Specific treatments may vary depending on the pedicure package you select when booking.",
    category: "pedicure",
    keywords: ["what pedicure includes", "pedicure Lekki", "pedicure package Lagos"],
  },
  {
    question: "Can I book a pedicure without getting my nails done?",
    answer:
      "Absolutely. You can book a pedicure as a standalone service at Veebeez in Lekki Phase 1 — no need to book a manicure at the same time.",
    category: "pedicure",
    keywords: ["pedicure alone", "book pedicure without manicure", "standalone pedicure Lekki"],
  },
  {
    question: "How often should I get a pedicure?",
    answer:
      "This depends on your personal preference and foot-care needs. Many clients at Veebeez choose to schedule regular pedicure appointments every 3–4 weeks to maintain well-groomed feet.",
    category: "pedicure",
    keywords: ["how often pedicure", "pedicure frequency", "regular pedicure Lekki"],
  },
];

export const FAQ_CATEGORIES = {
  wig: "Wig Services — Styling, Customization & Installation",
  nails: "Nail Services — Art, Gel & Manicure",
  pedicure: "Pedicure Services — Care & Maintenance",
} as const;
