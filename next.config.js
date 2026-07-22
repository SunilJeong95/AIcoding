/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keeps @prisma/client unbundled so OpenNext can patch it for the workerd
  // runtime (Cloudflare Workers) — bundling it in pulls in the Node-only
  // binary/library engine, which crashes on Workers (no `fs.readdir`).
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

module.exports = nextConfig;
