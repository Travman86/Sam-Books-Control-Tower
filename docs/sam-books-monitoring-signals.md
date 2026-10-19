# Sam Books monitoring: supplied signals and missing coverage

This document describes the integration boundary, not a change to Sam Books.
Control Tower reads the existing `/api/admin/overview` and `/api/admin/metrics`
using the existing authenticated server-to-server connection. Its session gate
and governance routes remain in place. It does not start retries or change
financial data.

## Available now

- Organisation and user totals; organisation subscription and transaction totals.
- Ingest and WhatsApp queue pending/processing counts, last-24-hour completion
  and failure counts, oldest queued age.
- Seven- and thirty-day queue completion/failure/retry counts, reported success
  rate, average duration and p95 when supplied.
- PDF correction counts, finance-agent usage, growth aggregates.
- A **limited sample** of dated ingest and WhatsApp failure records.

Queue completion is not proof that a statement is allocated to the correct
account or visible in reports. Queue success rates are not end-to-end user
journey success rates. Returned failure records do not provide a complete
incident history or lifecycle. Do not interpret their absence as proof of
health, recovery, or absence of data loss.

## Required from Sam Books for full monitoring

### Deployment identity and coverage

Report a stable deployment ID, environment, canonical application URL, service
names, producer timestamps, version/release IDs and last-seen heartbeats.
The hostname configured in Control Tower identifies the connection target
only. Without upstream identity it cannot prove that a label is current or
that the intended deployment is being monitored.

### Journey and statement records

Supply paginated journey records with opaque journey/import/statement IDs,
organisation ID, operation, start/end timestamps, outcome and safe error code.
Report the actual stages: Received, File stored, Queued (when relevant),
Parsed, Validated, Account assignment, Transactions saved, Reports updated,
User notified. Each event needs an event ID, original timestamp, status,
attempt/retry count and applicable automated/waiting-for-user durations.
Never infer stage completion from later queue aggregates.

Provide found/saved/skipped/failed transaction counts with documented
semantics (including duplicate skips and partial successes). Include explicit
outcome checks for retained files, valid rows, correct account, reconciled
balances and report visibility. Each check needs measured/pending/failed/
uninstrumented state and supporting evidence.

Provide an authorised statement deep-link destination rather than making
Control Tower construct one from guessed paths.

### Time series and definitions

For every metric include scope, time window, numerator/denominator,
completion definition, population, timestamp and units. Supply real time
buckets or raw duration samples for historical charts and percentiles.
Provide approved targets rather than inventing SLOs from observed durations.
Expose per-organisation breakdowns before claiming aggregate filters apply.

### Incident lifecycle and releases

An incident feed should provide stable incident IDs/fingerprints, severity,
status, owner, first/last occurrence, grouped occurrence count, affected
operations/organisations, impact and chronological events. Include measured
recovery criteria, provenance and links to authorised evidence. Historical
failure records alone are not active incidents.

Owner, acknowledgement and lifecycle updates require an authorised, audited
persistent API before exposing those controls. Investigation suggestions
must not automatically retry operations or make destructive changes.

Release monitoring requires actual deployment events and running version
identity; a module revision or published flag is not a deployment event.

## Privacy

Control Tower's operational snapshot exposes opaque organisation IDs and
allowlisted error categories. It excludes free-text errors, customer text,
SQL parameters, credentials, signed URLs and internal object paths.
Any future diagnostics must be redacted and authorised server-side, not
merely hidden in the browser.

## Freshness

The metrics snapshot is stale after five minutes or when its producer clock
is more than a minute in the future. Overview reads have no producer
timestamp: a successful HTTP read establishes transport availability only,
not a service heartbeat. Empty, unavailable, disconnected and stale signals
must remain distinct.
