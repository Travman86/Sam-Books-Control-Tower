import * as React from "react"
import { Link } from "wouter"
import { useGetDashboard } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Clock, ShieldAlert, AlertTriangle, FolderKanban } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard()

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse">Loading dashboard...</div></div>
  }

  if (error || !dashboard) {
    return <div className="text-destructive">Failed to load dashboard data.</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your authorization posture and current workflow.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting human sign-off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protected Features</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.protectedFeatures}</div>
            <p className="text-xs text-muted-foreground mt-1">With active policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Week</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.approvedThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Changes authorized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Changes</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.blockedChanges}</div>
            <p className="text-xs text-muted-foreground mt-1">Rejected by reviewers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>
              The most recent change request awaiting your review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.latestReview ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{dashboard.latestReview.title}</h4>
                    <p className="text-sm text-muted-foreground">{dashboard.latestReview.projectName} • {dashboard.latestReview.featureName}</p>
                  </div>
                  <Badge variant={
                    dashboard.latestReview.risk === 'high' ? 'destructive' :
                    dashboard.latestReview.risk === 'medium' ? 'warning' : 'default'
                  }>
                    {dashboard.latestReview.risk} risk
                  </Badge>
                </div>
                <div className="bg-muted p-3 rounded-md text-sm font-mono text-muted-foreground">
                  {dashboard.latestReview.summary}
                </div>
                <div className="flex justify-end pt-2">
                  <Button asChild>
                    <Link href={`/reviews/${dashboard.latestReview.id}`}>
                      Review Changes <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldCheck className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">All caught up</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">There are no pending reviews requiring your attention right now.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest authorization events across projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {dashboard.activity.length > 0 ? dashboard.activity.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="mt-0.5 bg-muted rounded-full p-1.5 flex-shrink-0">
                    {event.kind === 'approved' && <ShieldCheck className="h-3 w-3 text-green-500" />}
                    {event.kind === 'rejected' && <ShieldAlert className="h-3 w-3 text-destructive" />}
                    {event.kind === 'submitted' && <Clock className="h-3 w-3 text-amber-500" />}
                    {event.kind === 'connected' && <FolderKanban className="h-3 w-3 text-primary" />}
                    {event.kind === 'revoked' && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.actor} • {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Button variant="ghost" className="w-full text-xs" asChild>
                <Link href="/activity">View all activity</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
