"use client";
// app/priorities/page.tsx
// The real "Priorités" tab — fetches live data from /api/priorities.

import { useEffect, useState } from "react";
import Header from "@/components/Header";

const COLORS = {
  bg: "#F3F4F8",
  card: "#FFFFFF",
  border: "#E5E7EB",
  navy: "#101828",
  navySoft: "#475467",
  orange: "#F26B21",
  orangeSoft: "#FFF1E8",
  red: "#B42318",
  redSoft: "#FEF0EF",
  amber: "#B45309",
  amberSoft: "#FEF3E2",
  blue: "#1849A9",
  indigo: "#4338CA",
};

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  .cv-row, .cv-card {
    box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .cv-row:hover, .cv-card:hover {
    box-shadow: 0 4px 12px rgba(16,24,40,0.08);
    border-color: #D0D5DD;
  }
  .cv-pill { transition: opacity 0.15s ease, transform 0.1s ease; }
  .cv-pill:hover { opacity: 0.88; }
  .cv-pill:active { transform: scale(0.97); }
  .cv-link { transition: opacity 0.15s ease; }
  .cv-link:hover { opacity: 0.7; }
`;

type Priorities = {
  generatedAt: string;
  sheetTabUsed?: string;
  salesReps?: { id: string; name: string }[];
  activeRep?: { id: string; name: string } | null;
  p1_closing: any[];
  p1b_entonnoir_no_followup: { total: number; items: any[] };
  p2_inbound_fresh: any[];
  p3_no_show: any[];
  p4_stale_planned_meetings: any[];
  p5_nettoyage: any[];
  overdue_tasks: TaskItem[];
  upcoming_tasks: TaskItem[];
  p6_outbound_general: any[];
};

type TaskItem = {
  id: string;
  subject: string;
  dueDate: string | null;
  priority: string;
  type: string;
  isOverdue: boolean;
  dealId: string | null;
  dealName: string | null;
};

export default function PrioritesPage() {
  const [data, setData] = useState<Priorities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [repId, setRepId] = useState<string>("396827993"); // default: Slim Labassi
  const [pipelineFilter, setPipelineFilter] = useState<"tous" | "inbound" | "entonnoir" | "outbound">("tous");
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Sales Hub Priorités | Leadfox";
  }, []);

  async function handleCompleteTask(taskId: string) {
    setCompletingId(taskId);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Échec");
      setCompletedTaskIds((prev) => new Set(prev).add(taskId));
    } catch (e: any) {
      alert(`Impossible de marquer la tâche comme faite : ${e.message}`);
    } finally {
      setCompletingId(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/priorities?repId=${repId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repId]);

  const byPipeline = (item: any) => pipelineFilter === "tous" || item.pipeline === pipelineFilter;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <style>{FONT}</style>

      <Header />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.orange, letterSpacing: 0.4 }}>
          {new Date().toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase()} · {(data?.activeRep?.name ?? "TOUTE L'ÉQUIPE").toUpperCase()}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: COLORS.navy, margin: "6px 0 4px" }}>🎯 L'ordre du jour</h1>
        {data?.sheetTabUsed && (
          <p style={{ fontSize: 11, color: COLORS.navySoft, margin: "0 0 20px" }}>
            📊 Sheet : {data.sheetTabUsed}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {(data?.salesReps ?? [{ id: "396827993", name: "Slim Labassi" }, { id: "17032870", name: "Alexandre Paquet" }]).map((rep) => (
            <button
              key={rep.id}
              className="cv-pill"
              onClick={() => setRepId(rep.id)}
              style={{
                background: repId === rep.id ? COLORS.orange : COLORS.card,
                color: repId === rep.id ? "#fff" : COLORS.navySoft,
                border: `1px solid ${repId === rep.id ? COLORS.orange : COLORS.border}`,
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                boxShadow: repId === rep.id ? "0 1px 3px rgba(242,107,33,0.3)" : "none",
              }}
            >
              👤 {rep.name}
            </button>
          ))}
          <button
            className="cv-pill"
            onClick={() => setRepId("team")}
            style={{
              background: repId === "team" ? COLORS.orange : COLORS.card,
              color: repId === "team" ? "#fff" : COLORS.navySoft,
              border: `1px solid ${repId === "team" ? COLORS.orange : COLORS.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              boxShadow: repId === "team" ? "0 1px 3px rgba(242,107,33,0.3)" : "none",
            }}
          >
            👥 Toute l'équipe
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          {[
            { key: "tous" as const, label: "🌐 Tous" },
            { key: "inbound" as const, label: "📥 Deals sans RV réalisé" },
            { key: "entonnoir" as const, label: "🔻 Entonnoir de ventes" },
            { key: "outbound" as const, label: "📤 Outbound: Cold Email" },
          ].map((p) => (
            <button
              key={p.key}
              className="cv-pill"
              onClick={() => setPipelineFilter(p.key)}
              style={{
                background: pipelineFilter === p.key ? COLORS.navy : COLORS.card,
                color: pipelineFilter === p.key ? "#fff" : COLORS.navySoft,
                border: `1px solid ${pipelineFilter === p.key ? COLORS.navy : COLORS.border}`,
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {repId === "team" && (
          <div style={{ fontSize: 12, color: COLORS.navySoft, marginBottom: 16, fontStyle: "italic" }}>
            Mode "Toute l'équipe" : montre les deals de tous les reps, sans indiquer qui est propriétaire de chacun pour l'instant.
          </div>
        )}

        {loading && <div style={{ color: COLORS.navySoft }}>Chargement des priorités…</div>}

        {error && !data && (
          <div style={{ background: COLORS.redSoft, border: `1px solid ${COLORS.red}`, borderRadius: 10, padding: 16, color: COLORS.red }}>
            Erreur en chargeant les données : {error}
          </div>
        )}

        {error && data && (
          <div style={{ fontSize: 12.5, color: COLORS.amber, marginBottom: 16, fontStyle: "italic" }}>
            ⚠️ Le dernier rafraîchissement a échoué ({error}) — les données ci-dessous datent du chargement précédent.
          </div>
        )}

        {data && (() => {
          const p1 = data.p1_closing.filter(byPipeline);
          const p1bItems = data.p1b_entonnoir_no_followup.items.filter(byPipeline);
          const p2 = data.p2_inbound_fresh.filter(byPipeline);
          const p3 = data.p3_no_show.filter(byPipeline);
          const p4 = data.p4_stale_planned_meetings.filter(byPipeline);
          const p5 = data.p5_nettoyage.filter(byPipeline);
          const p6 = data.p6_outbound_general.filter(byPipeline);
          return (
          <>
            <Section title="🔥 Sur le point de signer" count={p1.length} emptyText="Rien pour l'instant — aucun deal ≥40% dans le sheet.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {p1.map((d, i) => (
                  <div key={i} className="cv-card" style={{ background: COLORS.card, border: `1px solid ${COLORS.redSoft}`, borderLeft: `3px solid ${COLORS.red}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong style={{ color: COLORS.navy }}>😊 {d.name}</strong>
                        {d.ownerName && (
                          <div style={{ fontSize: 11, color: COLORS.orange, fontWeight: 600, marginTop: 2 }}>
                            👤 {d.ownerName}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.red }}>{d.percent}%</span>
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.navySoft, marginTop: 4 }}>💰 {d.amount}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.navySoft, marginTop: 8, background: "#FAFAFB", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px" }}>
                      {d.note}
                    </div>
                    {d.fireflies && (
                      <div style={{ background: "#4B2E83", borderRadius: 8, padding: "9px 11px", marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>🎙️ FIREFLIES</span>
                          <a href={d.fireflies.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#FFFFFF", opacity: 0.9 }}>
                            {d.fireflies.recordingLabel}
                          </a>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#FFFFFF", lineHeight: 1.4 }}>{d.fireflies.insight}</div>
                      </div>
                    )}
                    {!d.fireflies && d.firefliesDebug && (
                      <div style={{ fontSize: 11, color: "#9AA3B2", fontStyle: "italic", marginTop: 6 }}>
                        🔧 {d.firefliesDebug}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      {d.hubspotUrl && (
                        <a href={d.hubspotUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: COLORS.navySoft }}>
                          Ouvrir dans HubSpot
                        </a>
                      )}
                      {d.phone ? (
                        <a
                          href={`tel:${d.phone}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: COLORS.orange,
                            color: "#fff",
                            borderRadius: 8,
                            padding: "7px 12px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          📞 {d.phone} · Aircall
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: COLORS.navySoft, fontStyle: "italic" }}>
                          Aucun numéro trouvé
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="🕸️ Entonnoir de ventes — aucun suivi programmé"
              count={p1bItems.length}
              subtitle="Tous stages confondus : pas de tâche future, pas de contact depuis 10 jours+"
            >
              {p1bItems.map((d, i) => (
                <Row key={i} name={d.name} meta={`${d.days} jours sans contact`} url={d.hubspotUrl} tone={COLORS.indigo} ownerName={d.ownerName} />
              ))}
              {data.p1b_entonnoir_no_followup.total > data.p1b_entonnoir_no_followup.items.length && pipelineFilter === "tous" && (
                <div style={{ fontSize: 12, fontStyle: "italic", color: COLORS.navySoft, padding: "4px 2px" }}>
                  + {data.p1b_entonnoir_no_followup.total - data.p1b_entonnoir_no_followup.items.length} autres
                </div>
              )}
            </Section>

            <Section title="📥 Leads inbound sans contact 48h+" count={p2.length}>
              {p2.map((d, i) => (
                <Row key={i} name={d.name} meta={`${d.days ?? "?"} jours`} url={d.hubspotUrl} tone={COLORS.orange} ownerName={d.ownerName} />
              ))}
            </Section>

            <Section title="📵 No Show sans contact 48h+" count={p3.length} emptyText="✅ Rien à signaler.">
              {p3.map((d, i) => (
                <Row key={i} name={d.name} meta="" url={d.hubspotUrl} tone={COLORS.orange} ownerName={d.ownerName} />
              ))}
            </Section>

            <Section title="🗓️ RV planifié à mettre à jour" count={p4.length} emptyText="✅ Rien à signaler.">
              {p4.map((d, i) => (
                <Row key={i} name={d.name} meta={`Rencontre prévue le ${d.meetingDate}`} url={d.hubspotUrl} tone={COLORS.red} ownerName={d.ownerName} />
              ))}
            </Section>

            <Section
              title="📋 Tâches HubSpot"
              count={
                data.upcoming_tasks.filter((t) => !completedTaskIds.has(t.id)).length +
                data.overdue_tasks.filter((t) => !completedTaskIds.has(t.id)).length
              }
              emptyText="✅ Rien à signaler."
            >
              {data.overdue_tasks.filter((t) => !completedTaskIds.has(t.id)).length > 0 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.navySoft, marginTop: 4 }}>
                  EN RETARD ({data.overdue_tasks.filter((t) => !completedTaskIds.has(t.id)).length})
                </div>
              )}
              {data.overdue_tasks
                .filter((t) => !completedTaskIds.has(t.id))
                .slice(0, 20)
                .map((t) => (
                  <TaskRow key={t.id} task={t} onComplete={handleCompleteTask} completing={completingId === t.id} tone={COLORS.red} />
                ))}
              {data.overdue_tasks.filter((t) => !completedTaskIds.has(t.id)).length > 20 && (
                <div style={{ fontSize: 12, fontStyle: "italic", color: COLORS.navySoft, padding: "4px 2px" }}>
                  + {data.overdue_tasks.filter((t) => !completedTaskIds.has(t.id)).length - 20} autres tâches en retard — voir dans HubSpot
                </div>
              )}

              {data.upcoming_tasks.filter((t) => !completedTaskIds.has(t.id)).length > 0 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.navySoft, marginTop: 12 }}>
                  À VENIR (AUJOURD'HUI / DEMAIN)
                </div>
              )}
              {data.upcoming_tasks
                .filter((t) => !completedTaskIds.has(t.id))
                .map((t) => (
                  <TaskRow key={t.id} task={t} onComplete={handleCompleteTask} completing={completingId === t.id} tone={COLORS.blue} />
                ))}
            </Section>

            <Section title="🧹 Nettoyage" count={p5.length}>
              {p5.map((d, i) => (
                <Row key={i} name={d.name} meta={d.overdueRecall ? "Rappel dépassé (60j)" : `${d.days} jours`} url={d.hubspotUrl} tone={COLORS.amber} ownerName={d.ownerName} />
              ))}
            </Section>

            <Section title="📤 Outbound — cadence normale" count={p6.length}>
              {p6.map((d, i) => (
                <Row key={i} name={d.name} meta={`${d.days ?? "?"} jours`} url={d.hubspotUrl} tone={COLORS.navySoft} ownerName={d.ownerName} />
              ))}
            </Section>
          </>
          );
        })()}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
  completing,
  tone,
}: {
  task: TaskItem;
  onComplete: (id: string) => void;
  completing: boolean;
  tone: string;
}) {
  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div
      className="cv-card"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: 9,
        padding: "11px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13.5,
        marginTop: 6,
      }}
    >
      <button
        onClick={() => onComplete(task.id)}
        disabled={completing}
        title="Marquer comme fait"
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          border: `2px solid ${COLORS.border}`,
          background: "#fff",
          cursor: completing ? "wait" : "pointer",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <strong style={{ color: COLORS.navy }}>{task.subject}</strong>
        {task.dealName && <span style={{ color: COLORS.navySoft }}> — {task.dealName}</span>}
        <div style={{ fontSize: 11.5, color: COLORS.navySoft, marginTop: 2 }}>
          {task.type} · {task.priority} {dueLabel && `· ${dueLabel}`}
        </div>
      </div>
    </div>
  );
}

