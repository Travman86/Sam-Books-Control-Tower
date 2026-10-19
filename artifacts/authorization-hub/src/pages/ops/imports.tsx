import { useState } from "react"
import { Link } from "wouter"
import { Input } from "@/components/ui/input"
import { Empty, MonitoringGate, NA, PageHeader, Panel, Pill, Scope } from "@/components/ops-ui"
import { fmtAge, fmtDate, groupId, opLabel } from "@/lib/monitoring"

export default function Imports() {
  const [q, setQ] = useState("")
  return (
    <>
      <PageHeader title="Imports & queues" sub="Background job queues for statement ingest and the WhatsApp agent." />
      <MonitoringGate>
        {({ data, failures, days, org, overviewOk }) => {
          if (!data) return null
          const names = new Map((data.overview?.organizations ?? []).map((o) => [o.id, o.name]))
          const rows = failures.filter((f) => `${f.id} ${f.category} ${f.operation} ${f.organizationId ?? ""} ${names.get(f.organizationId ?? -1) ?? ""}`.toLowerCase().includes(q.toLowerCase()))
          return (
            <div className="space-y-4">
              <Panel title="Queue state" note="Fixed 24h window, global across all organizations. Org and time filters do not apply.">
                {!data.overview ? <NA>Queue overview unavailable</NA> : data.overview.queues.length === 0 ? <p className="text-sm text-slate-600">No activity reported by the source.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.overview.queues.map((qu) => (
                      <div key={qu.name} className="border border-slate-200 rounded-md p-3" data-testid={`card-queue-${qu.name}`}>
                        <div className="font-medium text-sm mb-2">{opLabel(qu.name)}</div>
                        <dl className="grid grid-cols-2 gap-y-1 text-xs">
                          <dt className="text-slate-500">Pending</dt><dd className="tabular-nums">{qu.pending}</dd>
                          <dt className="text-slate-500">Processing</dt><dd className="tabular-nums">{qu.processing}</dd>
                          <dt className="text-slate-500">Done (24h)</dt><dd className="tabular-nums">{qu.done24h}</dd>
                          <dt className="text-slate-500">Failed (24h)</dt><dd className="tabular-nums">{qu.failed24h}</dd>
                          <dt className="text-slate-500">Oldest pending</dt><dd>{fmtAge(qu.oldestPendingAgeSeconds)}</dd>
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel
                title="Observed failure evidence"
                note={`Sample of records returned by the source, filtered to last ${days}d${org === "all" ? "" : ` and org ${org}`}. Counts are records returned, not total occurrences.`}
                right={<Input data-testid="input-failure-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, category, org" className="h-8 w-52 text-sm" />}
              >
                {!overviewOk && rows.length === 0 ? (
                  <Empty title={!data.connection.configured ? "Not connected" : "Not available"}>The overview source is not reporting, so failure evidence cannot be read. This is not zero failures.</Empty>
                ) : rows.length === 0 ? (
                  <Empty title="No observed failures in this view">The sample contains no matching records. That is not proof that imports succeed; individual statement records are not supplied to Control Tower.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-1.5 pr-3">Queue</th><th className="pr-3">Category</th><th className="pr-3">Organization</th><th className="pr-3">Occurred</th><th /></tr></thead>
                      <tbody>
                        {rows.map((f) => (
                          <tr key={f.id} className="border-b border-slate-100 last:border-0" data-testid={`row-failure-${f.id}`}>
                            <td className="py-2 pr-3">{opLabel(f.operation)}</td>
                            <td className="pr-3"><Pill tone="amber">{f.category}</Pill></td>
                            <td className="pr-3">{f.organizationId == null ? "None" : names.get(f.organizationId) ?? `#${f.organizationId}`}</td>
                            <td className="pr-3 whitespace-nowrap">{fmtDate(f.occurredAt)}</td>
                            <td><Link href={`/incidents/${groupId(f.operation, f.category)}`} className="text-teal-800 font-semibold hover:underline">Group</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Scope>The connected API does not supply statement-level records; rows are failure classifications only.</Scope>
              </Panel>
            </div>
          )
        }}
      </MonitoringGate>
    </>
  )
}
