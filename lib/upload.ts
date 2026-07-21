import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Root of all uploaded files (student photos + admin step images). Lives next to
// the app and is gitignored. DB stores only relative paths under this root.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

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
  // Subdirectory under uploads/, e.g. "submissions" or "steps". Must be a simple
  // single-segment name — no separators, no traversal.
  subdir: string;
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// Writes a web File to uploads/<subdir>/<random><ext> and returns the RELATIVE
// path (e.g. "submissions/ab12.png") to store in the DB. The generated name is
// random, so a hostile original filename can never influence the path.
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

  const destDir = path.join(UPLOADS_DIR, subdir);
  await fs.mkdir(destDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(destDir, fileName), buffer);

  return relPath;
}

// Resolves a stored relative path to an absolute path, guaranteeing it stays
// inside UPLOADS_DIR. Returns null on any traversal attempt or escape. Used by
// the GET /api/uploads/[...path] streaming handler.
export function resolveUploadPath(relPath: string): string | null {
  // Reject absolute inputs and obvious traversal up front.
  if (!relPath || path.isAbsolute(relPath)) return null;

  const resolved = path.resolve(UPLOADS_DIR, relPath);
  const root = path.resolve(UPLOADS_DIR);
  // Must be strictly within the uploads root (allow the root itself + separator).
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null;
  }
  return resolved;
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
