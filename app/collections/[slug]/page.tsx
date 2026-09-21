import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BUSINESS, SITE_URL } from "@/lib/seo/constants";
import { getOptimizedImageUrl, shouldUnoptimize } from "@/lib/image";
import { fetchCollectionBySlug, fetchCollections } from "@/lib/seo/fetchers";
import type { Collection } from "@/types/booking";
import { formatCurrency, formatDuration } from "@/lib/booking/format";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const cols = await fetchCollections();
    return cols.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const col = await fetchCollectionBySlug(slug);
  if (!col) return { title: "Collection not found | Veebeez" };
  const serviceCount = getServiceCount(col);
  const categoryCount = col.categories?.length ?? 0;
  const title = `${col.name} in Lekki | Veebeez — The Valerie Brand`;
  const description =
    col.description ??
    col.meta_description ??
    `Book ${col.name} services at Veebeez (VALERIES HQ) — ${serviceCount} services across ${categoryCount} ${categoryCount === 1 ? "category" : "categories"}. Fola Osibo Street, Lekki Phase 1. Mon–Sat 9AM–7PM. Reserve your stylist & time online.`;
  const img = col.image_url ? getOptimizedImageUrl(col.image_url) : `${SITE_URL}/imgs/image-4.webp`;
  const url = `${SITE_URL}/collections/${col.slug}`;
  return {
    // absolute: the title already ends with the brand, so the layout's
    // "%s | Veebeez" template must not append a second "| Veebeez"
    title: { absolute: title },
    description: description.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description.slice(0, 160),
      url,
      siteName: BUSINESS.legalName,
      locale: "en_NG",
      type: "website",
      images: [{ url: img, width: 1200, height: 630, alt: `${col.name} — Veebeez, Lekki` }],
    },
    twitter: { card: "summary_large_image", title, description: description.slice(0, 160), images: [img] },
    keywords: [col.name, `${col.name} Lekki`, `${col.name} Lagos`, "Veebeez", "Fola Osibo", "Lekki Phase 1"],
  };
}

/**
 * The collection-detail endpoint omits `service_count`, so derive it from
 * the returned categories (falling back to the field when present).
 */
function getServiceCount(col: Collection): number {
  if (col.service_count && col.service_count > 0) return col.service_count;
  return (col.categories ?? []).reduce(
    (n, cat) => n + (cat.services?.length ?? 0),
    0,
  );
}

