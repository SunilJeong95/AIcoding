import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// POST /api/admin/codes/[id]/reset — force-logout + recycle a code.
//
// Revokes the student's Session (so their next request 401s and the cookie is
// cleared by getStudentSession), deletes the Student row (and its submissions,
// which have no cascade from Student), and resets the EntryCode back to unused
// so it can be handed to a new person.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const code = await prisma.entryCode.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!code) {
    return NextResponse.json({ error: "코드를 찾을 수 없습니다" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Force-logout: revoke every student session bound to this code.
    await tx.session.updateMany({
      where: { kind: "student", entryCode: code.code },
      data: { revoked: true },
    });

    if (code.student) {
      // Submission has no onDelete cascade from Student — clear them first.
      await tx.submission.deleteMany({ where: { studentId: code.student.id } });
      await tx.student.delete({ where: { id: code.student.id } });
    }

    await tx.entryCode.update({
      where: { id },
      data: {
        status: "unused",
        assignedStudentName: null,
        assignedEmployeeId: null,
        aiTool: null,
        usedAt: null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
