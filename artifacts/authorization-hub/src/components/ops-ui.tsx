import { type ReactNode } from "react"
import { Link } from "wouter"
import { AlertTriangle, ArrowRight, CircleHelp, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { fmtDate, useMonitoring } from "@/lib/monitoring"

type Tone = "teal" | "amber" | "red" | "slate"
const TONES: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-800 border-teal-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-800 border-red-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
}
export function Pill({ tone = "slate", children, testid }: { tone?: Tone; children: ReactNode; testid?: string }) {
  return (
    <span data-testid={testid} className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap", TONES[tone])}>
      {children}
    </span>
  )
}

export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-600 mt-1 max-w-3xl">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Panel({ title, note, children, className, right }: { title?: string; note?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn("bg-white border border-slate-200 rounded-lg", className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  )
}

export function NA({ children = "Not available" }: { children?: ReactNode }) {
  return <span className="text-slate-500 italic">{children}</span>
}

export function Metric({ label, value, sub, scope, testid }: { label: string; value: ReactNode; sub?: ReactNode; scope?: string; testid: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 min-w-0" data-testid={testid}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        {scope && <Pill>{scope}</Pill>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums break-words">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-slate-500 leading-snug">{sub}</div>}
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-lg px-5 py-8 text-center bg-slate-50/60">
      <CircleHelp className="w-5 h-5 mx-auto text-slate-400" />
      <div className="mt-2 text-sm font-semibold text-slate-800">{title}</div>
      <p className="text-xs text-slate-600 mt-1 max-w-xl mx-auto leading-relaxed">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function GoLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline">
      {children} <ArrowRight className="w-3 h-3" />
    </Link>
  )
}

export function Scope({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-slate-500 mt-2">{children}</p>
}

/** Gate for monitoring pages: skeleton, hard error (no data), and stale/unavailable banner. */
export function MonitoringGate({ children }: { children: (m: ReturnType<typeof useMonitoring>) => ReactNode }) {
  const m = useMonitoring()
  const { q, data, stale } = m
  if (q.isLoading) {
    return (
      <div className="space-y-3" data-testid="state-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-5" data-testid="state-error">
        <div className="flex items-center gap-2 text-red-800 font-semibold text-sm"><AlertTriangle className="w-4 h-4" /> Monitoring data unavailable</div>
        <p className="text-sm text-red-800/90 mt-1">The monitoring request failed and no earlier observation is cached. Health is unknown; nothing here should be read as healthy.</p>
        <button type="button" data-testid="button-retry" onClick={() => q.refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-red-200 rounded px-3 py-1.5 text-red-800">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }
  const srcMsgs = [data.overviewSource, data.metricsSource].filter((s) => s.status !== "available")
  return (
    <>
      {(stale || srcMsgs.length > 0) && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900" data-testid="banner-stale">
          <div className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />
            {q.isError ? "Latest refresh failed. Showing last successful observation, marked stale." : "Observations are stale or partly unavailable."}
          </div>
          <ul className="text-xs mt-1 space-y-0.5">
            {srcMsgs.map((s, i) => <li key={i}>{s.status.replace("_", " ")}: {s.message}</li>)}
            <li>Last successful update: {fmtDate(m.lastSuccess)}</li>
          </ul>
        </div>
      )}
      {children(m)}
    </>
  )
}
