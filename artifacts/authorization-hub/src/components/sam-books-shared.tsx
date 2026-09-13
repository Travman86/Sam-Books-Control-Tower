import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Shared building blocks for the /sam-books/* pages — kept separate from
 * Auth Hub's own components so the two surfaces (this app's project
 * governance vs. the connected Sam Books instance) don't drift into each
 * other. Mirrors the shape of finance-app's control-shared.tsx, adapted to
 * this app's own design tokens.
 */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: React.ElementType
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

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

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={STATUS_TONE[status] ?? "outline"} className={cn("whitespace-nowrap", className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function rate(v: number | null): string {
  return v === null ? "—" : `${v}%`
}

export function ConnectionNotice({ error }: { error: unknown }) {
  const notConfigured = error instanceof Error && error.message.includes("must both be configured")
  if (!notConfigured) return null
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/40">
      <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-400">
        Not connected yet — set <code className="font-mono">SAM_BOOKS_API_URL</code> and{" "}
        <code className="font-mono">SAM_BOOKS_API_KEY</code> as secrets on this app, matching Sam Books' own{" "}
        <code className="font-mono">CONTROL_TOWER_API_KEY</code>.
      </CardContent>
    </Card>
  )
}
