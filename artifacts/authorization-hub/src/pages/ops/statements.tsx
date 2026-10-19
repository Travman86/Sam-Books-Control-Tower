import { Link } from "wouter"
import { Empty, MonitoringGate, NA, PageHeader, Panel, Pill } from "@/components/ops-ui"

const STEPS = ["Received", "File stored", "Queued (when relevant)", "Parsed", "Validated", "Account assignment", "Transactions saved", "Reports updated", "User notified"]
const COUNTS = [
  ["Found", "Transactions detected in the file."],
  ["Saved", "Transactions written to the ledger."],
  ["Skipped", "Detected but intentionally not saved (for example duplicates)."],
  ["Failed", "Detected but could not be saved."],
]
const CHECKS = ["File retained", "Valid rows", "Correct account", "Balances reconciled", "Visibility in reports"]

export default function StatementJourney() {
  return (
    <>
      <PageHeader title="Statement import journey" sub="Coverage and expected sequence. This is not a statement record; the connected API does not supply per-statement telemetry." right={<Link href="/imports" className="text-xs font-semibold text-teal-800 hover:underline">Queue evidence</Link>} />
      <MonitoringGate>
        {() => (
          <div className="space-y-4">
            <Panel title="Sequence" note="All steps are uninstrumented. No timings or completions are shown.">
              <ol className="divide-y divide-slate-100" data-testid="list-steps">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-6 h-6 rounded-full border border-slate-300 text-[11px] flex items-center justify-center text-slate-500">{i + 1}</span>
                    <span className="flex-1 text-slate-800">{s}</span><Pill>Not available</Pill>
                  </li>
                ))}
              </ol>
            </Panel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Duration">
                <dl className="text-sm divide-y divide-slate-100">
                  <div className="flex justify-between py-2"><dt>Automated duration</dt><dd><NA /></dd></div>
                  <div className="flex justify-between py-2"><dt>Waiting for user</dt><dd><NA /></dd></div>
                </dl>
                <p className="text-xs text-slate-500 mt-2">Kept separate: machine processing time and time spent waiting on the user are different problems.</p>
              </Panel>
              <Panel title="Transaction counts">
                <dl className="text-sm divide-y divide-slate-100">
                  {COUNTS.map(([k, d]) => (
                    <div key={k} className="py-2"><div className="flex justify-between"><dt className="font-medium">{k}</dt><dd><NA /></dd></div><p className="text-xs text-slate-500">{d}</p></div>
                  ))}
                </dl>
              </Panel>
            </div>
            <Panel title="Outcome checks">
              <div className="flex flex-wrap gap-2">{CHECKS.map((c) => <span key={c} className="text-sm border border-slate-200 rounded px-2.5 py-1">{c} <Pill>Uninstrumented</Pill></span>)}</div>
            </Panel>
            <Panel title="Event history">
              <Empty title="Not available: statement events">The connected API does not supply statement events, so no history can be shown. Raw diagnostics are intentionally not displayed, and there is no deep link to Sam Books because the statement destination is unknown.</Empty>
            </Panel>
          </div>
        )}
      </MonitoringGate>
    </>
  )
}
