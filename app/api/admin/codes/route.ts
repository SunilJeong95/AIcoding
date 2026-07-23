import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { MAX_CODES } from "@/lib/codes";

// GET /api/admin/codes — list all entry codes with status + assignee info.
export async function GET() {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const codes = await prisma.entryCode.findMany({
    orderBy: { issuedAt: "asc" },
  });

  return NextResponse.json({
    total: codes.length,
    max: MAX_CODES,
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      status: c.status,
      assignedStudentName: c.assignedStudentName,
      assignedEmployeeId: c.assignedEmployeeId,
      aiTool: c.aiTool,
      issuedAt: c.issuedAt,
      usedAt: c.usedAt,
    })),
  });
}

// DELETE /api/admin/codes — bulk-delete entry codes by id.
//
// For any selected code that's in-use, this also force-logs-out the student
// (revokes their Session) and removes their Student row (and its
// Submissions, which have no cascade from Student) before deleting the
// EntryCode itself — Student.entryCodeId has no onDelete cascade, so the
// code row can't be deleted out from under an existing Student.
export async function DELETE(req: Request) {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "삭제할 코드를 선택하세요" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const codes = await tx.entryCode.findMany({
      where: { id: { in: ids } },
      include: { student: true },
    });

    const studentIds = codes.filter((c) => c.student).map((c) => c.student!.id);
    if (studentIds.length > 0) {
      await tx.submission.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.student.deleteMany({ where: { id: { in: studentIds } } });
    }

    const codeValues = codes.map((c) => c.code);
    if (codeValues.length > 0) {
      await tx.session.updateMany({
        where: { kind: "student", entryCode: { in: codeValues } },
        data: { revoked: true },
      });
    }

    await tx.entryCode.deleteMany({ where: { id: { in: ids } } });
  });

  return NextResponse.json({ ok: true });
}
