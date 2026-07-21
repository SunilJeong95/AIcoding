import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { resolveUploadPath, contentTypeFor } from "@/lib/upload";
import { getStudentSession, getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/uploads/<...path> — streams a file from the uploads/ directory.
// Serves both student submission photos and admin step images. Rejects any
// path that escapes the uploads root (traversal guard in resolveUploadPath).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  // Require a valid session (any student or admin) before streaming — filenames
  // are random UUIDs but the endpoint must not serve files to anonymous callers.
  const [student, admin] = await Promise.all([
    getStudentSession(),
    getAdminSession(),
  ]);
  if (!student && !admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const relPath = path.posix.join(...(segments ?? []));

  const absPath = resolveUploadPath(relPath);
  if (!absPath) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) {
      return new Response("Not found", { status: 404 });
    }
    const data = await fs.readFile(absPath);
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(absPath),
        "Content-Length": String(stat.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
