import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { heartbeatLock } from "@/lib/locks";

export const dynamic = "force-dynamic";

// POST /api/admin/steps/[id]/lock/heartbeat — refresh lastHeartbeatAt. Called
// every 30s by the open editor. ok=false means the lock was lost.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await heartbeatLock(id, admin.sessionId);
  return NextResponse.json({ ok });
}
