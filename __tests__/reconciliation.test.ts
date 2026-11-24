import { labels, lines, type StatementLine } from "@/lib/reconciliation/fixture";
import { assess, evaluate, rank } from "@/lib/reconciliation/matching";
import { effectiveCategory } from "@/lib/reconciliation/page";
import { decide, initialStudio, restore, runImport, setCategory } from "@/lib/reconciliation/studio";

const completed = runImport(initialStudio()).state;
const active = completed.entries.filter((r) => !r.removed);

it("retries from partial writes and commits the cursor only after the removal", () => {
  const partial = runImport(initialStudio(), true);
  expect(partial.changed).toBe(2);
  expect(partial.state.cursor).toBe("OCT-017");
  expect(partial.state.entries.filter((x) => !x.removed)).toHaveLength(6);
  const retry = runImport(restore(JSON.stringify(partial.state)));
  expect(retry.changed).toBe(1);
  expect(retry.state).toEqual(completed);
  expect(retry.state.cursor).toBe("OCT-018");
  expect(active).toHaveLength(5);
  expect(active.reduce((total, r) => total + r.cents, 0)).toBe(39260);
  expect(runImport(retry.state)).toEqual({ state: completed, changed: 0 });
});

it("retains the reviewer's category, raw source and second-ranked choice on replay and refresh", () => {
  let state = setCategory(initialStudio(), "NL-103", "Print production");
  state = decide(runImport(state, true).state, "ST-301", "NL-103");
  const final = runImport(restore(JSON.stringify(state))).state;
  const row = final.entries.find((r) => r.id === "NL-103")!;
  expect(row).toMatchObject({ cents: 5470, manualCategory: "Print production", category: "Shopping" });
  expect(effectiveCategory({ ...row, aiCategory: null })).toBe("Print production");
  expect(runImport(final).state.decisions["ST-301"]).toBe("NL-103");
});

it("prevents duplicate, unknown and withdrawn matches and allows an explicit abstention", () => {
  const reviewed = decide(completed, "ST-301", "NL-103");
  expect(decide(reviewed, "ST-302", "NL-103")).toBe(reviewed);
  expect(decide(reviewed, "ST-302", "NL-105")).toBe(reviewed);
  expect(decide(reviewed, "ST-999", "NL-104")).toBe(reviewed);
  expect(decide(reviewed, "ST-301", null).decisions).toEqual({ "ST-301": null });
});

it("recovers the sample from malformed, obsolete or inconsistent session data", () => {
  for (const raw of [
    "unparseable",
    "{}",
    JSON.stringify({ ...completed, entries: [] }),
    JSON.stringify({ ...completed, decisions: { "ST-301": "not-in-packet" } }),
  ]) {
    expect(restore(raw)).toEqual(initialStudio());
  }
});

it("exposes the miss and component evidence for two equal-amount candidates", () => {
  const result = rank(lines[0], active);
  expect(assess(result)).toBe("Close call");
  const [first, second] = result;
  expect([first.row.id, second.row.id]).toEqual(["NL-104", "NL-103"]);
  expect([first.daysApart, second.daysApart]).toEqual([0, 1]);
  expect(first.centsApart).toBe(0);
  expect(first.text).toBe(second.text);
  expect(second.row.id).toBe(labels[lines[0].ref]);
});

it("compares every labeled line including abstentions against the exact baseline", () => {
  expect(Object.keys(labels).sort()).toEqual(lines.map((line) => line.ref).sort());
  expect(evaluate(lines, labels, active)).toEqual({ exact: 2, ranked: 4, close: 1, total: 5 });
  expect(assess(rank(lines[4], active))).toBe("Unmatched");
  expect(assess(rank(lines[4], []))).toBe("Unmatched");
});

it("ranks a new, unlabeled statement description using the ledger corpus", () => {
  const unseen: StatementLine = { ...lines[1], ref: "unseen", description: "Orbit Papermill ACH 93" };
  const result = rank(unseen, active.slice().reverse());
  expect(result[0].row.id).toBe("NL-101");
  expect(assess(result)).toBe("Suggested");
});
