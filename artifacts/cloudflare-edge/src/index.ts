/**
 * Cloudflare edge for Sam Books Control Tower.
 *
 * - Static assets (the authorization-hub SPA build) are served by Workers
 *   Static Assets; only `/api/*` reaches this Worker (`run_worker_first`).
 * - Those requests go to ONE API container owned by the `Backend` Durable
 *   Object under a fixed name. The API has no background work, so the
 *   container sleeps after INACTIVITY_TIMEOUT_MS without requests and the next
 *   request starts it again (a few seconds' cold start).
 * - Every Worker var and secret (all string bindings) is passed into the
 *   container's environment at start, so the API reads them from process.env
 *   exactly as it did on Replit.
 */
import { DurableObject } from "cloudflare:workers";

interface Env {
  BACKEND: DurableObjectNamespace<Backend>;
  ASSETS: Fetcher;
  [name: string]: unknown;
}

const API_PORT = 8080;
/** The Durable Object's location is fixed at creation, so the name carries the region. */
const INSTANCE_NAME = "main-weur";
const INSTANCE_LOCATION: DurableObjectLocationHint = "weur";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const READY_TIMEOUT_MS = 120_000;
const HEALTH_PATH = "/api/healthz";

const FINGERPRINT_KEY = "containerEnvFingerprint";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Stable hash of the container environment (values never leave this object). */
async function envFingerprint(env: Record<string, string>): Promise<string> {
  const canonical = JSON.stringify(Object.keys(env).sort().map((name) => [name, env[name]]));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class Backend extends DurableObject<Env> {
  private ready: Promise<void> | null = null;
  private startedFingerprint: string | undefined;

  private get container(): Container {
    const container = this.ctx.container;
    if (!container) throw new Error("Backend Durable Object has no container attached");
    return container;
  }

  private containerEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [name, value] of Object.entries(this.env)) {
      if (typeof value === "string") env[name] = value;
    }
    // The image sets these too; keep them authoritative here.
    env.PORT = String(API_PORT);
    env.NODE_ENV = "production";
    return env;
  }

  /**
   * Start the API if it is not running, and restart it when the Worker's vars
   * or secrets changed since it started: a container only reads its
   * environment at start. The fingerprint persists across Worker deploys.
   */
  private async ensureRunning(): Promise<void> {
    const container = this.container;
    const env = this.containerEnv();
    const fingerprint = await envFingerprint(env);
    await this.ctx.blockConcurrencyWhile(async () => {
      this.startedFingerprint ??= (await this.ctx.storage.get<string>(FINGERPRINT_KEY)) ?? "";
      if (container.running && this.startedFingerprint !== fingerprint) {
        console.log("Worker vars/secrets changed; restarting the API container");
        this.ready = null;
        await container.destroy();
        for (let i = 0; i < 50 && container.running; i++) await sleep(200);
      }
      if (!container.running) {
        this.ready = null;
        container.start({ env, enableInternet: true });
        // Forget readiness when the process exits so the next request restarts it.
        container.monitor().catch(() => undefined).finally(() => { this.ready = null; });
        await this.ctx.storage.put(FINGERPRINT_KEY, fingerprint);
        this.startedFingerprint = fingerprint;
      }
    });
    await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);
    this.ready ??= this.waitUntilHealthy().catch((error) => {
      this.ready = null;
      throw error;
    });
    await this.ready;
  }

  private async waitUntilHealthy(): Promise<void> {
    const port = this.container.getTcpPort(API_PORT);
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const response = await port.fetch(`http://container${HEALTH_PATH}`, { signal: AbortSignal.timeout(2_000) });
        await response.body?.cancel();
        if (response.ok) return;
        lastError = new Error(`healthz returned ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      await sleep(500);
    }
    throw new Error(`API container did not become healthy within ${READY_TIMEOUT_MS / 1000}s: ${String(lastError)}`);
  }

  override async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureRunning();
    } catch (error) {
      console.error("API container unavailable", error);
      return Response.json({ error: "Service is starting, please retry shortly." }, { status: 503, headers: { "retry-after": "5" } });
    }
    // Address the container directly over plain HTTP; the public host and
    // scheme travel in the X-Forwarded-* headers set by the Worker.
    const url = new URL(request.url);
    const target = new URL(`${url.pathname}${url.search}`, "http://container");
    return this.container.getTcpPort(API_PORT).fetch(new Request(target, request));
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    // `trust proxy` = 1 hop: the API takes the scheme (secure session cookie)
    // and client IP from these. Overwrite, never append, so clients cannot
    // spoof them.
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", url.protocol.replace(/:$/, ""));
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) headers.set("x-forwarded-for", clientIp);
    else headers.delete("x-forwarded-for");
    const backend = env.BACKEND.getByName(INSTANCE_NAME, { locationHint: INSTANCE_LOCATION });
    return backend.fetch(new Request(request, { headers }));
  },
} satisfies ExportedHandler<Env>;
