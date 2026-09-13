import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { isAuthenticated } from "./routes/auth";

const PgStore = connectPgSimple(session);

const app: Express = express();

// Trust Replit's reverse proxy so secure cookies work correctly.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required.");
}

app.use(
  session({
    store: new PgStore({
      conString: process.env["DATABASE_URL"],
      createTableIfMissing: true,
      tableName: "session",
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

/**
 * This app is an internal back office with a single admin and no user
 * accounts — everything under /api requires a session except the three
 * auth endpoints and the health check the deployment platform polls.
 */
const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/status", "/api/healthz"];

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.some((p) => req.path === p)) {
    next();
    return;
  }
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }
  if (isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required." });
}

app.use(requireAuth);
app.use("/api", router);

export default app;
