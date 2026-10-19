import { MonitoringGate, PageHeader, Panel, Pill } from "@/components/ops-ui"

const CHECKS = [
  ["Statement file retained", "The uploaded file is still stored after processing."],
  ["Valid rows parsed", "Rows extracted match the statement content."],
  ["Correct account assigned", "Transactions land in the intended account."],
  ["Balances reconciled", "Closing balance equals opening plus transactions."],
  ["Visible in reports", "Saved transactions appear in reports and balances."],
  ["No duplicate transactions", "Re-imports do not double count."],
]

export default function DataQuality() {
  return (
    <>
      <PageHeader title="Data quality" sub="Outcome checks verify results, not that a job ran. No check results are supplied to Control Tower." />
      <MonitoringGate>
        {() => (
          <Panel title="Outcome checks" note="Every check is missing. Missing is not passing.">
            <div className="divide-y divide-slate-100" data-testid="list-checks">
              {CHECKS.map(([n, d]) => (
                <div key={n} className="flex items-center justify-between gap-3 py-2.5">
                  <div><div className="text-sm font-medium">{n}</div><div className="text-xs text-slate-500">{d}</div></div>
                  <Pill>Uninstrumented</Pill>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </MonitoringGate>
    </>
  )
}
