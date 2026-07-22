import { NextRequest } from "next/server";
import path from "path";
import { getSupabase, resolveUploadPath, contentTypeFor } from "@/lib/upload";
import { getStudentSession, getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/uploads/<...path> — streams a file from Supabase Storage. Serves both
// student submission photos and admin step images. Rejects any key that is not
// an allow-listed subdir + UUID filename (validated in resolveUploadPath).
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

  const key = resolveUploadPath(relPath);
  if (!key) {
    return new Response("Forbidden", { status: 403 });
  }

  const client = await getSupabase();
  const { data, error } = await client.storage.from("uploads").download(key);
  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(key),
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
