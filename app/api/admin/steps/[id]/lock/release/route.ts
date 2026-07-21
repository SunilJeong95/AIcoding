import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { releaseLock } from "@/lib/locks";

export const dynamic = "force-dynamic";

// POST /api/admin/steps/[id]/lock/release — release the lock (on save success
// or navigate-away / beforeunload). No-op if the caller doesn't own it.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const released = await releaseLock(id, admin.sessionId);
  return NextResponse.json({ released });
}
