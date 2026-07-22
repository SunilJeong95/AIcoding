import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession, getAdminSession } from "@/lib/auth";
import { releaseAllForSession } from "@/lib/locks";

// POST /api/admin/logout — release any edit locks held by this admin session,
// revoke the Session row, and clear the cookie.
export async function POST() {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (admin) {
    await releaseAllForSession(admin.sessionId);
    await prisma.session.update({
      where: { id: admin.sessionId },
      data: { revoked: true },
    });
  }

  const session = await getSession();
  session.destroy();

  return NextResponse.json({ ok: true });
}
