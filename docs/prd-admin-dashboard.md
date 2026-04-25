# Product Requirements Document — Platform Owner Dashboard

**Status**: Draft (2026-04-23) — scaffold shipped, Phase 0 (dual-auth gate) shipped, Phase 1 (growth/engagement/health cards) shipped
**Audience**: Human developers, AI coding assistants
**Parent PRD**: `docs/prd.md` (see Roadmap phase link)

---

## 1. Purpose

A single-page, owner-only view that answers four questions at a glance:

1. **Is the platform growing?** — new workspaces and members, invite acceptance.
2. **Are families actually using it?** — weekly active workspaces, edits per week.
3. **Is the platform healthy?** — errors, storage, encryption, DB reachability.
4. **Who's using it right now?** — live presence: how many users are active in the last 1 / 5 minutes, broken down by workspace, plus a quiet-window heatmap so maintenance can be scheduled instead of guessed at.

Not a BI tool. Not a place for arbitrary ad-hoc queries. One opinionated page that the owner reads daily and that drives "do I need to do something this week?"

---

## 2. User & Access

- **Single audience**: the platform owner (one person, today). Multiple owners later = `UPDATE users SET is_platform_owner = true ...` — no code change.
- **Access gate**: `User.isPlatformOwner` flag. Enforced in three layers (middleware, server-side layout guard, route handler). Shipped.
- **Not for workspace admins.** Workspace admins see workspace-scoped analytics inside their own workspace (future). This PRD only covers cross-workspace platform metrics.

---

## 3. Core Principles

### 3.1 Metadata only — never content

Reads only plaintext metadata columns: counts, timestamps, `lastModifiedAt`, feature flags, `Workspace.name`, role names, enum values. **Never decrypts any tree/individual/family field.** Aggregate metrics on encrypted content require per-workspace key access, which is an explicit non-goal.

### 3.2 No PII by aggregation

Family membership is a privacy-sensitive fact. Rules:

- **Never join `User.displayName`/`User.email` with `Workspace.name` in a visible row.** E.g. do NOT show "آل سعيد: محمد، أحمد، فاطمة joined this week". Show counts only.
- **k-anonymity: hide any dimension with fewer than 5 entities.** A workspace with 2 members doesn't appear in "smallest workspaces"; a user with 1 workspace doesn't appear in "least-active users".
- Top-N lists use workspace names (already semi-public to members) but not user names.

### 3.3 Every read is logged

Every GET to `/api/admin/*` calls `logAdminAccess({ userId, action, pathname, queryString })` (helper already scaffolded at `src/lib/audit/admin-access.ts`). Response bodies are NOT logged — just the access event.

### 3.4 Cheap by default

Dashboard refreshes on demand (no polling). Queries target existing indexed columns. No materialized views, no cron-built aggregates in v1. If a query takes > 500ms, cache in-memory for 60s keyed by user+query.

---

## 4. V1 Metrics

Three horizontal sections on one page, Arabic labels, RTL:

### 4.1 Growth (النمو)

| Metric | Source | Notes |
|---|---|---|
| Total workspaces | `Workspace` count | |
| Workspaces created this week / month | `Workspace.createdAt` | Absolute counts |
| Total registered users | `User` count | |
| New users this week / month | `User.createdAt` | |
| Pending invitations | `WorkspaceInvitation` where status = pending, not expired | |
| Invite acceptance rate (30d) | accepted / (accepted + expired + pending older than 7d) | Excludes fresh-pending |

### 4.2 Engagement (الاستخدام)

| Metric | Source | Notes |
|---|---|---|
| Weekly active workspaces | `FamilyTree.lastModifiedAt` within last 7d | The north-star metric |
| Total tree edits (7d / 30d) | `TreeEditLog.timestamp` count | Excludes private content |
| Avg edits per active workspace | edits ÷ active workspaces | |
| Workspaces with ≥1 member besides creator | `WorkspaceMembership` groupBy | "Real" family workspaces |
| Top 10 active workspaces (7d) | `TreeEditLog` group by workspaceId | Workspace name + count only; no user info |
| Branch pointer usage | `BranchPointer` count by status | Adoption signal for cross-workspace feature |

### 4.3 Platform Health (الصحة)

