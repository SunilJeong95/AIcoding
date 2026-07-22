import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { stepUpdateSchema } from "@/lib/validation";
import { holdsLock } from "@/lib/locks";

export const dynamic = "force-dynamic";

// PUT /api/admin/steps/[id] — save text/image content. Must hold the lock.
export async function PUT(
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

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body → nothing to update
  }
  const parsed = stepUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: {
    topic?: string;
    textContent?: string;
    imageContent?: string | null;
    requiresUpload?: boolean;
  } = {};
  if (parsed.data.topic !== undefined) data.topic = parsed.data.topic;
  if (parsed.data.textContent !== undefined) data.textContent = parsed.data.textContent;
  if (parsed.data.imageContent !== undefined) data.imageContent = parsed.data.imageContent;
  if (parsed.data.requiresUpload !== undefined) data.requiresUpload = parsed.data.requiresUpload;

  const updated = await prisma.step.update({ where: { id }, data });
  return NextResponse.json({ step: updated });
}

// DELETE /api/admin/steps/[id] — delete the step (schema cascade cleans up
// dependent Submission/StepLock rows), then reorder the remaining steps so
// their `order` stays contiguous 1..N. Must hold the lock.
export async function DELETE(
  _req: NextRequest,
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

  await prisma.$transaction(async (tx) => {
    await tx.step.delete({ where: { id } });

    // Shift every step that came after the deleted one down by one in a single
    // statement — keeps the @@unique([courseId, order]) constraint satisfied
    // without a per-row round trip.
    await tx.step.updateMany({
      where: { courseId: 1, order: { gt: step.order } },
      data: { order: { decrement: 1 } },
    });
  });

  return NextResponse.json({ ok: true });
}
