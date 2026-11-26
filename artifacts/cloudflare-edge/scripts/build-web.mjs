// Production build of the authorization-hub SPA into ../authorization-hub/dist/public,
// which wrangler.jsonc serves as static assets. The Vite config requires PORT
// and BASE_PATH even for builds (PORT only matters to the dev server).
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["--filter", "@workspace/authorization-hub", "run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NODE_ENV: "production", PORT: process.env.PORT ?? "5173", BASE_PATH: "/" },
});
process.exit(result.status ?? 1);
