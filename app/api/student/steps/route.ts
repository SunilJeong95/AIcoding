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

  // The RETURNED step's own submission — when it's the current step, this
  // gates the "다음" button (requiresUpload). When browsing an already-
  // completed step read-only, this is just its uploaded photos.
  let submitted = false;
  let photoPaths: string[] = [];
  if (step) {
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_stepId: {
          studentId: auth.student.id,
          stepId: step.id,
        },
      },
      select: { status: true, photoPaths: true },
    });
    submitted = submission?.status === "uploaded";
    photoPaths = submission?.photoPaths ?? [];
  }

  return NextResponse.json({
    currentStepOrder,
    totalSteps,
    submitted,
    photoPaths,
    // Explicit "advanced past the real last step" signal — see
    // /api/student/advance. Distinct from `submitted`, which is only about
    // the returned step's own submission.
    completed: auth.student.completedAt !== null,
    step,
  });
}
