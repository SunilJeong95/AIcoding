import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

// GET /api/student/steps?order=N — server-enforced sequential lock.
// Without `order`, returns the current (awaiting) step. With `order`, returns
// that specific already-unlocked step for read-only review — any order
// outside [1, currentStepOrder] is clamped, so a locked future step is never
// exposed. The client renders one step at a time instead of an ever-growing
// list.
export async function GET(req: NextRequest) {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentStepOrder } = auth.student;

  const orderParam = req.nextUrl.searchParams.get("order");
  const parsedOrder = orderParam !== null ? Number(orderParam) : NaN;
  const viewOrder =
    Number.isInteger(parsedOrder) && parsedOrder >= 1 && parsedOrder <= currentStepOrder
      ? parsedOrder
      : currentStepOrder;

  // Gate at the query level — every other step never leaves the server.
  const [totalSteps, step] = await Promise.all([
    prisma.step.count({ where: { courseId: 1 } }),
    prisma.step.findFirst({
      where: { courseId: 1, order: viewOrder },
      select: {
        id: true,
        order: true,
        topic: true,
        textContent: true,
        requiresUpload: true,
      },
    }),
  ]);

  // Whether the *current* step has an "uploaded" Submission yet — only
  // meaningful when the returned step is the current one; for requiresUpload
  // steps this gates the "다음" button, and for the last step it's also how
  // the client knows the course is fully complete (see /api/student/advance,
  // which upserts a Submission even for no-upload steps).
  let currentStepSubmitted = false;
  if (step && step.order === currentStepOrder) {
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_stepId: {
          studentId: auth.student.id,
          stepId: step.id,
        },
      },
      select: { status: true },
    });
    currentStepSubmitted = submission?.status === "uploaded";
  }

  return NextResponse.json({
    currentStepOrder,
    totalSteps,
    currentStepSubmitted,
    step,
  });
}
