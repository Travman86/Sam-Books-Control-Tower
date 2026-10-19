import { Link, useParams } from "wouter"
import { ArrowLeft } from "lucide-react"
import { Empty, MonitoringGate, NA, PageHeader, Panel, Pill, Metric } from "@/components/ops-ui"
import { fmtDate, groupFailures, opLabel } from "@/lib/monitoring"

const CHECKLIST = [
  "Confirm whether users of the affected organizations were actually impacted (no journey signal exists).",
  "Review the connected Sam Books service logs for the failure category and time range shown.",
  "Check whether the affected queue is still accumulating failed or pending jobs.",
  "Decide manually whether affected jobs need re-submission. The tower performs no automatic retries.",
  "Verify results by inspecting outcomes directly; data integrity is not assumed.",
]

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <>
      <Link href="/incidents" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline mb-3"><ArrowLeft className="w-3 h-3" /> Observed failures</Link>
      <MonitoringGate>
        {({ data, days, org }) => {
          // Detail uses the full returned sample (not time/org filtered) so links never go stale on filter change.
          const g = groupFailures(data?.failures ?? []).find((x) => x.id === id) ?? null
          if (!g) {
            return <Empty title="Group not found" action={<Link href="/incidents" className="text-xs font-semibold text-teal-800 hover:underline">Back to list</Link>}>No record in the current returned sample matches {id}. The sample is limited and may have rotated. (Filters: last {days}d, org {org}.)</Empty>
          }
          const names = new Map((data?.overview?.organizations ?? []).map((o) => [o.id, o.name]))
          const items = [...g.items].sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1))
          return (
            <div className="space-y-4">
              <PageHeader title={`${opLabel(g.operation)}: ${g.category}`} sub="Observed failures. Whether this is an active incident is unverified." />
              <p className="text-xs bg-slate-100 border border-slate-200 rounded px-3 py-2 text-slate-700" data-testid="note-detail-scope">This detail ignores the global org and time filters and uses the full returned failure sample, which is limited.</p>
              <div className="flex flex-wrap gap-2 text-xs items-center" data-testid="header-incident">
                <span>Severity</span><Pill>Not classified</Pill><span>Status</span><Pill>Unverified</Pill><span>Owner</span><Pill>Unassigned</Pill>
                <span className="text-slate-500">(not persisted fields)</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Metric testid="metric-records" label="Records returned" value={g.items.length} sub="Sample size, not total occurrences." />
                    <Metric testid="metric-orgs" label="Orgs in sample" value={g.orgs.length} sub={g.orgs.map((o) => names.get(o) ?? `#${o}`).join(", ") || "No organization attached"} />
                    <Metric testid="metric-window" label="First seen" value={<span className="text-base">{fmtDate(g.first)}</span>} sub={`Latest ${fmtDate(g.last)}`} />
                  </div>
                  <Panel title="What happened">
                    <p className="text-sm text-slate-700">The {opLabel(g.operation).toLowerCase()} queue recorded {g.items.length} failure record{g.items.length === 1 ? "" : "s"} classified as <b>{g.category}</b>. Only the safe classification is shown; raw error text is withheld. Cause is not established.</p>
                  </Panel>
                  <Panel title="Impact context" note="What is not measured.">
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>Affected users: <NA>Unmeasured</NA></li>
                      <li>Affected operations beyond these records: <NA>Unmeasured</NA></li>
                      <li>Journey outcome: <NA>Not instrumented</NA></li>
                    </ul>
                  </Panel>
                  <Panel title="Chronology" note="Evidence records, original timestamps, oldest first.">
                    <ol className="divide-y divide-slate-100" data-testid="list-events">
                      {items.map((f) => (
                        <li key={f.id} className="py-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
                          <span className="whitespace-nowrap w-40">{fmtDate(f.occurredAt)}</span>
                          <span className="font-mono text-slate-600 break-all">{f.id}</span>
                          <span>{f.organizationId == null ? "No organization" : `Org ${names.get(f.organizationId) ?? "#" + f.organizationId}`}</span>
                        </li>
                      ))}
                    </ol>
                  </Panel>
                </div>
                <div className="space-y-4 lg:sticky lg:top-4">
                  <Panel title="Recovery" note="Documented investigation. All criteria are pending; nothing is proven. No automatic retries run. Data loss is neither confirmed nor ruled out.">
                    <ul className="space-y-2">
                      {CHECKLIST.map((c) => (
                        <li key={c} className="flex gap-2 text-sm text-slate-700"><span className="mt-1 w-3.5 h-3.5 shrink-0 rounded-sm border border-slate-300" aria-hidden /><span>{c} <Pill>Pending</Pill></span></li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              </div>
            </div>
          )
        }}
      </MonitoringGate>
    </>
  )
}
