import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";

// D1 is a Cloudflare-internal binding (like KV/R2) — no TLS handshake, no
// external network hop, unlike the previous Hyperdrive/Postgres setup.
// `cache()` scopes one PrismaClient instance to the current request/render,
// matching Cloudflare's documented pattern of a fresh client per request.
// Local dev is cf:preview-only (real Miniflare-backed Cloudflare context),
// so no non-Cloudflare fallback is needed here.
export const getDb = cache(
  (): PrismaClient =>
    new PrismaClient({
      adapter: new PrismaD1(getCloudflareContext().env.DB),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }),
);
