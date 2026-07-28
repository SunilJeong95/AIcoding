// Submission.photoPaths is stored as a JSON-encoded string (SQLite/D1 has no
// native array type) — every read/write must go through these two helpers so
// the external JSON HTTP API keeps returning real string[].

export function parsePhotoPaths(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function serializePhotoPaths(paths: string[]): string {
  return JSON.stringify(paths);
}
