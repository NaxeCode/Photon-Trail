"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FlaskConical,
  FolderOpen,
  GitCompareArrows,
  HardDrive,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import {
  lines,
  opening,
  packet,
  reviewCategories,
  type ReviewCategory,
} from "@/lib/reconciliation/fixture";
import { effectiveCategory } from "@/lib/reconciliation/page";
import {
  decide,
  initialStudio,
  restore,
  runImport,
  setCategory,
  type Entry,
  type Studio,
} from "@/lib/reconciliation/studio";
import { dayLabel, dollars } from "@/lib/reconciliation/format";
import { LedgerMatches, MatchingEvaluation } from "./matching-desk";

export const storageKey = "photon-trail.studio.v1";
const tabs = [
  { title: "Ledger", icon: BookOpen },
  { title: "Match review", icon: GitCompareArrows },
  { title: "Evaluation", icon: FlaskConical },
] as const;
type Tab = (typeof tabs)[number]["title"];

function Statement({
  state,
  lastImport,
  onRun,
}: {
  state: Studio;
  lastImport: string;
  onRun: (interrupt?: boolean) => void;
}) {
  const complete = state.cursor === "OCT-018";
  const previous = opening.find((r) => r.id === packet.modified[0].id)!;
  const removed = opening.find((r) => r.id === packet.removed[0].transaction_id)!;
  return (
    <aside className="pt-source" aria-label="Fictional bank statement packet">
      <div className="pt-jacket">
        <div className="pt-engraving" aria-hidden="true" />
        <div className="pt-sheet-top">
          <span>
            <FileText size={15} /> Source statement
          </span>
          <span>Packet 18</span>
        </div>
        <h2>
          October <br />
          statement
        </h2>
        <div className="pt-sheet-foot">
          <span>Northline Print Co.</span>
          <span>2025</span>
        </div>
      </div>
      <div className="pt-packet">
        <div className="pt-section-title">
          <h3>Incoming changes</h3>
          <span className="pt-count">3</span>
        </div>
        <div className="pt-change">
          <i className="pt-change-symbol pt-add">+</i>
          <div>
            <strong>{packet.added[0].merchant}</strong>
            <small>Added · {dollars(packet.added[0].cents)}</small>
          </div>
        </div>
        <div className="pt-change">
          <i className="pt-change-symbol pt-edit">≈</i>
          <div>
            <strong>{previous.merchant}</strong>
            <small>
              Modified · {dollars(previous.cents)} → {dollars(packet.modified[0].cents)}
            </small>
          </div>
        </div>
        <div className="pt-change">
          <i className="pt-change-symbol pt-remove">−</i>
          <div>
            <strong>{removed.merchant}</strong>
            <small>Removed · {dollars(removed.cents)} hold</small>
          </div>
        </div>
        <button className="pt-primary pt-import" onClick={() => onRun()}>
          {complete || state.interrupted ? <RotateCcw size={16} /> : <Play size={15} />}{" "}
          {complete ? "Replay import" : state.interrupted ? "Retry interrupted import" : "Apply import"}
        </button>
        {!complete && !state.interrupted && (
          <button className="pt-quiet pt-interrupt" onClick={() => onRun(true)}>
            <Pause size={13} />
            Simulate interruption
          </button>
        )}
        <div className="pt-cursor">
          <span>
            <HardDrive size={14} /> Checkpoint
          </span>
          <code>{state.cursor}</code>
        </div>
        {lastImport && !state.interrupted && <p className="pt-import-result">{lastImport}</p>}
        {state.interrupted && (
          <p className="pt-alert">
            Two writes landed before the interruption. Retry this packet to record its removal and advance
            the checkpoint.
          </p>
        )}
      </div>
    </aside>
  );
}

