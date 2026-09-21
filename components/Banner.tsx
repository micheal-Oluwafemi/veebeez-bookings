import Image from "next/image";
import React from "react";

export default function Banner() {
  return (
    <div className='w-full h-[12dvh] md:h-[19dvh] lg:h-[41dvh]  relative'>
      <Image
        src='/banners/version-1.png'
        alt='Veebeez — The Valerie Brand, Lekki Phase 1, Lagos — salon banner'
        fill
        priority
        sizes='100vw'
        style={{
          objectFit: "cover",
          objectPosition: "50% 5%",
        }}
      />
      {/* 
      <div className='lg:p-2 p-1 rounded-full justify-center items-center z-50 absolute bg-white md:-bottom-7 -bottom-12  lg:-bottom-36 left-[5%]'>
        <img
          src='/imgs/valerie.webp'
          alt='logo'
          className='object-top rounded-full size-20 lg:size-60 object-cover'
        />
      </div>

      <div className='lg:pl-[21.5%] pl-[8rem] lg:pt-4 pt-2 lg:pr-16 w-full justify-between flex lg:flex-row flex-col items-center'>
        <div>
          <div className='flex lg:items-center items-start gap-3'>
            <img
              src='/icons/location.svg'
              alt='location-icon'
              className='lg:size-10 size-6'
            />
            <h2 className='text-black lg:text-2xl font-plus-jakarta-sans leading-[1.2] font-normal '>
              Dulux paints Admiralty-Lekki, Fola Osibo Road, Lagos, Nigeria
            </h2>
          </div>

          <div className='flex lg:items-center items-center gap-3 lg:mt-2 mt-1'>
            <p className='text-black lg:text-2xl font-plus-jakarta-sans font-normal'>
              <span className='font-plus-jakarta-sans font-semibold pr-0.5'>Opens</span>:
              9AM to 7PM (Mon-Sat)
            </p>
          </div>
        </div>

        <div className='flex items-center cursor-pointer gap-2 p-2.5 rounded-[13px] bg-[#a57865]'>
          <img
            src='/icons/voucher.svg'
            alt='voucher-icon'
            className='size-7 invert'
          />

          <p className='text-white font-plus-jakarta-sans'>Redeem Voucher</p>
        </div>
      </div> */}
    </div>
  );
}
