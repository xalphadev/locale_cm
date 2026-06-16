/** @type {import('next').NextConfig} */
const nextConfig = {
  // self-contained server bundle (.next/standalone) for a small Docker runtime image
  output: 'standalone',
  // pg + minio + sharp are server-only (sharp is native) — keep them out of the client bundle
  serverExternalPackages: ['pg', 'minio', 'sharp'],
};
module.exports = nextConfig;
