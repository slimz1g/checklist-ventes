// lib/team.ts
// Single source of truth for the sales team roster.
// Add/remove reps here — everything else picks it up automatically.

export type SalesRep = {
  id: string;
  name: string;
  firstName: string;
  isSDR: boolean; // SDRs see different sections (no closing deals, no Objectif du mois)
  sheetSection: string[]; // all name variants used in the Google Sheet to identify this rep's section
};

export const SALES_REPS: SalesRep[] = [
  {
    id: "17032870",
    name: "Alexandre Paquet",
    firstName: "Alexandre",
    isSDR: false,
    sheetSection: ["alexandre paquet", "alexandre"],
  },
  {
    id: "482258542",
    name: "Sana Ghenie",
    firstName: "Sana",
    isSDR: true,
    sheetSection: ["sana ghenie", "sana"],
  },
  {
    id: "396827993",
    name: "Slim Labassi",
    firstName: "Slim",
    isSDR: false,
    sheetSection: ["slim labassi", "slim"],
  },
];

export const DEFAULT_REP_ID = SALES_REPS[2].id; // Slim — change if needed

export function findRep(repId: string): SalesRep | null {
  return SALES_REPS.find((r) => r.id === repId) ?? null;
}

export function isTeamView(repId: string): boolean {
  return repId === "team";
}
