import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { cache } from "react";

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
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }),
);
