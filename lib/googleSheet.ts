// lib/googleSheet.ts
// Reads the "Pipeline vendeur" Google Sheet for closing %, notes, and follow-up dates.
// Uses a Google Service Account (server-side only) — the sheet must be shared with the
// service account's email (found in your service account JSON as "client_email").
// This avoids a full per-user OAuth flow, which is overkill for a solo internal tool.

import { google } from "googleapis";

const SHEET_ID = "1-TicSgs0Ds6-_6DOZ1m-7Bm2LVCM5eqNcFoe4-lJZBI";
const TAB_PREFIX = "Pipeline vendeur"; // the monthly tab is always named "Pipeline vendeur - <mois> '<an>"

export type ClosingRow = {
  dealName: string;
  amount: string;
  closingPercent: number;
  note: string;
  dateSuivi: string;
  repSection: string; // which "rep header" this row falls under in the sheet
};

function getAuth() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set in the environment.");
  }
  const credentials = JSON.parse(serviceAccountKey);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, janv: 1, janvier: 1,
  fev: 2, fév: 2, fevrier: 2, février: 2,
  mar: 3, mars: 3,
  avr: 4, avril: 4,
  mai: 5,
  juin: 6,
  juil: 7, juillet: 7, july: 7,
  aou: 8, aout: 8, août: 8, august: 8,
  sep: 9, sept: 9, septembre: 9,
  oct: 10, octobre: 10,
  nov: 11, novembre: 11,
  dec: 12, déc: 12, decembre: 12, décembre: 12,
};

/**
 * Parses a tab title like "Pipeline vendeur - juil '26" or "Pipeline vendeur - july '25"
 * into { month, year }, or null if it doesn't match the expected pattern.
 */
function parseTabDate(title: string): { month: number; year: number } | null {
  const match = title.match(/-\s*([a-zA-Zéûî]+)\.?\s*'?(\d{2,4})\s*$/);
  if (!match) return null;
  const monthKey = match[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const month = MONTH_MAP[monthKey] ?? MONTH_MAP[match[1].toLowerCase()];
  if (!month) return null;
  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;
  return { month, year };
}

/**
 * Finds the current "Pipeline vendeur - <mois>" tab automatically instead of
 * hardcoding a name that changes every month. Primary strategy: parse the
 * month/year out of each candidate title and match it against today's date
 * (handles the observed naming inconsistency, e.g. one historical tab named
 * in English "july '25" instead of French). If no title parses cleanly,
 * fall back to the highest `sheetId` (assigned once at tab creation, so the
 * newest tab has the highest id) as a best-effort guess.
 */
async function findCurrentMonthTab(sheets: ReturnType<typeof google.sheets>): Promise<string> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: "sheets.properties(title,sheetId)",
  });

  const candidates = (meta.data.sheets ?? [])
    .map((s) => s.properties)
    .filter((p): p is { title: string; sheetId: number } => !!p?.title?.startsWith(TAB_PREFIX));

  if (candidates.length === 0) {
    throw new Error(`No sheet tab starting with "${TAB_PREFIX}" was found.`);
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const exactMatch = candidates.find((c) => {
    const parsed = parseTabDate(c.title);
    return parsed && parsed.month === currentMonth && parsed.year === currentYear;
  });
  if (exactMatch) return exactMatch.title;

  // No exact match for the current month (e.g. the new tab hasn't been created
  // yet this month) — fall back to the most recent one we can parse.
  const parseable = candidates
    .map((c) => ({ c, parsed: parseTabDate(c.title) }))
    .filter((x): x is { c: { title: string; sheetId: number }; parsed: { month: number; year: number } } => !!x.parsed)
    .sort((a, b) => b.parsed.year * 12 + b.parsed.month - (a.parsed.year * 12 + a.parsed.month));
  if (parseable.length > 0) return parseable[0].c.title;

  // Last resort: highest sheetId (most recently created tab).
  const newest = candidates.reduce((a, b) => (b.sheetId > a.sheetId ? b : a));
  return newest.title;
}

/**
 * Reads the sheet and returns rows grouped under their rep section header
 * (e.g. "Slim", "Alexandre Paquet"), stopping logic mirrors what we found
 * manually: a bare name in column A with no other columns filled = a new
 * rep section starts.
 */
export async function getClosingRows(): Promise<{ rows: ClosingRow[]; tabUsed: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const tabName = await findCurrentMonthTab(sheets);

  // Google's A1 notation requires doubling an apostrophe that's part of the
  // sheet name itself (the tab is literally called "...juil '26").
  const escapedTab = tabName.replace(/'/g, "''");
  // Fetch from row 1 instead of assuming the rep sections always start at a
  // fixed row 13 — that assumption broke once the sheet's layout shifted
  // (e.g. a row was inserted above). Scanning from the top and detecting rep
  // headers dynamically is more robust to that kind of change.
  const range = `'${escapedTab}'!A1:L500`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });

  const rows = res.data.values ?? [];
  const parsed: ClosingRow[] = [];
  let currentRep = "";

  // Column layout (confirmed against the real sheet header row):
  // A=name(0) B=unused(1) C=amount(2) D=percent(3) E=produit logiciel(4)
  // F=produit LF1(5) G=MRR(6) H=cashflow(7) I=prob 3 mois(8) J=prob mois courant(9)
  // K=note(10) L=dateSuivi(11)
  for (const row of rows) {
    const name = row[0];
    const amount = row[2];
    const percent = row[3];
    const note = row[10];
    const dateSuivi = row[11];
    if (!name) continue;

    const isRepHeader = !amount && !percent; // bare name row = new rep section
    if (isRepHeader) {
      currentRep = name.trim();
      continue;
    }

    parsed.push({
      dealName: name.trim(),
      amount: amount ?? "",
      closingPercent: percent ? parseFloat(String(percent).replace("%", "").replace(",", ".")) : 0,
      note: note ?? "",
      dateSuivi: dateSuivi ?? "",
      repSection: currentRep,
    });
  }

  return { rows: parsed, tabUsed: tabName };
}
