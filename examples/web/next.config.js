const { withTypedApi } = require('next-typed-api/codegen');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
};

module.exports = withTypedApi(nextConfig, {
  reactQuery: true,
  baseUrl: process.env.VERCEL_URL ?? 'http://localhost:3000',
});
