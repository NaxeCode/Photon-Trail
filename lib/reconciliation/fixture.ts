// Every business, statement line, amount and annotation in this packet is invented.
import type { TransactionPage } from "./page";

export type BankEntry = {
  id: string;
  merchant: string;
  day: string;
  cents: number; // Debits are positive, following Plaid's transaction convention.
  category: string;
};

const press = {
  id: "NL-103",
  merchant: "Counterform Press",
  day: "2025-10-27",
  cents: 4800,
  category: "Shopping",
};
const freight = {
  id: "NL-106",
  merchant: "Finch Freight",
  day: "2025-10-31",
  cents: 2480,
  category: "Shipping",
};

export const opening: BankEntry[] = [
  { id: "NL-101", merchant: "Orbit Paper Mill", day: "2025-10-23", cents: 18640, category: "Materials" },
  { id: "NL-102", merchant: "Folio Type Foundry", day: "2025-10-25", cents: 7200, category: "Software" },
  press,
  { id: "NL-104", merchant: "Counterform Press", day: "2025-10-28", cents: 5470, category: "Shopping" },
  { id: "NL-105", merchant: "Milepost Hold", day: "2025-10-30", cents: 1600, category: "Travel" },
];

export const packet: TransactionPage<BankEntry> = {
  added: [freight],
  modified: [{ ...press, cents: 5470 }],
  removed: [{ transaction_id: "NL-105" }],
};

export const reviewCategories = [
  "Print production",
  "Shipping",
  "Materials",
  "Software",
  "Travel",
  "Shopping",
] as const;
export type ReviewCategory = (typeof reviewCategories)[number];

export type StatementLine = { ref: string; description: string; cents: number; day: string; memo: string };

export const lines: StatementLine[] = [
  {
    ref: "ST-301",
    description: "SQ *COUNTERFORM PRS",
    cents: 5470,
    day: "2025-10-28",
    memo: "Receipt CP-276 lists the Oct 27 proof run. The card settlement arrived a day later.",
  },
  {
    ref: "ST-302",
    description: "ACH ORBIT PAPER MIL",
    cents: 18640,
    day: "2025-10-24",
    memo: "Paper stock for the October edition.",
  },
  {
    ref: "ST-303",
    description: "FOLIO TYPE FOUNDRY",
    cents: 7200,
    day: "2025-10-25",
    memo: "License renewal for the studio's display face.",
  },
  {
    ref: "ST-304",
    description: "FINCH FRGHT #909",
    cents: 2480,
    day: "2025-10-31",
    memo: "Ground freight for the sample run.",
  },
  {
    ref: "ST-305",
    description: "TIDELINE CATERING",
    cents: 33850,
    day: "2025-10-29",
    memo: "A supplier invoice has no corresponding entry in this ledger.",
  },
];

// Answers are available only to the evaluation, never to the matcher.
export const labels: Record<string, string | null> = {
  "ST-301": "NL-103",
  "ST-302": "NL-101",
  "ST-303": "NL-102",
  "ST-304": "NL-106",
  "ST-305": null,
};
