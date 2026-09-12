import { Router, type IRouter, type Response } from "express";
import {
  GetSamBooksOverviewResponse,
  ListSamBooksProjectsResponse,
  ListSamBooksFeatureRequestsQueryParams,
  ListSamBooksFeatureRequestsResponse,
  ListSamBooksAgentRunsQueryParams,
  ListSamBooksAgentRunsResponse,
  GetSamBooksMetricsResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Read-only proxy into the connected Sam Books instance's own `/api/admin/*`
 * Control Tower API. Sam Books is a separate deployment with its own
 * database — this app never touches it directly. Sam Books has no session
 * cookie to give a server-to-server caller, so it trusts a shared secret
 * instead: `SAM_BOOKS_API_KEY` here must match `CONTROL_TOWER_API_KEY` on
 * the Sam Books side, and `SAM_BOOKS_API_URL` must point at its deployment.
 */
class UpstreamError extends Error {}

async function fetchSamBooks(path: string): Promise<unknown> {
  const base = process.env["SAM_BOOKS_API_URL"];
  const key = process.env["SAM_BOOKS_API_KEY"];
  if (!base || !key) {
    throw new UpstreamError("SAM_BOOKS_API_URL and SAM_BOOKS_API_KEY must both be configured.");
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/api/admin${path}`, {
    headers: { "x-control-tower-key": key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new UpstreamError((data as { error?: string }).error ?? `Sam Books returned ${res.status}.`);
  }
  return data;
}

function handleUpstreamError(res: Response, err: unknown): void {
  logger.error({ err }, "Sam Books proxy request failed");
  res.status(502).json({ error: err instanceof Error ? err.message : "Sam Books is unreachable." });
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

router.get("/sam-books/metrics", async (_req, res) => {
  try {
    res.json(GetSamBooksMetricsResponse.parse(await fetchSamBooks("/metrics")));
  } catch (err) {
    handleUpstreamError(res, err);
  }
});

export default router;
