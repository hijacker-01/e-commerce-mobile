/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecom/shared'],
  // Type errors still fail the build; skip lint-style rules for the MVP.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Cheapest on Vercel + works with any host: the Railway API uploads URL,
    // owner-pasted product image URLs, etc. (no per-image optimization bill).
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost', port: '4000' },
    ],
  },
};

export default nextConfig;
