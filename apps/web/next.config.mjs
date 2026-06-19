/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecom/shared'],
  // Type errors still fail the build; skip lint-style rules for the MVP.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
