import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { holdsLock } from "@/lib/locks";
import { saveUpload } from "@/lib/upload";

export const dynamic = "force-dynamic";

// POST /api/admin/steps/[id]/inline-image — multipart image upload for an
// image embedded mid-content via markdown (`![](...)`) in textContent. Only
// saves the file and returns its path for the client to insert into the
// textarea — the step's own row is never touched. Must hold the lock.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const step = await prisma.step.findUnique({ where: { id } });
  if (!step) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await holdsLock(id, admin.sessionId))) {
    return NextResponse.json({ error: "lock_required" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  let relPath: string;
  try {
    relPath = await saveUpload(file, { subdir: "steps" });
  } catch (err) {
    return NextResponse.json(
      { error: "upload_failed", message: (err as Error).message },
      { status: 400 },
    );
  }

  return NextResponse.json({ path: relPath });
}
