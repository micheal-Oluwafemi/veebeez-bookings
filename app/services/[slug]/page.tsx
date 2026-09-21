import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BUSINESS, SITE_URL } from "@/lib/seo/constants";
import { fetchAllServiceSlugs, fetchServiceBySlug } from "@/lib/seo/fetchers";
import { formatCurrency, formatDuration } from "@/lib/booking/format";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await fetchAllServiceSlugs();
    // limit to 50 during build to avoid hitting API too hard; ISR will fill rest
    return slugs.slice(0, 50).map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const svc = await fetchServiceBySlug(slug);
  if (!svc) return { title: "Service not found | Veebeez" };
  const title = svc.meta_title ?? `${svc.name} in Lekki — Price, Duration & Booking | Veebeez`;
  const rawDesc =
    svc.meta_description ??
    svc.description ??
    `Book ${svc.name} at Veebeez (VALERIES HQ), Fola Osibo Street, Lekki. ${formatDuration(svc.duration_minutes)} · ${formatCurrency(Number(svc.price))} ${svc.currency}. Mon–Sat 9AM–7PM. Reserve online.`;
  const description = rawDesc.slice(0, 160);
  const url = `${SITE_URL}/services/${svc.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BUSINESS.legalName,
      locale: "en_NG",
      type: "website",
    },
    twitter: { card: "summary", title, description },
    keywords: [svc.name, `${svc.name} Lekki`, `${svc.name} Lagos`, "Veebeez", svc.collection_slug, svc.category_slug],
  };
}

function toJsonLd(svc: NonNullable<Awaited<ReturnType<typeof fetchServiceBySlug>>>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/#services` },
          svc.collection_slug
            ? {
                "@type": "ListItem",
                position: 3,
                name: svc.collection_slug,
                item: `${SITE_URL}/collections/${svc.collection_slug}`,
              }
            : null,
          { "@type": "ListItem", position: 4, name: svc.name, item: `${SITE_URL}/services/${svc.slug}` },
        ].filter(Boolean),
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/services/${svc.slug}#service`,
        name: svc.name,
        description: svc.description ?? `Professional ${svc.name.toLowerCase()} service at Veebeez, Lekki.`,
        url: `${SITE_URL}/services/${svc.slug}`,
        provider: { "@id": `${SITE_URL}/#beautysalon` },
        areaServed: BUSINESS.areaServed,
        isRelatedTo: svc.collection_slug ? { "@id": `${SITE_URL}/collections/${svc.collection_slug}` } : undefined,
        offers: {
          "@type": "Offer",
          price: String(svc.price),
          priceCurrency: svc.currency ?? "NGN",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/?collection=${encodeURIComponent(svc.collection_slug ?? "")}`,
          priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split("T")[0],
        },
        // optional: aggregateRating placeholder — replace with real reviews when available
      },
    ],
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const svc = await fetchServiceBySlug(slug);
  if (!svc) notFound();

  const priceLabel = `${svc.pricing_type === "starting_at" ? "From " : ""}${formatCurrency(Number(svc.price))} ${svc.currency ?? "NGN"}`;

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toJsonLd(svc)).replace(/</g, "\\u003c") }}
      />
      <article className='bg-[#FAF7F3]'>
        <nav aria-label='Breadcrumb' className='block-spacing pt-4'>
          <ol className='flex flex-wrap items-center gap-1.5 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
            <li>
              <Link href='/' className='hover:text-[#A57865] underline underline-offset-2'>
                Home
              </Link>
            </li>
            <li aria-hidden='true'>/</li>
            {svc.collection_slug ? (
              <>
                <li>
                  <Link href={`/collections/${svc.collection_slug}`} className='hover:text-[#A57865] underline underline-offset-2'>
                    {svc.collection_slug}
                  </Link>
                </li>
                <li aria-hidden='true'>/</li>
              </>
            ) : null}
            <li aria-current='page' className='font-medium text-[#3A2A22]'>
              {svc.name}
            </li>
          </ol>
        </nav>

        <header className='block-spacing py-6 md:py-8'>
          <p className='font-plus-jakarta-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-[#A57865]'>
            {svc.collection_slug ?? "Veebeez"} · {svc.category_slug ?? ""} · Lekki Phase 1
          </p>
          <h1 className='mt-2 max-w-3xl font-cooper text-[30px] md:text-[42px] leading-[1.05] text-[#1a1510]'>{svc.name}</h1>
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <span className='rounded-full bg-white border border-[#EDE3D3] px-3 py-1.5 font-plus-jakarta-sans text-xs font-medium text-[#3A2A22]'>
              {formatDuration(svc.duration_minutes)}
            </span>
            <span className='rounded-full bg-[#A57865] text-white px-3 py-1.5 font-sans text-xs font-semibold'>{priceLabel}</span>
            {svc.is_deposit_required ? (
              <span className='rounded-full bg-[#fdf9f5] border border-[#EDE3D3] px-3 py-1.5 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>Deposit required</span>
            ) : null}
            <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>· {BUSINESS.address.short}</span>
          </div>
          <p className='mt-4 max-w-2xl font-plus-jakarta-sans text-[15px] leading-relaxed text-[#483630]'>
            {svc.description ?? `Professional ${svc.name.toLowerCase()} at VALERIES HQ (Veebeez) — ${BUSINESS.address.formatted}. Book your stylist and time online in seconds. Mon–Sat 9AM–7PM.`}
          </p>
          <div className='mt-5 flex flex-wrap gap-2'>
            <Link
              href={`/?collection=${encodeURIComponent(svc.collection_slug ?? "")}`}
              className='inline-flex items-center justify-center rounded-full bg-[#A57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white hover:bg-[#8e6655]'>
              Book {svc.name} now
            </Link>
            <a
              href={BUSINESS.mapsUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center rounded-full border border-[#EDE3D3] bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-medium text-[#3A2A22] hover:bg-[#FDF9F5]'>
              Get directions — Fola Osibo
            </a>
          </div>
        </header>

        {svc.questions && svc.questions.length > 0 ? (
          <section aria-labelledby='options-heading' className='block-spacing pb-6'>
            <h2 id='options-heading' className='font-cooper text-[20px] text-[#1a1510]'>
              Options & customizations
            </h2>
            <p className='mt-2 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>Selected during booking — helps us allocate time & pricing.</p>
            <div className='mt-4 space-y-4'>
              {svc.questions.map((q) => (
                <div key={q.question_id} className='rounded-2xl border border-[#EDE3D3] bg-white p-4'>
                  <h3 className='font-plus-jakarta-sans text-sm font-medium text-[#1a1510]'>
                    {q.prompt} {q.is_required ? <span className='text-[#9f2d20]'>*</span> : <span className='font-normal text-[#8a6a5a]'>(optional)</span>}
                  </h3>
                  <ul className='mt-3 flex flex-wrap gap-2'>
                    {q.options.map((opt) => (
                      <li
                        key={opt.option_id}
                        className='rounded-full border border-[#EDE3D3] bg-[#FDF9F5] px-3 py-1.5 font-plus-jakarta-sans text-xs text-[#483630]'>
                        {opt.label}
                        {opt.extra_cost != null && Number(opt.extra_cost) > 0 ? (
                          <span className='ml-1 text-[#2d8a4f]'>+{formatCurrency(Number(opt.extra_cost))}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className='block-spacing pb-12'>
          <div className='rounded-2xl border border-[#EDE3D3] bg-white p-5'>
            <h2 className='font-cooper text-lg text-[#1a1510]'>Visit Veebeez — {BUSINESS.address.short}</h2>
            <p className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-[#483630]'>
              {BUSINESS.address.formatted} — {BUSINESS.openingHours.join(", ")} ·{" "}
              <a href={`tel:${(BUSINESS as unknown as { telephoneIntl: string }).telephoneIntl ?? BUSINESS.telephone}`} className='text-[#A57865] underline'>
                {BUSINESS.telephone}
              </a>{" "}
              ·{" "}
              <a href={BUSINESS.whatsapp} target='_blank' rel='noopener noreferrer' className='text-[#A57865] underline'>
                WhatsApp us
              </a>{" "}
              ·{" "}
              <a href={BUSINESS.mapsUrl} target='_blank' rel='noopener noreferrer' className='text-[#A57865] underline'>
                View on Google Maps
              </a>{" "}
              (Geo: {BUSINESS.geo.latitude}, {BUSINESS.geo.longitude})
            </p>
            <p className='mt-3 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
              Also see:{" "}
              {svc.collection_slug ? (
                <Link href={`/collections/${svc.collection_slug}`} className='underline'>
                  More {svc.collection_slug} services
                </Link>
              ) : (
                <Link href='/' className='underline'>
                  Browse all collections
                </Link>
              )}{" "}
              · <Link href='/faq' className='underline'>Booking FAQs</Link>
            </p>
          </div>
        </section>
      </article>
    </>
  );
}