| Metric | Source | Notes |
|---|---|---|
| DB reachable | Prisma `$queryRaw` ping | Green/red dot |
| GoTrue reachable | HTTP ping to `/auth/v1/health` | |
| Mail transport | `nodemailer.verify()` result | |
| Encryption master key loaded | `process.env.WORKSPACE_MASTER_KEY` present + valid length | Boolean |
| Workspaces with encryption failures (24h) | future `TreeEditLog` error bucket | Placeholder until error logging exists |
| Total storage used (approx) | sum of `AlbumMedia.fileSizeBytes` or disk-usage shell call | Single number, not per-workspace |
| Recent 5xx rate | Out of scope v1 (no central error log yet) | Note as gap |

### 4.4 Live Presence (الحضور المباشر)

Operational signal: "is anyone using the platform right now?" and "when can I safely do maintenance?" Both questions matter daily; the existing weekly-active metric does not answer either.

**Excluded from all presence counts**: users with `User.isPlatformOwner = true`. The owner is the audience, not the data — their own clicks must not appear in their own dashboard. The two seed accounts (`bassel.saeed9@gmail.com`, `bassel@gynat.com`) get the flag set as part of this phase's migration; no email-list hardcoding in code.

| Metric | Source | Notes |
|---|---|---|
| Active users (1 min) | `User.lastActiveAt > now() − 1 min`, owners excluded | Tightest "right now" signal — survives a flick of the eye |
| Active users (5 min) | `User.lastActiveAt > now() − 5 min`, owners excluded | Industry-standard "active now"; survives 90s of reading-without-clicking |
| Active workspaces (5 min) | distinct `lastActiveWorkspaceId` across active users | Cross-workspace total — surfaces both the count and the spread |
| Per-workspace breakdown (5 min) | active-user count grouped by `lastActiveWorkspaceId`, with dominant activity type | Workspace name + count + dominant activity (viewing / editing) |
| Quiet-window heatmap (7d × 24h) | hourly buckets of `lastActiveAt` over last 7 days | Tells the owner *when* to schedule maintenance, not just *whether* now is safe |
| Peak concurrency record | persisted running max of the 5-min count | Capacity planning + milestone; updated lazily on dashboard read |

#### 4.4.1 Activity-type classification

Each authenticated request also writes `User.lastActiveRoute` (the route pattern, not the full URL with IDs) and `User.lastActiveWorkspaceId` (when the route is workspace-scoped). v1 categories:

- **Viewing** (مشاهدة) — GET on tree / workspace / profile routes
- **Editing** (تعديل) — POST/PATCH/DELETE on tree mutation routes

When content features ship (main PRD §5.6–5.8): add **Posting** (نشر) for posts/albums/events. Categorization rules live in `src/lib/admin/presence.ts` so they are co-located with the queries and easy to audit.

#### 4.4.2 Maintenance-mode banner (deferred)

The presence card reserves a "Schedule maintenance" affordance — clicking it would broadcast an in-app banner ("صيانة بعد X دقائق") to all currently-active users. Implementation deferred to Phase 5 (Alerts). v1 ships only the UI hook on the card.

#### 4.4.3 Implementation: write throttling (load-bearing)

Middleware bumps `User.lastActiveAt`, `lastActiveRoute`, `lastActiveWorkspaceId` on every authenticated request. To avoid one DB write per request:

- In-memory cache keyed by `userId` tracks last-write timestamp + last route + last workspace
- Skip the DB write if last write was < 60s ago AND none of the three values changed
- Write through immediately when the workspace or activity-type changes (so the breakdown stays accurate)
- Cache is single-process; multi-instance deployment requires a shared store — same scaling caveat as `src/lib/api/rate-limit.ts`

Skipping this throttle would convert every API call into a DB write; unacceptable as user count grows.

#### 4.4.4 Schema additions (requires migration)

This is the dashboard's first feature that requires schema changes — the v1 "no new migrations" rule from §5 ends here.

New columns on `User`:
- `lastActiveAt: DateTime?`
- `lastActiveRoute: String?`
- `lastActiveWorkspaceId: String?` (nullable FK to `Workspace`, `ON DELETE SET NULL`)

New table `PlatformStat` (single-row settings table):
- `peakConcurrentUsers: Int` (default 0)
- `peakRecordedAt: DateTime?`

Index: `User(lastActiveAt)` — range scans on the active-window queries are the hot path.

### 4.5 Non-metrics

The dashboard also shows:

- Last refresh time.
- Link to `AdminAccessLog` (future page — v1 just shows count of reads in last 24h).

---

## 5. Data Sources

All v1 queries read existing tables — **no new migrations in v1**. Phase 2 (Live Presence) introduces the dashboard's first schema additions; see §4.4.4.

