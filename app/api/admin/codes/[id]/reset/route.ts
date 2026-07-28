import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { deleteUploads } from "@/lib/upload";
import { parsePhotoPaths } from "@/lib/photoPaths";

// POST /api/admin/codes/[id]/reset — force-logout + recycle a code.
//
// Revokes the student's Session (so their next request 401s and the cookie is
// cleared by getStudentSession), deletes the Student row (and its submissions,
// which have no cascade from Student), and resets the EntryCode back to unused
// so it can be handed to a new person. Uploaded photo files backing those
// submissions are removed from storage too, after the DB transaction commits.
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

  // D1 has no transaction support — these run as plain sequential statements
  // (same order as before). Low risk: admin-only, low-concurrency action.

  // Force-logout: revoke every student session bound to this code.
  await prisma.session.updateMany({
    where: { kind: "student", entryCode: code.code },
    data: { revoked: true },
  });

  let photoPaths: string[] = [];
  if (code.student) {
    // Submission has no onDelete cascade from Student — clear them first.
    const submissions = await prisma.submission.findMany({
      where: { studentId: code.student.id },
      select: { photoPaths: true },
    });
    photoPaths = submissions.flatMap((s) => parsePhotoPaths(s.photoPaths));
    await prisma.submission.deleteMany({ where: { studentId: code.student.id } });
    await prisma.student.delete({ where: { id: code.student.id } });
  }

  await prisma.entryCode.update({
    where: { id },
    data: {
      status: "unused",
      assignedStudentName: null,
      assignedEmployeeId: null,
      aiTool: null,
      usedAt: null,
    },
  });

  if (photoPaths.length > 0) {
    await deleteUploads(photoPaths).catch((err) =>
      console.error("Failed to delete submission photos from storage:", err),
    );
  }

  return NextResponse.json({ ok: true });
}
