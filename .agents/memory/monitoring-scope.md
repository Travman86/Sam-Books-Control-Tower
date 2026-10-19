---
name: Control Tower monitoring scope
description: Standing boundaries for operational monitoring and truthful telemetry presentation.
---

Scope monitoring work to Control Tower. Identify missing instrumentation in
Sam Books without silently modifying that separate application. Preserve
governance, sign-in, permissions and connected data. Do not publish automatically.

**Why:** The user explicitly set these boundaries when requesting the operational
monitoring redesign.

**How to apply:** Work in preview. Treat illustrative concept data as fictional,
never seed it as real monitoring. Missing/stale signals are unknown, not healthy.
Historical errors are not active incidents without lifecycle evidence; aggregate
queue averages cannot establish journey success or historical percentiles.
Verify connection identity from upstream evidence; do not retarget credentials
or URLs based on a suspected outdated label.
