# StatusCraft — Mission Status: June 12, 2026 (tick 14)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v1.4.0: +11 services (95 total)** (tick 14) — Added Temporal Cloud, Fivetran, dbt Cloud, BrowserStack, DocuSign, Smartsheet, Shortcut, Coda, Productboard, Sauce Labs, Contentful. All Statuspage v2. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.4.0.
- ✅ **v1.3.2: +9 services (84 total)** (tick 13) — Added Plaid, Snyk, Tailscale, HashiCorp, Snowflake, Retool, Make, Courier, Inngest. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.2.
- ✅ **v1.3.1: +4 services (75 total)** (tick 12) — Added Webflow, ActiveCampaign, Typeform, Elastic Cloud. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.1.
- ✅ **v1.3.0: +4 services (71 total)** (tick 11) — Added Okta, Asana, Miro, monday.com.
- ✅ **v1.2.9–v1.0.0** — See prior STATUS.md entries.

**Metrics:**
- Services tracked: 95
- Tools: 5 (get_status, get_all_status, list_services, check_multiple, refresh_status)
- Stars: 0
- Install: `npx -y github:jabbawocky/statuscraft`

**Still unresolved:**
- Salesforce (403 on JSON, JS-rendered HTML)
- Fastly (403 on all endpoints)
- Microsoft 365 / Teams (JS-rendered)
- Zendesk (JS-rendered, 1.3KB HTML shell)
- Mailchimp (JS-rendered)
- Docker Hub (redirect FAIL)
- Braintree (redirect FAIL)
- Checkly, Airbyte, Looker, Deno Deploy (no working status URL found)

**Next autonomous action:**
95 services. Coverage is strong. Next focus: discover remaining gaps. Candidates to probe: LaunchNotes, StatusPage (Atlassian's own SaaS), Honeybadger, Rollbar, BugSnag, Cloudinary (already have?), Heap Analytics, Mixpanel (retry different URL), PostHog (retry), Statsig, Novu, Cal.com. Also try zendesk at a non-JS alternate endpoint.
