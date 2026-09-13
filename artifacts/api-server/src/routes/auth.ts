import { Router, type IRouter, type Request } from "express";
import { timingSafeEqual } from "crypto";
import { LoginBody, LoginResponse, GetAuthStatusResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Single-admin session auth. This app has no user accounts — it's an
 * internal back office with one operator — so a shared password is enough:
 * `CONTROL_TOWER_ADMIN_PASSWORD` gates every route except these three (see
 * the `requireAuth` gate in app.ts).
 */
function isCorrectPassword(candidate: string): boolean {
  const expected = process.env["CONTROL_TOWER_ADMIN_PASSWORD"];
  if (!expected) return false;
  const expectedBuf = Buffer.from(expected);
  const candidateBuf = Buffer.from(candidate);
  return expectedBuf.length === candidateBuf.length && timingSafeEqual(expectedBuf, candidateBuf);
}

/** Exported so app.ts's global gate can check the session before routing anywhere. */
export function isAuthenticated(req: Request): boolean {
  return (req.session as unknown as { authenticated?: boolean }).authenticated === true;
}

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
    return;
  }
  if (!process.env["CONTROL_TOWER_ADMIN_PASSWORD"]) {
    res.status(500).json({ error: "CONTROL_TOWER_ADMIN_PASSWORD is not configured on this app." });
    return;
  }
  if (!isCorrectPassword(parsed.data.password)) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }
  (req.session as unknown as { authenticated?: boolean }).authenticated = true;
  res.json(LoginResponse.parse({ authenticated: true }));
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

router.get("/auth/status", (req, res) => {
  res.json(GetAuthStatusResponse.parse({ authenticated: isAuthenticated(req) }));
});

export default router;
