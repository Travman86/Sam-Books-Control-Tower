import { Link } from "wouter"
import { AlertTriangle } from "lucide-react"
import { MonitoringGate, Metric, Panel, PageHeader, Pill, NA, Empty, GoLink, Scope } from "@/components/ops-ui"
import { JourneyRows } from "./journeys"
import { fmtAge, fmtDate, opLabel, outcomes, pct } from "@/lib/monitoring"

export default function OpsOverview() {
  return (
    <>
      <PageHeader title="Operations overview" sub="Can real users complete financial tasks? This view only states what instrumentation has actually observed." />
      <MonitoringGate>
        {({ data, failures, groups, health, lastSuccess, days, queueFailed24h, org, overviewOk, metricsOk, q }) => {
          if (!data) return null
          const m = data.metrics
          const ing = m ? (days === 7 ? m.statementIngest.last7d : m.statementIngest.last30d) : null
          const orgs = new Set(failures.map((f) => f.organizationId).filter((x) => x != null))
          const orgNames = new Map((data.overview?.organizations ?? []).map((o) => [o.id, o.name]))
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4" data-testid="card-health">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium text-slate-500">Overall health</span>
                    <Pill tone={health === "DEGRADED" ? "amber" : "slate"} testid="status-health">{health}</Pill>
                  </div>
                  <p className="text-sm text-slate-700 mt-2 max-w-2xl">
                    {health === "DEGRADED"
                      ? `Degraded signal: ${queueFailed24h} failed queue job${queueFailed24h === 1 ? "" : "s"} in the last 24h from a fresh overview. User journeys are not instrumented, so user impact is unconfirmed.`
                      : "Unknown. No fresh degradation signal, and queue jobs completing is not evidence that users can finish a task. Missing or stale data also reads as unknown, and the historical failure sample is not live evidence."}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs space-y-1.5" data-testid="card-connection">
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Last successful update</span><span className="font-medium text-slate-800 text-right">{lastSuccess ? fmtDate(lastSuccess) : "Not available"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Monitored host</span><span className="font-mono text-slate-800 break-all text-right">{data.connection.configured ? data.connection.hostname ?? "Not reported" : "Not connected"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Environment</span><span className="text-slate-800">Not reported</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Identity</span><Pill>{data.connection.identityVerified ? "Verified" : "Unverified"}</Pill></div>
                </div>
              </div>

              {groups.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3" data-testid="banner-incident">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="text-sm text-amber-900 flex-1 min-w-[16rem]">
                    <b>{failures.length} observed failure record{failures.length === 1 ? "" : "s"}</b> in {groups.length} group{groups.length === 1 ? "" : "s"} within the last {days} days. Evidence only: whether any is an active incident is unverified.
                  </div>
                  <GoLink href="/incidents">View observed failures</GoLink>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <Metric testid="metric-e2e" label="End-to-end success" value={<NA />} sub="0 instrumented journeys. This is not 0 successful journeys." />
                <Metric
                  testid="metric-completion"
                  label="Queue duration: avg / p95"
                  scope="QUEUE, not journey"
                  value={ing && metricsOk ? <>{fmtAge(ing.avgSeconds)} <span className="text-slate-400 text-lg">/</span> {fmtAge(ing.p95Seconds)}</> : <NA />}
                  sub={ing && metricsOk ? `Statement ingest queue jobs, last ${days}d, all orgs. Success ${pct(ing.successRate)} (${outcomes(ing)}). Job processing, not a user outcome.` : "Metrics source not available."}
                />
                <Metric
                  testid="metric-orgs"
                  label="Affected organizations"
                  scope="Sample"
                  value={!overviewOk && orgs.size === 0 ? <NA>{data.connection.configured ? "Not available" : "Not connected"}</NA> : orgs.size}
                  sub={`Distinct orgs in observed failure sample, last ${days}d${orgs.size ? ": " + [...orgs].map((id) => orgNames.get(id as number) ?? `#${id}`).join(", ") : ""}. Not all orgs, not necessarily active.`}
                />
                <Metric testid="metric-incidents" label="Open incidents" value={<NA />} sub="No incident lifecycle feed is supplied to Control Tower." />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Panel className="xl:col-span-2" title="User journey coverage" note="Five journeys we care about, and what is actually measured.">
                  <JourneyRows compact signal={overviewOk} />
                </Panel>
                <Panel title="Attention items">
                  <ul className="space-y-2 text-sm" data-testid="list-attention">
                    {queueFailed24h > 0 && <li className="flex gap-2"><Pill tone="amber">Queue</Pill><span>{queueFailed24h} failed queue job{queueFailed24h === 1 ? "" : "s"} in the last 24h (global). <GoLink href="/imports">Imports & queues</GoLink></span></li>}
                    {groups.slice(0, 3).map((g) => (
                      <li key={g.id} className="flex gap-2"><Pill tone="amber">Observed</Pill><span>{opLabel(g.operation)}: {g.category} ({g.items.length} record{g.items.length === 1 ? "" : "s"}). <Link className="text-teal-800 font-semibold hover:underline" href={`/incidents/${g.id}`}>Detail</Link></span></li>
                    ))}
                    <li className="flex gap-2"><Pill>Gap</Pill><span>No journey instrumentation; user outcomes unknown. <GoLink href="/journeys">Coverage</GoLink></span></li>
                    <li className="flex gap-2"><Pill>Gap</Pill><span>No data-quality outcome checks. <GoLink href="/data-quality">Checks</GoLink></span></li>
                  </ul>
                </Panel>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel title="Completion history">
                  <Empty title="No time series">The source returns window aggregates (7d, 30d), not a history. No chart is drawn rather than inventing a trend from averages.</Empty>
                </Panel>
                <Panel title="Targets">
                  <dl className="text-sm divide-y divide-slate-100">
                    {["Journey success target", "Queue p95 target", "Freshness target"].map((t) => (
                      <div key={t} className="flex justify-between py-2"><dt className="text-slate-600">{t}</dt><dd className="font-medium text-slate-500">Not configured</dd></div>
                    ))}
                  </dl>
                </Panel>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel title="Queues" note="Fixed 24h window, all organizations. Org and time filters do not apply.">
                  <div className="space-y-2">
                    {(data.overview?.queues ?? []).map((qu) => (
                      <div key={qu.name} className="grid grid-cols-5 gap-2 text-xs items-center border-b border-slate-100 pb-2 last:border-0" data-testid={`row-queue-${qu.name}`}>
                        <span className="col-span-2 font-medium text-slate-800">{opLabel(qu.name)}</span>
                        <span>{qu.pending} pending</span><span>{qu.failed24h} failed</span><span>oldest {fmtAge(qu.oldestPendingAgeSeconds)}</span>
                      </div>
                    ))}
                    {!data.overview && <NA>Overview source unavailable</NA>}
                    {data.overview && data.overview.queues.length === 0 && <p className="text-sm text-slate-600">No activity reported by the source.</p>}
                  </div>
                </Panel>
                <Panel title="Platform totals" note="Current counts from the connected instance.">
                  {data.overview ? (
                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                      <dt className="text-slate-500">Organizations</dt><dd className="font-medium tabular-nums">{data.overview.totals.organizations}</dd>
                      <dt className="text-slate-500">Platform admins</dt><dd className="font-medium tabular-nums">{data.overview.totals.platformAdmins}</dd>
                      <dt className="text-slate-500">Modules</dt><dd className="font-medium tabular-nums">{data.overview.totals.modules}</dd>
                      <dt className="text-slate-500">Users</dt><dd className="font-medium tabular-nums">{data.overview.totals.users}</dd>
                      <dt className="text-slate-500">Active subscriptions</dt><dd className="font-medium tabular-nums">{data.overview.totals.activeSubscriptions}</dd>
                    </dl>
                  ) : <NA />}
                  <Scope>Global current totals; not affected by org or time filters. Size, not health.</Scope>
                </Panel>
              </div>

              <Panel title="Organizations" note={`Current snapshot, fixed. Org filter applies; time filter does not.${org === "all" ? "" : ""} Totals above stay global.`}>
                {!data.overview ? <NA>Overview source unavailable</NA> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" data-testid="table-orgs">
                      <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-1.5 pr-3">ID</th><th className="pr-3">Name</th><th className="pr-3">Status</th><th className="pr-3">Subscription</th><th className="pr-3">Members</th><th className="pr-3">Transactions</th><th>Modules</th></tr></thead>
                      <tbody>
                        {data.overview.organizations.filter((o) => org === "all" || String(o.id) === org).map((o) => (
                          <tr key={o.id} className="border-b border-slate-100 last:border-0" data-testid={`row-org-${o.id}`}>
                            <td className="py-2 pr-3 tabular-nums">{o.id}</td><td className="pr-3 font-medium">{o.name}</td>
                            <td className="pr-3"><Pill tone={o.status === "suspended" ? "amber" : "slate"}>{o.status}</Pill></td>
                            <td className="pr-3">{o.subscriptionStatus}</td><td className="pr-3 tabular-nums">{o.memberCount}</td><td className="pr-3 tabular-nums">{o.transactionCount}</td><td className="tabular-nums">{o.moduleCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.overview.organizations.length === 0 && <p className="py-3 text-sm text-slate-600">No organizations reported.</p>}
                  </div>
                )}
              </Panel>

              <Panel title="Monitoring coverage" right={<GoLink href="/dependencies">Dependencies</GoLink>} note="Successful polls show the tower could reach the source. They are not a heartbeat from the monitored service; none is supplied.">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" data-testid="panel-coverage">
                  {([["Overview source", data.overviewSource], ["Metrics source", data.metricsSource]] as const).map(([n, s]) => (
                    <div key={n} className="border border-slate-200 rounded-md p-3">
                      <div className="flex justify-between"><dt className="font-medium text-slate-800">{n}</dt><Pill tone={s.status === "available" ? "teal" : s.status === "stale" ? "amber" : "slate"}>{s.status.replace("_", " ")}</Pill></div>
                      <dd className="text-slate-500 mt-1">Service heartbeat: Not available. Last successful {fmtDate(s.lastSuccessfulAt)}. Last poll {fmtDate(s.checkedAt)}.</dd>
                    </div>
                  ))}
                </dl>
                {q.isError && <p className="text-xs text-amber-800 mt-2">Latest refresh failed; figures above are the last successful observation.</p>}
              </Panel>
            </div>
          )
        }}
      </MonitoringGate>
    </>
  )
}
