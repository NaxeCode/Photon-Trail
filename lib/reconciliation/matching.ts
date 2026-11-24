import type { BankEntry, StatementLine } from "./fixture";

export const minimumScore = 0.61;
export const ambiguityMargin = 0.08;

function normalize(s: string) {
  return s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function trigrams(text: string) {
  const counts = new Map<string, number>();
  const padded = ` ${normalize(text)} `;
  for (let i = 0; i + 3 <= padded.length; i++) {
    const gram = padded.slice(i, i + 3);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

// Fit inverse document frequency to active ledger merchants. Queries and labels
// never contribute to the corpus. Unseen query grams add norm but no dot product.
export function rank(line: StatementLine, ledger: BankEntry[]) {
  const documents = ledger.map((row) => trigrams(row.merchant));
  const df = new Map<string, number>();
  for (const doc of documents) {
    for (const gram of doc.keys()) df.set(gram, (df.get(gram) ?? 0) + 1);
  }
  function vector(counts: Map<string, number>) {
    return new Map(
      Array.from(counts, ([gram, tf]) => [
        gram,
        (1 + Math.log(tf)) * (1 + Math.log((documents.length + 1) / ((df.get(gram) ?? 0) + 1))),
      ]),
    );
  }
  const norm = (v: Map<string, number>) => Math.hypot(...v.values());
  const query = vector(trigrams(line.description));
  const queryNorm = norm(query);
  return ledger
    .map((row, index) => {
      const doc = vector(documents[index]);
      let dot = 0;
      for (const [gram, weight] of doc) dot += weight * (query.get(gram) ?? 0);
      const text = dot / (queryNorm * norm(doc) || 1);
      const centsApart = Math.abs(row.cents - line.cents);
      const daysApart = Math.abs(Date.parse(row.day) - Date.parse(line.day)) / 86_400_000;
      const amount = Math.max(0, 1 - centsApart / Math.max(100, Math.abs(line.cents) * 0.12));
      const date = Math.max(0, 1 - daysApart / 5);
      const score = 0.48 * text + 0.37 * amount + 0.15 * date;
      return { row, score, text, centsApart, daysApart };
    })
    .sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id));
}

export function assess(ranked: ReturnType<typeof rank>): "Unmatched" | "Close call" | "Suggested" {
  const [first, second] = ranked;
  if (!first || first.score < minimumScore) return "Unmatched";
  if (second && first.score - second.score < ambiguityMargin) return "Close call";
  return "Suggested";
}

export function evaluate(
  lines: StatementLine[],
  labels: Record<string, string | null>,
  ledger: BankEntry[],
) {
  let exact = 0;
  let ranked = 0;
  let close = 0;
  for (const line of lines) {
    const exactMatches = ledger.filter((row) => normalize(row.merchant) === normalize(line.description));
    const baseline = exactMatches.length === 1 ? exactMatches[0].id : null;
    const candidates = rank(line, ledger);
    const status = assess(candidates);
    const predicted = status === "Unmatched" ? null : candidates[0].row.id;
    if (baseline === labels[line.ref]) exact++;
    if (predicted === labels[line.ref]) ranked++;
    if (status === "Close call") close++;
  }
  return { exact, ranked, close, total: lines.length };
}
