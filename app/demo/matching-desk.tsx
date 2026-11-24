"use client";

import { Check, ChevronDown, GitCompareArrows, Info, Scale } from "lucide-react";
import { labels, lines, type StatementLine } from "@/lib/reconciliation/fixture";
import { assess, evaluate, rank } from "@/lib/reconciliation/matching";
import { initialStudio, runImport, type Studio } from "@/lib/reconciliation/studio";
import { dayLabel, dollars } from "@/lib/reconciliation/format";

function Receipt({ line }: { line: StatementLine }) {
  return (
    <div className="pt-receipt">
      <div>
        <code>{line.ref}</code>
        <strong>{line.description}</strong>
        <small>{dayLabel(line.day)} · Card statement</small>
      </div>
      <b>{dollars(line.cents)}</b>
    </div>
  );
}

export function LedgerMatches({
  state,
  selected,
  select,
  save,
}: {
  state: Studio;
  selected: string;
  select: (ref: string) => void;
  save: (id: string | null) => void;
}) {
  const line = lines.find((x) => x.ref === selected)!;
  const active = state.entries.filter((row) => !row.removed);
  const ranked = rank(line, active);
  const status = assess(ranked);
  const stored = state.decisions[selected];
  const count = Object.keys(state.decisions).length;
  return (
    <>
      <div className="pt-panel-heading">
        <div>
          <div className="pt-panel-kicker">
            <GitCompareArrows size={15} /> Statement to ledger
          </div>
          <h2>Match review</h2>
        </div>
        <div className="pt-summary">
          <span>Decisions saved</span>
          <strong>
            {count} / {lines.length}
          </strong>
        </div>
      </div>
      <label className="pt-labeled-select">
        Statement line
        <span className="pt-select">
          <select value={selected} onChange={(e) => select(e.target.value)}>
            {lines.map((l) => (
              <option value={l.ref} key={l.ref}>
                {l.ref} · {l.description}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </span>
      </label>
      <Receipt line={line} />
      <p className="pt-receipt-note">
        <Info size={15} />
        <span>{line.memo}</span>
      </p>
      {stored && !active.some((row) => row.id === stored) && (
        <p className="pt-alert">
          Your saved match {stored} was removed from the feed. Review it and choose a replacement or leave
          it unmatched.
        </p>
      )}
      <div className="pt-section-title pt-match-title">
        <h3>Ranked candidates</h3>
        <span className={status === "Suggested" ? "pt-tag pt-manual" : "pt-tag pt-review"}>{status}</span>
      </div>
      <p className="pt-helper">
        {status === "Unmatched"
          ? "No candidate reaches 61/100. You can leave the line unmatched."
          : status === "Close call"
            ? "The two best scores are within 8 points. Use the receipt to choose the entry."
            : "Review the date, amount and merchant before confirming a match."}
      </p>
      {ranked.slice(0, 2).map(({ row, score, text, centsApart, daysApart }) => {
        const claimed = Object.entries(state.decisions).some(
          ([ref, id]) => ref !== selected && id === row.id,
        );
        return (
          <div className="pt-candidate" key={row.id}>
            <div className="pt-candidate-head">
              <div>
                <strong>{row.merchant}</strong>
                <span>
                  {row.id} · {dayLabel(row.day)} · {dollars(row.cents)}
                </span>
              </div>
              <b>
                {Math.round(score * 100)}
                <small>/100</small>
              </b>
            </div>
            <p>
              {Math.round(text * 100)}% text similarity ·{" "}
              {centsApart ? dollars(centsApart) + " apart" : "exact amount"} ·{" "}
              {daysApart ? `${daysApart}d apart` : "same day"}
            </p>
            <button
              className="pt-secondary"
              disabled={stored === row.id || claimed}
              onClick={() => save(row.id)}
            >
              {stored === row.id ? (
                <>
                  <Check size={14} /> Confirmed {row.id}
                </>
              ) : claimed ? (
                "Claimed by another line"
              ) : (
                `Confirm ${row.id}`
              )}
            </button>
          </div>
        );
      })}
      <div className="pt-match-footer">
        <button className="pt-quiet" disabled={stored === null} onClick={() => save(null)}>
          {stored === null ? "Saved as unmatched" : "Leave unmatched"}
        </button>
        {stored !== undefined && <span>Saved decision · {stored ?? "no match"}</span>}
      </div>
    </>
  );
}

export function MatchingEvaluation() {
  const ledger = runImport(initialStudio()).state.entries.filter((r) => !r.removed);
  const result = evaluate(lines, labels, ledger);
  return (
    <>
      <div className="pt-panel-heading">
        <div>
          <div className="pt-panel-kicker">
            <Scale size={15} /> Labeled sample
          </div>
          <h2>Matching evaluation</h2>
        </div>
      </div>
      <p className="pt-intro">
        Five hand-labeled statement lines against the completed October ledger. A correct outcome is the
        expected entry ID or a correct abstention.
      </p>
      <div className="pt-benchmark">
        <div>
          <span>Exact merchant text</span>
          <strong>
            {result.exact} / {result.total}
          </strong>
        </div>
        <div>
          <span>Weighted ranker</span>
          <strong>
            {result.ranked} / {result.total}
          </strong>
        </div>
      </div>
      <p className="pt-helper">
        The ranker blends merchant trigram TF-IDF cosine similarity (48%), amount proximity (37%) and date
        proximity (15%). Below 61/100 it abstains. A margin under 8 points flags a close call. Scores
        measure fit, not probability.
      </p>
      <table className="pt-eval">
        <caption className="pt-sr">Weighted ranker outcomes on the completed packet</caption>
        <thead>
          <tr>
            <th>Line</th>
            <th>Expected</th>
            <th>Ranked</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const candidates = rank(line, ledger);
            const predicted = assess(candidates) === "Unmatched" ? null : candidates[0].row.id;
            return (
              <tr key={line.ref}>
                <td>{line.ref}</td>
                <td>{labels[line.ref] ?? "Unmatched"}</td>
                <td>
                  <span className={predicted === labels[line.ref] ? "" : "pt-miss"}>
                    {predicted ?? "Unmatched"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="pt-eval-note">
        <strong>Why the close call misses</strong>
        <p>
          Two Counterform receipts settle for $54.70. The later ledger date ranks first. The proof-run
          receipt identifies the Oct 27 entry. The review desk lets the operator preserve that choice.
        </p>
      </div>
      <p className="pt-helper">
        The exact baseline chooses a unique normalized merchant name or abstains. This designed fixture
        demonstrates behavior on five cases. It provides no estimate of performance on real accounts.
      </p>
    </>
  );
}
