import * as React from "react"
import { Link } from "wouter"
import { useGetDashboard } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Clock, ShieldAlert, AlertTriangle, FolderKanban, ListTodo } from "lucide-react"
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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">Code changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <ListTodo className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.pendingManagementActions}</div>
            <p className="text-xs text-muted-foreground mt-1">Project decisions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protected Features</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.protectedFeatures}</div>
            <p className="text-xs text-muted-foreground mt-1">Active policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Weekly</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.approvedThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Authorized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Weekly</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.blockedChanges}</div>
            <p className="text-xs text-muted-foreground mt-1">Rejected requests</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 mt-4">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Needs Attention (Code)</CardTitle>
            <CardDescription>
              The most recent code change request awaiting your review.
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
              <div className="flex flex-col items-center justify-center py-8 text-center h-[180px]">
                <ShieldCheck className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-medium text-lg">All caught up</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">No pending code reviews.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Management Actions</CardTitle>
            <CardDescription>Project operations proposed by AI agents.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col h-full justify-between pb-6">
            <div className="flex flex-col items-center text-center py-4">
              <div className="bg-background p-3 rounded-full mb-3 shadow-sm border border-primary/20">
                <ListTodo className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold">{dashboard.pendingManagementActions}</div>
              <p className="text-sm text-muted-foreground mt-1">Pending approval</p>
            </div>
            <Button asChild className="w-full mt-4" variant={dashboard.pendingManagementActions > 0 ? "default" : "outline"}>
              <Link href="/actions">
                Open Action Queue <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
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