function toJsonLd(col: Collection) {
  const services = (col.categories ?? []).flatMap((cat) => cat.services ?? []);
  const itemList = services.slice(0, 20).map((svc, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    item: {
      "@type": "Service",
      "@id": `${SITE_URL}/services/${svc.slug}#service`,
      name: svc.name,
      url: `${SITE_URL}/services/${svc.slug}`,
      provider: { "@id": `${SITE_URL}/#beautysalon` },
      areaServed: BUSINESS.areaServed,
      offers: {
        "@type": "Offer",
        price: String(svc.price),
        priceCurrency: svc.currency ?? "NGN",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/?collection=${encodeURIComponent(col.slug)}`,
      },
    },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/#collections` },
          { "@type": "ListItem", position: 3, name: col.name, item: `${SITE_URL}/collections/${col.slug}` },
        ],
      },
      {
        "@type": "CollectionPage",
        name: col.name,
        description: col.description ?? col.meta_description ?? BUSINESS.description,
        url: `${SITE_URL}/collections/${col.slug}`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#beautysalon` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: services.length,
          itemListElement: itemList,
        },
      },
    ],
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const col = await fetchCollectionBySlug(slug);
  if (!col) notFound();

  const categories = col.categories ?? [];
  const img = getOptimizedImageUrl(col.image_url, "/imgs/image-4.webp");
  const heroAlt = `${col.name} — beauty services at Veebeez, Fola Osibo Street, Lekki Phase 1, Lagos`;

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toJsonLd(col)).replace(/</g, "\\u003c") }}
      />
      <article className='bg-[#FAF7F3]'>
        {/* Breadcrumb */}
        <nav aria-label='Breadcrumb' className='block-spacing pt-4'>
          <ol className='flex flex-wrap items-center gap-1.5 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
            <li>
              <Link href='/' className='hover:text-[#A57865] underline underline-offset-2'>
                Home
              </Link>
            </li>
            <li aria-hidden='true'>/</li>
            <li>
              <Link href='/?collection=all' className='hover:text-[#A57865]'>
                Collections
              </Link>
            </li>
            <li aria-hidden='true'>/</li>
            <li aria-current='page' className='font-medium text-[#3A2A22]'>
              {col.name}
            </li>
          </ol>
        </nav>

        {/* Hero */}
        <header className='block-spacing py-6 md:py-8'>
          <div className='grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-start'>
            <div>
              <p className='font-plus-jakarta-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-[#A57865]'>
                Veebeez · {BUSINESS.address.short} · Mon–Sat 9AM–7PM
              </p>
              <h1 className='mt-2 font-cooper text-[30px] md:text-[42px] leading-[1.05] text-[#1a1510]'>{col.name} in Lekki Phase 1</h1>
              {col.description ? (
                <p className='mt-3 max-w-xl font-plus-jakarta-sans text-[15px] leading-relaxed text-[#483630]'>
                  {col.description}
                </p>
              ) : null}
              <p className='mt-3 max-w-xl font-plus-jakarta-sans text-[15px] leading-relaxed text-[#483630]'>
                Book {col.name.toLowerCase()} services at VALERIES HQ (Veebeez) — {BUSINESS.address.formatted}. Choose your services, stylist and time online.
              </p>
              <div className='mt-4 flex flex-wrap gap-2'>
                <Link
                  href={`/?collection=${encodeURIComponent(col.slug)}`}
                  className='inline-flex items-center justify-center rounded-full bg-[#A57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white hover:bg-[#8e6655]'>
                  Book {col.name} now
                </Link>
                <a
                  href={BUSINESS.mapsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center justify-center rounded-full border border-[#EDE3D3] bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-medium text-[#3A2A22] hover:bg-[#FDF9F5]'>
                  View on Google Maps
                </a>
              </div>
              <p className='mt-3 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                {categories.length} categories · {getServiceCount(col)} services · {BUSINESS.telephone}
              </p>
            </div>
            <div className='relative h-[220px] md:h-[300px] overflow-hidden rounded-2xl border border-[#EDE3D3] bg-white'>
              <Image
                src={img}
                alt={heroAlt}
                fill
                sizes='(max-width: 768px) 100vw, 500px'
                style={{ objectFit: "cover", objectPosition: "50% 30%" }}
                priority
                unoptimized={shouldUnoptimize(img)}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent' aria-hidden='true' />
            </div>
          </div>
        </header>

        {/* Services by category — crawlable HTML */}
        <section aria-labelledby='services-heading' className='block-spacing pb-12'>
          <h2 id='services-heading' className='font-cooper text-[22px] md:text-[28px] text-[#1a1510]'>
            Services in {col.name}
          </h2>
          {categories.length === 0 ? (
            <p className='mt-4 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>Services for this collection will appear here once available.</p>
          ) : (
            <div className='mt-6 space-y-10'>
              {categories.map((cat) => (
                <div key={cat.slug}>
                  <h3 className='font-plus-jakarta-sans text-xs font-semibold tracking-[0.12em] uppercase text-[#A57865]'>
                    {cat.name} — {cat.services.length} {cat.services.length === 1 ? "service" : "services"}
                  </h3>
                  {cat.description ? <p className='mt-1 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>{cat.description}</p> : null}
                  <ul className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                    {cat.services.map((svc) => (
                      <li
                        key={svc.slug}
                        className='rounded-2xl border border-[#EDE3D3] bg-white p-4 hover:shadow-sm transition'>
                        <Link href={`/services/${svc.slug}`} className='block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/30 rounded-xl'>
                          <h4 className='font-plus-jakarta-sans text-[15px] font-medium text-[#1a1510] hover:text-[#A57865]'>{svc.name}</h4>
                          <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                            {formatDuration(svc.duration_minutes)} · {svc.pricing_type === "starting_at" ? "From " : ""}
                            {formatCurrency(Number(svc.price))} {svc.currency}
                          </p>
                          {svc.has_questions ? (
                            <span className='mt-2 inline-flex rounded-full bg-[#fdf9f5] border border-[#EDE3D3] px-2 py-1 font-plus-jakarta-sans text-[10px] uppercase tracking-wide text-[#8a6a5a]'>
                              Options available
                            </span>
                          ) : null}
                        </Link>
                        <Link
                          href={`/?collection=${encodeURIComponent(col.slug)}`}
                          className='mt-3 inline-flex text-xs font-medium text-[#A57865] underline underline-offset-2 hover:text-[#8B5E4D]'>
                          Book this collection →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className='mt-10 rounded-2xl border border-[#EDE3D3] bg-white p-5'>
            <h3 className='font-cooper text-lg text-[#1a1510]'>Visit Veebeez in Lekki</h3>
            <p className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-[#483630]'>
              {BUSINESS.address.formatted} — {BUSINESS.openingHours.join(", ")} ·{" "}
              <a href={BUSINESS.mapsUrl} target='_blank' rel='noopener noreferrer' className='text-[#A57865] underline'>
                Get directions
              </a>{" "}
              · <a href={`tel:${(BUSINESS as unknown as { telephoneIntl: string }).telephoneIntl ?? BUSINESS.telephone}`} className='text-[#A57865] underline'>{BUSINESS.telephone}</a> ·{" "}
              <a href={BUSINESS.whatsapp} target='_blank' rel='noopener noreferrer' className='text-[#A57865] underline'>
                WhatsApp
              </a>
            </p>
          </div>
        </section>
      </article>
    </>
  );
}
