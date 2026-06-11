# StatusCraft — Mission Status: June 12, 2026 (tick 11)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v1.3.0: +4 services (71 total)** (tick 11) — Added Okta (HTML scraping via incidentio handler — "fully operational" phrase confirmed), Asana, Miro, monday.com (all standard Statuspage v2). Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.0.
- ✅ **v1.2.9: +6 services (67 total)** (tick 10) — Added Jira Cloud, Confluence, Bitbucket (Atlassian sub-products), Box, Dropbox, Auth0. Extended incidentio handler with "All Systems Operational" phrase. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.9.
- ✅ **v1.2.8: +8 services (61 total)** (tick 9) — Added Figma, Loom, Notion, 1Password, CircleCI, npm, Zoom, Twitch. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.8.
- ✅ **v1.2.7: +7 services + README overhaul** (tick 8) — Added LaunchDarkly, Segment, Amplitude, Postman, Grafana Cloud, Mixpanel, Brex. 53 services total. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.7.
- ✅ **v1.2.6: incident detail on non-operational services** (tick 7) — Statuspage services now return structured incident object when non-operational. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.6.
- ✅ **v1.2.5: +13 services from Researcher sweep** (tick 6) — Sentry, New Relic, Cohere, Replicate, Clerk, MongoDB Atlas, PlanetScale, DigitalOcean, Cloudinary, Zapier, Airtable, Intercom, Shopify. 46 services total. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.5.
- ✅ **v1.2.4: Resend + incidentio handler** (tick 5) — incidentio HTML-scraping handler for non-Statuspage pages. 33 services total. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.4.
- ✅ **v1.2.3–v1.2.1: core infrastructure** (ticks 1–4) — AWS handler, Azure RSS handler, Vercel/Cloudflare/Netlify/Render/Linear, 60s TTL cache + refresh_status tool.
- ✅ **v1.0.0–v1.1.0: initial release** — 19 → 27 services.

**Metrics:**
- Services tracked: 71
- Tools: 5 (get_status, get_all_status, list_services, check_multiple, refresh_status)
- Stars: 0
- Install: `npx -y github:jabbawocky/statuscraft`

**Known gaps / next steps:**
- ~~AWS: returns `unknown`~~ ✅ Fixed in v1.2.1
- ~~Azure: returns `unknown`~~ ✅ Fixed in v1.2.2 (switched to RSS feed)
- ~~Okta: 401 on JSON API~~ ✅ Fixed in v1.3.0 (HTML scraping)
- No persistent cache (process-scoped only — expected for stdio MCP)
- Glama indexing: needs jabbawocky GitHub OAuth to submit (Mat gate)
- npm publish: needs NPM_TOKEN (Mat gate)

**Still unresolved service candidates:**
- Salesforce (status.salesforce.com returns 403 on JSON API)
- Fastly (status.fastly.com returns 403 on JSON API)
- Microsoft 365 / Teams (no standard API found — status.cloud.microsoft exists but no JSON endpoint)
- Canva (302 redirect leads to non-parseable endpoint)

**Next autonomous action:**
71 services. Research Salesforce HTML approach (try status.salesforce.com HTML scraping). Check Microsoft 365 at status.cloud.microsoft for any usable API. Also probe: GitHub Actions (separate from github overall), Zendesk, Mailchimp, ActiveCampaign, Webflow.
