import { randomInt } from "crypto";
import type { EntryCode } from "@prisma/client";
import { prisma } from "@/lib/db";

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
// The count-then-insert runs inside a single transaction so two concurrent
// generate calls cannot both read an under-cap count and race past 100. Codes
// are guaranteed unique both within the batch and against existing rows.
export async function generateCodes(count: number): Promise<GenerateResult> {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.entryCode.count();
    const capacityBefore = Math.max(0, MAX_CODES - existingCount);
    const toCreate = Math.min(count, capacityBefore);

    const created: EntryCode[] = [];
    if (toCreate > 0) {
      const taken = new Set(
        (await tx.entryCode.findMany({ select: { code: true } })).map(
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
      for (const code of fresh) {
        created.push(await tx.entryCode.create({ data: { code } }));
      }
    }

    return {
      created,
      requested: count,
      createdCount: toCreate,
      capacityBefore,
      capped: toCreate < count,
    };
  });
}
