import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { acquireLock } from "@/lib/locks";

export const dynamic = "force-dynamic";

// POST /api/admin/steps/[id]/lock — acquire (or take over a stale) lock.
// Returns { acquired, ownerName }. acquired=false means another admin holds a
// live lock and the caller should render read-only.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const step = await prisma.step.findUnique({ where: { id } });
  if (!step) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await acquireLock(id, admin.name, admin.sessionId);
  return NextResponse.json(result);
}
