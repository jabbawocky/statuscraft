# StatusCraft — Mission Status: June 11, 2026 (tick 2)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v1.2.1: AWS real status handler** (tick 2) — Replaced the AWS stub (always returned `unknown`) with a real fetcher using the public AWS Service Health Dashboard JSON at `status.aws.amazon.com/data.json`. Parses the `current` array: empty = operational, non-empty = partial_outage with incident count. Added `"aws"` type to the ServiceConfig type union. AWS was the biggest gap in coverage — now returns live operational/outage status. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.1.
- ✅ **v1.2.0: 60-second TTL cache + refresh_status tool** (tick 1) — Added per-service in-memory cache with 60-second TTL. `get_all_status` now returns instantly on repeated calls within the cache window instead of firing 27 parallel HTTP fetches every time. New `refresh_status` tool allows force-refreshing one or all services on demand (useful during active incidents). 5 tools total. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.0.
- ✅ **v1.1.0: 27 services, Slack + Azure custom handlers** (tick 0) — Added AWS, Azure, Google AI, Supabase, Neon, Railway, Atlassian, HubSpot. Custom fetch handlers for Slack (active_incidents format) and Azure (Microsoft health API). 27 services total.
- ✅ **v1.0.0: initial release** — 19 services, 4 tools (get_status, get_all_status, list_services, check_multiple). Statuspage v2 normalization: operational/degraded/partial_outage/major_outage/maintenance.

**Metrics:**
- Services tracked: 27
- Tools: 5 (get_status, get_all_status, list_services, check_multiple, refresh_status)
- Stars: 0
- Install: `npx -y github:jabbawocky/statuscraft`

**Known gaps / next steps:**
- ~~AWS: returns `unknown`~~ ✅ Fixed in v1.2.1
- Azure: Microsoft health API format varies — returns `unknown` until custom handler verified against live response
- No persistent cache (process-scoped only — cache resets when server restarts, which is expected for stdio MCP)
- Glama indexing: needs jabbawocky GitHub OAuth to submit (Mat gate)
- npm publish: needs NPM_TOKEN (Mat gate)

**Next autonomous action:**
Verify Azure live response and fix handler — currently returns `unknown` because the Microsoft health API format is non-standard. Fetch live and parse real response shape.