- `Workspace`, `WorkspaceMembership`, `WorkspaceInvitation`
- `User` (Phase 2 adds `lastActiveAt`, `lastActiveRoute`, `lastActiveWorkspaceId`)
- `FamilyTree`, `TreeEditLog` (counts, timestamps only — no snapshot content)
- `BranchPointer`, `BranchShareToken` (counts)
- `Place` (for health check: total seeded count)
- `Post`, `Album`, `Event` (row counts for content traction, future)
- `PlatformStat` (new in Phase 2 — peak-concurrency record)

Aggregation queries live in `src/lib/admin/queries.ts` — a single file so every unscoped cross-workspace read is auditable in one place. Each exported function returns plain JSON, no Prisma objects.

---

## 6. UI Layout

Single page, 3 stacked sections (Growth, Engagement, Health). Each section is a grid of metric cards:

- **Card** = label (Arabic), primary number (large), secondary text (change vs last period or range label).
- **Top-N lists** = compact table, workspace name + count. No user names.
- **Health row** = colored dots + short label.

No charts in v1. Numbers only. Chart-addicted features (time series, sparklines) land in a follow-up once we know what's worth plotting.

Reuses existing design tokens (`src/styles/tokens/`). No new design system.

---

## 7. API Routes

All under `/api/admin/` — each handler calls `requirePlatformOwner(request)` AND `logAdminAccess(...)`.

- `GET /api/admin/metrics/growth` — `{ workspaces, users, invitations }`
- `GET /api/admin/metrics/engagement` — `{ activeWorkspaces, edits, topActive }`
- `GET /api/admin/metrics/health` — `{ db, gotrue, mail, encryption, storage }`
- `GET /api/admin/metrics/presence` (Phase 2) — `{ active1m, active5m, activeWorkspaces, perWorkspace, heatmap, peak }`

Response shape: flat JSON objects, no nesting beyond one level. Client composes the fetches in parallel.

---

## 8. Prerequisite — Fix cookie/Bearer asymmetry

**Problem identified while writing Playwright gate tests:**

- Middleware gate for `/api/admin/*` reads the session **cookie** (via `updateSession` → `@supabase/ssr`).
- Route handler's `requirePlatformOwner` → `getAuthenticatedUser` requires the **Bearer** header.

For browser clients using `apiFetch()`, both are sent, so this works in practice. But:

- A pure Bearer-only programmatic client (CLI, script, Postman) is blocked at the middleware before its Bearer token is even considered.
- A pure cookie-only navigation (e.g. server-side fetch from another Next route) would pass middleware but fail at the handler.

This is a load-bearing coincidence, not a design. Two options:

**(A) Make `requirePlatformOwner` accept either.** Check Bearer first (current path), fall back to cookie via `createServerClient`. Minimal code, keeps defense-in-depth.

**(B) Make the middleware accept either.** In the `/api/admin/*` branch, accept a Bearer header in addition to the cookie. Verify it via GoTrue like `getAuthenticatedUser` does.

**Recommendation: (A).** Reasons:
- Handler-level dual-auth is symmetric with other codebase patterns (`requireWorkspaceAdmin` currently only accepts Bearer — changing to dual there is an easy follow-up if we ever need it).
- Keeps middleware cheap (it already calls Supabase once via `updateSession`; adding Bearer verification there doubles GoTrue calls).
- Pure-Bearer programmatic clients (CLIs, scripts, Postman) unblocked end-to-end. Note: the browser-driven Playwright gate tests still need a cookie because the **middleware** for `/api/admin/*` continues to gate on the session cookie; only the handler becomes dual-mode.

**Must happen before Phase 1** below. Blocks: CLI-based metric scripts and any future programmatic admin tooling.

---

## 9. Phases

### Phase 0 — Auth prerequisite (blocker)

- Extend `requirePlatformOwner` to accept either Bearer header or Supabase session cookie.
- Update `src/test/admin-auth.test.ts` to cover both branches.
- Simplify `e2e-browser/admin-gate.spec.ts` API tests — Bearer alone should work.
- Decision: do the same for `requireWorkspaceAdmin` / `requireWorkspaceMember`? Defer until there's a concrete caller; don't expand the scope preemptively.

### Phase 1 — Growth + Engagement + Health cards (v1)

- `src/lib/admin/queries.ts` — all aggregation helpers.
- Three `GET /api/admin/metrics/*` routes with `logAdminAccess` wired.
- `/admin` page renders the 3 sections; client fetches all three in parallel.
- Arabic labels, RTL layout, existing design tokens.
- Unit tests for query helpers (with seeded data), Playwright e2e for owner vs non-owner rendering.

