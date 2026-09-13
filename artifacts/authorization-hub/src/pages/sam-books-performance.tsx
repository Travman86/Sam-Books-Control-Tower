import * as React from "react"
import { useGetSamBooksMetrics } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { PageHeader, rate, ConnectionNotice } from "@/components/sam-books-shared"

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function QueueCard({
  title,
  metric,
}: {
  title: string
  metric: { pending: number; processing: number; last7d: { successRate: number | null; avgSeconds: number | null } }
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Pending" value={metric.pending} />
        <Metric label="Processing" value={metric.processing} />
        <Metric label="Success rate (7d)" value={rate(metric.last7d.successRate)} />
        <Metric label="Avg time (7d)" value={metric.last7d.avgSeconds !== null ? `${Math.round(metric.last7d.avgSeconds)}s` : "—"} />
      </CardContent>
    </Card>
  )
}

export default function SamBooksPerformance() {
  const metrics = useGetSamBooksMetrics()
  const data = metrics.data

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Performance" subtitle="Queue throughput, agent usage, and growth KPIs." />

      <ConnectionNotice error={metrics.error} />

      {metrics.isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <QueueCard title="Statement ingest" metric={data.statementIngest} />
          <QueueCard title="WhatsApp agent" metric={data.whatsappAgent} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finance agent usage (7d)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Active conversations" value={data.financeAgentUsage.activeConversations7d} />
              <Metric label="Assistant messages" value={data.financeAgentUsage.assistantMessages7d} />
              <Metric label="Tool-calling turns" value={data.financeAgentUsage.toolCallingTurns7d} />
              <Metric label="WhatsApp threads" value={data.financeAgentUsage.whatsappThreads} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Growth (30d)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-sm">
              <Metric label="New orgs" value={data.growth.newOrganizations30d} />
              <Metric label="New users" value={data.growth.newUsers30d} />
              <Metric label="Transactions" value={data.growth.transactions30d} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
