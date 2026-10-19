import { useState } from "react"
import { Link } from "wouter"
import { Input } from "@/components/ui/input"
import { Empty, MonitoringGate, PageHeader, Panel, Pill } from "@/components/ops-ui"
import { fmtDate, opLabel } from "@/lib/monitoring"

export default function Incidents() {
  const [q, setQ] = useState("")
  return (
    <>
      <PageHeader title="Observed failures" sub="Repeated failures grouped by operation and safe category. Active state is unverified; there is no incident lifecycle feed." />
      <MonitoringGate>
        {({ data, groups, days, org, overviewOk }) => {
          const rows = groups.filter((g) => `${g.operation} ${g.category} ${opLabel(g.operation)}`.toLowerCase().includes(q.toLowerCase()))
          return (
            <Panel
              title={`${rows.length} group${rows.length === 1 ? "" : "s"}`}
              note={`Last ${days}d${org === "all" ? "" : `, org ${org}`}. Counts are records in a limited returned sample, not total occurrences.`}
              right={<Input data-testid="input-incident-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search operation or category" className="h-8 w-56 text-sm" />}
            >
              {!overviewOk && rows.length === 0 ? (
                <Empty title={data && !data.connection.configured ? "Not connected" : "Not available"}>The overview source is not reporting, so observed failures cannot be read. This is not zero failures.</Empty>
              ) : rows.length === 0 ? (
                <Empty title="No observed failures">None in the returned sample for this filter. This does not confirm health: the sample is limited and user journeys are not instrumented.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-1.5 pr-3">Group</th><th className="pr-3">Records</th><th className="pr-3">Orgs (sample)</th><th className="pr-3">First</th><th className="pr-3">Latest</th><th className="pr-3">Severity</th><th className="pr-3">Status</th><th className="pr-3">Owner</th></tr></thead>
                    <tbody>
                      {rows.map((g) => (
                        <tr key={g.id} className="border-b border-slate-100 last:border-0" data-testid={`row-incident-${g.id}`}>
                          <td className="py-2 pr-3"><Link href={`/incidents/${g.id}`} className="font-semibold text-teal-800 hover:underline">{opLabel(g.operation)}: {g.category}</Link></td>
                          <td className="pr-3 tabular-nums">{g.items.length}</td>
                          <td className="pr-3 tabular-nums">{g.orgs.length}</td>
                          <td className="pr-3 whitespace-nowrap">{fmtDate(g.first)}</td>
                          <td className="pr-3 whitespace-nowrap">{fmtDate(g.last)}</td>
                          <td className="pr-3"><Pill>Not classified</Pill></td>
                          <td className="pr-3"><Pill>Unverified</Pill></td>
                          <td className="pr-3"><Pill>Unassigned</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )
        }}
      </MonitoringGate>
    </>
  )
}
