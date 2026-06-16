/** @type {import('next').NextConfig} */
const nextConfig = {
  // self-contained server bundle (.next/standalone) for a small Docker runtime image
  output: 'standalone',
  // pg + minio are server-only dependencies; keep them out of the client bundle
  serverExternalPackages: ['pg', 'minio'],
};
module.exports = nextConfig;