### Phase 2 — Live Presence

Adds the "who's using it right now?" question (§4.4) — first phase that introduces schema changes.

- **Migration**: add `User.lastActiveAt`, `User.lastActiveRoute`, `User.lastActiveWorkspaceId` (FK, `ON DELETE SET NULL`); index on `User(lastActiveAt)`. Add `PlatformStat` table with `peakConcurrentUsers`, `peakRecordedAt`. Backfill: set `isPlatformOwner = true` for `bassel.saeed9@gmail.com` and `bassel@gynat.com` in the same migration if not already set.
- **Activity tracking**: extend `src/middleware.ts` (auth path only) to update the three `lastActive*` columns. Throttle via in-memory cache per §4.4.3 — write only when 60s have passed AND nothing relevant changed; write immediately on workspace/route-category transitions.
- **Queries** in `src/lib/admin/presence.ts` (separate from `queries.ts` because the route categorization rules live here): `getActiveUserCount(windowSeconds)`, `getActiveWorkspaceBreakdown(windowSeconds)`, `getQuietWindowHeatmap()`, `updatePeakConcurrency(currentCount)`. All exclude `isPlatformOwner = true`.
- **API**: `GET /api/admin/metrics/presence`, gated by `requirePlatformOwner` and audit-logged via `logAdminAccess`. Lazily updates `PlatformStat` peak when read.
- **UI**: a new "Live Presence" section as the first card on `/admin` (above Growth) — two large numbers (1-min, 5-min), workspace breakdown table, 7×24 heatmap rendered as a CSS grid with opacity scale (no chart library), peak record line. "Schedule maintenance" button is rendered but disabled until Phase 5.
- **Tests**: unit tests with seeded `lastActiveAt` values covering window edges, owner exclusion, throttle behavior; e2e verifies the owner's own browsing of `/admin` does not bump the active count.

### Phase 3 — Time series & sparklines

- Decide which metrics actually warrant trends after a few weeks of Phase 1 + 2 usage.
- Add simple sparklines (SVG, no chart library in v1).
- Persist aggregates only if we hit query performance issues.

### Phase 4 — AdminAccessLog viewer

- Page at `/admin/access-log` — paginated view of every admin read with timestamp, path, actor.
- Primarily for compliance/self-audit ("did I log in last night or was that something else?").

### Phase 5 — Alerts & Maintenance Mode (much later)

- Email when health check fails, when error rate spikes, when storage crosses 80%.
- Activate the maintenance-mode banner reserved in §4.4.2 — broadcast in-app warning to active users with a configurable countdown.
- Not before Phase 1 has been live for 3+ months.

---

## 10. Out of Scope

- **Per-workspace drill-down**: the dashboard shows platform-wide aggregates. Drilling into a specific workspace = visit that workspace as a member. Admin-only cross-workspace workspace inspection (reading private content) is explicitly rejected — it defeats the privacy guarantee in main PRD §1.
- **User-level metrics**: "most active users", "top editors" — rejected. Users aren't the audience; workspaces are.
- **Content metrics**: post counts, album counts per workspace — deferred until content features (§5.6, §5.7 in main PRD) ship.
- **Export/CSV**: copy numbers into a note if needed. No download button in v1.
- **Admin-on-admin**: no UI to promote/demote other owners. SQL only.
- **Ad-hoc SQL**: use Prisma Studio or `psql` directly for one-offs.

---

## 11. Non-Functional Requirements

- **Performance**: dashboard paint in < 1.5s on localhost; each metric query < 500ms.
- **Caching**: per-user in-memory 60s cache per query; stampede protection not required for a single owner. The presence endpoint (§4.4) is exempt — it reads fresh on every request so the 1-minute window is meaningful.
- **Presence write throttling**: `User.lastActiveAt` writes are batched at most once per 60s per user via an in-memory cache (see §4.4.3). Multi-instance deployment requires a shared cache (Redis) before scaling.
- **Privacy**: k-anonymity ≥ 5 on any dimension that can identify a family or a user; no displayName/email next to workspace names. Live presence shows counts and workspace names only — never lists individual users.
- **Auditability**: every admin read writes one `AdminAccessLog` row.
- **Failure modes**: if a health probe fails, surface the error inline (red dot + short message). Never throw a 500 for a dashboard read.

---

## 12. Links

- Main PRD: `docs/prd.md`
- Encryption & audit-log operator notes: `docs/encryption.md`
- Implementation status (update as phases ship): `docs/implementation.md`
