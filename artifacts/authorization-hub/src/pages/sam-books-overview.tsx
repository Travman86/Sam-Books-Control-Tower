import * as React from "react"
import { useGetSamBooksOverview } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Users, Boxes, CreditCard, ShieldCheck, AlertTriangle } from "lucide-react"
import { PageHeader, StatCard, StatusBadge, relativeTime, ConnectionNotice } from "@/components/sam-books-shared"

export default function SamBooksOverview() {
  const overview = useGetSamBooksOverview()
  const data = overview.data

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Sam Books" subtitle="Live platform totals from the connected Sam Books instance." />

      <ConnectionNotice error={overview.error} />

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Building2} label="Organizations" value={data?.totals.organizations ?? "—"} />
        <StatCard icon={Users} label="Users" value={data?.totals.users ?? "—"} />
        <StatCard icon={Boxes} label="Modules" value={data?.totals.modules ?? "—"} />
        <StatCard icon={CreditCard} label="Active subscriptions" value={data?.totals.activeSubscriptions ?? "—"} />
        <StatCard icon={ShieldCheck} label="Platform admins" value={data?.totals.platformAdmins ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Every tenant on Sam Books.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Modules</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell>
                </TableRow>
              ) : (data?.organizations.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No organizations yet.</TableCell>
                </TableRow>
              ) : (
                data!.organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell><StatusBadge status={org.status} /></TableCell>
                    <TableCell><StatusBadge status={org.subscriptionStatus} /></TableCell>
                    <TableCell>{org.memberCount}</TableCell>
                    <TableCell>{org.transactionCount}</TableCell>
                    <TableCell>{org.moduleCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.queues.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              data!.queues.map((q) => (
                <div key={q.name} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                  <span className="font-medium capitalize">{q.name.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-muted-foreground">
                    {q.pending} pending · {q.processing} processing · {q.failed24h} failed (24h)
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Recent failures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentFailures.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No recent failures.</p>
            ) : (
              data!.recentFailures.slice(0, 5).map((f) => (
                <div key={`${f.kind}-${f.id}`} className="text-sm">
                  <p className="font-medium">{f.organizationName ?? "—"} · {f.kind}</p>
                  <p className="text-muted-foreground text-xs">{f.error ?? f.detail} · {relativeTime(f.at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
