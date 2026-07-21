import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { generateCodes, MAX_CODES } from "@/lib/codes";
import { codeGenerateSchema } from "@/lib/validation";

// POST /api/admin/codes/generate — body { count }. Generate N codes, clamped by
// the hard 100-code cap. Returns 409 when there is no capacity left.
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = codeGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  const result = await generateCodes(parsed.data.count);

  if (result.createdCount === 0) {
    return NextResponse.json(
      { error: `코드 수량이 최대 ${MAX_CODES}개에 도달했습니다` },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    createdCount: result.createdCount,
    capped: result.capped,
    codes: result.created.map((c) => ({ id: c.id, code: c.code })),
  });
}
