import { z } from "zod";
import { lines, opening, packet, reviewCategories, type BankEntry, type ReviewCategory } from "./fixture";
import { pageWrites } from "./page";

const baseCursor = "OCT-017";
const nextCursor = "OCT-018";
const entrySchema = z.object({
  id: z.string(),
  merchant: z.string(),
  day: z.string(),
  cents: z.number().int(),
  category: z.string(),
  manualCategory: z.enum(reviewCategories).nullable(),
  removed: z.boolean(),
});
const snapshotSchema = z.object({
  version: z.literal(1),
  cursor: z.enum([baseCursor, nextCursor]),
  interrupted: z.boolean(),
  entries: z.array(entrySchema),
  decisions: z.record(z.string(), z.string().nullable()),
});
export type Studio = z.infer<typeof snapshotSchema>;
export type Entry = Studio["entries"][number];

function entry(bank: BankEntry): Entry {
  return { ...bank, removed: false, manualCategory: null };
}
export function initialStudio(): Studio {
  return { version: 1, cursor: baseCursor, interrupted: false, entries: opening.map(entry), decisions: {} };
}

export function runImport(state: Studio, interrupt = false) {
  const rows = new Map(state.entries.map((row) => [row.id, row]));
  let changed = 0;
  for (const write of pageWrites(packet)) {
    if (write.kind === "removed") {
      // Model a process stopping after durable upserts and before removal/checkpoint.
      if (interrupt && state.cursor === baseCursor) {
        return { state: { ...state, entries: [...rows.values()], interrupted: true }, changed };
      }
      for (const id of write.ids) {
        const old = rows.get(id);
        if (old && !old.removed) {
          rows.set(id, { ...old, removed: true });
          changed++;
        }
      }
    } else {
      for (const bank of write.rows) {
        const old = rows.get(bank.id);
        const next = { ...entry(bank), manualCategory: old?.manualCategory ?? null };
        if (
          !old ||
          old.removed ||
          old.cents !== next.cents ||
          old.merchant !== next.merchant ||
          old.category !== next.category ||
          old.day !== next.day
        )
          changed++;
        rows.set(bank.id, next);
      }
    }
  }
  return {
    state: {
      ...state,
      cursor: nextCursor,
      interrupted: false,
      entries: [...rows.values()],
    } satisfies Studio,
    changed,
  };
}

export function setCategory(state: Studio, id: string, value: ReviewCategory): Studio {
  return {
    ...state,
    entries: state.entries.map((row) =>
      row.id === id && !row.removed ? { ...row, manualCategory: value } : row,
    ),
  };
}

export function decide(state: Studio, ref: string, id: string | null): Studio {
  if (!lines.some((line) => line.ref === ref)) return state;
  if (id !== null && !state.entries.some((row) => row.id === id && !row.removed)) return state;
  // Prevent a second statement line from claiming an entry already confirmed here.
  if (
    id !== null &&
    Object.entries(state.decisions).some(([key, existing]) => key !== ref && existing === id)
  )
    return state;
  return { ...state, decisions: { ...state.decisions, [ref]: id } };
}

// Recover only states that can be produced by this version of the fictional packet.
export function restore(raw: string | null): Studio {
  if (!raw) return initialStudio();
  try {
    const state = snapshotSchema.parse(JSON.parse(raw));
    const reference =
      state.cursor === nextCursor
        ? runImport(initialStudio()).state
        : state.interrupted
          ? runImport(initialStudio(), true).state
          : initialStudio();
    if (reference.entries.length !== state.entries.length) return initialStudio();
    for (const expected of reference.entries) {
      const actual = state.entries.find((row) => row.id === expected.id);
      if (
        !actual ||
        actual.merchant !== expected.merchant ||
        actual.cents !== expected.cents ||
        actual.day !== expected.day ||
        actual.category !== expected.category ||
        actual.removed !== expected.removed
      )
        return initialStudio();
    }
    if (state.interrupted !== reference.interrupted) return initialStudio();
    const ids = new Set(state.entries.map((row) => row.id));
    const refs = new Set(lines.map((line) => line.ref));
    const claimed = new Set<string>();
    for (const [ref, id] of Object.entries(state.decisions)) {
      if (!refs.has(ref) || (id !== null && (!ids.has(id) || claimed.has(id)))) return initialStudio();
      if (id !== null) claimed.add(id);
    }
    return state;
  } catch {
    return initialStudio();
  }
}
