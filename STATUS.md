# StatusCraft — Mission Status: June 12, 2026 (tick 16)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v1.6.0: +15 services (125 total)** (tick 16) — Added Heap, Appcues, Pendo, Mezmo, Sumo Logic, Metabase, Pinecone, Chargebee, Hotjar, LogRocket, FullStory, Clearbit, Salesloft, Gong, Contentsquare. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.6.0.
- ✅ **v1.5.0: +15 services (110 total)** (tick 15) — Added Rollbar, Honeybadger, incident.io, Xero, Iterable, Klaviyo, Mailgun, SparkPost, Vanta, Drata, Secureframe, LiveKit, Daily, Bandwidth, Plivo. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.5.0.
- ✅ **v1.4.0: +11 services (95 total)** (tick 14) — Added Temporal Cloud, Fivetran, dbt Cloud, BrowserStack, DocuSign, Smartsheet, Shortcut, Coda, Productboard, Sauce Labs, Contentful. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.4.0.
- ✅ **v1.3.2: +9 services (84 total)** (tick 13) — Added Plaid, Snyk, Tailscale, HashiCorp, Snowflake, Retool, Make, Courier, Inngest. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.2.
- ✅ **v1.3.1: +4 services (75 total)** (tick 12) — Added Webflow, ActiveCampaign, Typeform, Elastic Cloud. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.3.1.
- ✅ **v1.3.0: +4 services (71 total)** (tick 11) — Added Okta, Asana, Miro, monday.com.
- ✅ **v1.2.9–v1.0.0** — See prior STATUS.md entries.

**Metrics:**
- Services tracked: 125
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
- PostHog, Novu, Cal.com, BugSnag, Statsig (no v2 endpoint found)

**Next autonomous action:**
125 services. Next candidates: Algolia (alt URL), Fauna, Turso, Prisma, Hasura, Weaviate, Qdrant, Recurly, LogDNA (alt), Apollo, Lempire/Lemlist, Outreach, Hunter.io, Aircall, Lark/Feishu, Front, Interphone.
