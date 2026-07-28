import { randomInt } from "crypto";
import type { EntryCode } from "@prisma/client";
import { getDb } from "@/lib/db";

// Hard cap on total entry codes that can ever exist (spec §1 / plan §6 WU-2).
export const MAX_CODES = 100;

// Human-enterable alphabet: Crockford-style base32 minus ambiguous glyphs
// (0/O, 1/I/L) so codes are easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function makeCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export interface GenerateResult {
  created: EntryCode[];
  requested: number;
  createdCount: number;
  capacityBefore: number; // free slots before this call (MAX_CODES - existing)
  capped: boolean; // true when the request was clamped by the 100 cap
}

// Generate up to `count` new entry codes, enforcing the hard cap of 100 total.
//
// D1 has no transaction support, so the count-then-insert is two plain
// sequential statements rather than one atomic check-and-act — two
// concurrent generate calls could together slightly exceed the 100 cap.
// Accepted as a soft-cap risk on an admin-only, effectively single-operator
// tool. Codes are guaranteed unique both within the batch and against
// existing rows.
//
// Every insert is batched into one createManyAndReturn call — on Workers each
// round trip to the DB costs real latency, and a loop of individual create()
// calls for a full-size batch (up to 100) would be far slower.
export async function generateCodes(count: number): Promise<GenerateResult> {
  const prisma = getDb();
  const existingCount = await prisma.entryCode.count();
  const capacityBefore = Math.max(0, MAX_CODES - existingCount);
  const toCreate = Math.min(count, capacityBefore);

  let created: EntryCode[] = [];
  if (toCreate > 0) {
    const taken = new Set(
      (await prisma.entryCode.findMany({ select: { code: true } })).map(
        (c) => c.code,
      ),
    );
    const fresh: string[] = [];
    while (fresh.length < toCreate) {
      const candidate = makeCode();
      if (taken.has(candidate)) continue;
      taken.add(candidate);
      fresh.push(candidate);
    }
    created = await prisma.entryCode.createManyAndReturn({
      data: fresh.map((code) => ({ code })),
    });
  }

  return {
    created,
    requested: count,
    createdCount: toCreate,
    capacityBefore,
    capped: toCreate < count,
  };
}
