import { MonitoringGate, NA, PageHeader, Panel, Pill } from "@/components/ops-ui"
import { fmtDate } from "@/lib/monitoring"

const tone = (s: string) => (s === "available" ? "teal" : s === "stale" ? "amber" : "slate") as "teal" | "amber" | "slate"

export default function Dependencies() {
  return (
    <>
      <PageHeader title="Dependencies" sub="The connection to Sam Books and the data sources this tower reads." />
      <MonitoringGate>
        {({ data, lastSuccess }) => {
          if (!data) return null
          const c = data.connection
          const sources = [["Overview source", data.overviewSource], ["Metrics source", data.metricsSource]] as const
          return (
            <div className="space-y-4">
              <Panel title="Monitored connection">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm" data-testid="card-connection-detail">
                  <div className="flex justify-between"><dt className="text-slate-500">Configured</dt><dd>{c.configured ? "Yes" : "No"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Hostname</dt><dd className="font-mono">{c.hostname ?? <NA>None</NA>}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Environment</dt><dd>{c.environment ?? "Not reported"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Identity</dt><dd><Pill>{c.identityVerified ? "Verified" : "Unverified"}</Pill></dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Last poll attempt</dt><dd>{fmtDate(data.checkedAt)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Service heartbeat</dt><dd><NA /></dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Last successful update</dt><dd>{lastSuccess ? fmtDate(lastSuccess) : "Not available"}</dd></div>
                </dl>
                <p className="text-xs text-slate-500 mt-3">{c.explanation} The poll time reflects transport success only; the overview has no service heartbeat.</p>
              </Panel>
              <Panel title="Sources and coverage">
                <div className="divide-y divide-slate-100">
                  {sources.map(([n, s]) => (
                    <div key={n} className="py-2.5 text-sm" data-testid={`row-source-${n.split(" ")[0].toLowerCase()}`}>
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">{n}</span><Pill tone={tone(s.status)}>{s.status.replace("_", " ")}</Pill></div>
                      <p className="text-xs text-slate-600 mt-1">{s.message}</p>
                      <p className="text-xs text-slate-500">Checked {fmtDate(s.checkedAt)}. Last success {fmtDate(s.lastSuccessfulAt)}. Generated {fmtDate(s.generatedAt)}.</p>
                    </div>
                  ))}
                  {["Database health", "Email / notification delivery", "WhatsApp provider"].map((d) => (
                    <div key={d} className="py-2.5 text-sm flex items-center justify-between"><span>{d}</span><Pill>Not monitored</Pill></div>
                  ))}
                </div>
              </Panel>
            </div>
          )
        }}
      </MonitoringGate>
    </>
  )
}
