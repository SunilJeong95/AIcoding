// Merges the generated `Env` (worker-configuration.d.ts, run
// `npx wrangler types --include-runtime=false` after editing wrangler.jsonc —
// `--include-runtime=false` because the full runtime type dump redefines
// `Response`/`fetch` in a way that conflicts with Next.js's own DOM lib
// types) into @opennextjs/cloudflare's `CloudflareEnv`, so
// `getCloudflareContext().env` is fully typed.
declare global {
  interface CloudflareEnv extends Env {}

  // Minimal ambient shape — worker-configuration.d.ts references `Hyperdrive`
  // without defining it once runtime types are excluded. We only ever read
  // `.connectionString`; the rest mirrors Cloudflare's documented binding.
  interface Hyperdrive {
    readonly connectionString: string;
    readonly host: string;
    readonly port: number;
    readonly user: string;
    readonly password: string;
    readonly database: string;
  }
}

export {};
