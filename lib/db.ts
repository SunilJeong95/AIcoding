import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { cache } from "react";

// Cloudflare Workers cannot share a pg connection across requests, so the
// client (and its connection) must be created fresh per request — a
// module-level singleton works locally but breaks on Workers ("Cannot perform
// I/O on behalf of a different request"). `cache()` scopes one instance to
// the current request/render on both runtimes; `maxUses: 1` stops the
// adapter from recycling the connection into a later request.
export const getDb = cache(
  (): PrismaClient =>
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, maxUses: 1 }),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }),
);
