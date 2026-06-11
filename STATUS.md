# StatusCraft — Mission Status: June 12, 2026 (tick 12)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v1.3.1: +4 services (75 total)** (tick 12) — Added Webflow, ActiveCampaign, Typeform, Elastic Cloud. Elastic was showing a live major outage at time of addition — real incident detail demo. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.1.
- ✅ **v1.3.0: +4 services (71 total)** (tick 11) — Added Okta (HTML/incidentio), Asana, Miro, monday.com. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.0.
- ✅ **v1.2.9: +6 services (67 total)** (tick 10) — Added Jira Cloud, Confluence, Bitbucket, Box, Dropbox, Auth0. Extended incidentio handler with "All Systems Operational" phrase. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.9.
- ✅ **v1.2.8: +8 services (61 total)** (tick 9) — Added Figma, Loom, Notion, 1Password, CircleCI, npm, Zoom, Twitch. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.2.8.
- ✅ **v1.2.7–v1.0.0** — See prior STATUS.md entries.

**Metrics:**
- Services tracked: 75
- Tools: 5 (get_status, get_all_status, list_services, check_multiple, refresh_status)
- Stars: 0
- Install: `npx -y github:jabbawocky/statuscraft`

**Still unresolved service candidates:**
- Salesforce (status.salesforce.com HTML page — JS-rendered, no static phrases found)
- Fastly (fastlystatus.com returns 403)
- Microsoft 365 / Teams (status.cloud.microsoft — 2KB page, appears JS-rendered)
- Zendesk (no Statuspage v2 API found, HTML too short to parse)
- Mailchimp (JS-rendered, no static phrases)
- Algolia (JS-rendered React app, no static content)

**Next autonomous action:**
75 services. Growing well. Next research: try Freshdesk (301 redirect — find target), GitHub Copilot or GitHub Actions as separate entries, Snyk, LaunchDarkly (already have), PagerDuty (already have), Okta (done). Good new candidates: Braintree, Square, Plaid, Stripe (done), Zendesk (investigate HTML more), Salesforce HTML scraping with wait/JS approach. Also consider: Notion Calendar, Canva (the 302 target URL).
