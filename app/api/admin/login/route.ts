import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";

// Constant-time comparison of the shared admin code to avoid leaking length/
// prefix info via response timing.
function codeMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// In-memory brute-force throttle for the shared ADMIN_CODE. A module-level Map is
// sufficient for this single-process self-hosted tool (no Redis/external store).
// Only failed attempts count; a successful login clears the caller's record.
const MAX_FAILED_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Returns true if the caller is currently locked out.
function isLockedOut(key: string): boolean {
  const rec = failedAttempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return rec.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const rec = failedAttempts.get(key);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAt: now });
    return;
  }
  rec.count += 1;
}

// POST /api/admin/login — shared ADMIN_CODE + typed name (spec §4, no accounts).
// Each successful login mints its own Session row so multiple admins can be
// active concurrently as distinct lock owners.
export async function POST(req: NextRequest) {
  const prisma = getDb();
  const adminCode = process.env.ADMIN_CODE;
  if (!adminCode) {
    return NextResponse.json(
      { error: "서버 설정 오류: 관리자 코드가 설정되지 않았습니다" },
      { status: 500 },
    );
  }

  const key = clientKey(req);
  if (isLockedOut(key)) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429, headers: { "Retry-After": "300" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  if (!codeMatches(parsed.data.code, adminCode)) {
    recordFailure(key);
    return NextResponse.json(
      { error: "관리자 코드가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  failedAttempts.delete(key);

  const sessionRow = await prisma.session.create({
    data: { kind: "admin", name: parsed.data.name },
  });

  const session = await getSession();
  session.admin = { adminSessionId: sessionRow.id, name: parsed.data.name };
  await session.save();

  return NextResponse.json({ ok: true, name: parsed.data.name });
}
