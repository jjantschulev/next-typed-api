const { withTypedApi } = require("next-typed-api");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
};

module.exports = withTypedApi(nextConfig);
