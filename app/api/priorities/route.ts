// app/api/priorities/route.ts
// Aggregates HubSpot + Google Sheet + Fireflies into the 6-tier priority list
// documented in "Check-list_des_ventes_Reference.md". This is the real logic —
// no hardcoded example data.

import { NextResponse } from "next/server";
import {
  searchDeals,
  getOverdueTasks,
  getPrimaryContactPhone,
  hubspotDealUrl,
  PIPELINES,
  STAGES,
} from "@/lib/hubspot";
import { getClosingRows } from "@/lib/googleSheet";
import { findTranscriptByParticipant, firefliesRecordingUrl } from "@/lib/fireflies";

const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID!;
const OWNER_ID = process.env.HUBSPOT_OWNER_ID!; // Slim, for the solo deployment

const HOURS_48 = 48 * 60 * 60 * 1000;
const DAYS_60 = 60 * 24 * 60 * 60 * 1000;

function hoursSince(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function daysSince(dateStr: string | undefined): number | null {
  const h = hoursSince(dateStr);
  return h === null ? null : Math.floor(h / 24);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  try {
    // Calls run sequentially with a small delay between each — HubSpot's
    // per-second burst limit rejects too many simultaneous requests (this is
    // what caused the 429 RATE_LIMIT error during first testing).
    const closingSheetRows = await getClosingRows();
    await sleep(150);

    const entonnoirDeals = await searchDeals(
      [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINES.ENTONNOIR },
            { propertyName: "hs_is_closed", operator: "EQ", value: "false" },
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
          ],
        },
      ],
      ["dealname", "dealstage", "notes_last_contacted", "notes_next_activity_date", "amount", "closedate"],
      100
    );
    await sleep(150);

    const inboundFreshDeals = await searchDeals(
      [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINES.INBOUND },
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
            {
              propertyName: "dealstage",
              operator: "IN",
              values: [
                STAGES.INBOUND_SQL,
                STAGES.INBOUND_1ER_SUIVI,
                STAGES.INBOUND_2E_SUIVI,
                STAGES.INBOUND_3E_SUIVI,
              ],
            },
          ],
        },
      ],
      ["dealname", "dealstage", "notes_last_contacted"],
      100
    );
    await sleep(150);

    const outboundNoShowDeals = await searchDeals(
      [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINES.OUTBOUND_COLD_EMAIL },
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
            { propertyName: "dealstage", operator: "EQ", value: STAGES.OUTBOUND_NO_SHOW },
          ],
        },
      ],
      ["dealname", "notes_last_contacted"],
      50
    );
    await sleep(150);

    const rvPlanifieInbound = await searchDeals(
      [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINES.INBOUND },
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
            { propertyName: "dealstage", operator: "EQ", value: STAGES.INBOUND_RV_PLANIFIE },
          ],
        },
      ],
      ["dealname", "closedate"],
      50
    );
    await sleep(150);

    const rdvPlanifieOutbound = await searchDeals(
      [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINES.OUTBOUND_COLD_EMAIL },
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
            { propertyName: "dealstage", operator: "EQ", value: STAGES.OUTBOUND_RDV_PLANIFIE },
          ],
        },
      ],
      ["dealname", "closedate"],
      50
    );
    await sleep(150);

    const remisEtBougePas = await searchDeals(
      [
        {
          filters: [
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
            {
              propertyName: "dealstage",
              operator: "IN",
              values: [
                STAGES.REMIS_A_PLUS_TARD_ENTONNOIR,
                STAGES.NE_BOUGE_PAS_ENTONNOIR,
                STAGES.INBOUND_BOUGE_PAS,
                STAGES.INBOUND_REMIS_A_PLUS_TARD,
                STAGES.OUTBOUND_BOUGE_PAS,
              ],
            },
          ],
        },
      ],
      ["dealname", "dealstage", "notes_last_contacted", "notes_next_activity_date", "hs_v2_date_entered_current_stage"],
      200
    );
    await sleep(150);

    // Overdue tasks require the crm.objects.tasks.read scope. If the key doesn't
    // have it, this fails — we don't want that to break the whole page, so it's
    // wrapped separately and degrades gracefully to an empty list.
    let overdueTasks: { results: any[]; total: number } = { results: [], total: 0 };
    try {
      overdueTasks = await getOverdueTasks(OWNER_ID, 200);
    } catch (e) {
      console.warn("Skipping overdue tasks (likely missing scope):", e);
    }
    await sleep(150);

    const outboundGeneral = await searchDeals(
      [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINES.OUTBOUND_COLD_EMAIL },
            { propertyName: "hubspot_owner_id", operator: "EQ", value: OWNER_ID },
            {
              propertyName: "dealstage",
              operator: "IN",
              values: [STAGES.OUTBOUND_EN_SUIVI, STAGES.OUTBOUND_EMAIL],
            },
          ],
        },
      ],
      ["dealname", "dealstage", "notes_last_contacted"],
      100
    );

    // ---- P1: Deals qu'on ferme (sheet % >= 40, matched to HubSpot by name) ----
    const closingCandidates = closingSheetRows.filter(
      (r) => r.repSection === "Slim" && r.closingPercent >= 40
    );
    const p1 = await Promise.all(
      closingCandidates.map(async (row) => {
        const match = entonnoirDeals.results.find((d) =>
          d.properties.dealname?.toLowerCase().includes(row.dealName.toLowerCase())
        );
        const phone = match ? await getPrimaryContactPhone(match.id) : null;

        // Try to enrich with a Fireflies insight — requires the contact's email,
        // which we'd need to fetch via the deal's associated contact. Left as a
        // follow-up call here rather than fetched by default, to avoid a Fireflies
        // API call for every deal on every page load (see lib/fireflies.ts note
        // about the scaling concern with search-by-participant).
        return {
          dealId: match?.id ?? null,
          name: row.dealName,
          amount: row.amount,
          percent: row.closingPercent,
          note: row.note,
          dateSuivi: row.dateSuivi,
          phone,
          hubspotUrl: match ? hubspotDealUrl(HUBSPOT_PORTAL_ID, match.id) : null,
        };
      })
    );

    // ---- P1.5: Entonnoir de ventes, aucun suivi programmé ----
    const p1b = entonnoirDeals.results
      .filter((d) => {
        const next = d.properties.notes_next_activity_date;
        const days = daysSince(d.properties.notes_last_contacted);
        const overdueOrMissing = !next || new Date(next).getTime() < Date.now();
        return overdueOrMissing && days !== null && days >= 10;
      })
      .map((d) => ({
        dealId: d.id,
        name: d.properties.dealname,
        stage: d.properties.dealstage,
        days: daysSince(d.properties.notes_last_contacted),
        hubspotUrl: hubspotDealUrl(HUBSPOT_PORTAL_ID, d.id),
      }))
      .sort((a, b) => (b.days ?? 0) - (a.days ?? 0));

    // ---- P2: Inbound first 4 stages, 48h+ no contact ----
    const p2 = inboundFreshDeals.results
      .filter((d) => {
        const h = hoursSince(d.properties.notes_last_contacted);
        return h === null || h > 48;
      })
      .map((d) => ({
        dealId: d.id,
        name: d.properties.dealname,
        stage: d.properties.dealstage,
        days: daysSince(d.properties.notes_last_contacted),
        hubspotUrl: hubspotDealUrl(HUBSPOT_PORTAL_ID, d.id),
      }));

    // ---- P3: No Show, 48h+ no contact ----
    const p3 = outboundNoShowDeals.results
      .filter((d) => {
        const h = hoursSince(d.properties.notes_last_contacted);
        return h === null || h > 48;
      })
      .map((d) => ({
        dealId: d.id,
        name: d.properties.dealname,
        hubspotUrl: hubspotDealUrl(HUBSPOT_PORTAL_ID, d.id),
      }));

    // ---- P4: RV/RDV planifié, meeting date passed, stage unchanged ----
    const stalePlanned = [...rvPlanifieInbound.results, ...rdvPlanifieOutbound.results]
      .filter((d) => d.properties.closedate && new Date(d.properties.closedate).getTime() < Date.now())
      .map((d) => ({
        dealId: d.id,
        name: d.properties.dealname,
        meetingDate: d.properties.closedate,
        hubspotUrl: hubspotDealUrl(HUBSPOT_PORTAL_ID, d.id),
      }));

    // ---- P5: Remis à plus tard / Bouge pas / tâches en retard ----
    const nettoyage = remisEtBougePas.results.map((d) => {
      const days = daysSince(d.properties.notes_last_contacted);
      const enteredStage = daysSince(d.properties.hs_v2_date_entered_current_stage);
      const isRemisAPlusTard = [
        STAGES.REMIS_A_PLUS_TARD_ENTONNOIR,
        STAGES.INBOUND_REMIS_A_PLUS_TARD,
      ].includes(d.properties.dealstage);

      // "Remis à plus tard" default 60-day recall window when no next activity is set
      const overdueRecall =
        isRemisAPlusTard &&
        !d.properties.notes_next_activity_date &&
        (enteredStage ?? 0) * 24 * 60 * 60 * 1000 >= DAYS_60;

      return {
        dealId: d.id,
        name: d.properties.dealname,
        stage: d.properties.dealstage,
        days,
        overdueRecall,
        hubspotUrl: hubspotDealUrl(HUBSPOT_PORTAL_ID, d.id),
      };
    });

    // ---- P6: Outbound general cadence (En Suivi 48h / Email is a lower, weekly cadence) ----
    const p6 = outboundGeneral.results
      .filter((d) => {
        if (d.properties.dealstage === STAGES.OUTBOUND_EMAIL) return false; // weekly cadence, not shown as urgent here
        const h = hoursSince(d.properties.notes_last_contacted);
        return h === null || h > 48;
      })
      .map((d) => ({
        dealId: d.id,
        name: d.properties.dealname,
        stage: d.properties.dealstage,
        days: daysSince(d.properties.notes_last_contacted),
        hubspotUrl: hubspotDealUrl(HUBSPOT_PORTAL_ID, d.id),
      }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      p1_closing: p1,
      p1b_entonnoir_no_followup: {
        total: p1b.length,
        items: p1b.slice(0, 12),
      },
      p2_inbound_fresh: p2,
      p3_no_show: p3,
      p4_stale_planned_meetings: stalePlanned,
      p5_nettoyage: nettoyage,
      overdue_tasks: {
        total: overdueTasks.total,
        items: overdueTasks.results.slice(0, 10),
      },
      p6_outbound_general: p6,
    });
  } catch (err: any) {
    console.error("Error building priorities:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
