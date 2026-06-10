# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product identity

_Last updated: 2026-06-10, after the May 2026 beta feedback review._

Fresco is a decision engine for startup founders. Built for the moments early in a company's life when you have to choose what to build with no senior colleague to push back on the decision, Fresco runs your thinking through structured analysis and returns a clear verdict — GO, PIVOT, STOP, or NEEDS MORE SIGNAL — with the reasoning that produced it. Not a thinking partner. Not a workshop. A verdict, defensible enough to act on, in the time it takes to drink a coffee.

## Commands

```bash
npm run dev          # start local dev server
npm run build        # prisma generate + next build
npm run lint         # eslint
npm run db:push      # push schema changes to the database (no migration file)
npm run db:studio    # open Prisma Studio
npm run db:generate  # regenerate Prisma client after schema edits
```

No test suite exists yet.

## Architecture

Next.js 14 App Router, deployed to Vercel. PostgreSQL via Prisma. Auth via NextAuth v5 (beta) with Google OAuth and email/password (bcrypt). Payments via Stripe and LemonSqueezy (both wired up; Stripe is primary). Global state via Zustand, persisted to `localStorage`.

**Data flow — two-layer persistence:**
- All state lives first in the Zustand store (`src/lib/store.ts`), persisted to `localStorage` under the key `fresco-storage`.
- When the user is authenticated, `useDBSync` (`src/lib/useDBSync.ts`) loads DB data into the store on login and replaces the local state. `useDBWrite` wraps every mutating store action to also fire the corresponding API call.
- Unauthenticated users get the full app experience stored only in `localStorage`.

**"Four Houses" model:**
Investigate, Innovate, Validate, Evaluate remain as engine internals — the analysis stages that feed the verdict — but are no longer the user's first interaction. House sessions (`houseType` on `ToolkitSession`) use a sentinel `toolkitType` value (e.g. `insight_stack` for Investigate). The AI routes under `/api/houses/` handle house-level generation; `/api/extension/` handles the Path A Chrome extension equivalents (`evaluate`, `compare`, `journey`).

**Extension auth (Path A):**
`ExtensionKey` rows store SHA-256 hashes of API keys (prefix `frsk_`). Plaintext is shown once and never stored. `src/lib/extension-auth.ts` exports `authenticateExtensionRequest()` — all `/api/extension/*` routes call this first.

**Admin:**
`/admin/usage` and `GET /api/admin/usage` are gated by `requireAdmin()` (`src/lib/admin.ts`), which checks `ADMIN_EMAILS` env var. Shows beta-cohort metrics: session counts, completion rate, house breakdown, per-tester table, 30-day activity.

**Key directories:**
- `src/app/api/` — all Route Handlers; each folder maps 1:1 to a resource
- `src/components/` — page-level client components (`FrescoAppContent`, `HomeDashboard`, etc.)
- `src/lib/` — shared logic: store, auth, DB sync, AI hooks, extension auth, export
- `src/types/index.ts` — canonical type definitions; consult before adding new types
- `prisma/schema.prisma` — source of truth for the data model

## Conventions

- Route Handlers authenticate via `auth()` from `src/lib/auth.ts` (NextAuth session) for user-facing APIs, or `authenticateExtensionRequest()` for extension APIs. Never skip auth checks.
- Use `prisma` singleton from `src/lib/prisma.ts` — never instantiate PrismaClient directly.
- Mutations that affect both local state and the DB go through `useDBWrite` hooks, not the store directly.
- Tailwind for all styling; no CSS modules. `clsx` for conditional class names.
- `lucide-react` for icons; `framer-motion` for animation.
- Subscription tiers: `free`, `pro`, `studio`. Free users get 3 workspaces, 3 AI runs/month, and only the four sentinel house toolkits.
- Schema changes: edit `prisma/schema.prisma` then run `db:push` (no migration files — this is a hosted Supabase-backed Postgres, no CI migrations).

## Recently shipped

- **Extension auth (Path A):** `ExtensionKey` model, `/connect-extension` setup page, `/account/extensions` key management, and `/api/extension/{evaluate,compare,journey}` routes backed by `extension-auth.ts`.
- **Admin usage dashboard:** `/admin/usage` with completion rate, house breakdown, per-tester rows, 30-day sparkline.
- **Four Houses:** house sessions with `houseType`, AI routes at `/api/houses/[house]` and `/api/houses/reframe`.

## Open questions

- ~~**0% session completion rate**~~ Resolved June 2026: the metric counted `isLocked = true` (the optional sentence-of-truth lock, which the verdict flow never sets). Completion is now defined in `/api/admin/usage` as "session has a verdict in `aiOutputs`" (`isLocked` still counts too).
