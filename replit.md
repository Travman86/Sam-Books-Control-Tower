# Feature Authorization Hub

A review-first control plane that prevents AI-generated changes from reaching connected projects until a designated human reviewer approves them.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/authorization-hub/` — web dashboard, project connections, policies, review queue, and audit trail
- `artifacts/api-server/src/routes/authorization.ts` — authorization API implementation
- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/db/src/schema/authorization.ts` — projects, feature policies, reviews, and activity persistence

## Architecture decisions

- Builder and reviewer are deliberately separate roles; a pending change cannot approve itself.
- Human sign-off is modeled as a state transition on a review request, with every decision appended to the audit trail.
- Project connections and feature policies are independent so one project can enforce different reviewers for different risk boundaries.

## Product

- Monitor authorization posture across connected projects.
- Connect projects and create feature-level builder/reviewer policies.
- Review, approve, or reject AI-proposed changes.
- Propose, filter, approve, or reject project-management actions such as task creation, reprioritization, reassignment, deadline changes, milestone creation, scope updates, and task closure.
- Inspect a chronological audit trail of submissions and human decisions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
