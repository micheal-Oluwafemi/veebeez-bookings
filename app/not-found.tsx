import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className='flex h-dvh flex-col items-center justify-center bg-[#F9E8D9] px-4 py-8 text-center sm:px-6 sm:py-12 md:py-16'>
      {/* 404 */}
      <h1
        aria-label='404 - Page not found'
        className='font-jakarta-sans text-[110px] md:mt-20 leading-[0.85] font-semibold tracking-[-0.07em] text-black select-none min-[360px]:text-[128px] sm:text-[168px] md:text-[220px] lg:text-[190px] xl:text-[270px]'>
        404
      </h1>

      {/* Pill CTA - matches guide: thin bordered pill centered under 404 */}
      <Link
        href='/'
        className='mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/20 bg-[#F9E8D9] px-4 py-[6px] text-[11px] leading-none font-medium tracking-wide text-black/70 transition-colors hover:border-black hover:bg-black hover:text-white sm:mt-4 sm:px-5 sm:py-2 sm:text-[13px] md:text-sm'>
        Go back to homepage
      </Link>

      {/* Illustration - uses supplied asset public/not-found.png, fully responsive */}
      <div className='mt-8 flex w-full max-w-[320px] justify-center min-[360px]:max-w-[360px] sm:mt-10 sm:max-w-[460px] md:max-w-[540px] lg:max-w-[620px]'>
        <Image
          src='/not-found.png'
          alt='Line drawing of a person with arms crossed - page not found'
          width={808}
          height={593}
          priority
          sizes='(max-width: 360px) 320px, (max-width: 640px) 460px, (max-width: 768px) 540px, 620px'
          className='h-auto w-full object-contain select-none'
        />
      </div>

      {/* Accessible description for screen readers */}
      <p className='sr-only'>
        The page you&apos;re looking for doesn&apos;t exist. Go back to the
        homepage.
      </p>
    </div>
  );
}