function Ledger({
  state,
  selected,
  select,
  save,
}: {
  state: Studio;
  selected: string;
  select: (id: string) => void;
  save: (id: string, value: ReviewCategory) => void;
}) {
  const entries = state.entries
    .slice()
    .sort((a, b) => b.day.localeCompare(a.day) || a.id.localeCompare(b.id));
  const row = entries.find((r) => r.id === selected) ?? entries[0];
  const active = entries.filter((r) => !r.removed);
  return (
    <>
      <div className="pt-panel-heading">
        <div>
          <div className="pt-panel-kicker">
            <BookOpen size={15} /> Operating account
          </div>
          <h2>Transaction ledger</h2>
        </div>
        <div className="pt-summary">
          <span>Active debits</span>
          <strong>{dollars(active.reduce((total, r) => total + r.cents, 0))}</strong>
        </div>
      </div>
      <div className="pt-table-wrap">
        <table className="pt-ledger">
          <thead>
            <tr>
              <th>Merchant / date</th>
              <th>Category</th>
              <th>Debit</th>
              <th>
                <span className="pt-sr">Inspect</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r) => (
              <tr key={r.id} data-selected={row.id === r.id} data-removed={r.removed}>
                <td>
                  <button
                    onClick={() => select(r.id)}
                    aria-label={`Inspect ${r.merchant}, ${r.id}`}
                    aria-pressed={row.id === r.id}
                  >
                    <span>{r.merchant}</span>
                    <small>
                      {dayLabel(r.day)} <b>·</b> {r.id}
                    </small>
                  </button>
                </td>
                <td>
                  {r.removed ? (
                    <span className="pt-tag pt-void">Removed</span>
                  ) : (
                    <span className={r.manualCategory ? "pt-tag pt-manual" : ""}>
                      {effectiveCategory({ ...r, aiCategory: null })}
                    </span>
                  )}
                </td>
                <td>{dollars(r.cents)}</td>
                <td aria-hidden="true">
                  <ChevronRight size={14} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pt-rowcount">
        {active.length} active {active.length === 1 ? "entry" : "entries"} ·{" "}
        {entries.length - active.length} removed
      </div>
      <Category key={row.id + (row.manualCategory ?? "")} row={row} save={save} />
    </>
  );
}

function Category({ row, save }: { row: Entry; save: (id: string, value: ReviewCategory) => void }) {
  const [choice, setChoice] = useState<ReviewCategory>(
    row.manualCategory ??
      (row.category === "Shopping" ? "Print production" : (row.category as ReviewCategory)),
  );
  return (
    <section className="pt-inspector">
      <div className="pt-inspector-heading">
        <span>
          <ScanLine size={15} /> Entry detail
        </span>
        <code>{row.id}</code>
      </div>
      <h3>{row.merchant}</h3>
      <p>
        {row.removed ? (
          "The bank withdrew this entry. Its record stays visible and its debit is excluded from the total."
        ) : (
          <>
            Bank category <strong>{row.category}</strong>.{" "}
            {row.manualCategory ? (
              <>
                Your override <strong>{row.manualCategory}</strong> takes precedence on replay.
              </>
            ) : (
              "A manual category stays attached to this transaction ID on replay."
            )}
          </>
        )}
      </p>
      {!row.removed && (
        <form
          className="pt-inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            save(row.id, choice);
          }}
        >
          <label className="pt-select">
            <span className="pt-sr">Manual category</span>
            <select value={choice} onChange={(event) => setChoice(event.target.value as ReviewCategory)}>
              {reviewCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <button className="pt-secondary" type="submit" disabled={choice === row.manualCategory}>
            {choice === row.manualCategory ? (
              <>
                <Check size={14} /> Saved override
              </>
            ) : (
              "Save override"
            )}
          </button>
        </form>
      )}
    </section>
  );
}

