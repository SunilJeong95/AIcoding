import path from "path";
import crypto from "crypto";
import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

// Storage bucket holding all uploaded files (student photos + admin step images).
// DB stores only relative keys under this bucket (e.g. "submissions/<uuid>.png").
const BUCKET = "uploads";

// Subdirs (key prefixes) the app actually writes to. Used to validate read keys.
const ALLOWED_SUBDIRS = new Set(["submissions", "steps"]);

let supabase: SupabaseClient | undefined;

// Server-only Supabase client (service role key — never expose to the client).
// Lazily created so a missing env var fails at call time, not module load.
export async function getSupabase(): Promise<SupabaseClient> {
  if (!supabase) {
    // supabase-js always constructs a realtime client (even though this app
    // never uses realtime), which throws if no WebSocket constructor exists.
    // Node 20 (local dev) has none; Cloudflare Workers provides one natively,
    // so this branch never runs there. `ws`'s constructor type doesn't
    // structurally match the DOM `WebSocket` type supabase-js expects, hence the cast.
    let options: SupabaseClientOptions<"public"> | undefined;
    if (typeof WebSocket === "undefined") {
      const { default: WS } = await import("ws");
      options = {
        realtime: {
          transport: WS as unknown as NonNullable<
            SupabaseClientOptions<"public">["realtime"]
          >["transport"],
        },
      };
    }
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      options,
    );
  }
  return supabase;
}

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function pickExtension(file: File): string {
  const mimeExt = EXT_BY_MIME[file.type];
  if (mimeExt) return mimeExt;
  const nameExt = path.extname(file.name || "").toLowerCase();
  if (ALLOWED_EXTENSIONS.has(nameExt)) return nameExt;
  return ".bin";
}

export interface SaveOptions {
  // Subdirectory (key prefix) under the bucket, e.g. "submissions" or "steps".
  // Must be a simple single-segment name — no separators, no traversal.
  subdir: string;
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// Uploads a web File to <bucket>/<subdir>/<random><ext> and returns the RELATIVE
// key (e.g. "submissions/ab12.png") to store in the DB. The generated name is
// random, so a hostile original filename can never influence the key.
export async function saveUpload(
  file: File,
  { subdir, maxBytes = DEFAULT_MAX_BYTES }: SaveOptions,
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(subdir)) {
    throw new Error(`Invalid upload subdir: ${subdir}`);
  }
  if (file.size > maxBytes) {
    throw new Error(`File too large: ${file.size} > ${maxBytes}`);
  }

  const ext = pickExtension(file);
  const fileName = `${crypto.randomUUID()}${ext}`;
  const relPath = path.posix.join(subdir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  const client = await getSupabase();
  const { error } = await client
    .storage.from(BUCKET)
    .upload(relPath, buffer, { contentType: contentTypeFor(relPath), upsert: false });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return relPath;
}

// Validates a stored relative key before it is read back. Returns the key if the
// subdir is allow-listed and the filename is a UUID + allowed extension, else
// null. Used by the GET /api/uploads/[...path] streaming handler.
export function resolveUploadPath(relPath: string): string | null {
  if (!relPath) return null;

  const subdir = path.posix.dirname(relPath);
  const filename = path.posix.basename(relPath);
  if (!ALLOWED_SUBDIRS.has(subdir)) return null;
  if (!/^[0-9a-f-]+\.(png|jpg|jpeg|gif|webp)$/.test(filename)) return null;

  return relPath;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPE_BY_EXT[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
