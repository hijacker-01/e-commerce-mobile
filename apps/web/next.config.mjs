import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecom/shared'],
  // Lean, self-contained server bundle for the Docker image.
  output: 'standalone',
  // Trace files from the monorepo root so standalone includes workspace deps.
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
