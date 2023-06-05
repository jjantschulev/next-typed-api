const {
  withTypedApi,
  vercelServerSideOrigin,
} = require('next-typed-api/codegen');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
};

module.exports = withTypedApi(nextConfig, {
  reactQuery: true,
  serverSideOrigin: vercelServerSideOrigin(3000),
});
