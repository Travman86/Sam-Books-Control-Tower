import type { SamBooksOverview, SamBooksMetrics } from "@workspace/api-zod";

/**
 * A narrow allowlist rather than regex-only redaction of arbitrary diagnostics.
 * Error strings can contain SQL parameters, customer text and signed URLs.
 * They are classified in memory and never returned or logged by this snapshot.
 */
export function failureCategory(message: string | null): string {
  const text = (message ?? "").toLowerCase();
  if (/timeout|timed out|deadline/.test(text)) return "Processing timeout";
  if (/unauthori[sz]ed|forbidden|invalid.*key|authentication/.test(text)) {
    return "Dependency authentication failure";
  }
  if (/rate.?limit|too many requests|429/.test(text)) return "Dependency rate limit";
  if (/parse|invalid.*file|unsupported.*file/.test(text)) return "File processing failure";
  if (/database|sql|constraint|relation|postgres/.test(text)) return "Data persistence failure";
  if (/network|econn|fetch failed|unreachable/.test(text)) return "Dependency connectivity failure";
  return "Processing failure";
}

export function safeOverview(data: SamBooksOverview): SamBooksOverview {
  return {
    ...data,
    // Display opaque tenant identities, not potentially personal business names.
    organizations: data.organizations.map((org) => ({
      ...org,
      name: `Organisation ${org.id}`,
    })),
    recentFailures: data.recentFailures.map((failure) => ({
      ...failure,
      organizationName: failure.organizationId == null
        ? null
        : `Organisation ${failure.organizationId}`,
      detail: failureCategory(failure.error),
      error: null,
    })),
  };
}

export function safeFailures(data: SamBooksOverview | null) {
  return (data?.recentFailures ?? []).map((failure) => ({
    id: `${failure.kind}-${failure.id}`,
    operation: failure.kind,
    category: failureCategory(failure.error),
    occurredAt: failure.at,
    organizationId: failure.organizationId,
  }));
}

export const STALE_AFTER_MS = 5 * 60 * 1000;

export function metricsStale(data: SamBooksMetrics, now: number): boolean {
  const timestamp = data.generatedAt instanceof Date
    ? data.generatedAt.getTime()
    : Date.parse(String(data.generatedAt));
  return !Number.isFinite(timestamp) ||
    now - timestamp > STALE_AFTER_MS ||
    timestamp - now > 60_000;
}

export function safeConnection(base: string | undefined, keyExists: boolean) {
  let hostname: string | null = null;
  let validUrl = false;
  try {
    const parsed = new URL(base ?? "");
    hostname = parsed.hostname;
    validUrl = parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    // No URL, path, username, password or query string is returned.
  }
  return {
    configured: Boolean(validUrl && keyExists),
    hostname,
    environment: null,
    identityVerified: false,
    explanation: "Hostname comes from the configured connection, not a verified deployment identity. Sam Books does not report its environment, deployment ID or canonical URL; an outdated label cannot be ruled out. No connection settings have been changed.",
  };
}
