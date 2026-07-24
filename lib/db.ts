import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";

// On the deployed Worker, prefer the Hyperdrive binding — it pools/caches the
// Postgres connection at Cloudflare's edge so requests don't each pay a fresh
// TCP+TLS handshake to Supabase (Singapore). getCloudflareContext() throws
// outside the Worker runtime (local `next dev`/`next build`), so this falls
// back to DATABASE_URL there.
function resolveConnectionString(): string {
  try {
    const { env } = getCloudflareContext();
    if (env.HYPERDRIVE) return env.HYPERDRIVE.connectionString;
  } catch {
    // not running on Cloudflare — fall through to DATABASE_URL
  }
  return process.env.DATABASE_URL!;
}

// Cloudflare Workers cannot share a pg connection across requests, so the
// client (and its connection pool) must be created fresh per request — a
// module-level singleton works locally but breaks on Workers ("Cannot perform
// I/O on behalf of a different request"). `cache()` scopes one instance to
// the current request/render on both runtimes; the pool itself is discarded
// with it, so connections never leak into a later request — no need to force
// a single use per connection within the request.
export const getDb = cache(
  (): PrismaClient =>
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: resolveConnectionString() }),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }),
);
