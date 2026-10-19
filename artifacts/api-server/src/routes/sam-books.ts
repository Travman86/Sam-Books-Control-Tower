import { Router, type IRouter, type Response } from "express";
import {
  GetSamBooksOverviewResponse,
  ListSamBooksProjectsResponse,
  ListSamBooksFeatureRequestsQueryParams,
  ListSamBooksFeatureRequestsResponse,
  GetSamBooksFeatureRequestResponse,
  DecideSamBooksFeatureRequestBody,
  DecideSamBooksFeatureRequestResponse,
  ListSamBooksAgentRunsQueryParams,
  ListSamBooksAgentRunsResponse,
  GetSamBooksAgentRunResponse,
  GetSamBooksMetricsResponse,
  GetSamBooksMonitoringResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { metricsStale, safeConnection, safeFailures, safeOverview } from "../lib/monitoring";

const router: IRouter = Router();

/**
 * Read-only (plus feature-request decisions) proxy into the connected Sam
 * Books instance's own `/api/admin/*` Control Tower API. Sam Books is a
 * separate deployment with its own database — this app never touches it
 * directly. Sam Books has no session cookie to give a server-to-server
 * caller, so it trusts a shared secret instead: `SAM_BOOKS_API_KEY` here must
 * match `CONTROL_TOWER_API_KEY` on the Sam Books side, and `SAM_BOOKS_API_URL`
 * must point at its deployment.
 */
class UpstreamError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

async function fetchSamBooks(path: string, init?: RequestInit): Promise<unknown> {
  const base = process.env["SAM_BOOKS_API_URL"];
  const key = process.env["SAM_BOOKS_API_KEY"];
  if (!base || !key) {
    throw new UpstreamError("SAM_BOOKS_API_URL and SAM_BOOKS_API_KEY must both be configured.");
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/api/admin${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: { "content-type": "application/json", ...(init?.headers ?? {}), "x-control-tower-key": key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 404 (unknown id) and 409 (already decided) are real resource states
    // Sam Books reports deliberately — pass them through as-is. Anything
    // else (auth misconfiguration, Sam Books down, etc.) collapses to 502.
    const status = res.status === 404 || res.status === 409 ? res.status : 502;
    throw new UpstreamError((data as { error?: string }).error ?? `Sam Books returned ${res.status}.`, status);
  }
  return data;
}

router.get("/sam-books/monitoring", async (_req, res) => {
  const checkedAt = new Date().toISOString();
  const connection = safeConnection(
    process.env["SAM_BOOKS_API_URL"],
    Boolean(process.env["SAM_BOOKS_API_KEY"]),
  );
  const emptySource = {
    status: connection.configured ? "not_available" : "not_connected",
    checkedAt,
    lastSuccessfulAt: null as string | null,
    generatedAt: null as string | null,
    message: connection.configured
      ? "Source could not be read. No health conclusion can be drawn."
      : "Sam Books monitoring is not connected.",
  };
  const [overviewResult, metricsResult] = await Promise.allSettled([
    connection.configured
      ? fetchSamBooks("/overview").then((data) => GetSamBooksOverviewResponse.parse(data))
      : Promise.reject(new Error("Not connected")),
    connection.configured
      ? fetchSamBooks("/metrics").then((data) => GetSamBooksMetricsResponse.parse(data))
      : Promise.reject(new Error("Not connected")),
  ]);
  const overview = overviewResult.status === "fulfilled" ? overviewResult.value : null;
  const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : null;
  const completedAt = new Date().toISOString();
  const stale = metrics ? metricsStale(metrics, Date.now()) : false;
  // Do not log upstream error objects: they can include raw financial diagnostics.
  res.setHeader("Cache-Control", "private, no-store");
  res.json(GetSamBooksMonitoringResponse.parse({
    checkedAt: completedAt,
    connection,
    overviewSource: overview ? {
      ...emptySource,
      status: "available",
      checkedAt: completedAt,
      lastSuccessfulAt: completedAt,
      message: "Overview API read successfully. Producer timestamp and service heartbeat are not supplied; transport availability is not end-to-end health.",
    } : emptySource,
    metricsSource: metrics ? {
      ...emptySource,
      status: stale ? "stale" : "available",
      checkedAt: completedAt,
      lastSuccessfulAt: completedAt,
      generatedAt: metrics.generatedAt,
      message: stale
        ? "The source snapshot is older than five minutes or its clock is inconsistent. Treat health as unknown."
        : "Aggregate queue metrics read successfully. This is not end-to-end journey telemetry.",
    } : emptySource,
    overview: overview ? safeOverview(overview) : null,
    metrics,
    failures: safeFailures(overview),
  }));
});

function handleUpstreamError(res: Response, err: unknown): void {
  if (err instanceof UpstreamError && err.status !== 502) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  logger.error({ err }, "Sam Books proxy request failed");
  res.status(502).json({ error: err instanceof Error ? err.message : "Sam Books is unreachable." });
}

function parsePositiveIntParam(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

router.get("/sam-books/overview", async (_req, res) => {
  try {
    res.json(GetSamBooksOverviewResponse.parse(await fetchSamBooks("/overview")));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.get("/sam-books/projects", async (_req, res) => {
  try {
    res.json(ListSamBooksProjectsResponse.parse(await fetchSamBooks("/projects")));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.get("/sam-books/feature-requests", async (req, res) => {
  const query = ListSamBooksFeatureRequestsQueryParams.safeParse(req.query);
  const status = query.success ? query.data.status : "submitted";
  try {
    const data = await fetchSamBooks(`/feature-requests?status=${encodeURIComponent(status)}`);
    res.json(ListSamBooksFeatureRequestsResponse.parse(data));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.get("/sam-books/feature-requests/:featureRequestId", async (req, res) => {
  const id = parsePositiveIntParam(req.params.featureRequestId);
  if (id === null) {
    res.status(400).json({ error: "featureRequestId must be a positive integer." });
    return;
  }
  try {
    res.json(GetSamBooksFeatureRequestResponse.parse(await fetchSamBooks(`/feature-requests/${id}`)));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.post("/sam-books/feature-requests/:featureRequestId/decision", async (req, res) => {
  const id = parsePositiveIntParam(req.params.featureRequestId);
  if (id === null) {
    res.status(400).json({ error: "featureRequestId must be a positive integer." });
    return;
  }
  const body = DecideSamBooksFeatureRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid decision." });
    return;
  }
  try {
    const data = await fetchSamBooks(`/feature-requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(body.data),
    });
    res.json(DecideSamBooksFeatureRequestResponse.parse(data));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.get("/sam-books/agent-runs", async (req, res) => {
  const query = ListSamBooksAgentRunsQueryParams.safeParse(req.query);
  const status = query.success ? query.data.status : "all";
  try {
    const data = await fetchSamBooks(`/agent-runs?status=${encodeURIComponent(status)}`);
    res.json(ListSamBooksAgentRunsResponse.parse(data));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.get("/sam-books/agent-runs/:agentRunId", async (req, res) => {
  const id = parsePositiveIntParam(req.params.agentRunId);
  if (id === null) {
    res.status(400).json({ error: "agentRunId must be a positive integer." });
    return;
  }
  try {
    res.json(GetSamBooksAgentRunResponse.parse(await fetchSamBooks(`/agent-runs/${id}`)));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

router.get("/sam-books/metrics", async (_req, res) => {
  try {
    res.json(GetSamBooksMetricsResponse.parse(await fetchSamBooks("/metrics")));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

export default router;
