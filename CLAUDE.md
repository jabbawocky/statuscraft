# StatusCraft — CLAUDE.md

MCP server (stdio) that checks the live status of ~3,600 software services from their official status pages. Published straight from GitHub — users install with `npx -y github:jabbawocky/statuscraft` (no API key, no npm registry).

## GitHub account

This repo belongs to the **`jabbawocky`** GitHub account, NOT `leadsyapplication`. Run `gh auth switch -u jabbawocky` before any push/PR/gh command here, and switch back after if other work follows.

## Architecture — one file

Everything lives in `src/index.ts` (~8,000 lines):

- **`SERVICES` array** (starts ~line 77): 3,629 `ServiceConfig` entries — `{ id, name, tags, status_url, page_url, type }`.
- **Fetchers** (after the array): one per `type` — `statuspage` (the default, Atlassian Statuspage `/api/v2/status.json`), plus custom handlers `gcp`, `slack`, `azure`, `aws`, `incidentio`, `pagerduty`, `heroku`, `statusio`, `betterstack`, `salesforce` (Trust API, aggregates production instances).
- **5 MCP tools**: `get_status`, `get_all_status`, `list_services`, `check_multiple`, `refresh_status`.
- 60-second in-memory cache (`CACHE_TTL_MS`); outbound fetches batched at `FETCH_CONCURRENCY = 50` to avoid fd exhaustion at this scale.
- Incident detail is only fetched for non-operational services (no latency cost when green).

## Build & ship — dist/ is committed on purpose

`npm run build` (plain `tsc`) emits `dist/index.js`. Because installs come directly from GitHub via `npx github:...` with no publish step, **`dist/` is checked into git — always rebuild and commit `dist/` alongside any `src/` change**, or users get stale code.

## Working conventions (from STATUS.md history)

- `STATUS.md` is a rolling mission log in "ticks" — newest entry at the top. Each expansion tick records: services added, count change (e.g. 4056 → 4066), verification results, and a health spot-check of core fetchers (Anthropic, GitHub, Datadog, Sentry, etc.). Append a new entry per work session.
- **Every new service is live-verified before commit** — actually hit its `status_url` and confirm a valid response. No unverified entries.
- The service count appears in several places that must stay in sync: README header/intro, the tool descriptions inside `src/index.ts`, and the STATUS.md tick. `grep -c 'id: "' src/index.ts` is the source of truth (3,355 as of 2026-07-18, after removing 436 duplicate-ID entries and 274 alias-dupe entries that expansion ticks had accumulated). **Before adding a service, grep for its id AND its status_url** — duplicate IDs are bugs (`get_status` only reaches the first match), and this repo has been burned by re-adding existing services. `node audit-dupes.mjs` must report 0 duplicate URLs.
- When a service rebrands, keep ONE entry and put the former brand in the display name (e.g. "Splunk On Call (VictorOps)") — `get_status` falls back id → exact name → name-substring, so that keeps old-brand queries resolving without a second entry.
- Adding a Statuspage-backed service is a 6-line entry in the `SERVICES` array; non-standard pages need one of the existing custom `type` handlers.

## Audit scripts

- `node audit.mjs` — parses the `SERVICES` array out of `dist/index.js` and live-tests every fetcher, reporting broken ones. (Requires a fresh build.)
- `node audit-dupes.mjs` — regex-scans `src/index.ts` for duplicate `status_url`s.

## Distribution surfaces

- `smithery.yaml` — Smithery registry (stdio, `npx -y github:jabbawocky/statuscraft`).
- `glama.json` — Glama MCP registry listing.
- `Dockerfile` — node:22-alpine, runs the committed `dist/`.
- This machine also has StatusCraft connected as a live MCP server (`mcp__statuscraft__*` tools) — handy for end-to-end testing of the shipped behavior.
