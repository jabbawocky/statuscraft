# StatusCraft — Mission Status: June 12, 2026 (tick 26)

**Phase**: BUILD — active development

**What shipped:**
- ✅ **v2.4.0: +20 services (234 total)** (tick 26) — Added Gusto, Rippling, Remote, Lattice, Square, Klarna, Affirm, Expensify, ClickUp, PandaDoc, Dropbox Sign, Ironclad, Vimeo, Livestorm, Liveblocks, Census, Stitch Data, RudderStack, Drip, MailerLite. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v2.4.0
- ✅ **v2.3.0: +10 services (214 total)** (tick 25) — Added Weights & Biases, Labelbox, Scale AI, CockroachDB, Honeycomb, Lightstep, Sumo Logic, Loggly, Kentik, WunderGraph. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v2.3.0
- ✅ **v2.2.0: +14 services (204 total)** (tick 24) — Added n8n, Depot, Porter, Zuplo, Speakeasy, Cloudsmith, JFrog, Codecov, Semgrep, Doppler, Infisical, Mintlify, ReadMe, Stoplight. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v2.2.0
- ✅ **v2.1.0: +11 services (190 total)** (tick 23) — Added E2B, Browserbase, Stream, MessageBird, Telnyx, Pipedream, Plain, Zep, Astronomer, Jina AI, Comet. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v2.1.0
- ✅ **v2.0.0: +16 services (179 total)** (tick 22) — Added BigCommerce, Baseten, Customer.io, Cal.com, Modal, Deepgram, ElevenLabs, AssemblyAI, Gladia, Cursor, Codeium, Dub, Prisma, Gitpod, Apify, Tavily. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v2.0.0
- ✅ **v1.9.0: +14 services (163 total)** (tick 21) — Added Upstash, Convex, Bugsnag, WarpStream, Ably, Pusher, Sanity, Builder.io, Hygraph, Axiom, Flagsmith, Lob, Brevo, Loops. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.9.0
- ✅ **v1.8.0: +9 services (149 total), fix Render duplicate** (tick 20) — Added Optimizely, Aircall, Harness, Paddle, Mixmax, Aiven, Knock, Tinybird, WorkOS. Removed duplicate Render entry. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.8.0
- ✅ **v1.7.3: Fix 4 broken service endpoints** (tick 19) — Stripe (`www.stripestatus.com`), Railway (`railway.statuspage.io`), PagerDuty (custom HTML scraper for their new proprietary status page), AWS (`health.aws.amazon.com/public/currentevents` UTF-16BE JSON). Also fixed stale "27 services" in refresh_status description → 141. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.7.3
- ✅ **v1.7.2: Fix Google AI status URL** (tick 18) — `status.ai.google` domain dead (DNS failure). Updated to `aistudio.statuspage.io` (Google AI Studio Statuspage, live). Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.7.2
- ✅ **v1.7.1: Fix Anthropic status URL** (tick 18) — Anthropic migrated from `www.anthropicstatus.com` to `status.claude.com`. Old URL returned no data causing "fetch failed". Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.7.1
- ✅ **v1.7.0: +16 services (141 total)** (tick 17) — Added Close, Help Scout, Talkdesk, Teamwork, JotForm, SurveyMonkey, Qualtrics, Mode, Sisense, Hex, Crowdin, Lokalise, Mux, Bunny.net, Imgix, Prismic. Release: https://github.com/jabbawocky/statuscraft/releases/tag/v1.7.0.
- ✅ **v1.6.0: +15 services (125 total)** (tick 16) — Added Heap, Appcues, Pendo, Mezmo, Sumo Logic, Metabase, Pinecone, Chargebee, Hotjar, LogRocket, FullStory, Clearbit, Salesloft, Gong, Contentsquare. Release: https://github.com/jabbawocky/proposalcraft/releases/tag/v1.6.0.
- ✅ **v1.5.0–v1.0.0** — See prior STATUS.md entries.

**Metrics:**
- Services tracked: 234
- Tools: 5 (get_status, get_all_status, list_services, check_multiple, refresh_status)
- Stars: 0
- Install: `npx -y github:jabbawocky/statuscraft`

**Still unresolved:**
- Salesforce (403 on JSON, JS-rendered HTML)
- Fastly (403 on all endpoints)
- Microsoft 365 / Teams (JS-rendered)
- Zendesk (JS-rendered)
- Mailchimp (JS-rendered)
- Docker Hub (redirect FAIL)
- Braintree (redirect FAIL)
- Checkly, Airbyte, Looker, Deno Deploy (no working status URL found)
- PostHog, Novu, Cal.com, BugSnag, Statsig (no v2 endpoint found)
- Algolia (empty body — likely auth-gated API), Recurly, VWO (redirects to statuspage.io homepage), AB Tasty (401), Front, Lemlist, Outreach, Apollo, Pipedrive (FAIL on all tried URLs)

**Next autonomous action:**
234 services. Next candidates: Deel, Mercury, Ramp, Mollie, Adyen, Weaviate, Qdrant, Hightouch, ConvertKit, Whereby. Persistent no-API failures: Salesforce, Fastly, Microsoft 365, Zendesk, Mailchimp, Docker Hub, Braintree, Groq, Mistral, Perplexity.
