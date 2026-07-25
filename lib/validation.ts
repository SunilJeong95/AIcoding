import { z } from "zod";

// The supported AI tools. Kept here so both student login and code
// generation validate against the same source of truth.
export const AI_TOOLS = [
  "Cursor",
  "Cursor 무료",
  "GitHub Copilot",
  "GitHub Copilot 무료",
  "Claude",
] as const;
export const aiToolSchema = z.enum(AI_TOOLS);

// Step content ("본문 내용") can read differently per AI tool — the paid and
// free tiers of the same tool share one variant, so this collapses down to 3
// buckets rather than one per AI_TOOLS entry.
export const CONTENT_TOOL_KEYS = ["Cursor", "GitHub Copilot", "Claude"] as const;
export type ContentToolKey = (typeof CONTENT_TOOL_KEYS)[number];

// Maps a student's chosen AI_TOOLS value to its content bucket. Returns null
// for anything unrecognized (e.g. a legacy "Codex" student from before that
// option was removed) — callers treat that the same as "not authored yet".
export function contentToolKeyFor(aiTool: string): ContentToolKey | null {
  if (aiTool === "Cursor" || aiTool === "Cursor 무료") return "Cursor";
  if (aiTool === "GitHub Copilot" || aiTool === "GitHub Copilot 무료") return "GitHub Copilot";
  if (aiTool === "Claude") return "Claude";
  return null;
}

export const textContentByToolSchema = z
  .object({
    Cursor: z.string().max(20000),
    "GitHub Copilot": z.string().max(20000),
    Claude: z.string().max(20000),
  })
  .partial();
export type TextContentByTool = z.infer<typeof textContentByToolSchema>;

// Guarantees all 3 keys are present as strings — the admin editor always
// wants a definite value per tab, even for a step that predates this feature
// or has never had a given tool's variant written.
export function normalizeTextContentByTool(raw: unknown): Record<ContentToolKey, string> {
  const byTool = (raw ?? {}) as TextContentByTool;
  return {
    Cursor: byTool["Cursor"] ?? "",
    "GitHub Copilot": byTool["GitHub Copilot"] ?? "",
    Claude: byTool["Claude"] ?? "",
  };
}

// POST /api/student/login
export const studentLoginSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요").max(50),
  employeeId: z.string().trim().min(1, "사번을 입력하세요").max(50),
  aiTool: aiToolSchema,
  code: z.string().trim().min(1, "참가 코드를 입력하세요").max(64),
});
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

// POST /api/student/submit — the client may hint a stepId, but the server MUST
// derive the real target from currentStepOrder (WU-1 auth-bypass guard). Kept
// optional here so the handler can compare, never trust.
export const submitSchema = z.object({
  stepId: z.string().trim().min(1).optional(),
});
export type SubmitInput = z.infer<typeof submitSchema>;

// POST /api/admin/login
export const adminLoginSchema = z.object({
  code: z.string().trim().min(1, "관리자 코드를 입력하세요").max(128),
  name: z.string().trim().min(1, "이름을 입력하세요").max(50),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// POST /api/admin/codes/generate — hard cap of 100 total enforced in the handler.
export const codeGenerateSchema = z.object({
  count: z.coerce.number().int().min(1).max(100),
});
export type CodeGenerateInput = z.infer<typeof codeGenerateSchema>;

// POST /api/admin/steps  (create)
export const stepCreateSchema = z.object({
  topic: z.string().trim().min(1, "주제를 입력하세요").max(200),
  textContentByTool: textContentByToolSchema.optional().default({}),
});
export type StepCreateInput = z.infer<typeof stepCreateSchema>;

// PUT /api/admin/steps/[id]  (update)
export const stepUpdateSchema = z.object({
  topic: z.string().trim().min(1, "주제를 입력하세요").max(200).optional(),
  textContentByTool: textContentByToolSchema.optional(),
  requiresUpload: z.boolean().optional(),
});
export type StepUpdateInput = z.infer<typeof stepUpdateSchema>;
