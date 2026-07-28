import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { MAX_CODES } from "@/lib/codes";
import { deleteUploads } from "@/lib/upload";
import { parsePhotoPaths } from "@/lib/photoPaths";

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
// code row can't be deleted out from under an existing Student. Uploaded
// photo files backing those Submissions are removed from storage too, after
// the DB transaction commits.
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

  // D1 has no transaction support — these run as plain sequential statements
  // (same order as before). Low risk: admin-only, low-concurrency action.
  const codes = await prisma.entryCode.findMany({
    where: { id: { in: ids } },
    include: { student: true },
  });

  const studentIds = codes.filter((c) => c.student).map((c) => c.student!.id);
  let photoPaths: string[] = [];
  if (studentIds.length > 0) {
    const submissions = await prisma.submission.findMany({
      where: { studentId: { in: studentIds } },
      select: { photoPaths: true },
    });
    photoPaths = submissions.flatMap((s) => parsePhotoPaths(s.photoPaths));
    await prisma.submission.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  }

  const codeValues = codes.map((c) => c.code);
  if (codeValues.length > 0) {
    await prisma.session.updateMany({
      where: { kind: "student", entryCode: { in: codeValues } },
      data: { revoked: true },
    });
  }

  await prisma.entryCode.deleteMany({ where: { id: { in: ids } } });

  if (photoPaths.length > 0) {
    await deleteUploads(photoPaths).catch((err) =>
      console.error("Failed to delete submission photos from storage:", err),
    );
  }

  return NextResponse.json({ ok: true });
}
