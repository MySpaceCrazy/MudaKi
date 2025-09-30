/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ["maps.gstatic.com", "maps.googleapis.com"] },
  experimental: { serverActions: { allowedOrigins: ["*"] } }
};
export default nextConfig;
