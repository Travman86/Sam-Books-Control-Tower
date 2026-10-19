import { useState } from "react"
import { Link } from "wouter"
import { Input } from "@/components/ui/input"
import { Empty, GoLink, MonitoringGate, PageHeader, Panel, Pill } from "@/components/ops-ui"

export const JOURNEYS = [
  { key: "signin", name: "Sign-in", coverage: "Unknown", detail: "No sign-in outcome signal is supplied to Control Tower.", href: "/dependencies", link: "Dependencies" },
  { key: "statement", name: "Statement import", coverage: "Partial", detail: "Ingest queue job outcomes only. Upload-through-report telemetry is not supplied.", href: "/journeys/statements", link: "Statement journey" },
  { key: "allocation", name: "Account allocation", coverage: "Unknown", detail: "No signal for account assignment correctness.", href: "/data-quality", link: "Data quality" },
  { key: "reports", name: "Reports & balances", coverage: "Unknown", detail: "No signal for reports or balance reconciliation.", href: "/data-quality", link: "Data quality" },
  { key: "assistant", name: "Finance assistant", coverage: "Partial", detail: "WhatsApp agent queue only. Not an end-to-end assistant measure.", href: "/imports", link: "Queues" },
]

export function JourneyRows({ compact, filter = "", signal = true }: { compact?: boolean; filter?: string; signal?: boolean }) {
  const rows = JOURNEYS.filter((j) => (j.name + j.detail).toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="divide-y divide-slate-100" data-testid="list-journeys">
      {rows.map((j) => (
        <div key={j.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5" data-testid={`row-journey-${j.key}`}>
          <div className="w-40 font-medium text-sm text-slate-900">{j.name}</div>
          <Pill tone={j.coverage === "Partial" ? "amber" : "slate"}>{j.coverage === "Partial" ? (signal ? "Partial: queue only" : "Partial: queue signal unavailable") : "Unknown"}</Pill>
          {!compact && <span className="text-xs text-slate-600 flex-1 min-w-[14rem]">{j.detail}</span>}
          <span className="ml-auto"><GoLink href={j.href}>{j.link}</GoLink></span>
        </div>
      ))}
      {rows.length === 0 && <p className="py-4 text-sm text-slate-500">No journey matches.</p>}
    </div>
  )
}

export default function Journeys() {
  const [q, setQ] = useState("")
  return (
    <>
      <PageHeader title="User journeys" sub="Coverage of the tasks users must complete. No journey records are supplied by the source." />
      <MonitoringGate>
        {({ overviewOk }) => (
          <div className="space-y-4">
            <Panel title="Coverage" note="Instrumented journeys: 0. Partial rows are queue data, not journey outcomes.">
              <JourneyRows filter={q} signal={overviewOk} />
            </Panel>
            <Panel title="Journey records" right={<Input data-testid="input-journey-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search journeys" className="h-8 w-48 text-sm" />}>
              <Empty title="No journey records" action={<Link href="/journeys/statements" className="text-xs font-semibold text-teal-800 hover:underline">Open statement journey coverage</Link>}>
                The connected monitoring API does not supply individual journey runs. This is a missing signal, not an absence of activity or failures.
              </Empty>
            </Panel>
          </div>
        )}
      </MonitoringGate>
    </>
  )
}