export function ReconciliationStudio() {
  const [state, setState] = useState<Studio>(initialStudio);
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState(true);
  const [tab, setTab] = useState<Tab>("Ledger");
  const [selected, select] = useState("NL-103");
  const [ref, setRef] = useState(lines[0].ref);
  const [lastImport, recordImport] = useState("");
  const [message, announce] = useState("");
  useEffect(() => {
    try {
      setState(restore(sessionStorage.getItem(storageKey)));
    } catch {
      setStorage(false);
    }
    setReady(true);
  }, []);
  function commit(next: Studio, note: string) {
    setState(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorage(false);
    }
    announce(note);
  }
  function onRun(interrupt = false) {
    const result = runImport(state, interrupt);
    const resultText =
      result.changed === 1 ? "1 ledger entry changed" : `${result.changed} ledger entries changed`;
    recordImport(
      `${resultText}. ${result.changed === 0 ? "All IDs and review decisions were retained." : "Bank feed applied."}`,
    );
    commit(
      result.state,
      interrupt
        ? `Import interrupted. ${resultText}. Checkpoint held at ${state.cursor}.`
        : `${resultText}. Checkpoint ${result.state.cursor}. ${result.changed === 0 ? "Replay preserved every entry and review decision." : "Import complete."}`,
    );
  }
  function reset() {
    commit(initialStudio(), "Sample restored to the opening ledger.");
    recordImport("");
    select("NL-103");
    setRef(lines[0].ref);
    setTab("Ledger");
  }
  return (
    <main className="pt-studio">
      <header className="pt-mast">
        <div className="pt-mast-inner">
          <div className="pt-wordmark">
            <span className="pt-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Photon Trail
          </div>
          <span className="pt-mast-divider" />
          <span className="pt-product">Reconciliation studio</span>
          <span className="pt-sample">
            <span />
            Fictional workspace
          </span>
        </div>
      </header>
      <div className="pt-workspace">
        <div className="pt-breadcrumb">
          <FolderOpen size={15} /> Workspaces <ChevronRight size={12} /> <span>Northline Print Co.</span>
        </div>
        <div className="pt-heading">
          <div>
            <h1>October reconciliation</h1>
            <p>Reconcile the bank feed and review statement matches for the studio’s month-end close.</p>
          </div>
          <button className="pt-reset" disabled={!ready} onClick={reset}>
            <RotateCcw size={14} /> Reset sample
          </button>
        </div>
        <a href="#pt-register" className="pt-skip">
          Jump to register <ArrowRight size={14} />
        </a>
        <div className="pt-columns" aria-busy={!ready}>
          <fieldset disabled={!ready} className="pt-source-field">
            <legend className="pt-sr">Import controls</legend>
            <Statement state={state} lastImport={lastImport} onRun={onRun} />
          </fieldset>
          <section className="pt-register" id="pt-register" aria-label="Reconciliation register">
            <nav className="pt-tabs" aria-label="Register views">
              {tabs.map(({ title, icon: Icon }) => (
                <button
                  key={title}
                  aria-current={tab === title ? "page" : undefined}
                  onClick={() => setTab(title)}
                >
                  <Icon size={16} />
                  {title}
                </button>
              ))}
            </nav>
            <fieldset disabled={!ready} className="pt-panel">
              <legend className="pt-sr">{tab}</legend>
              {tab === "Ledger" ? (
                <Ledger
                  state={state}
                  selected={selected}
                  select={select}
                  save={(id, value) => commit(setCategory(state, id, value), `Saved ${value} for ${id}.`)}
                />
              ) : tab === "Match review" ? (
                <LedgerMatches
                  state={state}
                  selected={ref}
                  select={setRef}
                  save={(id) => {
                    const next = decide(state, ref, id);
                    if (next !== state) commit(next, `Saved ${ref} as ${id ?? "unmatched"}.`);
                  }}
                />
              ) : (
                <MatchingEvaluation />
              )}
            </fieldset>
          </section>
        </div>
        <div className="pt-notice" role="status">
          {message && (
            <>
              <Check size={16} />
              {message}
            </>
          )}
        </div>
        <footer className="pt-footer">
          <span>
            <HardDrive size={14} />
            {storage
              ? "Changes stay in this browser tab, including after refresh."
              : "Tab storage is unavailable. Changes last until refresh."}
          </span>
          <span>Fictional transactions · USD</span>
        </footer>
      </div>
    </main>
  );
}
