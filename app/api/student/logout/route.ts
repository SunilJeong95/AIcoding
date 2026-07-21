import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/student/logout — clear cookie + mark the Session row revoked.
export async function POST() {
  const session = await getSession();
  const sessionId = session.student?.sessionId;

  if (sessionId) {
    await prisma.session
      .update({ where: { id: sessionId }, data: { revoked: true } })
      .catch(() => {
        // Session row may already be gone (e.g. admin Reset). Non-fatal.
      });
  }

  session.destroy();
  return NextResponse.json({ ok: true });
}
