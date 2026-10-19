import { Fragment } from "react"
import { MonitoringGate, NA, PageHeader, Panel, Pill, Scope } from "@/components/ops-ui"
import { fmtAge, fmtDate, outcomes, pct } from "@/lib/monitoring"
import type { SamBooksQueueMetric } from "@workspace/api-client-react"

function QueueCard({ title, m, days }: { title: string; m: SamBooksQueueMetric; days: 7 | 30 }) {
  const w = days === 7 ? m.last7d : m.last30d
  const rows: [string, string | number][] = [
    ["Done", w.done], ["Failed", w.failed], ["Retried", w.retried], ["Success rate", pct(w.successRate)], ["Outcomes", outcomes(w)],
    ["Average duration", fmtAge(w.avgSeconds)], ["p95 duration", fmtAge(w.p95Seconds)],
  ]
  return (
    <Panel title={title} right={<Pill>Queue, not journey</Pill>} note={`Last ${days}d, all organizations. Current pending ${m.pending}, processing ${m.processing}.`}>
      <dl className="grid grid-cols-2 gap-y-1.5 text-sm" data-testid={`card-perf-${title}`}>
        {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium tabular-nums">{v}</dd></Fragment>))}
      </dl>
    </Panel>
  )
}

export default function Performance() {
  return (
    <>
      <PageHeader title="Performance" sub="Real aggregates returned by the source. Time filter picks the 7d or 30d window; organization filter cannot apply to these figures." />
      <MonitoringGate>
        {({ data, days }) => {
          const m = data?.metrics
          if (!m) return <Panel title="Metrics"><NA>Metrics source unavailable: {data?.metricsSource.message}</NA></Panel>
          return (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Snapshot generated {fmtDate(m.generatedAt)} (authoritative source timestamp).</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <QueueCard title="Statement ingest" m={m.statementIngest} days={days} />
                <QueueCard title="WhatsApp agent" m={m.whatsappAgent} days={days} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel title="PDF parsing corrections">
                  <div className="text-2xl font-semibold tabular-nums">{days === 7 ? m.pdfParsing.correctionsLast7d : m.pdfParsing.correctionsLast30d}</div>
                  <Scope>Corrections, last {days}d.</Scope>
                </Panel>
                <Panel title="Finance agent usage" note="Fixed 7d window">
                  <dl className="text-sm grid grid-cols-2 gap-y-1">
                    <dt className="text-slate-500">Active conversations</dt><dd>{m.financeAgentUsage.activeConversations7d}</dd>
                    <dt className="text-slate-500">Assistant messages</dt><dd>{m.financeAgentUsage.assistantMessages7d}</dd>
                    <dt className="text-slate-500">Tool-calling turns</dt><dd>{m.financeAgentUsage.toolCallingTurns7d}</dd>
                    <dt className="text-slate-500">WhatsApp threads</dt><dd>{m.financeAgentUsage.whatsappThreads}</dd>
                  </dl>
                </Panel>
                <Panel title="Growth" note="Fixed 30d window">
                  <dl className="text-sm grid grid-cols-2 gap-y-1">
                    <dt className="text-slate-500">New organizations</dt><dd>{m.growth.newOrganizations30d}</dd>
                    <dt className="text-slate-500">New users</dt><dd>{m.growth.newUsers30d}</dd>
                    <dt className="text-slate-500">Transactions</dt><dd>{m.growth.transactions30d}</dd>
                  </dl>
                </Panel>
              </div>
              <Scope>No latency history is drawn: the source gives window aggregates only.</Scope>
            </div>
          )
        }}
      </MonitoringGate>
    </>
  )
}
