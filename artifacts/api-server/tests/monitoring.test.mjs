import test from "node:test";
import assert from "node:assert/strict";
import {
  failureCategory,
  safeOverview,
  safeFailures,
  metricsStale,
  safeConnection,
  STALE_AFTER_MS,
} from "../src/lib/monitoring.ts";

test("diagnostics use an allowlisted category, never raw financial or credential text", () => {
  const secret = "postgres error: SELECT name FROM people WHERE email='private@example.invalid'; /objects/private/id token=secret";
  const input = {
    totals: {},
    queues: [],
    organizations: [{ id: 8, name: "Personal tenant name" }],
    recentFailures: [{
      kind: "ingest", id: 3, organizationId: 8,
      organizationName: "Personal tenant name",
      detail: secret, error: secret, at: "2026-09-01T12:00:00.000Z",
    }],
  };
  const safe = safeOverview(input);
  const failures = safeFailures(input);
  const json = JSON.stringify({ safe, failures });
  for (const sensitive of ["private@example", "SELECT", "/objects", "token=", "Personal tenant"]) {
    assert.equal(json.includes(sensitive), false);
  }
  assert.equal(failures[0].category, "Data persistence failure");
  assert.equal(failures[0].occurredAt, input.recentFailures[0].at);
  assert.equal(failures[0].id, "ingest-3");
  assert.equal(input.recentFailures[0].error, secret, "redaction does not mutate source");
});

test("all unsupported diagnostics collapse to a safe generic label", () => {
  assert.equal(failureCategory(null), "Processing failure");
  assert.equal(failureCategory("a customer message and an unknown traceback"), "Processing failure");
  assert.equal(failureCategory("request timed out"), "Processing timeout");
  assert.equal(failureCategory("429 too many requests"), "Dependency rate limit");
  assert.equal(failureCategory("unauthorized"), "Dependency authentication failure");
});

test("fresh, stale, invalid and future metrics are distinct without deriving heartbeats", () => {
  const now = Date.parse("2026-10-19T04:00:00Z");
  assert.equal(metricsStale({ generatedAt: new Date(now).toISOString() }, now), false);
  assert.equal(metricsStale({ generatedAt: new Date(now - STALE_AFTER_MS - 1).toISOString() }, now), true);
  assert.equal(metricsStale({ generatedAt: "invalid" }, now), true);
  assert.equal(metricsStale({ generatedAt: new Date(now + 120_000).toISOString() }, now), true);
});

test("connection reveals hostname only and never asserts deployment identity", () => {
  const connection = safeConnection("https://username:password@host.example.invalid/internal?token=secret", true);
  assert.equal(connection.hostname, "host.example.invalid");
  assert.equal(connection.identityVerified, false);
  assert.equal(connection.environment, null);
  assert.equal(connection.configured, true);
  assert.equal(JSON.stringify(connection).includes("password"), false);
  assert.equal(safeConnection(undefined, false).configured, false);
  assert.equal(safeConnection("invalid", true).configured, false);
  assert.equal(safeConnection("file:///tmp/source", true).configured, false);
});
