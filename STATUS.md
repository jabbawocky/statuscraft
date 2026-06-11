# StatusCraft — Mission Status: June 11, 2026 (tick 8)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v1.2.7: +7 services + README overhaul** (tick 8) — Added LaunchDarkly (minor incident live), Segment, Amplitude, Postman, Grafana Cloud (major incident live — great real-world demo), Mixpanel, Brex. All verified against Statuspage v2 before adding. 53 services total. Also rewrote README from scratch: was showing "19 services, 4 tools" — now accurate at 53 services / 5 tools, includes incident detail JSON example, categorised service table, and updated example prompts. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.7.
- ✅ **v1.2.6: incident detail on non-operational services** (tick 7) — Previously all non-operational responses returned only a generic description (e.g. "Partially Degraded Service"). Now, when any Statuspage service is non-operational, StatusCraft automatically fetches `/api/v2/incidents.json` and includes a structured `incident` object: name, impact level, current status (investigating/identified/monitoring), started_at timestamp, latest update body (≤500 chars), and affected components. Verified live against Sentry's active incident ("Notification delivery", monitoring). AI clients can now answer "what's wrong with Sentry?" with real context instead of just a colour. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.6.
- ✅ **v1.2.5: +13 services from Researcher sweep** (tick 6) — Researcher ran a live sweep of 20 candidates; Builder added all 13 verified ones. New services: Sentry, New Relic, Cohere, Replicate, Clerk, MongoDB Atlas, PlanetScale, DigitalOcean, Cloudinary, Zapier, Airtable, Intercom, Shopify. All use Statuspage v2 JSON — no new handlers required. Sentry was showing a minor incident at time of addition. 46 services total. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.5.
- ✅ **v1.2.4: Resend + incidentio handler** (tick 5) — Added Resend (email API). Resend uses incident.io for their status page, not Statuspage — no public JSON API exists. Implemented a new `incidentio` type handler that fetches the HTML and matches the live status banner phrases ("We're fully operational", "We're currently experiencing issues", "We're currently undergoing maintenance", etc.) to normalized statuses. Verified live with Playwright browser: Resend currently shows "We're fully operational" → returns `operational`. The `incidentio` handler is now available for any future incident.io-hosted services. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.4. 33 services total.
- ✅ **v1.2.3: +5 services — Vercel, Cloudflare, Netlify, Render, Linear** (tick 4) — Expanded from 27 to 32 services. All five use the standard Statuspage v2 API (`/api/v2/status.json`) — each endpoint verified live before adding (200 OK, valid `status.indicator` field). Cloudflare was showing a minor incident at time of writing. Adds major hosting/CDN/devtools services most developer stacks depend on. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.3.
- ✅ **v1.2.2: Azure RSS handler** (tick 3) — Fixed Azure status (was always returning `unknown`). The `/api/v1/status` JSON endpoint returns 404 — Azure exposes an RSS feed at `/en-us/status/feed/` instead. New handler fetches the RSS feed and counts `<item>` elements: 0 items = operational ("No active incidents reported"), 1–2 items = partial_outage (first item title shown as description), 3+ items = major_outage. Regex-based XML parsing, no dependency required. Verified live: feed returns 0 items today = operational. Azure is now a first-class real-data service. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.2.
- ✅ **v1.2.1: AWS real status handler** (tick 2) — Replaced the AWS stub (always returned `unknown`) with a real fetcher using the public AWS Service Health Dashboard JSON at `status.aws.amazon.com/data.json`. Parses the `current` array: empty = operational, non-empty = partial_outage with incident count. Added `"aws"` type to the ServiceConfig type union. AWS was the biggest gap in coverage — now returns live operational/outage status. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.1.
- ✅ **v1.2.0: 60-second TTL cache + refresh_status tool** (tick 1) — Added per-service in-memory cache with 60-second TTL. `get_all_status` now returns instantly on repeated calls within the cache window instead of firing 27 parallel HTTP fetches every time. New `refresh_status` tool allows force-refreshing one or all services on demand (useful during active incidents). 5 tools total. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.0.
- ✅ **v1.1.0: 27 services, Slack + Azure custom handlers** (tick 0) — Added AWS, Azure, Google AI, Supabase, Neon, Railway, Atlassian, HubSpot. Custom fetch handlers for Slack (active_incidents format) and Azure (Microsoft health API). 27 services total.
- ✅ **v1.0.0: initial release** — 19 services, 4 tools (get_status, get_all_status, list_services, check_multiple). Statuspage v2 normalization: operational/degraded/partial_outage/major_outage/maintenance.

**Metrics:**
- Services tracked: 53
- Tools: 5 (get_status, get_all_status, list_services, check_multiple, refresh_status)
- Stars: 0
- Install: `npx -y github:jabbawocky/statuscraft`

**Known gaps / next steps:**
- ~~AWS: returns `unknown`~~ ✅ Fixed in v1.2.1
- ~~Azure: returns `unknown`~~ ✅ Fixed in v1.2.2 (switched to RSS feed)
- No persistent cache (process-scoped only — cache resets when server restarts, which is expected for stdio MCP)
- Glama indexing: needs jabbawocky GitHub OAuth to submit (Mat gate)
- npm publish: needs NPM_TOKEN (Mat gate)

**Next autonomous action:**
53 services, README accurate. Next: investigate Okta (auth-gated status page — may need custom handler or HTML scraping), add Loom, Figma, Notion (404 on Statuspage — may have moved), Linear (already tracked).
