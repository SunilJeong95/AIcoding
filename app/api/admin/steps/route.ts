import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { stepCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/admin/steps — all steps in course order (for the editor list).
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const steps = await prisma.step.findMany({
    where: { courseId: 1 },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ steps });
}

// POST /api/admin/steps — append a new step at the end (order = max + 1).
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults apply
  }
  const parsed = stepCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const last = await prisma.step.findFirst({
    where: { courseId: 1 },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? 0) + 1;

  const step = await prisma.step.create({
    data: {
      courseId: 1,
      order: nextOrder,
      textContent: parsed.data.textContent,
    },
  });
  return NextResponse.json({ step }, { status: 201 });
}
