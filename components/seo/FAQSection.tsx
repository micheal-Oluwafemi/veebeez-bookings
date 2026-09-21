"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKING_FAQS, FAQ_CATEGORIES, type FAQItem } from "@/data/faq-booking";
import { BUSINESS } from "@/lib/seo/constants";

function groupByCategory(items: FAQItem[]) {
  const groups: Record<string, FAQItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export default function FAQSection() {
  const grouped = groupByCategory(BOOKING_FAQS);
  const [openKey, setOpenKey] = useState<string | null>(
    BOOKING_FAQS[0]?.question ?? null,
  );

  return (
    <section
      id='faq'
      aria-labelledby='faq-heading'
      className='bg-[#FAF7F3] border-t  border-[#EDE3D3] py-12 md:py-16'>
      <div className='block-spacing'>
        <div className='max-w-3xl'>
          <h2
            id='faq-heading'
            className='mt-2 font-cooper text-[22px] md:text-[36px] leading-[1.05] text-[#1a1510]'>
            Booking FAQs
          </h2>
          <div className='mt-4 max-w-2xl rounded-2xl border border-[#EDE3D3] bg-white p-4 shadow-sm shadow-black/[0.03]'>
            <p className='font-plus-jakarta-sans text-[15px] leading-relaxed text-[#483630]'>
              Answers to the most common booking questions for our hair, wig and
              nail services in Lekki. Can’t find what you need? We’re here to
              help.
            </p>
            <div className='mt-3 grid gap-2 sm:grid-cols-2'>
              <a
                href={BUSINESS.whatsapp}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex items-center gap-2.5 rounded-xl border border-[#25D366]/20 bg-[#F0FDF4] px-3.5 py-3 font-plus-jakarta-sans text-sm font-semibold text-[#128C7E] transition hover:border-[#25D366]/30 hover:bg-[#DCFCE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30'>
                <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5'>
                  <MessageCircle size={14} className='text-[#25D366]' />
                </span>
                Chat on WhatsApp
                <span
                  className='ml-auto text-[#128C7E]/40 transition group-hover:text-[#128C7E]'
                  aria-hidden='true'>
                  ↗
                </span>
              </a>
              <a
                href={BUSINESS.mapsUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex items-center gap-2.5 rounded-xl border border-[#EDE3D3] bg-[#FAF7F3] px-3.5 py-3 font-plus-jakarta-sans text-sm font-medium text-[#3A2A22] transition hover:border-[#A57865]/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/30'>
                <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5'>
                  <MapPin size={14} className='text-[#A57865]' />
                </span>
                <span className='truncate'>{BUSINESS.address.short}</span>
                <span
                  className='ml-auto shrink-0 text-[#8a6a5a]/40 transition group-hover:text-[#A57865]'
                  aria-hidden='true'>
                  ↗
                </span>
              </a>
            </div>
            <div className='mt-3 flex flex-wrap items-center gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-[#EDE3D3] bg-[#FAF7F3] px-2.5 py-1 font-plus-jakarta-sans text-xs font-medium text-[#483630]'>
                <Clock3 size={12} className='shrink-0 text-[#A57865]' />
                {BUSINESS.openingHours.join(" · ")}
              </span>
              <a
                href={`tel:${(BUSINESS as unknown as { telephoneIntl: string }).telephoneIntl ?? BUSINESS.telephone.replace(/[^+\\d]/g, "")}`}
                className='inline-flex items-center gap-1.5 rounded-full border border-[#EDE3D3] bg-white px-2.5 py-1 font-plus-jakarta-sans text-xs font-medium text-[#3A2A22] transition hover:border-[#A57865]/30 hover:bg-[#FAF7F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/30'>
                <Phone size={12} className='shrink-0 text-[#A57865]' />
                {BUSINESS.telephone}
              </a>
            </div>
            <p className='mt-3 font-plus-jakarta-sans text-xs leading-relaxed text-[#8a6a5a]'>
              Prefer to visit?{" "}
              <a
                href={BUSINESS.mapsUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='font-medium text-[#3A2A22] underline decoration-[#EDE3D3] underline-offset-2 transition hover:decoration-[#A57865] hover:text-[#A57865]'>
                {BUSINESS.address.formatted}
              </a>
            </p>
          </div>
        </div>

        <div className='mt-10 space-y-10'>
          {(["wig", "nails", "pedicure"] as const).map((cat) => {
            const items = grouped[cat] ?? [];
            if (!items.length) return null;
            return (
              <div key={cat}>
                <h3 className='font-plus-jakarta-sans text-xs font-semibold tracking-[0.1em] uppercase text-[#483630]'>
                  {FAQ_CATEGORIES[cat]}
                </h3>
                <div className='mt-4 divide-y divide-[#EDE3D3] overflow-hidden rounded-2xl border border-[#EDE3D3] bg-white'>
                  {items.map((item) => {
                    const isOpen = openKey === item.question;
                    const key = item.question;
                    return (
                      <div key={key} className='bg-white'>
                        <button
                          type='button'
                          onClick={() => setOpenKey(isOpen ? null : key)}
                          aria-expanded={isOpen}
                          className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#FDF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/30'>
                          <span className='font-plus-jakarta-sans text-[15px] font-medium leading-snug text-[#1a1510]'>
                            {item.question}
                          </span>
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full border border-[#EDE3D3] bg-[#FAF7F3] transition-transform duration-200",
                              isOpen &&
                                "rotate-180 bg-[#A57865] border-[#A57865] text-white",
                            )}
                            aria-hidden='true'>
                            <ChevronDown
                              size={14}
                              className={
                                isOpen ? "text-white" : "text-[#A57865]"
                              }
                            />
                          </span>
                        </button>
                        <div
                          className={cn(
                            "grid transition-all duration-300 ease-out",
                            isOpen
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0",
                          )}
                          aria-hidden={!isOpen}>
                          <div className='overflow-hidden'>
                            <p className='px-5 pb-5 font-plus-jakarta-sans text-[14px] leading-relaxed text-[#483630]'>
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className='mt-8 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
          NAP: {BUSINESS.name} · {BUSINESS.address.formatted} ·{" "}
          <a
            href={BUSINESS.mapsUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='underline'>
            View on Google Maps
          </a>{" "}
          · Geo: {BUSINESS.geo.latitude}, {BUSINESS.geo.longitude}
        </p>
      </div>
    </section>
  );
}
