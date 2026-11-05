/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.100.107'],
  turbopack: { root: process.cwd() },
  images: { unoptimized: true },
};

export default nextConfig;
