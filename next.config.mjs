/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the whole game is a set of files served from a CDN, no server needed.
  output: 'export',
  images: { unoptimized: true },
  // Relative asset paths let the exported game run from any folder or CDN path.
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : undefined,
  reactStrictMode: true,
};

export default nextConfig;
