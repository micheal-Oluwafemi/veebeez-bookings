"use client";

import CollectionGrid from "../services/CollectionGrid";
import CategoryServiceGrid from "../services/CategoryServiceGrid";

export default function Step1Services() {
  return (
    <div>
      <PanelHead
        eyebrow='Collection'
        title={`What are you here for, love?`}
        sub='Choose a collection, then select as many services as you need.'
      />

      <CollectionGrid />

      <CategoryServiceGrid />
    </div>
  );
}

export function PanelHead({
  eyebrow,
  title,
  sub,
  as: As = "h2",
}: {
  eyebrow: string;
  title?: string;
  sub?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className='mb-8 space-y-3'>
      <p className='text-[11px] font-semibold tracking-[0.1em] text-gray-600 uppercase hidden'>
        {eyebrow}
      </p>

      <As className='lg:max-w-xl max-w-sm font-cooper font-normal! text-[25px] leading-[1.05] text-black/80 md:text-[27px] lg:text-[35px]'>
        {title}
      </As>

      <p className='mt-3 max-w-xl text-neutral-500 text-[clamp(17px,1.1vw,16px)] leading-normal tracking-[-0.30px] font-plus-jakarta-sans'>
        {sub}
      </p>
    </div>
  );
}
