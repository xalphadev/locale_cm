/** @type {import('next').NextConfig} */
const nextConfig = {
  // self-contained server bundle (.next/standalone) for a small Docker runtime image
  output: 'standalone',
  // pg is a server-only dependency; keep it out of the client bundle
  serverExternalPackages: ['pg'],
};
module.exports = nextConfig;
