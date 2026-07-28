// Merges the generated `Env` (worker-configuration.d.ts, run
// `npx wrangler types --include-runtime=false` after editing wrangler.jsonc —
// `--include-runtime=false` because the full runtime type dump redefines
// `Response`/`fetch` in a way that conflicts with Next.js's own DOM lib
// types) into @opennextjs/cloudflare's `CloudflareEnv`, so
// `getCloudflareContext().env` is fully typed.
import type { D1Database as D1DatabaseType } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv extends Env {}

  // worker-configuration.d.ts references `D1Database` without defining it
  // once runtime types are excluded. Unlike the old Hyperdrive binding (where
  // only `.connectionString` was read), PrismaD1 calls real D1Database
  // methods (prepare/batch/exec/dump), so this pulls the real shape from
  // @cloudflare/workers-types via a scoped import instead of hand-rolling a
  // minimal interface — but NOT via tsconfig's `types` array or a
  // triple-slash reference, either of which would pull in the full ambient
  // runtime type dump and reintroduce the Response/fetch conflict with
  // Next.js's DOM lib types that --include-runtime=false avoids.
  type D1Database = D1DatabaseType;
}

export {};
