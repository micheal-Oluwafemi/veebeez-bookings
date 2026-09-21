import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Image optimization: fixes slow Contabo S3 signed-URL loads
  // See lib/image.ts getOptimizedImageUrl — strips X-Amz-* query
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eu2.contabostorage.com",
        pathname: "/veebeez/**",
      },
      { protocol: "https", hostname: "**.contabostorage.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "backend.thevaleriebrand.co",
        pathname: "/**",
      },
      // { protocol: "https", hostname: "cdn.thevaleriebrand.co", pathname: "/**" },
      { protocol: "https", hostname: "*.thevaleriebrand.co", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year immutable — requires unsigned/CDN URL
    dangerouslyAllowSVG: false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Cache optimized images aggressively
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
