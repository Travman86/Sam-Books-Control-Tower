import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import {
  useGetSamBooksMonitoring,
  getGetSamBooksMonitoringQueryKey,
  type MonitoringFailure,
} from "@workspace/api-client-react"

export const STALE_MS = 5 * 60 * 1000

export type Filters = { org: string; days: 7 | 30 }
type Ctx = Filters & { setOrg: (o: string) => void; setDays: (d: 7 | 30) => void }
const FilterCtx = createContext<Ctx | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState("all")
  const [days, setDays] = useState<7 | 30>(7)
  const v = useMemo(() => ({ org, days, setOrg, setDays }), [org, days])
  return <FilterCtx.Provider value={v}>{children}</FilterCtx.Provider>
}
export function useFilters() {
  const c = useContext(FilterCtx)
  if (!c) throw new Error("FilterProvider missing")
  return c
}

export function useMonitoring() {
  const q = useGetSamBooksMonitoring({
    query: { queryKey: getGetSamBooksMonitoringQueryKey(), refetchInterval: 30000, retry: 1 },
  })
  const { org, days } = useFilters()
  const data = q.data
  const now = Date.now()
  const generated = data?.metrics?.generatedAt ? new Date(data.metrics.generatedAt).getTime() : null
  const ageMs = generated != null ? now - generated : data ? now - q.dataUpdatedAt : null
  const sourceStale =
    data?.metricsSource.status === "stale" || data?.overviewSource.status === "stale"
  const stale = !!data && (q.isError || sourceStale || (ageMs != null && ageMs > STALE_MS))
  const failuresAll = data?.failures ?? []
  const failures = useMemo(() => {
    const cutoff = Date.now() - days * 86400000
    return failuresAll.filter(
      (f) =>
        new Date(f.occurredAt).getTime() >= cutoff &&
        (org === "all" || String(f.organizationId) === org),
    )
  }, [failuresAll, org, days, data?.checkedAt])
  const groups = useMemo(() => groupFailures(failures), [failures])
  const queueFailed24h = (data?.overview?.queues ?? []).reduce((a, x) => a + x.failed24h, 0)
  const overviewFresh = !!data && data.overviewSource.status === "available" && !q.isError && !stale
  // Only fresh, available overview queue counts are live degradation evidence; the failure sample is history.
  const health: "DEGRADED" | "UNKNOWN" = overviewFresh && queueFailed24h > 0 ? "DEGRADED" : "UNKNOWN"
  const stamps = [data?.overviewSource.lastSuccessfulAt, data?.metricsSource.lastSuccessfulAt].filter((x): x is string => !!x)
  const lastSuccess = stamps.length ? stamps.sort().reverse()[0] : null
  const overviewOk = data?.overviewSource.status === "available"
  const metricsOk = data?.metricsSource.status === "available"
  return { q, data, stale, overviewOk, metricsOk, failures, groups, health, queueFailed24h, lastSuccess, org, days, ageMs }
}

export type FailureGroup = {
  id: string
  operation: MonitoringFailure["operation"]
  category: string
  items: MonitoringFailure[]
  orgs: number[]
  first: string
  last: string
}
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unclassified"
export const groupId = (op: string, cat: string) => `${op}--${slug(cat)}`

export function groupFailures(list: MonitoringFailure[]): FailureGroup[] {
  const m = new Map<string, FailureGroup>()
  for (const f of list) {
    const id = groupId(f.operation, f.category)
    let g = m.get(id)
    if (!g) {
      g = { id, operation: f.operation, category: f.category, items: [], orgs: [], first: f.occurredAt, last: f.occurredAt }
      m.set(id, g)
    }
    g.items.push(f)
    if (f.organizationId != null && !g.orgs.includes(f.organizationId)) g.orgs.push(f.organizationId)
    if (f.occurredAt < g.first) g.first = f.occurredAt
    if (f.occurredAt > g.last) g.last = f.occurredAt
  }
  return [...m.values()].sort((a, b) => (a.last < b.last ? 1 : -1))
}

export const opLabel = (o: string) => (o === "ingest" ? "Statement ingest" : "WhatsApp agent")
export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not available"
export function fmtAge(sec: number | null | undefined) {
  if (sec == null) return "Not available"
  if (sec < 90) return `${Math.round(sec)}s`
  if (sec < 5400) return `${Math.round(sec / 60)}m`
  return `${(sec / 3600).toFixed(1)}h`
}
// Upstream successRate is already a percentage (100 = 100%).
export const pct = (n: number | null | undefined) => (n == null ? "Not available" : `${Number(n.toFixed(1))}%`)
export const outcomes = (w: { done: number; failed: number }) => `${w.done} done / ${w.done + w.failed} finished`
