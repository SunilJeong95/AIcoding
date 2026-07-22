import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";

// POST /api/student/submit — multipart photo upload for the CURRENT step.
// Only records the submission (status "uploaded"); it no longer advances
// currentStepOrder itself — the student must click "다음" (see
// /api/student/advance), which is disabled client-side until this succeeds.
//
// Security (plan §6 WU-1, auth-bypass guard): the target step is derived from the
// server-side student.currentStepOrder, never from a client-supplied stepId. Any
// stepId in the request is only compared, never trusted — a mismatch is rejected so
// a student cannot POST ahead and bypass the sequential lock.
export async function POST(req: NextRequest) {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { student } = auth;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "사진 파일이 필요합니다." },
      { status: 400 },
    );
  }

  // Server-derived target step. This is the ONLY source of truth for which step
  // the upload belongs to.
  const targetStep = await prisma.step.findFirst({
    where: { courseId: 1, order: student.currentStepOrder },
  });
  if (!targetStep) {
    return NextResponse.json(
      { error: "현재 단계를 찾을 수 없습니다." },
      { status: 400 },
    );
  }
  if (!targetStep.requiresUpload) {
    return NextResponse.json(
      { error: "이 단계는 사진 업로드가 필요하지 않습니다." },
      { status: 400 },
    );
  }

  // If the client hinted a stepId, it must match the server target. Never trust it
  // to select the step — only to reject a stale/ahead request.
  const clientStepId = form.get("stepId");
  if (typeof clientStepId === "string" && clientStepId !== targetStep.id) {
    return NextResponse.json(
      { error: "현재 단계가 아닙니다. 새로고침 후 다시 시도하세요." },
      { status: 409 },
    );
  }

  let photoPath: string;
  try {
    photoPath = await saveUpload(file, { subdir: "submissions" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Record the submission (one per step per student). Advancing to the next
  // step happens separately via /api/student/advance.
  await prisma.submission.upsert({
    where: {
      studentId_stepId: { studentId: student.id, stepId: targetStep.id },
    },
    create: {
      studentId: student.id,
      stepId: targetStep.id,
      photoPath,
      status: "uploaded",
    },
    update: { photoPath, status: "uploaded", uploadedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