function groupByStage<T extends { stageLabel?: string }>(items: T[]): { stageLabel: string; items: T[] }[] {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.stageLabel || "Autre";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups)
    .map(([stageLabel, items]) => ({ stageLabel, items }))
    .sort((a, b) => b.items.length - a.items.length);
}

function StageGroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: COLORS.navySoft,
        marginTop: 16,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ width: 14, height: 1.5, background: COLORS.border, display: "inline-block" }} />
      {label} ({count})
    </div>
  );
}

function Section({ title, subtitle, count, emptyText, children }: any) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 4,
          paddingBottom: 10,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.navy, letterSpacing: -0.1 }}>{title}</span>
        <span style={{ fontSize: 12.5, color: COLORS.navySoft, fontWeight: 500 }}>({count})</span>
      </div>
      {subtitle && <div style={{ fontSize: 12, color: COLORS.navySoft, marginTop: 8, marginBottom: 6 }}>{subtitle}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {count === 0 && emptyText ? (
          <div style={{ fontSize: 13, fontStyle: "italic", color: COLORS.navySoft }}>{emptyText}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Row({
  name,
  meta,
  url,
  tone,
  ownerName,
}: {
  name: string;
  meta: string;
  url: string | null;
  tone: string;
  ownerName?: string | null;
}) {
  return (
    <div
      className="cv-row"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: 9,
        padding: "12px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13.5,
      }}
    >
      <span style={{ lineHeight: 1.5 }}>
        <strong style={{ color: COLORS.navy }}>{name}</strong>{" "}
        {meta && <span style={{ color: COLORS.navySoft }}>— {meta}</span>}
        {ownerName && (
          <span style={{ marginLeft: 8, fontSize: 11, color: COLORS.orange, fontWeight: 600 }}>
            👤 {ownerName}
          </span>
        )}
      </span>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="cv-link" style={{ color: COLORS.navySoft, fontSize: 12, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>
          HubSpot ↗
        </a>
      )}
    </div>
  );
}
