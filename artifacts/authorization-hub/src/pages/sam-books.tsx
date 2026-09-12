import * as React from "react"
import { useState } from "react"
import {
  useGetSamBooksOverview,
  useListSamBooksProjects,
  useListSamBooksFeatureRequests,
  useListSamBooksAgentRuns,
  useGetSamBooksMetrics,
} from "@workspace/api-client-react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Building2, Users, Boxes, CreditCard, AlertTriangle, Activity, type LucideIcon } from "lucide-react"

/**
 * Read-only window into the connected Sam Books instance. Everything here is
 * proxied through this app's own `/api/sam-books/*` routes, which forward to
 * Sam Books' `/api/admin/*` Control Tower API with a shared secret — see
 * `artifacts/api-server/src/routes/sam-books.ts`. Approve/reject actions stay
 * in Sam Books' own Control Tower for now; this is visibility, not control.
 */

const STATUS_TONE: Record<string, "success" | "destructive" | "warning" | "outline"> = {
  active: "success",
  approved: "success",
  completed: "success",
  applied: "success",
  suspended: "destructive",
  rejected: "destructive",
  failed: "destructive",
  past_due: "destructive",
  canceled: "destructive",
  unpaid: "destructive",
  submitted: "warning",
  pending: "warning",
  running: "warning",
  queued: "warning",
  changes_requested: "warning",
  trialing: "outline",
  manual: "outline",
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_TONE[status] ?? "outline"}>{status.replace(/_/g, " ")}</Badge>
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

function rate(v: number | null): string {
  return v === null ? "—" : `${v}%`
}

export default function SamBooks() {
  const [reqStatus, setReqStatus] = useState<"submitted" | "approved" | "rejected" | "changes_requested">("submitted")
  const [runStatus, setRunStatus] = useState<"all" | "queued" | "running" | "completed" | "applied" | "failed">("all")

  const overview = useGetSamBooksOverview()
  const projects = useListSamBooksProjects()
  const featureRequests = useListSamBooksFeatureRequests({ status: reqStatus })
  const agentRuns = useListSamBooksAgentRuns({ status: runStatus })
  const metrics = useGetSamBooksMetrics()

  const notConfigured =
    overview.error instanceof Error && overview.error.message.includes("must both be configured")

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sam Books</h1>
        <p className="text-muted-foreground mt-1">
          Live status of the connected Sam Books instance, proxied through its own Control Tower API.
        </p>
      </div>

      {notConfigured && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/40">
          <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-400">
            Not connected yet — set <code className="font-mono">SAM_BOOKS_API_URL</code> and{" "}
            <code className="font-mono">SAM_BOOKS_API_KEY</code> as secrets on this app, matching Sam Books' own{" "}
            <code className="font-mono">CONTROL_TOWER_API_KEY</code>.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="agent-runs">Agent runs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard icon={Building2} label="Organizations" value={overview.data?.totals.organizations} />
            <StatCard icon={Users} label="Users" value={overview.data?.totals.users} />
            <StatCard icon={Boxes} label="Modules" value={overview.data?.totals.modules} />
            <StatCard icon={CreditCard} label="Active subscriptions" value={overview.data?.totals.activeSubscriptions} />
            <StatCard icon={Users} label="Platform admins" value={overview.data?.totals.platformAdmins} />
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
                  ) : (overview.data?.organizations.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No organizations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overview.data!.organizations.map((org) => (
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
                {(overview.data?.queues.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  overview.data!.queues.map((q) => (
                    <div
                      key={q.name}
                      className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0"
                    >
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
                {(overview.data?.recentFailures.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent failures.</p>
                ) : (
                  overview.data!.recentFailures.slice(0, 5).map((f) => (
                    <div key={`${f.kind}-${f.id}`} className="text-sm">
                      <p className="font-medium">
                        {f.organizationName ?? "—"} · {f.kind}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {f.error ?? f.detail} · {relativeTime(f.at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Open requests</TableHead>
                    <TableHead>Awaiting approval</TableHead>
                    <TableHead>Latest run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">Loading…</TableCell>
                    </TableRow>
                  ) : (projects.data?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No custom modules yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.data!.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.name}
                          {p.published && (
                            <Badge variant="outline" className="ml-2 text-xs font-normal">
                              published
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{p.organizationName}</TableCell>
                        <TableCell>{p.openRequests}</TableCell>
                        <TableCell>
                          {p.awaitingApproval > 0 ? <Badge variant="warning">{p.awaitingApproval}</Badge> : "0"}
                        </TableCell>
                        <TableCell>{p.latestRun ? <StatusBadge status={p.latestRun.status} /> : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="approvals" className="space-y-4 mt-4">
          <div className="flex gap-2">
            {(["submitted", "approved", "rejected", "changes_requested"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={reqStatus === s ? "default" : "outline"}
                onClick={() => setReqStatus(s)}
              >
                {s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRequests.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell>
                    </TableRow>
                  ) : (featureRequests.data?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nothing here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    featureRequests.data!.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>{r.moduleName}</TableCell>
                        <TableCell>{r.organizationName}</TableCell>
                        <TableCell>{r.requester.name}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>{relativeTime(r.submittedAt ?? r.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Read-only for now — approve/reject a request from Sam Books' own Control Tower (
            <code className="font-mono">/control/approvals</code>).
          </p>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="agent-runs" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {(["all", "queued", "running", "completed", "applied", "failed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={runStatus === s ? "default" : "outline"}
                onClick={() => setRunStatus(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Checks</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentRuns.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell>
                    </TableRow>
                  ) : (agentRuns.data?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No runs yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentRuns.data!.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.moduleName}</TableCell>
                        <TableCell>{run.organizationName}</TableCell>
                        <TableCell><StatusBadge status={run.status} /></TableCell>
                        <TableCell>{run.checksPassed}/{run.checksTotal}</TableCell>
                        <TableCell>{run.durationSeconds !== null ? `${run.durationSeconds}s` : "—"}</TableCell>
                        <TableCell>{relativeTime(run.startedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="performance" className="mt-4">
          {metrics.isLoading || !metrics.data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <QueueCard title="Statement ingest" metric={metrics.data.statementIngest} />
              <QueueCard title="WhatsApp agent" metric={metrics.data.whatsappAgent} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Finance agent usage (7d)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Active conversations" value={metrics.data.financeAgentUsage.activeConversations7d} />
                  <Metric label="Assistant messages" value={metrics.data.financeAgentUsage.assistantMessages7d} />
                  <Metric label="Tool-calling turns" value={metrics.data.financeAgentUsage.toolCallingTurns7d} />
                  <Metric label="WhatsApp threads" value={metrics.data.financeAgentUsage.whatsappThreads} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Growth (30d)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-sm">
                  <Metric label="New orgs" value={metrics.data.growth.newOrganizations30d} />
                  <Metric label="New users" value={metrics.data.growth.newUsers30d} />
                  <Metric label="Transactions" value={metrics.data.growth.transactions30d} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? "—"}</div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-bold">{value}</p>
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
        <div>
          <p className="text-muted-foreground text-xs">Success rate (7d)</p>
          <p className="text-xl font-bold">{rate(metric.last7d.successRate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Avg time (7d)</p>
          <p className="text-xl font-bold">
            {metric.last7d.avgSeconds !== null ? `${Math.round(metric.last7d.avgSeconds)}s` : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
