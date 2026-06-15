#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
const CACHE_TTL_MS = 60_000; // 60-second TTL
const statusCache = new Map();
function getCached(id) {
    const entry = statusCache.get(id);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        statusCache.delete(id);
        return null;
    }
    return entry.result;
}
function setCache(result) {
    statusCache.set(result.id, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}
const SERVICES = [
    {
        id: "anthropic",
        name: "Anthropic",
        tags: ["ai", "llm", "api"],
        status_url: "https://status.claude.com/api/v2/status.json",
        page_url: "https://status.claude.com",
        type: "statuspage",
    },
    {
        id: "openai",
        name: "OpenAI",
        tags: ["ai", "llm", "api"],
        status_url: "https://status.openai.com/api/v2/status.json",
        page_url: "https://status.openai.com",
        type: "statuspage",
    },
    {
        id: "github",
        name: "GitHub",
        tags: ["devtools", "git", "hosting"],
        status_url: "https://www.githubstatus.com/api/v2/status.json",
        page_url: "https://www.githubstatus.com",
        type: "statuspage",
    },
    {
        id: "stripe",
        name: "Stripe",
        tags: ["payments", "fintech", "api"],
        status_url: "https://www.stripestatus.com/api/v2/status.json",
        page_url: "https://www.stripestatus.com",
        type: "statuspage",
    },
    {
        id: "discord",
        name: "Discord",
        tags: ["communication", "chat"],
        status_url: "https://discordstatus.com/api/v2/status.json",
        page_url: "https://discordstatus.com",
        type: "statuspage",
    },
    {
        id: "slack",
        name: "Slack",
        tags: ["communication", "chat"],
        status_url: "https://status.slack.com/api/v2.0.0/current",
        page_url: "https://status.slack.com",
        type: "slack",
    },
    {
        id: "pagerduty",
        name: "PagerDuty",
        tags: ["monitoring", "ops", "alerting"],
        status_url: "https://status.pagerduty.com/",
        page_url: "https://status.pagerduty.com",
        type: "pagerduty",
    },
    {
        id: "datadog",
        name: "Datadog",
        tags: ["monitoring", "observability", "ops"],
        status_url: "https://status.datadoghq.com/api/v2/status.json",
        page_url: "https://status.datadoghq.com",
        type: "statuspage",
    },
    {
        id: "twilio",
        name: "Twilio",
        tags: ["communications", "api", "sms"],
        status_url: "https://status.twilio.com/api/v2/status.json",
        page_url: "https://status.twilio.com",
        type: "statuspage",
    },
    {
        id: "sendgrid",
        name: "SendGrid",
        tags: ["email", "api"],
        status_url: "https://status.sendgrid.com/api/v2/status.json",
        page_url: "https://status.sendgrid.com",
        type: "statuspage",
    },
    {
        id: "heroku",
        name: "Heroku",
        tags: ["hosting", "paas", "deployment"],
        status_url: "https://status.heroku.com/api/v4/current-status",
        page_url: "https://status.heroku.com",
        type: "heroku",
    },
    {
        id: "render",
        name: "Render",
        tags: ["hosting", "paas", "deployment"],
        status_url: "https://status.render.com/api/v2/status.json",
        page_url: "https://status.render.com",
        type: "statuspage",
    },
    {
        id: "fly",
        name: "Fly.io",
        tags: ["hosting", "paas", "deployment"],
        status_url: "https://flyio.statuspage.io/api/v2/status.json",
        page_url: "https://status.flyio.net",
        type: "statuspage",
    },
    {
        id: "google_cloud",
        name: "Google Cloud",
        tags: ["cloud", "infrastructure", "hosting"],
        status_url: "https://status.cloud.google.com/incidents.json",
        page_url: "https://status.cloud.google.com",
        type: "gcp",
    },
    {
        id: "google_ai",
        name: "Google AI Studio",
        tags: ["ai", "llm", "api"],
        status_url: "https://aistudio.statuspage.io/api/v2/status.json",
        page_url: "https://aistudio.statuspage.io",
        type: "statuspage",
    },
    {
        id: "aws",
        name: "AWS",
        tags: ["cloud", "infrastructure", "hosting"],
        status_url: "https://health.aws.amazon.com/public/currentevents",
        page_url: "https://health.aws.amazon.com/health/status",
        type: "aws",
    },
    {
        id: "azure",
        name: "Azure",
        tags: ["cloud", "infrastructure", "hosting"],
        status_url: "https://azure.status.microsoft/en-us/status/feed/",
        page_url: "https://azure.status.microsoft/en-us/status",
        type: "azure",
    },
    {
        id: "supabase",
        name: "Supabase",
        tags: ["database", "hosting", "api", "devtools"],
        status_url: "https://status.supabase.com/api/v2/status.json",
        page_url: "https://status.supabase.com",
        type: "statuspage",
    },
    {
        id: "neon",
        name: "Neon",
        tags: ["database", "postgres", "hosting"],
        status_url: "https://api.status.io/1.0/status/6878fc85709daa75be6c7e3c",
        page_url: "https://neonstatus.com",
        type: "statusio",
    },
    {
        id: "railway",
        name: "Railway",
        tags: ["hosting", "paas", "deployment"],
        status_url: "https://railway.statuspage.io/api/v2/status.json",
        page_url: "https://railway.statuspage.io",
        type: "statuspage",
    },
    {
        id: "atlassian",
        name: "Atlassian",
        tags: ["devtools", "project-management", "productivity"],
        status_url: "https://status.atlassian.com/api/v2/status.json",
        page_url: "https://status.atlassian.com",
        type: "statuspage",
    },
    {
        id: "hubspot",
        name: "HubSpot",
        tags: ["crm", "marketing", "sales"],
        status_url: "https://status.hubspot.com/api/v2/status.json",
        page_url: "https://status.hubspot.com",
        type: "statuspage",
    },
    {
        id: "vercel",
        name: "Vercel",
        tags: ["hosting", "devtools", "infrastructure"],
        status_url: "https://www.vercel-status.com/api/v2/status.json",
        page_url: "https://www.vercel-status.com",
        type: "statuspage",
    },
    {
        id: "cloudflare",
        name: "Cloudflare",
        tags: ["cdn", "dns", "infrastructure", "security"],
        status_url: "https://www.cloudflarestatus.com/api/v2/status.json",
        page_url: "https://www.cloudflarestatus.com",
        type: "statuspage",
    },
    {
        id: "netlify",
        name: "Netlify",
        tags: ["hosting", "devtools", "infrastructure"],
        status_url: "https://www.netlifystatus.com/api/v2/status.json",
        page_url: "https://www.netlifystatus.com",
        type: "statuspage",
    },
    {
        id: "linear",
        name: "Linear",
        tags: ["project-management", "devtools", "productivity"],
        status_url: "https://linearstatus.com/api/v2/status.json",
        page_url: "https://linearstatus.com",
        type: "statuspage",
    },
    {
        id: "sentry",
        name: "Sentry",
        tags: ["observability", "error-tracking", "devtools"],
        status_url: "https://status.sentry.io/api/v2/status.json",
        page_url: "https://status.sentry.io",
        type: "statuspage",
    },
    {
        id: "new_relic",
        name: "New Relic",
        tags: ["observability", "apm", "monitoring"],
        status_url: "https://status.newrelic.com/api/v2/status.json",
        page_url: "https://status.newrelic.com",
        type: "statuspage",
    },
    {
        id: "cohere",
        name: "Cohere",
        tags: ["ai", "llm", "api"],
        status_url: "https://status.cohere.com/api/v2/status.json",
        page_url: "https://status.cohere.com",
        type: "statuspage",
    },
    {
        id: "replicate",
        name: "Replicate",
        tags: ["ai", "ml", "hosting", "api"],
        status_url: "https://www.replicatestatus.com/api/v2/status.json",
        page_url: "https://www.replicatestatus.com",
        type: "statuspage",
    },
    {
        id: "mongodb_atlas",
        name: "MongoDB Atlas",
        tags: ["database", "cloud"],
        status_url: "https://status.mongodb.com/api/v2/status.json",
        page_url: "https://status.mongodb.com",
        type: "statuspage",
    },
    {
        id: "digitalocean",
        name: "DigitalOcean",
        tags: ["cloud", "hosting", "infrastructure"],
        status_url: "https://status.digitalocean.com/api/v2/status.json",
        page_url: "https://status.digitalocean.com",
        type: "statuspage",
    },
    {
        id: "cloudinary",
        name: "Cloudinary",
        tags: ["media", "cdn", "storage", "images"],
        status_url: "https://status.cloudinary.com/api/v2/status.json",
        page_url: "https://status.cloudinary.com",
        type: "statuspage",
    },
    {
        id: "zapier",
        name: "Zapier",
        tags: ["automation", "integrations", "productivity"],
        status_url: "https://status.zapier.com/api/v2/status.json",
        page_url: "https://status.zapier.com",
        type: "statuspage",
    },
    {
        id: "airtable",
        name: "Airtable",
        tags: ["database", "productivity", "no-code"],
        status_url: "https://status.airtable.com/api/v2/status.json",
        page_url: "https://status.airtable.com",
        type: "statuspage",
    },
    {
        id: "intercom",
        name: "Intercom",
        tags: ["crm", "support", "chat", "customer-success"],
        status_url: "https://www.intercomstatus.com/api/v2/status.json",
        page_url: "https://www.intercomstatus.com",
        type: "statuspage",
    },
    {
        id: "shopify",
        name: "Shopify",
        tags: ["ecommerce", "payments", "hosting"],
        status_url: "https://www.shopifystatus.com/api/v2/status.json",
        page_url: "https://www.shopifystatus.com",
        type: "statuspage",
    },
    {
        id: "segment",
        name: "Segment",
        tags: ["analytics", "cdp", "data", "integrations"],
        status_url: "https://status.segment.com/api/v2/status.json",
        page_url: "https://status.segment.com",
        type: "statuspage",
    },
    {
        id: "amplitude",
        name: "Amplitude",
        tags: ["analytics", "product-analytics", "data"],
        status_url: "https://status.amplitude.com/api/v2/status.json",
        page_url: "https://status.amplitude.com",
        type: "statuspage",
    },
    {
        id: "postman",
        name: "Postman",
        tags: ["api", "devtools", "testing"],
        status_url: "https://status.postman.com/api/v2/status.json",
        page_url: "https://status.postman.com",
        type: "statuspage",
    },
    {
        id: "grafana_cloud",
        name: "Grafana Cloud",
        tags: ["observability", "monitoring", "dashboards"],
        status_url: "https://status.grafana.com/api/v2/status.json",
        page_url: "https://status.grafana.com",
        type: "statuspage",
    },
    {
        id: "mixpanel",
        name: "Mixpanel",
        tags: ["analytics", "product-analytics", "data"],
        status_url: "https://status.mixpanel.com/api/v2/status.json",
        page_url: "https://status.mixpanel.com",
        type: "statuspage",
    },
    {
        id: "brex",
        name: "Brex",
        tags: ["fintech", "payments", "banking"],
        status_url: "https://status.brex.com/api/v2/status.json",
        page_url: "https://status.brex.com",
        type: "statuspage",
    },
    {
        id: "figma",
        name: "Figma",
        tags: ["design", "collaboration", "productivity"],
        status_url: "https://status.figma.com/api/v2/status.json",
        page_url: "https://status.figma.com",
        type: "statuspage",
    },
    {
        id: "loom",
        name: "Loom",
        tags: ["video", "communication", "productivity"],
        status_url: "https://loom.status.atlassian.com/api/v2/status.json",
        page_url: "https://loom.status.atlassian.com",
        type: "statuspage",
    },
    {
        id: "notion",
        name: "Notion",
        tags: ["productivity", "workspace", "notes"],
        status_url: "https://www.notion-status.com/api/v2/status.json",
        page_url: "https://www.notion-status.com",
        type: "statuspage",
    },
    {
        id: "onepassword",
        name: "1Password",
        tags: ["security", "passwords", "authentication"],
        status_url: "https://status.1password.com/api/v2/status.json",
        page_url: "https://status.1password.com",
        type: "statuspage",
    },
    {
        id: "circleci",
        name: "CircleCI",
        tags: ["ci-cd", "devtools", "automation"],
        status_url: "https://circleci.statuspage.io/api/v2/status.json",
        page_url: "https://status.circleci.com",
        type: "statuspage",
    },
    {
        id: "npm",
        name: "npm",
        tags: ["devtools", "package-registry", "javascript"],
        status_url: "https://status.npmjs.org/api/v2/status.json",
        page_url: "https://status.npmjs.org",
        type: "statuspage",
    },
    {
        id: "zoom",
        name: "Zoom",
        tags: ["video", "communication", "meetings"],
        status_url: "https://status.zoom.us/api/v2/status.json",
        page_url: "https://www.zoomstatus.com",
        type: "statuspage",
    },
    {
        id: "twitch",
        name: "Twitch",
        tags: ["streaming", "video", "gaming"],
        status_url: "https://status.twitch.tv/api/v2/status.json",
        page_url: "https://status.twitch.com",
        type: "statuspage",
    },
    {
        id: "jira_cloud",
        name: "Jira Cloud",
        tags: ["devtools", "project-management", "atlassian"],
        status_url: "https://jira-software.status.atlassian.com/api/v2/status.json",
        page_url: "https://jira-software.status.atlassian.com",
        type: "statuspage",
    },
    {
        id: "confluence",
        name: "Confluence",
        tags: ["documentation", "wiki", "atlassian"],
        status_url: "https://confluence.status.atlassian.com/api/v2/status.json",
        page_url: "https://confluence.status.atlassian.com",
        type: "statuspage",
    },
    {
        id: "bitbucket",
        name: "Bitbucket",
        tags: ["devtools", "git", "atlassian"],
        status_url: "https://bitbucket.status.atlassian.com/api/v2/status.json",
        page_url: "https://bitbucket.status.atlassian.com",
        type: "statuspage",
    },
    {
        id: "box",
        name: "Box",
        tags: ["storage", "collaboration", "productivity"],
        status_url: "https://status.box.com/api/v2/status.json",
        page_url: "https://status.box.com",
        type: "statuspage",
    },
    {
        id: "dropbox",
        name: "Dropbox",
        tags: ["storage", "collaboration", "productivity"],
        status_url: "https://status.dropbox.com/api/v2/status.json",
        page_url: "https://status.dropbox.com",
        type: "statuspage",
    },
    {
        id: "auth0",
        name: "Auth0",
        tags: ["authentication", "security", "identity"],
        status_url: "https://status.auth0.com",
        page_url: "https://status.auth0.com",
        type: "incidentio",
    },
    {
        id: "okta",
        name: "Okta",
        tags: ["authentication", "security", "identity"],
        status_url: "https://status.okta.com",
        page_url: "https://status.okta.com",
        type: "incidentio",
    },
    {
        id: "asana",
        name: "Asana",
        tags: ["productivity", "project-management", "collaboration"],
        status_url: "https://status.asana.com/api/v2/status.json",
        page_url: "https://status.asana.com",
        type: "statuspage",
    },
    {
        id: "miro",
        name: "Miro",
        tags: ["collaboration", "whiteboard", "design"],
        status_url: "https://status.miro.com/api/v2/status.json",
        page_url: "https://status.miro.com",
        type: "statuspage",
    },
    {
        id: "monday",
        name: "monday.com",
        tags: ["productivity", "project-management", "collaboration"],
        status_url: "https://status.monday.com/api/v2/status.json",
        page_url: "https://status.monday.com",
        type: "statuspage",
    },
    {
        id: "webflow",
        name: "Webflow",
        tags: ["hosting", "cms", "no-code"],
        status_url: "https://status.webflow.com/api/v2/status.json",
        page_url: "https://status.webflow.com",
        type: "statuspage",
    },
    {
        id: "activecampaign",
        name: "ActiveCampaign",
        tags: ["email", "marketing", "crm"],
        status_url: "https://status.activecampaign.com/api/v2/status.json",
        page_url: "https://status.activecampaign.com",
        type: "statuspage",
    },
    {
        id: "typeform",
        name: "Typeform",
        tags: ["forms", "surveys", "data-collection"],
        status_url: "https://status.typeform.com/api/v2/status.json",
        page_url: "https://status.typeform.com",
        type: "statuspage",
    },
    {
        id: "elastic",
        name: "Elastic Cloud",
        tags: ["search", "analytics", "observability"],
        status_url: "https://status.elastic.co/api/v2/status.json",
        page_url: "https://status.elastic.co",
        type: "statuspage",
    },
    {
        id: "plaid",
        name: "Plaid",
        tags: ["fintech", "banking", "payments"],
        status_url: "https://status.plaid.com/api/v2/status.json",
        page_url: "https://status.plaid.com",
        type: "statuspage",
    },
    {
        id: "snyk",
        name: "Snyk",
        tags: ["security", "devtools", "vulnerability-scanning"],
        status_url: "https://status.snyk.io/api/v2/status.json",
        page_url: "https://status.snyk.io",
        type: "statuspage",
    },
    {
        id: "tailscale",
        name: "Tailscale",
        tags: ["networking", "vpn", "devtools"],
        status_url: "https://status.tailscale.com/api/v2/status.json",
        page_url: "https://status.tailscale.com",
        type: "statuspage",
    },
    {
        id: "hashicorp",
        name: "HashiCorp",
        tags: ["devtools", "infrastructure", "cloud"],
        status_url: "https://status.hashicorp.com/api/v2/status.json",
        page_url: "https://status.hashicorp.com",
        type: "statuspage",
    },
    {
        id: "snowflake",
        name: "Snowflake",
        tags: ["data", "analytics", "cloud"],
        status_url: "https://status.snowflake.com/api/v2/status.json",
        page_url: "https://status.snowflake.com",
        type: "statuspage",
    },
    {
        id: "retool",
        name: "Retool",
        tags: ["devtools", "internal-tools", "no-code"],
        status_url: "https://status.retool.com/api/v2/status.json",
        page_url: "https://status.retool.com",
        type: "statuspage",
    },
    {
        id: "make",
        name: "Make",
        tags: ["automation", "integration", "no-code"],
        status_url: "https://status.make.com/api/v2/status.json",
        page_url: "https://status.make.com",
        type: "statuspage",
    },
    // Tick 14 additions
    {
        id: "fivetran",
        name: "Fivetran",
        tags: ["data", "etl", "analytics"],
        status_url: "https://status.fivetran.com/api/v2/status.json",
        page_url: "https://status.fivetran.com",
        type: "statuspage",
    },
    {
        id: "dbt_cloud",
        name: "dbt Cloud",
        tags: ["data", "analytics", "etl"],
        status_url: "https://status.getdbt.com/api/v2/status.json",
        page_url: "https://status.getdbt.com",
        type: "statuspage",
    },
    {
        id: "browserstack",
        name: "BrowserStack",
        tags: ["devtools", "testing", "qa"],
        status_url: "https://status.browserstack.com/api/v2/status.json",
        page_url: "https://status.browserstack.com",
        type: "statuspage",
    },
    {
        id: "docusign",
        name: "DocuSign",
        tags: ["productivity", "legal", "documents"],
        status_url: "https://status.docusign.com/api/v2/status.json",
        page_url: "https://status.docusign.com",
        type: "statuspage",
    },
    {
        id: "smartsheet",
        name: "Smartsheet",
        tags: ["productivity", "project-management", "collaboration"],
        status_url: "https://status.smartsheet.com/api/v2/status.json",
        page_url: "https://status.smartsheet.com",
        type: "statuspage",
    },
    {
        id: "shortcut",
        name: "Shortcut",
        tags: ["devtools", "project-management", "collaboration"],
        status_url: "https://status.shortcut.com/api/v2/status.json",
        page_url: "https://status.shortcut.com",
        type: "statuspage",
    },
    {
        id: "coda",
        name: "Coda",
        tags: ["productivity", "documents", "collaboration"],
        status_url: "https://status.coda.io/api/v2/status.json",
        page_url: "https://status.coda.io",
        type: "statuspage",
    },
    {
        id: "productboard",
        name: "Productboard",
        tags: ["productivity", "product-management", "collaboration"],
        status_url: "https://status.productboard.com/api/v2/status.json",
        page_url: "https://status.productboard.com",
        type: "statuspage",
    },
    {
        id: "saucelabs",
        name: "Sauce Labs",
        tags: ["devtools", "testing", "qa"],
        status_url: "https://status.saucelabs.com/api/v2/status.json",
        page_url: "https://status.saucelabs.com",
        type: "statuspage",
    },
    {
        id: "contentful",
        name: "Contentful",
        tags: ["cms", "content", "headless"],
        status_url: "https://www.contentfulstatus.com/api/v2/status.json",
        page_url: "https://www.contentfulstatus.com",
        type: "statuspage",
    },
    // Tick 15 additions
    {
        id: "rollbar",
        name: "Rollbar",
        tags: ["monitoring", "error-tracking", "observability"],
        status_url: "https://status.rollbar.com/api/v2/status.json",
        page_url: "https://status.rollbar.com",
        type: "statuspage",
    },
    {
        id: "honeybadger",
        name: "Honeybadger",
        tags: ["monitoring", "error-tracking", "observability"],
        status_url: "https://status.honeybadger.io/api/v2/status.json",
        page_url: "https://status.honeybadger.io",
        type: "statuspage",
    },
    {
        id: "incident_io",
        name: "incident.io",
        tags: ["monitoring", "incident-management", "ops"],
        status_url: "https://status.incident.io/api/v2/status.json",
        page_url: "https://status.incident.io",
        type: "statuspage",
    },
    {
        id: "xero",
        name: "Xero",
        tags: ["fintech", "accounting", "payments"],
        status_url: "https://status.xero.com/api/v2/status.json",
        page_url: "https://status.xero.com",
        type: "statuspage",
    },
    {
        id: "iterable",
        name: "Iterable",
        tags: ["email", "marketing", "automation"],
        status_url: "https://status.iterable.com/api/v2/status.json",
        page_url: "https://status.iterable.com",
        type: "statuspage",
    },
    {
        id: "klaviyo",
        name: "Klaviyo",
        tags: ["email", "marketing", "ecommerce"],
        status_url: "https://status.klaviyo.com/api/v2/status.json",
        page_url: "https://status.klaviyo.com",
        type: "statuspage",
    },
    {
        id: "mailgun",
        name: "Mailgun",
        tags: ["email", "api", "transactional"],
        status_url: "https://status.mailgun.com/api/v2/status.json",
        page_url: "https://status.mailgun.com",
        type: "statuspage",
    },
    {
        id: "sparkpost",
        name: "SparkPost",
        tags: ["email", "api", "transactional"],
        status_url: "https://status.sparkpost.com/api/v2/status.json",
        page_url: "https://status.sparkpost.com",
        type: "statuspage",
    },
    {
        id: "vanta",
        name: "Vanta",
        tags: ["security", "compliance", "audit"],
        status_url: "https://status.vanta.com/api/v2/status.json",
        page_url: "https://status.vanta.com",
        type: "statuspage",
    },
    {
        id: "drata",
        name: "Drata",
        tags: ["security", "compliance", "audit"],
        status_url: "https://status.drata.com/api/v2/status.json",
        page_url: "https://status.drata.com",
        type: "statuspage",
    },
    {
        id: "secureframe",
        name: "Secureframe",
        tags: ["security", "compliance", "audit"],
        status_url: "https://status.secureframe.com/api/v2/status.json",
        page_url: "https://status.secureframe.com",
        type: "statuspage",
    },
    {
        id: "livekit",
        name: "LiveKit",
        tags: ["video", "audio", "realtime", "api"],
        status_url: "https://status.livekit.io/api/v2/status.json",
        page_url: "https://status.livekit.io",
        type: "statuspage",
    },
    {
        id: "daily",
        name: "Daily",
        tags: ["video", "api", "realtime"],
        status_url: "https://status.daily.co/api/v2/status.json",
        page_url: "https://status.daily.co",
        type: "statuspage",
    },
    {
        id: "bandwidth",
        name: "Bandwidth",
        tags: ["communications", "voice", "api"],
        status_url: "https://status.bandwidth.com/api/v2/status.json",
        page_url: "https://status.bandwidth.com",
        type: "statuspage",
    },
    {
        id: "plivo",
        name: "Plivo",
        tags: ["communications", "sms", "voice", "api"],
        status_url: "https://status.plivo.com/api/v2/status.json",
        page_url: "https://status.plivo.com",
        type: "statuspage",
    },
    // Tick 16 additions
    { id: "heap", name: "Heap", tags: ["analytics", "product", "data"], status_url: "https://status.heap.io/api/v2/status.json", page_url: "https://status.heap.io", type: "statuspage" },
    { id: "appcues", name: "Appcues", tags: ["product", "onboarding", "analytics"], status_url: "https://status.appcues.com/api/v2/status.json", page_url: "https://status.appcues.com", type: "statuspage" },
    { id: "pendo", name: "Pendo", tags: ["analytics", "product", "onboarding"], status_url: "https://status.pendo.io/api/v2/status.json", page_url: "https://status.pendo.io", type: "statuspage" },
    { id: "mezmo", name: "Mezmo", tags: ["observability", "logging", "devops"], status_url: "https://status.mezmo.com/api/v2/status.json", page_url: "https://status.mezmo.com", type: "statuspage" },
    { id: "sumo_logic", name: "Sumo Logic", tags: ["observability", "logging", "security", "analytics"], status_url: "https://status.sumologic.com/api/v2/status.json", page_url: "https://status.sumologic.com", type: "statuspage" },
    { id: "metabase", name: "Metabase", tags: ["analytics", "bi", "data"], status_url: "https://status.metabase.com/api/v2/status.json", page_url: "https://status.metabase.com", type: "statuspage" },
    { id: "pinecone", name: "Pinecone", tags: ["database", "vector", "ai", "ml"], status_url: "https://status.pinecone.io/api/v2/status.json", page_url: "https://status.pinecone.io", type: "statuspage" },
    { id: "chargebee", name: "Chargebee", tags: ["fintech", "billing", "subscriptions", "payments"], status_url: "https://status.chargebee.com/api/v2/status.json", page_url: "https://status.chargebee.com", type: "statuspage" },
    { id: "hotjar", name: "Hotjar", tags: ["analytics", "product", "ux"], status_url: "https://status.hotjar.com/api/v2/status.json", page_url: "https://status.hotjar.com", type: "statuspage" },
    { id: "logrocket", name: "LogRocket", tags: ["observability", "error-tracking", "analytics"], status_url: "https://status.logrocket.com/api/v2/status.json", page_url: "https://status.logrocket.com", type: "statuspage" },
    { id: "fullstory", name: "FullStory", tags: ["analytics", "product", "ux"], status_url: "https://status.fullstory.com/api/v2/status.json", page_url: "https://status.fullstory.com", type: "statuspage" },
    { id: "clearbit", name: "Clearbit", tags: ["data", "enrichment", "marketing"], status_url: "https://status.clearbit.com/api/v2/status.json", page_url: "https://status.clearbit.com", type: "statuspage" },
    { id: "salesloft", name: "Salesloft", tags: ["sales", "crm", "outreach"], status_url: "https://status.salesloft.com/api/v2/status.json", page_url: "https://status.salesloft.com", type: "statuspage" },
    { id: "gong", name: "Gong", tags: ["sales", "analytics", "ai"], status_url: "https://status.gong.io/api/v2/status.json", page_url: "https://status.gong.io", type: "statuspage" },
    { id: "contentsquare", name: "Contentsquare", tags: ["analytics", "product", "ux"], status_url: "https://status.contentsquare.com/api/v2/status.json", page_url: "https://status.contentsquare.com", type: "statuspage" },
    // Tick 17 additions
    { id: "close", name: "Close", tags: ["crm", "sales", "email"], status_url: "https://status.close.com/api/v2/status.json", page_url: "https://status.close.com", type: "statuspage" },
    { id: "helpscout", name: "Help Scout", tags: ["customer-support", "email", "helpdesk"], status_url: "https://status.helpscout.com/api/v2/status.json", page_url: "https://status.helpscout.com", type: "statuspage" },
    { id: "talkdesk", name: "Talkdesk", tags: ["communications", "customer-support", "voice", "api"], status_url: "https://status.talkdesk.com/api/v2/status.json", page_url: "https://status.talkdesk.com", type: "statuspage" },
    { id: "teamwork", name: "Teamwork", tags: ["project-management", "collaboration", "productivity"], status_url: "https://status.teamwork.com/api/v2/status.json", page_url: "https://status.teamwork.com", type: "statuspage" },
    { id: "jotform", name: "JotForm", tags: ["forms", "automation", "no-code"], status_url: "https://status.jotform.com/api/v2/status.json", page_url: "https://status.jotform.com", type: "statuspage" },
    { id: "surveymonkey", name: "SurveyMonkey", tags: ["surveys", "forms", "analytics"], status_url: "https://status.surveymonkey.com/api/v2/status.json", page_url: "https://status.surveymonkey.com", type: "statuspage" },
    { id: "qualtrics", name: "Qualtrics", tags: ["surveys", "analytics", "enterprise"], status_url: "https://status.qualtrics.com/api/v2/status.json", page_url: "https://status.qualtrics.com", type: "statuspage" },
    { id: "mode", name: "Mode", tags: ["analytics", "bi", "data", "notebooks"], status_url: "https://status.modeanalytics.com/api/v2/status.json", page_url: "https://status.modeanalytics.com", type: "statuspage" },
    { id: "sisense", name: "Sisense", tags: ["analytics", "bi", "data"], status_url: "https://status.sisense.com/api/v2/status.json", page_url: "https://status.sisense.com", type: "statuspage" },
    { id: "hex", name: "Hex", tags: ["analytics", "data", "notebooks", "bi"], status_url: "https://status.hex.tech/api/v2/status.json", page_url: "https://status.hex.tech", type: "statuspage" },
    { id: "crowdin", name: "Crowdin", tags: ["localization", "i18n", "translation"], status_url: "https://status.crowdin.com/api/v2/status.json", page_url: "https://status.crowdin.com", type: "statuspage" },
    { id: "lokalise", name: "Lokalise", tags: ["localization", "i18n", "translation"], status_url: "https://status.lokalise.com/api/v2/status.json", page_url: "https://status.lokalise.com", type: "statuspage" },
    { id: "mux", name: "Mux", tags: ["video", "media", "api", "streaming"], status_url: "https://status.mux.com/api/v2/status.json", page_url: "https://status.mux.com", type: "statuspage" },
    { id: "bunny", name: "Bunny.net", tags: ["cdn", "networking", "media", "hosting"], status_url: "https://status.bunny.net/api/v2/status.json", page_url: "https://status.bunny.net", type: "statuspage" },
    { id: "imgix", name: "Imgix", tags: ["media", "image-processing", "cdn"], status_url: "https://status.imgix.com/api/v2/status.json", page_url: "https://status.imgix.com", type: "statuspage" },
    { id: "prismic", name: "Prismic", tags: ["cms", "content", "headless"], status_url: "https://status.prismic.io/api/v2/status.json", page_url: "https://status.prismic.io", type: "statuspage" },
    // Tick 20 additions
    { id: "optimizely", name: "Optimizely", tags: ["ab-testing", "feature-flags", "experimentation"], status_url: "https://status.optimizely.com/api/v2/status.json", page_url: "https://status.optimizely.com", type: "statuspage" },
    { id: "aircall", name: "Aircall", tags: ["communications", "voice", "cloud-phone"], status_url: "https://status.aircall.io/api/v2/status.json", page_url: "https://status.aircall.io", type: "statuspage" },
    { id: "harness", name: "Harness", tags: ["ci-cd", "devtools", "feature-flags", "deployment"], status_url: "https://status.harness.io/api/v2/status.json", page_url: "https://status.harness.io", type: "statuspage" },
    { id: "paddle", name: "Paddle", tags: ["fintech", "payments", "billing", "subscriptions"], status_url: "https://paddlestatus.com/", page_url: "https://paddlestatus.com", type: "incidentio" },
    { id: "mixmax", name: "Mixmax", tags: ["email", "productivity", "sales"], status_url: "https://status.mixmax.com/api/v2/status.json", page_url: "https://status.mixmax.com", type: "statuspage" },
    { id: "aiven", name: "Aiven", tags: ["database", "managed-services", "cloud", "streaming"], status_url: "https://status.aiven.io/api/v2/status.json", page_url: "https://status.aiven.io", type: "statuspage" },
    { id: "knock", name: "Knock", tags: ["notifications", "messaging", "api"], status_url: "https://status.knock.app/api/v2/status.json", page_url: "https://status.knock.app", type: "statuspage" },
    { id: "tinybird", name: "Tinybird", tags: ["analytics", "data", "realtime", "api"], status_url: "https://status.tinybird.co/api/v2/status.json", page_url: "https://status.tinybird.co", type: "statuspage" },
    { id: "workos", name: "WorkOS", tags: ["authentication", "sso", "enterprise", "identity"], status_url: "https://status.workos.com/api/v2/status.json", page_url: "https://status.workos.com", type: "statuspage" },
    { id: "upstash", name: "Upstash", tags: ["database", "redis", "kafka", "serverless", "cache"], status_url: "https://status.upstash.com/api/v2/status.json", page_url: "https://status.upstash.com", type: "statuspage" },
    { id: "convex", name: "Convex", tags: ["database", "backend", "serverless", "realtime"], status_url: "https://status.convex.dev/api/v2/status.json", page_url: "https://status.convex.dev", type: "statuspage" },
    { id: "bugsnag", name: "Bugsnag", tags: ["error-tracking", "monitoring", "observability"], status_url: "https://status.bugsnag.com/api/v2/status.json", page_url: "https://status.bugsnag.com", type: "statuspage" },
    { id: "warpstream", name: "WarpStream", tags: ["streaming", "kafka", "messaging", "data"], status_url: "https://status.warpstream.com/api/v2/status.json", page_url: "https://status.warpstream.com", type: "statuspage" },
    { id: "ably", name: "Ably", tags: ["realtime", "messaging", "websockets", "api"], status_url: "https://status.ably.com/api/v2/status.json", page_url: "https://status.ably.com", type: "statuspage" },
    { id: "pusher", name: "Pusher", tags: ["realtime", "websockets", "messaging", "api"], status_url: "https://status.pusher.com/api/v2/status.json", page_url: "https://status.pusher.com", type: "statuspage" },
    { id: "sanity", name: "Sanity", tags: ["cms", "content", "headless", "api"], status_url: "https://status.sanity.io/api/v2/status.json", page_url: "https://status.sanity.io", type: "statuspage" },
    { id: "builder_io", name: "Builder.io", tags: ["cms", "visual-editor", "headless", "frontend"], status_url: "https://status.builder.io/api/v2/status.json", page_url: "https://status.builder.io", type: "statuspage" },
    { id: "hygraph", name: "Hygraph", tags: ["cms", "graphql", "headless", "api"], status_url: "https://status.hygraph.com/api/v2/status.json", page_url: "https://status.hygraph.com", type: "statuspage" },
    { id: "axiom", name: "Axiom", tags: ["observability", "logging", "analytics", "monitoring"], status_url: "https://status.axiom.co/api/v2/status.json", page_url: "https://status.axiom.co", type: "statuspage" },
    { id: "flagsmith", name: "Flagsmith", tags: ["feature-flags", "experimentation", "devops"], status_url: "https://status.flagsmith.com/api/v2/status.json", page_url: "https://status.flagsmith.com", type: "statuspage" },
    { id: "lob", name: "Lob", tags: ["direct-mail", "printing", "api", "postal"], status_url: "https://status.lob.com/api/v2/status.json", page_url: "https://status.lob.com", type: "statuspage" },
    { id: "brevo", name: "Brevo", tags: ["email", "marketing", "sms", "crm"], status_url: "https://status.brevo.com/api/v2/status.json", page_url: "https://status.brevo.com", type: "statuspage" },
    { id: "loops", name: "Loops", tags: ["email", "marketing", "saas", "transactional"], status_url: "https://status.loops.so/api/v2/status.json", page_url: "https://status.loops.so", type: "statuspage" },
    { id: "bigcommerce", name: "BigCommerce", tags: ["ecommerce", "payments", "platform", "saas"], status_url: "https://status.bigcommerce.com/api/v2/status.json", page_url: "https://status.bigcommerce.com", type: "statuspage" },
    { id: "baseten", name: "Baseten", tags: ["ml", "ai", "inference", "model-serving"], status_url: "https://status.baseten.co/api/v2/status.json", page_url: "https://status.baseten.co", type: "statuspage" },
    { id: "customerio", name: "Customer.io", tags: ["email", "marketing", "automation", "crm"], status_url: "https://status.customerio.com/api/v2/status.json", page_url: "https://status.customerio.com", type: "statuspage" },
    { id: "cal", name: "Cal.com", tags: ["scheduling", "calendar", "booking", "productivity"], status_url: "https://cal.statuspage.io/api/v2/status.json", page_url: "https://cal.statuspage.io", type: "statuspage" },
    { id: "modal", name: "Modal", tags: ["serverless", "compute", "ml", "python"], status_url: "https://modal.statuspage.io/api/v2/status.json", page_url: "https://modal.statuspage.io", type: "statuspage" },
    { id: "deepgram", name: "Deepgram", tags: ["speech-to-text", "ai", "audio", "transcription"], status_url: "https://status.deepgram.com/api/v2/status.json", page_url: "https://status.deepgram.com", type: "statuspage" },
    { id: "elevenlabs", name: "ElevenLabs", tags: ["text-to-speech", "ai", "audio", "voice"], status_url: "https://status.elevenlabs.io/api/v2/status.json", page_url: "https://status.elevenlabs.io", type: "statuspage" },
    { id: "assemblyai", name: "AssemblyAI", tags: ["speech-to-text", "ai", "audio", "transcription"], status_url: "https://status.assemblyai.com/api/v2/status.json", page_url: "https://status.assemblyai.com", type: "statuspage" },
    { id: "gladia", name: "Gladia", tags: ["speech-to-text", "ai", "audio", "transcription"], status_url: "https://status.gladia.io/api/v2/status.json", page_url: "https://status.gladia.io", type: "statuspage" },
    { id: "cursor", name: "Cursor", tags: ["ai", "ide", "developer-tools", "coding"], status_url: "https://status.cursor.com/api/v2/status.json", page_url: "https://status.cursor.com", type: "statuspage" },
    { id: "codeium", name: "Codeium", tags: ["ai", "coding", "developer-tools", "autocomplete"], status_url: "https://status.codeium.com/api/v2/status.json", page_url: "https://status.codeium.com", type: "statuspage" },
    { id: "dub", name: "Dub", tags: ["link-shortening", "analytics", "developer-tools"], status_url: "https://status.dub.co/api/v2/status.json", page_url: "https://status.dub.co", type: "statuspage" },
    { id: "prisma", name: "Prisma", tags: ["database", "orm", "developer-tools", "backend"], status_url: "https://status.prisma.io/api/v2/status.json", page_url: "https://status.prisma.io", type: "statuspage" },
    { id: "gitpod", name: "Gitpod", tags: ["cloud-ide", "developer-tools", "devops", "remote-dev"], status_url: "https://gitpod.statuspage.io/api/v2/status.json", page_url: "https://gitpod.statuspage.io", type: "statuspage" },
    { id: "apify", name: "Apify", tags: ["web-scraping", "automation", "data", "crawling"], status_url: "https://status.apify.com/api/v2/status.json", page_url: "https://status.apify.com", type: "statuspage" },
    { id: "tavily", name: "Tavily", tags: ["search", "ai", "research", "api"], status_url: "https://status.tavily.com/api/v2/status.json", page_url: "https://status.tavily.com", type: "statuspage" },
    { id: "e2b", name: "E2B", tags: ["sandboxing", "code-execution", "ai", "developer-tools"], status_url: "https://status.e2b.dev/api/v2/status.json", page_url: "https://status.e2b.dev", type: "statuspage" },
    { id: "browserbase", name: "Browserbase", tags: ["browser-automation", "web-scraping", "developer-tools", "ai"], status_url: "https://status.browserbase.com/api/v2/status.json", page_url: "https://status.browserbase.com", type: "statuspage" },
    { id: "stream", name: "Stream", tags: ["chat", "feeds", "realtime", "api"], status_url: "https://status.getstream.io/api/v2/status.json", page_url: "https://status.getstream.io", type: "statuspage" },
    { id: "messagebird", name: "MessageBird", tags: ["sms", "messaging", "communications", "api"], status_url: "https://status.messagebird.com/api/v2/status.json", page_url: "https://status.messagebird.com", type: "statuspage" },
    { id: "telnyx", name: "Telnyx", tags: ["telephony", "sms", "voice", "api"], status_url: "https://status.telnyx.com/api/v2/status.json", page_url: "https://status.telnyx.com", type: "statuspage" },
    { id: "pipedream", name: "Pipedream", tags: ["automation", "integration", "workflows", "api"], status_url: "https://status.pipedream.com/api/v2/status.json", page_url: "https://status.pipedream.com", type: "statuspage" },
    { id: "plain", name: "Plain", tags: ["customer-support", "helpdesk", "api", "saas"], status_url: "https://status.plain.com/api/v2/status.json", page_url: "https://status.plain.com", type: "statuspage" },
    { id: "zep", name: "Zep", tags: ["memory", "ai", "llm", "developer-tools"], status_url: "https://status.getzep.com/api/v2/status.json", page_url: "https://status.getzep.com", type: "statuspage" },
    { id: "astronomer", name: "Astronomer", tags: ["data", "airflow", "orchestration", "pipelines"], status_url: "https://status.astronomer.io/api/v2/status.json", page_url: "https://status.astronomer.io", type: "statuspage" },
    { id: "jina", name: "Jina AI", tags: ["ai", "embeddings", "search", "api"], status_url: "https://status.jina.ai/api/v2/status.json", page_url: "https://status.jina.ai", type: "statuspage" },
    { id: "comet", name: "Comet", tags: ["ml", "experiment-tracking", "mlops", "observability"], status_url: "https://status.comet.com/api/v2/status.json", page_url: "https://status.comet.com", type: "statuspage" },
    { id: "n8n", name: "n8n", tags: ["automation", "workflows", "integration", "no-code"], status_url: "https://n8n.statuspage.io/api/v2/status.json", page_url: "https://n8n.statuspage.io", type: "statuspage" },
    { id: "depot", name: "Depot", tags: ["ci", "docker", "build", "developer-tools"], status_url: "https://status.depot.dev/api/v2/status.json", page_url: "https://status.depot.dev", type: "statuspage" },
    { id: "porter", name: "Porter", tags: ["paas", "kubernetes", "devops", "deployment"], status_url: "https://status.porter.run/api/v2/status.json", page_url: "https://status.porter.run", type: "statuspage" },
    { id: "zuplo", name: "Zuplo", tags: ["api-gateway", "developer-tools", "api-management"], status_url: "https://status.zuplo.com/api/v2/status.json", page_url: "https://status.zuplo.com", type: "statuspage" },
    { id: "speakeasy", name: "Speakeasy", tags: ["api", "sdk-generation", "developer-tools"], status_url: "https://status.speakeasyapi.dev/api/v2/status.json", page_url: "https://status.speakeasyapi.dev", type: "statuspage" },
    { id: "cloudsmith", name: "Cloudsmith", tags: ["package-registry", "devops", "artifacts", "ci"], status_url: "https://status.cloudsmith.io/api/v2/status.json", page_url: "https://status.cloudsmith.io", type: "statuspage" },
    { id: "jfrog", name: "JFrog", tags: ["package-registry", "devops", "artifacts", "security"], status_url: "https://status.jfrog.io/api/v2/status.json", page_url: "https://status.jfrog.io", type: "statuspage" },
    { id: "codecov", name: "Codecov", tags: ["code-coverage", "ci", "testing", "developer-tools"], status_url: "https://status.codecov.io/api/v2/status.json", page_url: "https://status.codecov.io", type: "statuspage" },
    { id: "semgrep", name: "Semgrep", tags: ["security", "sast", "code-analysis", "developer-tools"], status_url: "https://status.semgrep.dev/api/v2/status.json", page_url: "https://status.semgrep.dev", type: "statuspage" },
    { id: "doppler", name: "Doppler", tags: ["secrets", "environment-variables", "security", "devops"], status_url: "https://status.doppler.com/api/v2/status.json", page_url: "https://status.doppler.com", type: "statuspage" },
    { id: "infisical", name: "Infisical", tags: ["secrets", "environment-variables", "security", "open-source"], status_url: "https://status.infisical.com/api/v2/status.json", page_url: "https://status.infisical.com", type: "statuspage" },
    { id: "mintlify", name: "Mintlify", tags: ["documentation", "developer-tools", "api-docs"], status_url: "https://status.mintlify.com/api/v2/status.json", page_url: "https://status.mintlify.com", type: "statuspage" },
    { id: "readme", name: "ReadMe", tags: ["documentation", "api-docs", "developer-experience"], status_url: "https://status.readme.io/api/v2/status.json", page_url: "https://status.readme.io", type: "statuspage" },
    { id: "stoplight", name: "Stoplight", tags: ["api-design", "documentation", "developer-tools"], status_url: "https://status.stoplight.io/api/v2/status.json", page_url: "https://status.stoplight.io", type: "statuspage" },
    { id: "wandb", name: "Weights & Biases", tags: ["ml", "experiment-tracking", "mlops", "ai"], status_url: "https://status.wandb.com/api/v2/status.json", page_url: "https://status.wandb.com", type: "statuspage" },
    { id: "labelbox", name: "Labelbox", tags: ["ml", "data-labeling", "ai", "training-data"], status_url: "https://status.labelbox.com/api/v2/status.json", page_url: "https://status.labelbox.com", type: "statuspage" },
    { id: "scale_ai", name: "Scale AI", tags: ["ml", "data-labeling", "ai", "training-data"], status_url: "https://status.scale.com/api/v2/status.json", page_url: "https://status.scale.com", type: "statuspage" },
    { id: "cockroachdb", name: "CockroachDB", tags: ["database", "distributed", "sql", "cloud"], status_url: "https://cockroachlabs.statuspage.io/api/v2/status.json", page_url: "https://cockroachlabs.statuspage.io", type: "statuspage" },
    { id: "honeycomb", name: "Honeycomb", tags: ["observability", "tracing", "monitoring", "devops"], status_url: "https://status.honeycomb.io/api/v2/status.json", page_url: "https://status.honeycomb.io", type: "statuspage" },
    { id: "lightstep", name: "Lightstep", tags: ["observability", "tracing", "monitoring", "apm"], status_url: "https://status.lightstep.com/api/v2/status.json", page_url: "https://status.lightstep.com", type: "statuspage" },
    { id: "sumologic", name: "Sumo Logic", tags: ["logging", "observability", "security", "analytics"], status_url: "https://status.sumologic.com/api/v2/status.json", page_url: "https://status.sumologic.com", type: "statuspage" },
    { id: "loggly", name: "Loggly", tags: ["logging", "observability", "monitoring", "cloud"], status_url: "https://status.loggly.com/api/v2/status.json", page_url: "https://status.loggly.com", type: "statuspage" },
    { id: "kentik", name: "Kentik", tags: ["networking", "observability", "traffic-analytics", "cloud"], status_url: "https://status.kentik.com/api/v2/status.json", page_url: "https://status.kentik.com", type: "statuspage" },
    { id: "wundergraph", name: "WunderGraph", tags: ["api", "graphql", "developer-tools", "backend"], status_url: "https://status.wundergraph.com/api/v2/status.json", page_url: "https://status.wundergraph.com", type: "statuspage" },
    { id: "gusto", name: "Gusto", tags: ["hr", "payroll", "benefits", "saas"], status_url: "https://status.gusto.com/api/v2/status.json", page_url: "https://status.gusto.com", type: "statuspage" },
    { id: "rippling", name: "Rippling", tags: ["hr", "payroll", "it", "saas"], status_url: "https://status.rippling.com/api/v2/status.json", page_url: "https://status.rippling.com", type: "statuspage" },
    { id: "expensify", name: "Expensify", tags: ["expenses", "finance", "accounting", "saas"], status_url: "https://status.expensify.com/api/v2/status.json", page_url: "https://status.expensify.com", type: "statuspage" },
    { id: "klarna", name: "Klarna", tags: ["payments", "bnpl", "fintech", "ecommerce"], status_url: "https://status.klarna.com/api/v2/status.json", page_url: "https://status.klarna.com", type: "statuspage" },
    { id: "affirm", name: "Affirm", tags: ["payments", "bnpl", "fintech", "ecommerce"], status_url: "https://status.affirm.com/api/v2/status.json", page_url: "https://status.affirm.com", type: "statuspage" },
    { id: "remote", name: "Remote", tags: ["hr", "payroll", "global", "employment"], status_url: "https://remote.statuspage.io/api/v2/status.json", page_url: "https://remote.statuspage.io", type: "statuspage" },
    { id: "lattice", name: "Lattice", tags: ["hr", "performance", "people-management", "saas"], status_url: "https://lattice.statuspage.io/api/v2/status.json", page_url: "https://lattice.statuspage.io", type: "statuspage" },
    { id: "square", name: "Square", tags: ["payments", "pos", "fintech", "ecommerce"], status_url: "https://issquareup.com/api/v2/status.json", page_url: "https://issquareup.com", type: "statuspage" },
    { id: "clickup", name: "ClickUp", tags: ["project-management", "productivity", "collaboration", "saas"], status_url: "https://clickup.statuspage.io/api/v2/status.json", page_url: "https://clickup.statuspage.io", type: "statuspage" },
    { id: "pandadoc", name: "PandaDoc", tags: ["documents", "esign", "contracts", "saas"], status_url: "https://status.pandadoc.com/api/v2/status.json", page_url: "https://status.pandadoc.com", type: "statuspage" },
    { id: "hellosign", name: "Dropbox Sign", tags: ["esign", "documents", "contracts", "api"], status_url: "https://status.hellosign.com/api/v2/status.json", page_url: "https://status.hellosign.com", type: "statuspage" },
    { id: "ironclad", name: "Ironclad", tags: ["contracts", "legal", "clm", "saas"], status_url: "https://status.ironcladapp.com/api/v2/status.json", page_url: "https://status.ironcladapp.com", type: "statuspage" },
    { id: "vimeo", name: "Vimeo", tags: ["video", "hosting", "streaming", "media"], status_url: "https://status.vimeo.com/api/v2/status.json", page_url: "https://status.vimeo.com", type: "statuspage" },
    { id: "livestorm", name: "Livestorm", tags: ["video", "webinar", "events", "saas"], status_url: "https://status.livestorm.co/api/v2/status.json", page_url: "https://status.livestorm.co", type: "statuspage" },
    { id: "liveblocks", name: "Liveblocks", tags: ["realtime", "collaboration", "developer-tools", "api"], status_url: "https://liveblocks.statuspage.io/api/v2/status.json", page_url: "https://liveblocks.statuspage.io", type: "statuspage" },
    { id: "census", name: "Census", tags: ["data", "reverse-etl", "analytics", "integration"], status_url: "https://status.getcensus.com/api/v2/status.json", page_url: "https://status.getcensus.com", type: "statuspage" },
    { id: "stitch", name: "Stitch Data", tags: ["data", "etl", "integration", "pipelines"], status_url: "https://status.stitchdata.com/api/v2/status.json", page_url: "https://status.stitchdata.com", type: "statuspage" },
    { id: "rudderstack", name: "RudderStack", tags: ["data", "cdp", "analytics", "integration"], status_url: "https://status.rudderstack.com/api/v2/status.json", page_url: "https://status.rudderstack.com", type: "statuspage" },
    { id: "drip", name: "Drip", tags: ["email", "marketing", "automation", "ecommerce"], status_url: "https://status.drip.com/api/v2/status.json", page_url: "https://status.drip.com", type: "statuspage" },
    { id: "mailerlite", name: "MailerLite", tags: ["email", "marketing", "automation", "saas"], status_url: "https://status.mailerlite.com/api/v2/status.json", page_url: "https://status.mailerlite.com", type: "statuspage" },
    { id: "hightouch", name: "Hightouch", tags: ["data", "cdp", "integration", "analytics"], status_url: "https://hightouch.statuspage.io/api/v2/status.json", page_url: "https://hightouch.statuspage.io", type: "statuspage" },
    { id: "convertkit", name: "ConvertKit", tags: ["email", "marketing", "automation", "creators"], status_url: "https://convertkit.statuspage.io/api/v2/status.json", page_url: "https://convertkit.statuspage.io", type: "statuspage" },
    { id: "wise", name: "Wise", tags: ["fintech", "payments", "banking", "international"], status_url: "https://status.wise.com/api/v2/status.json", page_url: "https://status.wise.com", type: "statuspage" },
    { id: "mailjet", name: "Mailjet", tags: ["email", "transactional", "marketing", "saas"], status_url: "https://status.mailjet.com/api/v2/status.json", page_url: "https://status.mailjet.com", type: "statuspage" },
    { id: "bamboohr", name: "BambooHR", tags: ["hr", "payroll", "saas", "workforce"], status_url: "https://bamboohr.statuspage.io/api/v2/status.json", page_url: "https://bamboohr.statuspage.io", type: "statuspage" },
    { id: "canva", name: "Canva", tags: ["design", "productivity", "saas", "creative"], status_url: "https://canva.statuspage.io/api/v2/status.json", page_url: "https://canva.statuspage.io", type: "statuspage" },
    { id: "kajabi", name: "Kajabi", tags: ["elearning", "courses", "saas", "creators"], status_url: "https://status.kajabi.com/api/v2/status.json", page_url: "https://status.kajabi.com", type: "statuspage" },
    { id: "teachable", name: "Teachable", tags: ["elearning", "courses", "saas", "creators"], status_url: "https://teachable.statuspage.io/api/v2/status.json", page_url: "https://teachable.statuspage.io", type: "statuspage" },
    { id: "thinkific", name: "Thinkific", tags: ["elearning", "courses", "saas", "creators"], status_url: "https://status.thinkific.com/api/v2/status.json", page_url: "https://status.thinkific.com", type: "statuspage" },
    { id: "circle", name: "Circle", tags: ["community", "saas", "creators", "engagement"], status_url: "https://status.circle.so/api/v2/status.json", page_url: "https://status.circle.so", type: "statuspage" },
    { id: "gorgias", name: "Gorgias", tags: ["customer-support", "ecommerce", "helpdesk", "saas"], status_url: "https://status.gorgias.com/api/v2/status.json", page_url: "https://status.gorgias.com", type: "statuspage" },
    { id: "podia", name: "Podia", tags: ["elearning", "courses", "saas", "creators"], status_url: "https://podia.statuspage.io/api/v2/status.json", page_url: "https://podia.statuspage.io", type: "statuspage" },
    { id: "memberstack", name: "Memberstack", tags: ["membership", "auth", "saas", "no-code"], status_url: "https://memberstack.statuspage.io/api/v2/status.json", page_url: "https://memberstack.statuspage.io", type: "statuspage" },
    { id: "squarespace", name: "Squarespace", tags: ["website-builder", "ecommerce", "saas", "hosting"], status_url: "https://status.squarespace.com/api/v2/status.json", page_url: "https://status.squarespace.com", type: "statuspage" },
    { id: "wix", name: "Wix", tags: ["website-builder", "ecommerce", "saas", "hosting"], status_url: "https://status.wix.com/api/v2/status.json", page_url: "https://status.wix.com", type: "statuspage" },
    { id: "bubble", name: "Bubble", tags: ["no-code", "saas", "app-builder", "hosting"], status_url: "https://status.bubble.io/api/v2/status.json", page_url: "https://status.bubble.io", type: "statuspage" },
    { id: "magic", name: "Magic", tags: ["auth", "passwordless", "developer-tools", "saas"], status_url: "https://status.magic.link/api/v2/status.json", page_url: "https://status.magic.link", type: "statuspage" },
    { id: "frontegg", name: "Frontegg", tags: ["auth", "user-management", "developer-tools", "saas"], status_url: "https://status.frontegg.com/api/v2/status.json", page_url: "https://status.frontegg.com", type: "statuspage" },
    { id: "apideck", name: "Apideck", tags: ["api", "integration", "developer-tools", "saas"], status_url: "https://status.apideck.com/api/v2/status.json", page_url: "https://status.apideck.com", type: "statuspage" },
    { id: "attio", name: "Attio", tags: ["crm", "sales", "saas", "productivity"], status_url: "https://status.attio.com/api/v2/status.json", page_url: "https://status.attio.com", type: "statuspage" },
    { id: "lusha", name: "Lusha", tags: ["sales-intelligence", "prospecting", "saas", "data"], status_url: "https://status.lusha.com/api/v2/status.json", page_url: "https://status.lusha.com", type: "statuspage" },
    { id: "kustomer", name: "Kustomer", tags: ["customer-support", "crm", "saas", "helpdesk"], status_url: "https://status.kustomer.com/api/v2/status.json", page_url: "https://status.kustomer.com", type: "statuspage" },
    { id: "crisp", name: "Crisp", tags: ["live-chat", "customer-support", "saas", "messaging"], status_url: "https://crisp.statuspage.io/api/v2/status.json", page_url: "https://crisp.statuspage.io", type: "statuspage" },
    { id: "livechat", name: "LiveChat", tags: ["live-chat", "customer-support", "saas", "messaging"], status_url: "https://status.livechatinc.com/api/v2/status.json", page_url: "https://status.livechatinc.com", type: "statuspage" },
    { id: "tidio", name: "Tidio", tags: ["live-chat", "chatbot", "saas", "customer-support"], status_url: "https://status.tidio.com/api/v2/status.json", page_url: "https://status.tidio.com", type: "statuspage" },
    { id: "descript", name: "Descript", tags: ["video", "audio", "editing", "saas"], status_url: "https://status.descript.com/api/v2/status.json", page_url: "https://status.descript.com", type: "statuspage" },
    { id: "frame_io", name: "Frame.io", tags: ["video", "review", "collaboration", "saas"], status_url: "https://status.frame.io/api/v2/status.json", page_url: "https://status.frame.io", type: "statuspage" },
    { id: "sproutsocial", name: "Sprout Social", tags: ["social-media", "analytics", "saas", "marketing"], status_url: "https://status.sproutsocial.com/api/v2/status.json", page_url: "https://status.sproutsocial.com", type: "statuspage" },
    { id: "buffer", name: "Buffer", tags: ["social-media", "scheduling", "saas", "marketing"], status_url: "https://status.buffer.com/api/v2/status.json", page_url: "https://status.buffer.com", type: "statuspage" },
    { id: "hootsuite", name: "Hootsuite", tags: ["social-media", "scheduling", "saas", "marketing"], status_url: "https://status.hootsuite.com/api/v2/status.json", page_url: "https://status.hootsuite.com", type: "statuspage" },
    { id: "later", name: "Later", tags: ["social-media", "scheduling", "saas", "marketing"], status_url: "https://status.later.com/api/v2/status.json", page_url: "https://status.later.com", type: "statuspage" },
    { id: "agorapulse", name: "Agorapulse", tags: ["social-media", "scheduling", "saas", "marketing"], status_url: "https://status.agorapulse.com/api/v2/status.json", page_url: "https://status.agorapulse.com", type: "statuspage" },
    { id: "chatwoot", name: "Chatwoot", tags: ["live-chat", "customer-support", "open-source", "saas"], status_url: "https://chatwoot.statuspage.io/api/v2/status.json", page_url: "https://chatwoot.statuspage.io", type: "statuspage" },
    { id: "databox", name: "Databox", tags: ["analytics", "bi", "dashboards", "saas"], status_url: "https://status.databox.com/api/v2/status.json", page_url: "https://status.databox.com", type: "statuspage" },
    { id: "geckoboard", name: "Geckoboard", tags: ["analytics", "bi", "dashboards", "saas"], status_url: "https://status.geckoboard.com/api/v2/status.json", page_url: "https://status.geckoboard.com", type: "statuspage" },
    { id: "stability_ai", name: "Stability AI", tags: ["ai", "image-generation", "ml", "api"], status_url: "https://status.stability.ai/api/v2/status.json", page_url: "https://status.stability.ai", type: "statuspage" },
    { id: "character_ai", name: "Character.AI", tags: ["ai", "chatbot", "llm", "saas"], status_url: "https://status.character.ai/api/v2/status.json", page_url: "https://status.character.ai", type: "statuspage" },
    { id: "signnow", name: "SignNow", tags: ["e-signature", "documents", "saas", "legal"], status_url: "https://status.signnow.com/api/v2/status.json", page_url: "https://status.signnow.com", type: "statuspage" },
    { id: "survicate", name: "Survicate", tags: ["surveys", "feedback", "saas", "analytics"], status_url: "https://status.survicate.com/api/v2/status.json", page_url: "https://status.survicate.com", type: "statuspage" },
    { id: "tray", name: "Tray.io", tags: ["integration", "automation", "ipaas", "saas"], status_url: "https://status.tray.io/api/v2/status.json", page_url: "https://status.tray.io", type: "statuspage" },
    { id: "workato", name: "Workato", tags: ["integration", "automation", "ipaas", "saas"], status_url: "https://status.workato.com/api/v2/status.json", page_url: "https://status.workato.com", type: "statuspage" },
    { id: "boomi", name: "Boomi", tags: ["integration", "ipaas", "automation", "saas"], status_url: "https://status.boomi.com/api/v2/status.json", page_url: "https://status.boomi.com", type: "statuspage" },
    { id: "filestack", name: "Filestack", tags: ["file-upload", "storage", "developer-tools", "saas"], status_url: "https://status.filestack.com/api/v2/status.json", page_url: "https://status.filestack.com", type: "statuspage" },
    { id: "uploadcare", name: "Uploadcare", tags: ["file-upload", "storage", "developer-tools", "saas"], status_url: "https://status.uploadcare.com/api/v2/status.json", page_url: "https://status.uploadcare.com", type: "statuspage" },
    { id: "betteruptime", name: "Better Uptime", tags: ["monitoring", "uptime", "alerting", "saas"], status_url: "https://betteruptime.statuspage.io/api/v2/status.json", page_url: "https://betteruptime.statuspage.io", type: "statuspage" },
    { id: "freshbooks", name: "FreshBooks", tags: ["accounting", "invoicing", "saas", "finance"], status_url: "https://status.freshbooks.com/api/v2/status.json", page_url: "https://status.freshbooks.com", type: "statuspage" },
    { id: "mapbox", name: "Mapbox", tags: ["maps", "location", "developer-tools", "saas"], status_url: "https://status.mapbox.com/api/v2/status.json", page_url: "https://status.mapbox.com", type: "statuspage" },
    { id: "greenhouse", name: "Greenhouse", tags: ["recruiting", "hr", "ats", "saas"], status_url: "https://status.greenhouse.io/api/v2/status.json", page_url: "https://status.greenhouse.io", type: "statuspage" },
    { id: "lever", name: "Lever", tags: ["recruiting", "hr", "ats", "saas"], status_url: "https://status.lever.co/api/v2/status.json", page_url: "https://status.lever.co", type: "statuspage" },
    { id: "gainsight", name: "Gainsight", tags: ["customer-success", "crm", "saas", "analytics"], status_url: "https://status.gainsight.com/api/v2/status.json", page_url: "https://status.gainsight.com", type: "statuspage" },
    { id: "vitally", name: "Vitally", tags: ["customer-success", "crm", "saas", "analytics"], status_url: "https://vitally.statuspage.io/api/v2/status.json", page_url: "https://vitally.statuspage.io", type: "statuspage" },
    { id: "phrase", name: "Phrase", tags: ["translation", "localization", "saas", "developer-tools"], status_url: "https://status.phrase.com/api/v2/status.json", page_url: "https://status.phrase.com", type: "statuspage" },
    { id: "clio", name: "Clio", tags: ["legal", "law-firm", "saas", "productivity"], status_url: "https://status.clio.com/api/v2/status.json", page_url: "https://status.clio.com", type: "statuspage" },
    { id: "ashby", name: "Ashby", tags: ["recruiting", "hr", "ats", "saas"], status_url: "https://status.ashbyhq.com/api/v2/status.json", page_url: "https://status.ashbyhq.com", type: "statuspage" },
    { id: "yotpo", name: "Yotpo", tags: ["ecommerce", "reviews", "marketing", "saas"], status_url: "https://status.yotpo.com/api/v2/status.json", page_url: "https://status.yotpo.com", type: "statuspage" },
    { id: "dyte", name: "Dyte", tags: ["video", "webrtc", "realtime", "developer-tools"], status_url: "https://dyte.statuspage.io/api/v2/status.json", page_url: "https://dyte.statuspage.io", type: "statuspage" },
    { id: "quickbooks", name: "QuickBooks", tags: ["accounting", "finance", "saas", "smb"], status_url: "https://status.quickbooks.intuit.com/api/v2/status.json", page_url: "https://status.quickbooks.intuit.com", type: "statuspage" },
    { id: "wave", name: "Wave", tags: ["accounting", "finance", "saas", "smb"], status_url: "https://status.wave.com/api/v2/status.json", page_url: "https://status.wave.com", type: "statuspage" },
    { id: "toggl", name: "Toggl", tags: ["time-tracking", "productivity", "saas", "freelancer"], status_url: "https://status.toggl.com/api/v2/status.json", page_url: "https://status.toggl.com", type: "statuspage" },
    { id: "harvest", name: "Harvest", tags: ["time-tracking", "invoicing", "saas", "freelancer"], status_url: "https://harvest.statuspage.io/api/v2/status.json", page_url: "https://harvest.statuspage.io", type: "statuspage" },
    { id: "mattermost", name: "Mattermost", tags: ["messaging", "collaboration", "developer-tools", "open-source"], status_url: "https://status.mattermost.com/api/v2/status.json", page_url: "https://status.mattermost.com", type: "statuspage" },
    { id: "element", name: "Element", tags: ["messaging", "collaboration", "open-source", "matrix"], status_url: "https://status.element.io/api/v2/status.json", page_url: "https://status.element.io", type: "statuspage" },
    { id: "front", name: "Front", tags: ["email", "customer-support", "inbox", "saas"], status_url: "https://front.statuspage.io/api/v2/status.json", page_url: "https://front.statuspage.io", type: "statuspage" },
    { id: "justworks", name: "Justworks", tags: ["hr", "payroll", "benefits", "saas"], status_url: "https://status.justworks.com/api/v2/status.json", page_url: "https://status.justworks.com", type: "statuspage" },
    { id: "navan", name: "Navan", tags: ["travel", "expense", "finance", "saas"], status_url: "https://status.navan.com/api/v2/status.json", page_url: "https://status.navan.com", type: "statuspage" },
    { id: "sap", name: "SAP", tags: ["erp", "enterprise", "finance", "saas"], status_url: "https://sap.statuspage.io/api/v2/status.json", page_url: "https://sap.statuspage.io", type: "statuspage" },
    { id: "together", name: "Together AI", tags: ["ai", "llm", "inference", "developer-tools"], status_url: "https://together.statuspage.io/api/v2/status.json", page_url: "https://together.statuspage.io", type: "statuspage" },
    { id: "ai21", name: "AI21 Labs", tags: ["ai", "llm", "nlp", "developer-tools"], status_url: "https://status.ai21.com/api/v2/status.json", page_url: "https://status.ai21.com", type: "statuspage" },
    { id: "streamyard", name: "StreamYard", tags: ["streaming", "video", "live", "broadcast"], status_url: "https://status.streamyard.com/api/v2/status.json", page_url: "https://status.streamyard.com", type: "statuspage" },
    { id: "riverside", name: "Riverside.fm", tags: ["podcast", "recording", "video", "audio"], status_url: "https://status.riverside.fm/api/v2/status.json", page_url: "https://status.riverside.fm", type: "statuspage" },
    { id: "simplecast", name: "Simplecast", tags: ["podcast", "hosting", "audio", "publishing"], status_url: "https://status.simplecast.com/api/v2/status.json", page_url: "https://status.simplecast.com", type: "statuspage" },
    { id: "substack", name: "Substack", tags: ["newsletter", "publishing", "email", "creators"], status_url: "https://substack.statuspage.io/api/v2/status.json", page_url: "https://substack.statuspage.io", type: "statuspage" },
    { id: "constantcontact", name: "Constant Contact", tags: ["email", "marketing", "automation", "smb"], status_url: "https://status.constantcontact.com/api/v2/status.json", page_url: "https://status.constantcontact.com", type: "statuspage" },
    { id: "stonly", name: "Stonly", tags: ["documentation", "knowledge-base", "customer-support", "saas"], status_url: "https://status.stonly.com/api/v2/status.json", page_url: "https://status.stonly.com", type: "statuspage" },
    { id: "gumroad", name: "Gumroad", tags: ["ecommerce", "digital-products", "creators", "payments"], status_url: "https://status.gumroad.com/api/v2/status.json", page_url: "https://status.gumroad.com", type: "statuspage" },
    { id: "whop", name: "Whop", tags: ["ecommerce", "digital-products", "communities", "saas"], status_url: "https://status.whop.com/api/v2/status.json", page_url: "https://status.whop.com", type: "statuspage" },
    { id: "1password", name: "1Password", tags: ["security", "password-manager", "saas", "enterprise"], status_url: "https://status.1password.com/api/v2/status.json", page_url: "https://status.1password.com", type: "statuspage" },
    { id: "wiz", name: "Wiz", tags: ["security", "cloud-security", "saas", "enterprise"], status_url: "https://status.wiz.io/api/v2/status.json", page_url: "https://status.wiz.io", type: "statuspage" },
    { id: "buildkite", name: "Buildkite", tags: ["ci-cd", "developer-tools", "automation", "saas"], status_url: "https://buildkite.statuspage.io/api/v2/status.json", page_url: "https://buildkite.statuspage.io", type: "statuspage" },
    { id: "travisci", name: "Travis CI", tags: ["ci-cd", "developer-tools", "automation", "open-source"], status_url: "https://www.traviscistatus.com/api/v2/status.json", page_url: "https://www.traviscistatus.com", type: "statuspage" },
    { id: "semaphoreci", name: "Semaphore CI", tags: ["ci-cd", "developer-tools", "automation", "saas"], status_url: "https://status.semaphoreci.com/api/v2/status.json", page_url: "https://status.semaphoreci.com", type: "statuspage" },
    { id: "contentstack", name: "Contentstack", tags: ["cms", "headless-cms", "content", "enterprise"], status_url: "https://status.contentstack.com/api/v2/status.json", page_url: "https://status.contentstack.com", type: "statuspage" },
    { id: "kontent", name: "Kontent.ai", tags: ["cms", "headless-cms", "content", "saas"], status_url: "https://status.kontent.ai/api/v2/status.json", page_url: "https://status.kontent.ai", type: "statuspage" },
    { id: "sage", name: "Sage", tags: ["accounting", "erp", "finance", "smb"], status_url: "https://status.sage.com/api/v2/status.json", page_url: "https://status.sage.com", type: "statuspage" },
    { id: "netsuite", name: "NetSuite", tags: ["erp", "accounting", "finance", "enterprise"], status_url: "https://status.netsuite.com/api/v2/status.json", page_url: "https://status.netsuite.com", type: "statuspage" },
    { id: "grafana", name: "Grafana Cloud", tags: ["monitoring", "observability", "metrics", "developer-tools"], status_url: "https://status.grafana.com/api/v2/status.json", page_url: "https://status.grafana.com", type: "statuspage" },
    { id: "pulumi", name: "Pulumi", tags: ["iac", "infrastructure", "developer-tools", "cloud"], status_url: "https://status.pulumi.com/api/v2/status.json", page_url: "https://status.pulumi.com", type: "statuspage" },
    { id: "spacelift", name: "Spacelift", tags: ["iac", "infrastructure", "ci-cd", "saas"], status_url: "https://spacelift.statuspage.io/api/v2/status.json", page_url: "https://spacelift.statuspage.io", type: "statuspage" },
    { id: "agilitycms", name: "Agility CMS", tags: ["cms", "headless-cms", "content", "saas"], status_url: "https://status.agilitycms.com/api/v2/status.json", page_url: "https://status.agilitycms.com", type: "statuspage" },
    { id: "payload", name: "Payload CMS", tags: ["cms", "headless-cms", "content", "developer-tools"], status_url: "https://payload.statuspage.io/api/v2/status.json", page_url: "https://payload.statuspage.io", type: "statuspage" },
    { id: "namely", name: "Namely", tags: ["hr", "payroll", "benefits", "saas"], status_url: "https://status.namely.com/api/v2/status.json", page_url: "https://status.namely.com", type: "statuspage" },
    { id: "codefresh", name: "Codefresh", tags: ["ci-cd", "gitops", "kubernetes", "developer-tools"], status_url: "https://status.codefresh.io/api/v2/status.json", page_url: "https://status.codefresh.io", type: "statuspage" },
    { id: "mongodb", name: "MongoDB Atlas", tags: ["database", "nosql", "cloud", "developer-tools"], status_url: "https://status.mongodb.com/api/v2/status.json", page_url: "https://status.mongodb.com", type: "statuspage" },
    { id: "fauna", name: "Fauna", tags: ["database", "serverless", "developer-tools", "cloud"], status_url: "https://fauna.statuspage.io/api/v2/status.json", page_url: "https://fauna.statuspage.io", type: "statuspage" },
    { id: "tigris", name: "Tigris Data", tags: ["database", "object-storage", "developer-tools", "cloud"], status_url: "https://status.tigrisdata.com/api/v2/status.json", page_url: "https://status.tigrisdata.com", type: "statuspage" },
    { id: "100ms", name: "100ms", tags: ["video", "webrtc", "realtime", "developer-tools"], status_url: "https://status.100ms.live/api/v2/status.json", page_url: "https://status.100ms.live", type: "statuspage" },
    { id: "keeper", name: "Keeper", tags: ["security", "password-manager", "enterprise", "saas"], status_url: "https://keeper.statuspage.io/api/v2/status.json", page_url: "https://keeper.statuspage.io", type: "statuspage" },
    { id: "lambdalabs", name: "Lambda Labs", tags: ["ai", "gpu", "cloud", "developer-tools"], status_url: "https://status.lambdalabs.com/api/v2/status.json", page_url: "https://status.lambdalabs.com", type: "statuspage" },
    { id: "directus", name: "Directus", tags: ["cms", "headless-cms", "open-source", "developer-tools"], status_url: "https://directus.statuspage.io/api/v2/status.json", page_url: "https://directus.statuspage.io", type: "statuspage" },
    { id: "hasura", name: "Hasura", tags: ["graphql", "database", "api", "developer-tools"], status_url: "https://hasura.statuspage.io/api/v2/status.json", page_url: "https://hasura.statuspage.io", type: "statuspage" },
    { id: "paperspace", name: "Paperspace", tags: ["gpu", "cloud", "ai", "developer-tools"], status_url: "https://status.paperspace.com/api/v2/status.json", page_url: "https://status.paperspace.com", type: "statuspage" },
    { id: "sentinelone", name: "SentinelOne", tags: ["security", "endpoint", "cybersecurity", "saas"], status_url: "https://status.sentinelone.com/api/v2/status.json", page_url: "https://status.sentinelone.com", type: "statuspage" },
    { id: "payoneer", name: "Payoneer", tags: ["payments", "fintech", "banking", "saas"], status_url: "https://status.payoneer.com/api/v2/status.json", page_url: "https://status.payoneer.com", type: "statuspage" },
    { id: "yodlee", name: "Yodlee", tags: ["fintech", "banking", "financial-data", "api"], status_url: "https://yodlee.statuspage.io/api/v2/status.json", page_url: "https://yodlee.statuspage.io", type: "statuspage" },
    { id: "coralogix", name: "Coralogix", tags: ["observability", "logging", "monitoring", "developer-tools"], status_url: "https://status.coralogix.com/api/v2/status.json", page_url: "https://status.coralogix.com", type: "statuspage" },
    { id: "netdata", name: "Netdata", tags: ["monitoring", "observability", "metrics", "developer-tools"], status_url: "https://netdata.statuspage.io/api/v2/status.json", page_url: "https://netdata.statuspage.io", type: "statuspage" },
    { id: "statuscake", name: "StatusCake", tags: ["monitoring", "uptime", "developer-tools", "saas"], status_url: "https://status.statuscake.com/api/v2/status.json", page_url: "https://status.statuscake.com", type: "statuspage" },
    { id: "opsgenie", name: "Opsgenie", tags: ["incident-management", "alerting", "monitoring", "devops"], status_url: "https://status.opsgenie.com/api/v2/status.json", page_url: "https://status.opsgenie.com", type: "statuspage" },
    { id: "victorops", name: "VictorOps", tags: ["incident-management", "alerting", "devops", "saas"], status_url: "https://status.victorops.com/api/v2/status.json", page_url: "https://status.victorops.com", type: "statuspage" },
    { id: "rechargepayments", name: "Recharge Payments", tags: ["payments", "subscriptions", "ecommerce", "saas"], status_url: "https://status.rechargepayments.com/api/v2/status.json", page_url: "https://status.rechargepayments.com", type: "statuspage" },
    { id: "airbrake", name: "Airbrake", tags: ["error-tracking", "monitoring", "developer-tools", "saas"], status_url: "https://airbrake.statuspage.io/api/v2/status.json", page_url: "https://airbrake.statuspage.io", type: "statuspage" },
    { id: "sinch", name: "Sinch", tags: ["sms", "communications", "api", "cpaas"], status_url: "https://status.sinch.com/api/v2/status.json", page_url: "https://status.sinch.com", type: "statuspage" },
    { id: "imply", name: "Imply", tags: ["analytics", "data", "developer-tools", "database"], status_url: "https://imply.statuspage.io/api/v2/status.json", page_url: "https://imply.statuspage.io", type: "statuspage" },
    { id: "ecwid", name: "Ecwid", tags: ["ecommerce", "saas", "payments", "website"], status_url: "https://status.ecwid.com/api/v2/status.json", page_url: "https://status.ecwid.com", type: "statuspage" },
    { id: "infobip", name: "Infobip", tags: ["sms", "communications", "api", "cpaas"], status_url: "https://status.infobip.com/api/v2/status.json", page_url: "https://status.infobip.com", type: "statuspage" },
    { id: "attentive", name: "Attentive", tags: ["sms", "marketing", "ecommerce", "saas"], status_url: "https://attentive.statuspage.io/api/v2/status.json", page_url: "https://attentive.statuspage.io", type: "statuspage" },
    { id: "postscript", name: "Postscript", tags: ["sms", "marketing", "ecommerce", "shopify"], status_url: "https://postscript.statuspage.io/api/v2/status.json", page_url: "https://postscript.statuspage.io", type: "statuspage" },
    { id: "okendo", name: "Okendo", tags: ["reviews", "ecommerce", "saas", "shopify"], status_url: "https://okendo.statuspage.io/api/v2/status.json", page_url: "https://okendo.statuspage.io", type: "statuspage" },
    { id: "stamped", name: "Stamped", tags: ["reviews", "loyalty", "ecommerce", "saas"], status_url: "https://stamped.statuspage.io/api/v2/status.json", page_url: "https://stamped.statuspage.io", type: "statuspage" },
    { id: "chameleon", name: "Chameleon", tags: ["onboarding", "product", "saas", "developer-tools"], status_url: "https://chameleon.statuspage.io/api/v2/status.json", page_url: "https://chameleon.statuspage.io", type: "statuspage" },
    { id: "sprig", name: "Sprig", tags: ["research", "surveys", "product", "saas"], status_url: "https://status.sprig.com/api/v2/status.json", page_url: "https://status.sprig.com", type: "statuspage" },
    { id: "maze", name: "Maze", tags: ["testing", "research", "product", "saas"], status_url: "https://maze.statuspage.io/api/v2/status.json", page_url: "https://maze.statuspage.io", type: "statuspage" },
    { id: "partnerstack", name: "PartnerStack", tags: ["partnerships", "affiliates", "saas", "growth"], status_url: "https://status.partnerstack.com/api/v2/status.json", page_url: "https://status.partnerstack.com", type: "statuspage" },
    { id: "impact", name: "Impact", tags: ["affiliates", "partnerships", "marketing", "saas"], status_url: "https://status.impact.com/api/v2/status.json", page_url: "https://status.impact.com", type: "statuspage" },
    { id: "leaddyno", name: "LeadDyno", tags: ["affiliates", "referrals", "marketing", "saas"], status_url: "https://status.leaddyno.com/api/v2/status.json", page_url: "https://status.leaddyno.com", type: "statuspage" },
    { id: "friendbuy", name: "Friendbuy", tags: ["referrals", "loyalty", "marketing", "ecommerce"], status_url: "https://friendbuy.statuspage.io/api/v2/status.json", page_url: "https://friendbuy.statuspage.io", type: "statuspage" },
    { id: "sprinto", name: "Sprinto", tags: ["compliance", "security", "saas", "soc2"], status_url: "https://status.sprinto.com/api/v2/status.json", page_url: "https://status.sprinto.com", type: "statuspage" },
    { id: "sigma", name: "Sigma Computing", tags: ["analytics", "bi", "data", "saas"], status_url: "https://status.sigmacomputing.com/api/v2/status.json", page_url: "https://status.sigmacomputing.com", type: "statuspage" },
    { id: "preset", name: "Preset", tags: ["analytics", "bi", "data", "open-source"], status_url: "https://status.preset.io/api/v2/status.json", page_url: "https://status.preset.io", type: "statuspage" },
    { id: "alchemy", name: "Alchemy", tags: ["web3", "blockchain", "api", "developer-tools"], status_url: "https://status.alchemy.com/api/v2/status.json", page_url: "https://status.alchemy.com", type: "statuspage" },
    { id: "infura", name: "Infura", tags: ["web3", "blockchain", "api", "developer-tools"], status_url: "https://infura.statuspage.io/api/v2/status.json", page_url: "https://infura.statuspage.io", type: "statuspage" },
    { id: "quicknode", name: "QuickNode", tags: ["web3", "blockchain", "api", "developer-tools"], status_url: "https://status.quicknode.com/api/v2/status.json", page_url: "https://status.quicknode.com", type: "statuspage" },
    { id: "hibob", name: "HiBob", tags: ["hr", "people", "saas", "payroll"], status_url: "https://hibob.statuspage.io/api/v2/status.json", page_url: "https://hibob.statuspage.io", type: "statuspage" },
    { id: "personio", name: "Personio", tags: ["hr", "people", "saas", "europe"], status_url: "https://personio.statuspage.io/api/v2/status.json", page_url: "https://personio.statuspage.io", type: "statuspage" },
    { id: "octopus", name: "Octopus Deploy", tags: ["deployment", "devops", "ci-cd", "developer-tools"], status_url: "https://status.octopus.com/api/v2/status.json", page_url: "https://status.octopus.com", type: "statuspage" },
    { id: "matillion", name: "Matillion", tags: ["data", "etl", "integration", "cloud"], status_url: "https://status.matillion.com/api/v2/status.json", page_url: "https://status.matillion.com", type: "statuspage" },
    { id: "talend", name: "Talend", tags: ["data", "etl", "integration", "cloud"], status_url: "https://talend.statuspage.io/api/v2/status.json", page_url: "https://talend.statuspage.io", type: "statuspage" },
    { id: "informatica", name: "Informatica", tags: ["data", "etl", "integration", "enterprise"], status_url: "https://informatica.statuspage.io/api/v2/status.json", page_url: "https://informatica.statuspage.io", type: "statuspage" },
    { id: "polytomic", name: "Polytomic", tags: ["data", "sync", "integration", "developer-tools"], status_url: "https://status.polytomic.com/api/v2/status.json", page_url: "https://status.polytomic.com", type: "statuspage" },
    { id: "everflow", name: "Everflow", tags: ["affiliates", "tracking", "marketing", "saas"], status_url: "https://everflow.statuspage.io/api/v2/status.json", page_url: "https://everflow.statuspage.io", type: "statuspage" },
    { id: "trello", name: "Trello", tags: ["project-management", "productivity", "collaboration", "saas"], status_url: "https://status.trello.com/api/v2/status.json", page_url: "https://status.trello.com", type: "statuspage" },
    { id: "kayako", name: "Kayako", tags: ["customer-support", "helpdesk", "saas", "messaging"], status_url: "https://status.kayako.com/api/v2/status.json", page_url: "https://status.kayako.com", type: "statuspage" },
    { id: "dixa", name: "Dixa", tags: ["customer-support", "helpdesk", "saas", "omnichannel"], status_url: "https://dixa.statuspage.io/api/v2/status.json", page_url: "https://dixa.statuspage.io", type: "statuspage" },
    { id: "gladly", name: "Gladly", tags: ["customer-support", "helpdesk", "saas", "enterprise"], status_url: "https://gladly.statuspage.io/api/v2/status.json", page_url: "https://gladly.statuspage.io", type: "statuspage" },
    { id: "hiver", name: "Hiver", tags: ["customer-support", "email", "gmail", "saas"], status_url: "https://hiver.statuspage.io/api/v2/status.json", page_url: "https://hiver.statuspage.io", type: "statuspage" },
    { id: "groove", name: "Groove", tags: ["customer-support", "helpdesk", "saas", "email"], status_url: "https://groove.statuspage.io/api/v2/status.json", page_url: "https://groove.statuspage.io", type: "statuspage" },
    { id: "taskade", name: "Taskade", tags: ["productivity", "collaboration", "ai", "project-management"], status_url: "https://taskade.statuspage.io/api/v2/status.json", page_url: "https://taskade.statuspage.io", type: "statuspage" },
    { id: "plane", name: "Plane", tags: ["project-management", "productivity", "open-source", "developer-tools"], status_url: "https://status.plane.com/api/v2/status.json", page_url: "https://status.plane.com", type: "statuspage" },
    { id: "taskworld", name: "Taskworld", tags: ["project-management", "productivity", "collaboration", "saas"], status_url: "https://taskworld.statuspage.io/api/v2/status.json", page_url: "https://taskworld.statuspage.io", type: "statuspage" },
    { id: "nifty", name: "Nifty", tags: ["project-management", "productivity", "collaboration", "saas"], status_url: "https://nifty.statuspage.io/api/v2/status.json", page_url: "https://nifty.statuspage.io", type: "statuspage" },
    { id: "horizons", name: "Horizons", tags: ["hr", "payroll", "global-employment", "eor"], status_url: "https://horizons.statuspage.io/api/v2/status.json", page_url: "https://horizons.statuspage.io", type: "statuspage" },
    { id: "multiplier", name: "Multiplier", tags: ["hr", "payroll", "global-employment", "eor"], status_url: "https://multiplier.statuspage.io/api/v2/status.json", page_url: "https://multiplier.statuspage.io", type: "statuspage" },
    { id: "akamai", name: "Akamai", tags: ["cdn", "security", "networking", "enterprise"], status_url: "https://status.akamai.com/api/v2/status.json", page_url: "https://status.akamai.com", type: "statuspage" },
    { id: "imperva", name: "Imperva", tags: ["security", "cdn", "waf", "ddos-protection"], status_url: "https://status.imperva.com/api/v2/status.json", page_url: "https://status.imperva.com", type: "statuspage" },
    { id: "pingidentity", name: "Ping Identity", tags: ["identity", "sso", "security", "enterprise"], status_url: "https://status.pingidentity.com/api/v2/status.json", page_url: "https://status.pingidentity.com", type: "statuspage" },
    { id: "sailpoint", name: "SailPoint", tags: ["identity", "iam", "security", "enterprise"], status_url: "https://status.sailpoint.com/api/v2/status.json", page_url: "https://status.sailpoint.com", type: "statuspage" },
    { id: "tenable", name: "Tenable", tags: ["security", "vulnerability-management", "enterprise"], status_url: "https://status.tenable.com/api/v2/status.json", page_url: "https://status.tenable.com", type: "statuspage" },
    { id: "qualys", name: "Qualys", tags: ["security", "vulnerability-management", "compliance", "enterprise"], status_url: "https://status.qualys.com/api/v2/status.json", page_url: "https://status.qualys.com", type: "statuspage" },
    { id: "sonarcloud", name: "SonarCloud", tags: ["code-quality", "sast", "developer-tools", "ci-cd"], status_url: "https://sonarcloud.statuspage.io/api/v2/status.json", page_url: "https://sonarcloud.statuspage.io", type: "statuspage" },
    { id: "veracode", name: "Veracode", tags: ["security", "sast", "appsec", "enterprise"], status_url: "https://status.veracode.com/api/v2/status.json", page_url: "https://status.veracode.com", type: "statuspage" },
    { id: "bugcrowd", name: "Bugcrowd", tags: ["security", "bug-bounty", "penetration-testing", "crowdsourced"], status_url: "https://bugcrowd.statuspage.io/api/v2/status.json", page_url: "https://bugcrowd.statuspage.io", type: "statuspage" },
    { id: "sonatype", name: "Sonatype", tags: ["security", "sca", "open-source", "appsec"], status_url: "https://status.sonatype.com/api/v2/status.json", page_url: "https://status.sonatype.com", type: "statuspage" },
    { id: "mend", name: "Mend", tags: ["security", "sca", "open-source", "appsec"], status_url: "https://status.mend.io/api/v2/status.json", page_url: "https://status.mend.io", type: "statuspage" },
    { id: "stackhawk", name: "StackHawk", tags: ["security", "dast", "api-testing", "appsec"], status_url: "https://status.stackhawk.com/api/v2/status.json", page_url: "https://status.stackhawk.com", type: "statuspage" },
    { id: "copper", name: "Copper", tags: ["crm", "sales", "google-workspace", "saas"], status_url: "https://status.copper.com/api/v2/status.json", page_url: "https://status.copper.com", type: "statuspage" },
    { id: "streak", name: "Streak", tags: ["crm", "sales", "gmail", "saas"], status_url: "https://status.streak.com/api/v2/status.json", page_url: "https://status.streak.com", type: "statuspage" },
    { id: "apollo", name: "Apollo", tags: ["sales", "crm", "sales-intelligence", "prospecting"], status_url: "https://apollo.statuspage.io/api/v2/status.json", page_url: "https://apollo.statuspage.io", type: "statuspage" },
    { id: "runway", name: "Runway", tags: ["finance", "financial-planning", "startups", "saas"], status_url: "https://runway.statuspage.io/api/v2/status.json", page_url: "https://runway.statuspage.io", type: "statuspage" },
    { id: "airbase", name: "Airbase", tags: ["finance", "spend-management", "procurement", "saas"], status_url: "https://status.airbase.com/api/v2/status.json", page_url: "https://status.airbase.com", type: "statuspage" },
    { id: "uservoice", name: "UserVoice", tags: ["product", "feedback", "roadmap", "saas"], status_url: "https://status.uservoice.com/api/v2/status.json", page_url: "https://status.uservoice.com", type: "statuspage" },
    { id: "aha", name: "Aha!", tags: ["product", "roadmap", "strategy", "saas"], status_url: "https://aha.statuspage.io/api/v2/status.json", page_url: "https://aha.statuspage.io", type: "statuspage" },
    { id: "roadmunk", name: "Roadmunk", tags: ["product", "roadmap", "planning", "saas"], status_url: "https://status.roadmunk.com/api/v2/status.json", page_url: "https://status.roadmunk.com", type: "statuspage" },
    { id: "papertrail", name: "Papertrail", tags: ["logging", "observability", "devops", "saas"], status_url: "https://papertrail.statuspage.io/api/v2/status.json", page_url: "https://papertrail.statuspage.io", type: "statuspage" },
    { id: "scalyr", name: "Scalyr", tags: ["logging", "observability", "devops", "saas"], status_url: "https://status.scalyr.com/api/v2/status.json", page_url: "https://status.scalyr.com", type: "statuspage" },
    { id: "logzio", name: "Logz.io", tags: ["logging", "observability", "elk", "devops"], status_url: "https://status.logz.io/api/v2/status.json", page_url: "https://status.logz.io", type: "statuspage" },
    { id: "victoriametrics", name: "VictoriaMetrics", tags: ["monitoring", "metrics", "observability", "open-source"], status_url: "https://status.victoriametrics.com/api/v2/status.json", page_url: "https://status.victoriametrics.com", type: "statuspage" },
    { id: "observeinc", name: "Observe", tags: ["observability", "monitoring", "logging", "analytics"], status_url: "https://status.observeinc.com/api/v2/status.json", page_url: "https://status.observeinc.com", type: "statuspage" },
    { id: "craft", name: "Craft.io", tags: ["product", "roadmap", "planning", "saas"], status_url: "https://craft.statuspage.io/api/v2/status.json", page_url: "https://craft.statuspage.io", type: "statuspage" },
    { id: "airfocus", name: "Airfocus", tags: ["product", "roadmap", "prioritization", "saas"], status_url: "https://status.airfocus.com/api/v2/status.json", page_url: "https://status.airfocus.com", type: "statuspage" },
    { id: "appsmith", name: "Appsmith", tags: ["internal-tools", "low-code", "open-source", "developer-tools"], status_url: "https://appsmith.statuspage.io/api/v2/status.json", page_url: "https://appsmith.statuspage.io", type: "statuspage" },
    { id: "superblocks", name: "Superblocks", tags: ["internal-tools", "low-code", "developer-tools", "saas"], status_url: "https://superblocks.statuspage.io/api/v2/status.json", page_url: "https://superblocks.statuspage.io", type: "statuspage" },
    { id: "jetadmin", name: "Jet Admin", tags: ["internal-tools", "low-code", "admin-panel", "saas"], status_url: "https://jetadmin.statuspage.io/api/v2/status.json", page_url: "https://jetadmin.statuspage.io", type: "statuspage" },
    { id: "forestadmin", name: "Forest Admin", tags: ["internal-tools", "admin-panel", "low-code", "saas"], status_url: "https://forestadmin.statuspage.io/api/v2/status.json", page_url: "https://forestadmin.statuspage.io", type: "statuspage" },
    { id: "redash", name: "Redash", tags: ["analytics", "bi", "data", "open-source"], status_url: "https://redash.statuspage.io/api/v2/status.json", page_url: "https://redash.statuspage.io", type: "statuspage" },
    { id: "lightdash", name: "Lightdash", tags: ["analytics", "bi", "data", "open-source"], status_url: "https://status.lightdash.com/api/v2/status.json", page_url: "https://status.lightdash.com", type: "statuspage" },
    { id: "dbt", name: "dbt Cloud", tags: ["data", "analytics", "etl", "developer-tools"], status_url: "https://status.getdbt.com/api/v2/status.json", page_url: "https://status.getdbt.com", type: "statuspage" },
    { id: "clickhouse", name: "ClickHouse Cloud", tags: ["database", "analytics", "olap", "developer-tools"], status_url: "https://status.clickhouse.com/api/v2/status.json", page_url: "https://status.clickhouse.com", type: "statuspage" },
    { id: "couchbase", name: "Couchbase", tags: ["database", "nosql", "enterprise", "cloud"], status_url: "https://status.couchbase.com/api/v2/status.json", page_url: "https://status.couchbase.com", type: "statuspage" },
    { id: "qovery", name: "Qovery", tags: ["paas", "devops", "deployment", "developer-tools"], status_url: "https://qovery.statuspage.io/api/v2/status.json", page_url: "https://qovery.statuspage.io", type: "statuspage" },
    { id: "fusionauth", name: "FusionAuth", tags: ["identity", "authentication", "sso", "developer-tools"], status_url: "https://fusionauth.statuspage.io/api/v2/status.json", page_url: "https://fusionauth.statuspage.io", type: "statuspage" },
    { id: "userfront", name: "Userfront", tags: ["identity", "authentication", "sso", "developer-tools"], status_url: "https://userfront.statuspage.io/api/v2/status.json", page_url: "https://userfront.statuspage.io", type: "statuspage" },
    { id: "onesignal", name: "OneSignal", tags: ["notifications", "push", "messaging", "saas"], status_url: "https://status.onesignal.com/api/v2/status.json", page_url: "https://status.onesignal.com", type: "statuspage" },
    { id: "engagespot", name: "Engagespot", tags: ["notifications", "in-app", "messaging", "saas"], status_url: "https://engagespot.statuspage.io/api/v2/status.json", page_url: "https://engagespot.statuspage.io", type: "statuspage" },
    { id: "smartling", name: "Smartling", tags: ["localization", "translation", "i18n", "enterprise"], status_url: "https://status.smartling.com/api/v2/status.json", page_url: "https://status.smartling.com", type: "statuspage" },
    { id: "weglot", name: "Weglot", tags: ["localization", "translation", "website", "saas"], status_url: "https://status.weglot.com/api/v2/status.json", page_url: "https://status.weglot.com", type: "statuspage" },
    { id: "thunkable", name: "Thunkable", tags: ["no-code", "mobile", "app-builder", "saas"], status_url: "https://status.thunkable.com/api/v2/status.json", page_url: "https://status.thunkable.com", type: "statuspage" },
    { id: "draftbit", name: "Draftbit", tags: ["no-code", "mobile", "react-native", "developer-tools"], status_url: "https://status.draftbit.com/api/v2/status.json", page_url: "https://status.draftbit.com", type: "statuspage" },
    { id: "transifex", name: "Transifex", tags: ["localization", "translation", "i18n", "saas"], status_url: "https://status.transifex.com/api/v2/status.json", page_url: "https://status.transifex.com", type: "statuspage" },
    { id: "lingohub", name: "LingoHub", tags: ["localization", "translation", "i18n", "developer-tools"], status_url: "https://lingohub.statuspage.io/api/v2/status.json", page_url: "https://lingohub.statuspage.io", type: "statuspage" },
    { id: "lecto", name: "Lecto", tags: ["translation", "api", "localization", "developer-tools"], status_url: "https://lecto.statuspage.io/api/v2/status.json", page_url: "https://lecto.statuspage.io", type: "statuspage" },
    { id: "fireworks", name: "Fireworks AI", tags: ["ai", "llm", "inference", "developer-tools"], status_url: "https://fireworks.statuspage.io/api/v2/status.json", page_url: "https://fireworks.statuspage.io", type: "statuspage" },
    { id: "hevo", name: "Hevo Data", tags: ["data", "etl", "integration", "pipelines"], status_url: "https://status.hevodata.com/api/v2/status.json", page_url: "https://status.hevodata.com", type: "statuspage" },
    { id: "rivery", name: "Rivery", tags: ["data", "etl", "integration", "cloud"], status_url: "https://status.rivery.io/api/v2/status.json", page_url: "https://status.rivery.io", type: "statuspage" },
    { id: "etleap", name: "Etleap", tags: ["data", "etl", "integration", "cloud"], status_url: "https://status.etleap.com/api/v2/status.json", page_url: "https://status.etleap.com", type: "statuspage" },
    { id: "integrate", name: "Integrate.com", tags: ["data", "integration", "demand-generation", "b2b"], status_url: "https://status.integrate.com/api/v2/status.json", page_url: "https://status.integrate.com", type: "statuspage" },
    { id: "servicenow", name: "ServiceNow", tags: ["itsm", "enterprise", "workflow", "saas"], status_url: "https://servicenow.statuspage.io/api/v2/status.json", page_url: "https://servicenow.statuspage.io", type: "statuspage" },
    { id: "incidentio", name: "incident.io", tags: ["incident-management", "devops", "on-call", "saas"], status_url: "https://status.incident.io/api/v2/status.json", page_url: "https://status.incident.io", type: "statuspage" },
    { id: "alertsite", name: "AlertSite", tags: ["monitoring", "uptime", "performance", "saas"], status_url: "https://status.alertsite.com/api/v2/status.json", page_url: "https://status.alertsite.com", type: "statuspage" },
    { id: "jeli", name: "Jeli", tags: ["incident-analysis", "postmortem", "devops", "saas"], status_url: "https://jeli.statuspage.io/api/v2/status.json", page_url: "https://jeli.statuspage.io", type: "statuspage" },
    { id: "spike", name: "Spike.sh", tags: ["incident-management", "on-call", "alerting", "devops"], status_url: "https://spike.statuspage.io/api/v2/status.json", page_url: "https://spike.statuspage.io", type: "statuspage" },
    { id: "funnel", name: "Funnel", tags: ["marketing", "analytics", "data", "etl"], status_url: "https://funnel.statuspage.io/api/v2/status.json", page_url: "https://funnel.statuspage.io", type: "statuspage" },
    { id: "supermetrics", name: "Supermetrics", tags: ["marketing", "analytics", "reporting", "saas"], status_url: "https://status.supermetrics.com/api/v2/status.json", page_url: "https://status.supermetrics.com", type: "statuspage" },
    { id: "oblivus", name: "Oblivus", tags: ["gpu", "cloud", "compute", "ai"], status_url: "https://status.oblivus.com/api/v2/status.json", page_url: "https://status.oblivus.com", type: "statuspage" },
    { id: "hyperstack", name: "Hyperstack", tags: ["gpu", "cloud", "compute", "ai"], status_url: "https://hyperstack.statuspage.io/api/v2/status.json", page_url: "https://hyperstack.statuspage.io", type: "statuspage" },
    { id: "datacrunch", name: "DataCrunch", tags: ["gpu", "cloud", "compute", "ai"], status_url: "https://datacrunch.statuspage.io/api/v2/status.json", page_url: "https://datacrunch.statuspage.io", type: "statuspage" },
    { id: "document360", name: "Document360", tags: ["documentation", "knowledge-base", "saas", "support"], status_url: "https://document360.statuspage.io/api/v2/status.json", page_url: "https://document360.statuspage.io", type: "statuspage" },
    { id: "slab", name: "Slab", tags: ["knowledge-base", "documentation", "collaboration", "saas"], status_url: "https://slab.statuspage.io/api/v2/status.json", page_url: "https://slab.statuspage.io", type: "statuspage" },
    { id: "tettra", name: "Tettra", tags: ["knowledge-base", "documentation", "slack", "saas"], status_url: "https://tettra.statuspage.io/api/v2/status.json", page_url: "https://tettra.statuspage.io", type: "statuspage" },
    { id: "guru", name: "Guru", tags: ["knowledge-base", "documentation", "enterprise", "saas"], status_url: "https://status.getguru.com/api/v2/status.json", page_url: "https://status.getguru.com", type: "statuspage" },
    { id: "archbee", name: "Archbee", tags: ["documentation", "api-docs", "knowledge-base", "saas"], status_url: "https://status.archbee.com/api/v2/status.json", page_url: "https://status.archbee.com", type: "statuspage" },
    { id: "bump", name: "Bump.sh", tags: ["api-docs", "documentation", "developer-tools", "saas"], status_url: "https://bump.statuspage.io/api/v2/status.json", page_url: "https://bump.statuspage.io", type: "statuspage" },
    { id: "dialpad", name: "Dialpad", tags: ["voip", "communications", "cloud-phone", "saas"], status_url: "https://dialpad.statuspage.io/api/v2/status.json", page_url: "https://dialpad.statuspage.io", type: "statuspage" },
    { id: "fillout", name: "Fillout", tags: ["forms", "surveys", "no-code", "saas"], status_url: "https://fillout.statuspage.io/api/v2/status.json", page_url: "https://fillout.statuspage.io", type: "statuspage" },
    { id: "tally", name: "Tally", tags: ["forms", "surveys", "no-code", "saas"], status_url: "https://tally.statuspage.io/api/v2/status.json", page_url: "https://tally.statuspage.io", type: "statuspage" },
    { id: "paperform", name: "Paperform", tags: ["forms", "surveys", "booking", "saas"], status_url: "https://paperform.statuspage.io/api/v2/status.json", page_url: "https://paperform.statuspage.io", type: "statuspage" },
    { id: "formstack", name: "Formstack", tags: ["forms", "workflows", "automation", "saas"], status_url: "https://formstack.statuspage.io/api/v2/status.json", page_url: "https://formstack.statuspage.io", type: "statuspage" },
    { id: "printful", name: "Printful", tags: ["print-on-demand", "ecommerce", "fulfillment", "saas"], status_url: "https://printful.statuspage.io/api/v2/status.json", page_url: "https://printful.statuspage.io", type: "statuspage" },
    { id: "gelato", name: "Gelato", tags: ["print-on-demand", "ecommerce", "fulfillment", "saas"], status_url: "https://status.gelato.com/api/v2/status.json", page_url: "https://status.gelato.com", type: "statuspage" },
    { id: "linode", name: "Linode (Akamai Cloud)", tags: ["cloud", "infrastructure", "vps", "hosting"], status_url: "https://linode.statuspage.io/api/v2/status.json", page_url: "https://linode.statuspage.io", type: "statuspage" },
    { id: "totango", name: "Totango", tags: ["customer-success", "crm", "saas", "enterprise"], status_url: "https://totango.statuspage.io/api/v2/status.json", page_url: "https://totango.statuspage.io", type: "statuspage" },
    { id: "cortex", name: "Cortex", tags: ["devops", "service-catalog", "developer-experience", "saas"], status_url: "https://cortex.statuspage.io/api/v2/status.json", page_url: "https://cortex.statuspage.io", type: "statuspage" },
    { id: "walkme", name: "WalkMe", tags: ["digital-adoption", "onboarding", "enterprise", "saas"], status_url: "https://status.walkme.com/api/v2/status.json", page_url: "https://status.walkme.com", type: "statuspage" },
    { id: "cronofy", name: "Cronofy", tags: ["scheduling", "calendar-api", "developer-tools", "saas"], status_url: "https://status.cronofy.com/api/v2/status.json", page_url: "https://status.cronofy.com", type: "statuspage" },
    { id: "checkly", name: "Checkly", tags: ["monitoring", "synthetic", "testing", "devops"], status_url: "https://checkly.statuspage.io/api/v2/status.json", page_url: "https://checkly.statuspage.io", type: "statuspage" },
    { id: "catchpoint", name: "Catchpoint", tags: ["monitoring", "network", "observability", "enterprise"], status_url: "https://catchpoint.statuspage.io/api/v2/status.json", page_url: "https://catchpoint.statuspage.io", type: "statuspage" },
    { id: "playht", name: "PlayHT", tags: ["ai", "voice", "text-to-speech", "audio"], status_url: "https://playht.statuspage.io/api/v2/status.json", page_url: "https://playht.statuspage.io", type: "statuspage" },
    { id: "heygen", name: "HeyGen", tags: ["ai", "video", "avatar", "content"], status_url: "https://status.heygen.com/api/v2/status.json", page_url: "https://status.heygen.com", type: "statuspage" },
    { id: "deepl", name: "DeepL", tags: ["translation", "ai", "nlp", "api"], status_url: "https://deepl.statuspage.io/api/v2/status.json", page_url: "https://deepl.statuspage.io", type: "statuspage" },
    { id: "rev", name: "Rev", tags: ["transcription", "captions", "audio", "video"], status_url: "https://rev.statuspage.io/api/v2/status.json", page_url: "https://rev.statuspage.io", type: "statuspage" },
    { id: "lambdatest", name: "LambdaTest", tags: ["testing", "browser", "automation", "devtools"], status_url: "https://lambdatest.statuspage.io/api/v2/status.json", page_url: "https://lambdatest.statuspage.io", type: "statuspage" },
    { id: "easypost", name: "EasyPost", tags: ["shipping", "logistics", "api", "ecommerce"], status_url: "https://easypost.statuspage.io/api/v2/status.json", page_url: "https://easypost.statuspage.io", type: "statuspage" },
    { id: "shippo", name: "Shippo", tags: ["shipping", "logistics", "api", "ecommerce"], status_url: "https://shippo.statuspage.io/api/v2/status.json", page_url: "https://shippo.statuspage.io", type: "statuspage" },
    { id: "zerobounce", name: "ZeroBounce", tags: ["email", "verification", "deliverability", "marketing"], status_url: "https://zerobounce.statuspage.io/api/v2/status.json", page_url: "https://zerobounce.statuspage.io", type: "statuspage" },
    { id: "dnsimple", name: "DNSimple", tags: ["dns", "domains", "infrastructure", "developer-tools"], status_url: "https://dnsimple.statuspage.io/api/v2/status.json", page_url: "https://dnsimple.statuspage.io", type: "statuspage" },
    { id: "bunnycdn", name: "BunnyCDN", tags: ["cdn", "infrastructure", "performance", "storage"], status_url: "https://bunnycdn.statuspage.io/api/v2/status.json", page_url: "https://bunnycdn.statuspage.io", type: "statuspage" },
    { id: "shipstation", name: "ShipStation", tags: ["shipping", "logistics", "ecommerce", "fulfillment"], status_url: "https://shipstation.statuspage.io/api/v2/status.json", page_url: "https://shipstation.statuspage.io", type: "statuspage" },
    { id: "alchemer", name: "Alchemer", tags: ["surveys", "research", "forms", "enterprise"], status_url: "https://alchemer.statuspage.io/api/v2/status.json", page_url: "https://alchemer.statuspage.io", type: "statuspage" },
    { id: "lumos", name: "Lumos", tags: ["access-management", "iga", "identity", "enterprise"], status_url: "https://status.lumos.com/api/v2/status.json", page_url: "https://status.lumos.com", type: "statuspage" },
    { id: "convoy", name: "Convoy", tags: ["webhooks", "events", "developer-tools", "infrastructure"], status_url: "https://convoy.statuspage.io/api/v2/status.json", page_url: "https://convoy.statuspage.io", type: "statuspage" },
    { id: "bento", name: "Bento", tags: ["email", "marketing", "automation", "saas"], status_url: "https://bento.statuspage.io/api/v2/status.json", page_url: "https://bento.statuspage.io", type: "statuspage" },
    { id: "nylas", name: "Nylas", tags: ["email", "calendar", "api", "developer-tools"], status_url: "https://nylas.statuspage.io/api/v2/status.json", page_url: "https://nylas.statuspage.io", type: "statuspage" },
    { id: "openphone", name: "OpenPhone", tags: ["voip", "phone", "sms", "communications"], status_url: "https://status.openphone.com/api/v2/status.json", page_url: "https://status.openphone.com", type: "statuspage" },
    { id: "lemonsqueezy", name: "Lemon Squeezy", tags: ["payments", "billing", "saas", "ecommerce"], status_url: "https://lemon.statuspage.io/api/v2/status.json", page_url: "https://lemon.statuspage.io", type: "statuspage" },
    { id: "lago", name: "Lago", tags: ["billing", "metering", "usage-based", "open-source"], status_url: "https://status.getlago.com/api/v2/status.json", page_url: "https://status.getlago.com", type: "statuspage" },
    { id: "orb", name: "Orb", tags: ["billing", "usage-based", "metering", "saas"], status_url: "https://orb.statuspage.io/api/v2/status.json", page_url: "https://orb.statuspage.io", type: "statuspage" },
    { id: "stigg", name: "Stigg", tags: ["billing", "pricing", "packaging", "saas"], status_url: "https://status.stigg.io/api/v2/status.json", page_url: "https://status.stigg.io", type: "statuspage" },
    { id: "zitadel", name: "ZITADEL", tags: ["authentication", "identity", "open-source", "enterprise"], status_url: "https://status.zitadel.com/api/v2/status.json", page_url: "https://status.zitadel.com", type: "statuspage" },
    { id: "resend", name: "Resend", tags: ["email", "transactional", "api", "developer-tools"], status_url: "https://resend-status.com/api/v2/status.json", page_url: "https://resend-status.com", type: "statuspage" },
    { id: "groq", name: "Groq", tags: ["ai", "llm", "inference", "developer-tools"], status_url: "https://groqstatus.com/api/v2/status.json", page_url: "https://groqstatus.com", type: "statuspage" },
    { id: "clerk", name: "Clerk", tags: ["authentication", "identity", "developer-tools", "saas"], status_url: "https://status.clerk.com/api/v2/status.json", page_url: "https://status.clerk.com", type: "statuspage" },
    { id: "planetscale", name: "PlanetScale", tags: ["database", "mysql", "serverless", "developer-tools"], status_url: "https://planetscale.statuspage.io/api/v2/status.json", page_url: "https://planetscale.statuspage.io", type: "statuspage" },
    { id: "temporal", name: "Temporal", tags: ["workflow", "orchestration", "developer-tools", "cloud"], status_url: "https://temporal.statuspage.io/api/v2/status.json", page_url: "https://temporal.statuspage.io", type: "statuspage" },
    { id: "inngest", name: "Inngest", tags: ["workflows", "background-jobs", "developer-tools", "serverless"], status_url: "https://status.inngest.com/api/v2/status.json", page_url: "https://status.inngest.com", type: "statuspage" },
    { id: "svix", name: "Svix", tags: ["webhooks", "developer-tools", "infrastructure", "api"], status_url: "https://svix.statuspage.io/api/v2/status.json", page_url: "https://svix.statuspage.io", type: "statuspage" },
    { id: "courier", name: "Courier", tags: ["notifications", "messaging", "developer-tools", "saas"], status_url: "https://status.courier.com/api/v2/status.json", page_url: "https://status.courier.com", type: "statuspage" },
    { id: "launchdarkly", name: "LaunchDarkly", tags: ["feature-flags", "feature-management", "developer-tools", "saas"], status_url: "https://launchdarkly.statuspage.io/api/v2/status.json", page_url: "https://launchdarkly.statuspage.io", type: "statuspage" },
    { id: "splitio", name: "Split.io", tags: ["feature-flags", "feature-management", "developer-tools", "saas"], status_url: "https://splitio.statuspage.io/api/v2/status.json", page_url: "https://splitio.statuspage.io", type: "statuspage" },
    { id: "moov", name: "Moov", tags: ["payments", "fintech", "banking", "developer-tools"], status_url: "https://status.moov.io/api/v2/status.json", page_url: "https://status.moov.io", type: "statuspage" },
    { id: "column", name: "Column", tags: ["banking", "fintech", "api", "developer-tools"], status_url: "https://status.column.com/api/v2/status.json", page_url: "https://status.column.com", type: "statuspage" },
    { id: "bland", name: "Bland AI", tags: ["ai", "voice", "phone", "api"], status_url: "https://bland.statuspage.io/api/v2/status.json", page_url: "https://bland.statuspage.io", type: "statuspage" },
    { id: "langsmith", name: "LangSmith", tags: ["ai", "llm", "observability", "developer-tools"], status_url: "https://status.smith.langchain.com/api/v2/status.json", page_url: "https://status.smith.langchain.com", type: "statuspage" },
    { id: "langfuse", name: "Langfuse", tags: ["ai", "llm", "observability", "open-source"], status_url: "https://status.langfuse.com/api/v2/status.json", page_url: "https://status.langfuse.com", type: "statuspage" },
    { id: "tavus", name: "Tavus", tags: ["ai", "video", "personalization", "api"], status_url: "https://tavus.statuspage.io/api/v2/status.json", page_url: "https://tavus.statuspage.io", type: "statuspage" },
    { id: "callhippo", name: "CallHippo", tags: ["voip", "phone", "communications", "saas"], status_url: "https://callhippo.statuspage.io/api/v2/status.json", page_url: "https://callhippo.statuspage.io", type: "statuspage" },
    { id: "windsurf", name: "Windsurf", tags: ["ai", "ide", "coding", "developer-tools"], status_url: "https://status.windsurf.com/api/v2/status.json", page_url: "https://status.windsurf.com", type: "statuspage" },
    { id: "kong", name: "Kong", tags: ["api-gateway", "infrastructure", "developer-tools", "cloud"], status_url: "https://kong.statuspage.io/api/v2/status.json", page_url: "https://kong.statuspage.io", type: "statuspage" },
    { id: "port", name: "Port", tags: ["developer-platform", "devops", "developer-tools", "saas"], status_url: "https://port.statuspage.io/api/v2/status.json", page_url: "https://port.statuspage.io", type: "statuspage" },
    { id: "clari", name: "Clari", tags: ["sales", "revenue", "crm", "analytics"], status_url: "https://clari.statuspage.io/api/v2/status.json", page_url: "https://trust.clari.com", type: "statuspage" },
    { id: "loop", name: "Loop", tags: ["communication", "collaboration", "team", "productivity"], status_url: "https://loop.statuspage.io/api/v2/status.json", page_url: "https://status.loopworks.com", type: "statuspage" },
    { id: "bitrise", name: "Bitrise", tags: ["ci-cd", "mobile", "devops", "developer-tools"], status_url: "https://status.bitrise.io/api/v2/status.json", page_url: "https://status.bitrise.io", type: "statuspage" },
    { id: "backstage", name: "Backstage", tags: ["developer-platform", "devops", "service-catalog", "open-source"], status_url: "https://backstage.statuspage.io/api/v2/status.json", page_url: "https://backstage.statuspage.io", type: "statuspage" },
    { id: "videoask", name: "VideoAsk", tags: ["video", "forms", "survey", "saas"], status_url: "https://status.videoask.com/api/v2/status.json", page_url: "https://status.videoask.com", type: "statuspage" },
    { id: "finix", name: "Finix", tags: ["payments", "fintech", "banking-as-a-service", "api"], status_url: "https://status.finix.com/api/v2/status.json", page_url: "https://status.finix.com", type: "statuspage" },
    { id: "unit", name: "Unit", tags: ["fintech", "banking-as-a-service", "payments", "api"], status_url: "https://status.unit.co/api/v2/status.json", page_url: "https://status.unit.co", type: "statuspage" },
    { id: "synctera", name: "Synctera", tags: ["fintech", "banking-as-a-service", "payments", "api"], status_url: "https://status.synctera.com/api/v2/status.json", page_url: "https://status.synctera.com", type: "statuspage" },
    { id: "otter_ai", name: "Otter.ai", tags: ["ai", "transcription", "meetings", "productivity"], status_url: "https://status.otter.ai/api/v2/status.json", page_url: "https://status.otter.ai", type: "statuspage" },
    { id: "yesware", name: "Yesware", tags: ["sales", "email", "outreach", "productivity"], status_url: "https://status.yesware.com/api/v2/status.json", page_url: "https://status.yesware.com", type: "statuspage" },
    { id: "reflektive", name: "Reflektive", tags: ["hr", "performance", "people-management", "saas"], status_url: "https://status.reflektive.com/api/v2/status.json", page_url: "https://status.reflektive.com", type: "statuspage" },
    { id: "celigo", name: "Celigo", tags: ["integration", "ipaas", "automation", "api"], status_url: "https://status.celigo.com/api/v2/status.json", page_url: "https://status.celigo.com", type: "statuspage" },
    { id: "kisi", name: "Kisi", tags: ["security", "access-control", "physical-security", "saas"], status_url: "https://status.kisi.io/api/v2/status.json", page_url: "https://status.kisi.io", type: "statuspage" },
    { id: "privy", name: "Privy", tags: ["ecommerce", "email", "marketing", "sms"], status_url: "https://status.privy.com/api/v2/status.json", page_url: "https://status.privy.com", type: "statuspage" },
    { id: "braze", name: "Braze", tags: ["marketing", "customer-engagement", "push", "email"], status_url: "https://status.braze.com/api/v2/status.json", page_url: "https://status.braze.com", type: "statuspage" },
    { id: "scaleway", name: "Scaleway", tags: ["cloud", "infrastructure", "european", "hosting"], status_url: "https://status.scaleway.com/api/v2/status.json", page_url: "https://status.scaleway.com", type: "statuspage" },
    { id: "pubnub", name: "PubNub", tags: ["realtime", "messaging", "push", "api"], status_url: "https://status.pubnub.com/api/v2/status.json", page_url: "https://status.pubnub.com", type: "statuspage" },
    { id: "safetyculture", name: "SafetyCulture", tags: ["workplace-safety", "inspections", "operations", "saas"], status_url: "https://status.safetyculture.com/api/v2/status.json", page_url: "https://status.safetyculture.com", type: "statuspage" },
    { id: "zilliz", name: "Zilliz", tags: ["vector-database", "ai", "cloud", "ml"], status_url: "https://status.zilliz.com/api/v2/status.json", page_url: "https://status.zilliz.com", type: "statuspage" },
    { id: "podio", name: "Podio", tags: ["project-management", "collaboration", "crm", "saas"], status_url: "https://status.podio.com/api/v2/status.json", page_url: "https://status.podio.com", type: "statuspage" },
    { id: "lucid", name: "Lucid Software", tags: ["diagramming", "visual-collaboration", "productivity", "saas"], status_url: "https://status.lucid.co/api/v2/status.json", page_url: "https://status.lucid.co", type: "statuspage" },
    { id: "sprinklr", name: "Sprinklr", tags: ["social-media", "marketing", "customer-experience", "enterprise"], status_url: "https://status.sprinklr.com/api/v2/status.json", page_url: "https://status.sprinklr.com", type: "statuspage" },
    { id: "bynder", name: "Bynder", tags: ["dam", "digital-asset-management", "marketing", "saas"], status_url: "https://status.bynder.com/api/v2/status.json", page_url: "https://status.bynder.com", type: "statuspage" },
    { id: "clicksend", name: "ClickSend", tags: ["sms", "email", "communications", "api"], status_url: "https://status.clicksend.com/api/v2/status.json", page_url: "https://status.clicksend.com", type: "statuspage" },
    // Package registries / open-source ecosystems
    { id: "pypi", name: "PyPI", tags: ["python", "packages", "open-source", "developer-tools"], status_url: "https://status.python.org/api/v2/status.json", page_url: "https://status.python.org", type: "statuspage" },
    { id: "rubygems", name: "RubyGems", tags: ["ruby", "packages", "open-source", "developer-tools"], status_url: "https://status.rubygems.org/api/v2/status.json", page_url: "https://status.rubygems.org", type: "statuspage" },
    { id: "crates_io", name: "crates.io", tags: ["rust", "packages", "open-source", "developer-tools"], status_url: "https://status.crates.io/api/v2/status.json", page_url: "https://status.crates.io", type: "statuspage" },
    { id: "maven_central", name: "Maven Central", tags: ["java", "packages", "open-source", "developer-tools"], status_url: "https://status.maven.org/api/v2/status.json", page_url: "https://status.maven.org", type: "statuspage" },
    { id: "hex_pm", name: "Hex.pm", tags: ["elixir", "erlang", "packages", "open-source"], status_url: "https://status.hex.pm/api/v2/status.json", page_url: "https://status.hex.pm", type: "statuspage" },
    // Cloud hosting
    { id: "kinsta", name: "Kinsta", tags: ["wordpress", "hosting", "cloud", "managed"], status_url: "https://status.kinsta.com/api/v2/status.json", page_url: "https://status.kinsta.com", type: "statuspage" },
    { id: "upcloud", name: "UpCloud", tags: ["cloud", "vps", "european", "hosting"], status_url: "https://status.upcloud.com/api/v2/status.json", page_url: "https://status.upcloud.com", type: "statuspage" },
    { id: "cloudways", name: "Cloudways", tags: ["cloud", "hosting", "managed", "wordpress"], status_url: "https://status.cloudways.com/api/v2/status.json", page_url: "https://status.cloudways.com", type: "statuspage" },
    { id: "pantheon", name: "Pantheon", tags: ["wordpress", "drupal", "hosting", "webops"], status_url: "https://status.pantheon.io/api/v2/status.json", page_url: "https://status.pantheon.io", type: "statuspage" },
    { id: "flightcontrol", name: "Flightcontrol", tags: ["cloud", "deployment", "aws", "developer-tools"], status_url: "https://status.flightcontrol.dev/api/v2/status.json", page_url: "https://status.flightcontrol.dev", type: "statuspage" },
    { id: "azion", name: "Azion", tags: ["cdn", "edge", "serverless", "infrastructure"], status_url: "https://status.azion.com/api/v2/status.json", page_url: "https://status.azion.com", type: "statuspage" },
    { id: "acquia", name: "Acquia", tags: ["drupal", "cms", "cloud", "enterprise"], status_url: "https://status.acquia.com/api/v2/status.json", page_url: "https://status.acquia.com", type: "statuspage" },
    // Billing / payments
    { id: "zuora", name: "Zuora", tags: ["billing", "subscriptions", "revenue", "enterprise"], status_url: "https://trust.zuora.com/api/v2/status.json", page_url: "https://trust.zuora.com", type: "statuspage" },
    { id: "avalara", name: "Avalara", tags: ["tax", "compliance", "ecommerce", "api"], status_url: "https://status.avalara.com/api/v2/status.json", page_url: "https://status.avalara.com", type: "statuspage" },
    { id: "taxjar", name: "TaxJar", tags: ["tax", "compliance", "ecommerce", "automation"], status_url: "https://status.taxjar.com/api/v2/status.json", page_url: "https://status.taxjar.com", type: "statuspage" },
    // Identity / security
    { id: "jumpcloud", name: "JumpCloud", tags: ["identity", "mdm", "directory", "zero-trust"], status_url: "https://status.jumpcloud.com/api/v2/status.json", page_url: "https://status.jumpcloud.com", type: "statuspage" },
    { id: "duo", name: "Duo Security", tags: ["mfa", "authentication", "security", "zero-trust"], status_url: "https://status.duo.com/api/v2/status.json", page_url: "https://status.duo.com", type: "statuspage" },
    { id: "rapid7", name: "Rapid7", tags: ["security", "vulnerability", "siem", "cloud"], status_url: "https://status.rapid7.com/api/v2/status.json", page_url: "https://status.rapid7.com", type: "statuspage" },
    { id: "aquasec", name: "Aqua Security", tags: ["security", "cloud-native", "container", "devsecops"], status_url: "https://status.aquasec.com/api/v2/status.json", page_url: "https://status.aquasec.com", type: "statuspage" },
    { id: "traceable", name: "Traceable AI", tags: ["security", "api-security", "observability", "ai"], status_url: "https://status.traceable.ai/api/v2/status.json", page_url: "https://status.traceable.ai", type: "statuspage" },
    // API management
    { id: "apigee", name: "Apigee", tags: ["api-management", "gateway", "google", "enterprise"], status_url: "https://status.apigee.com/api/v2/status.json", page_url: "https://status.apigee.com", type: "statuspage" },
    // Monitoring
    { id: "hetrixtools", name: "HetrixTools", tags: ["monitoring", "uptime", "server", "blacklist"], status_url: "https://status.hetrixtools.com/api/v2/status.json", page_url: "https://status.hetrixtools.com", type: "statuspage" },
    // Communications / VoIP
    { id: "talkdesk", name: "Talkdesk", tags: ["contact-center", "voip", "ccaas", "ai"], status_url: "https://status.talkdesk.com/api/v2/status.json", page_url: "https://status.talkdesk.com", type: "statuspage" },
    { id: "nextiva", name: "Nextiva", tags: ["voip", "ucaas", "phone", "communications"], status_url: "https://status.nextiva.com/api/v2/status.json", page_url: "https://status.nextiva.com", type: "statuspage" },
    { id: "justcall", name: "JustCall", tags: ["voip", "sms", "phone", "sales"], status_url: "https://status.justcall.io/api/v2/status.json", page_url: "https://status.justcall.io", type: "statuspage" },
    { id: "genesys", name: "Genesys Cloud", tags: ["contact-center", "ccaas", "voip", "enterprise"], status_url: "https://status.mypurecloud.com/api/v2/status.json", page_url: "https://status.mypurecloud.com", type: "statuspage" },
    // Sales / GTM
    { id: "zoominfo", name: "ZoomInfo", tags: ["sales", "intelligence", "b2b", "data"], status_url: "https://status.zoominfo.com/api/v2/status.json", page_url: "https://status.zoominfo.com", type: "statuspage" },
    { id: "chili_piper", name: "Chili Piper", tags: ["scheduling", "sales", "revenue", "saas"], status_url: "https://status.chilipiper.com/api/v2/status.json", page_url: "https://status.chilipiper.com", type: "statuspage" },
    { id: "demandbase", name: "Demandbase", tags: ["abm", "b2b", "marketing", "sales"], status_url: "https://status.demandbase.com/api/v2/status.json", page_url: "https://status.demandbase.com", type: "statuspage" },
    { id: "qualified_com", name: "Qualified", tags: ["sales", "pipeline", "chat", "ai"], status_url: "https://status.qualified.com/api/v2/status.json", page_url: "https://status.qualified.com", type: "statuspage" },
    { id: "bazaarvoice", name: "Bazaarvoice", tags: ["reviews", "ugc", "ecommerce", "marketing"], status_url: "https://status.bazaarvoice.com/api/v2/status.json", page_url: "https://status.bazaarvoice.com", type: "statuspage" },
    { id: "knak", name: "Knak", tags: ["email", "builder", "marketing", "enterprise"], status_url: "https://status.knak.com/api/v2/status.json", page_url: "https://status.knak.com", type: "statuspage" },
    // E-commerce
    { id: "bigcommerce", name: "BigCommerce", tags: ["ecommerce", "saas", "hosting", "enterprise"], status_url: "https://status.bigcommerce.com/api/v2/status.json", page_url: "https://status.bigcommerce.com", type: "statuspage" },
    { id: "omnisend", name: "Omnisend", tags: ["email", "sms", "ecommerce", "marketing"], status_url: "https://status.omnisend.com/api/v2/status.json", page_url: "https://status.omnisend.com", type: "statuspage" },
    // Location / address
    { id: "geocodio", name: "Geocodio", tags: ["geocoding", "address", "location", "api"], status_url: "https://status.geocod.io/api/v2/status.json", page_url: "https://status.geocod.io", type: "statuspage" },
    { id: "smarty", name: "Smarty", tags: ["address-validation", "geocoding", "usps", "api"], status_url: "https://status.smarty.com/api/v2/status.json", page_url: "https://status.smarty.com", type: "statuspage" },
    // AI / ML
    { id: "tidb_cloud", name: "TiDB Cloud", tags: ["database", "mysql", "distributed", "cloud"], status_url: "https://status.tidbcloud.com/api/v2/status.json", page_url: "https://status.tidbcloud.com", type: "statuspage" },
    // CI/CD
    { id: "cloudbees", name: "CloudBees", tags: ["ci-cd", "devops", "jenkins", "enterprise"], status_url: "https://status.cloudbees.com/api/v2/status.json", page_url: "https://status.cloudbees.com", type: "statuspage" },
    // HR / compliance
    { id: "finch", name: "Finch", tags: ["hr", "payroll", "integration", "api"], status_url: "https://status.tryfinch.com/api/v2/status.json", page_url: "https://status.tryfinch.com", type: "statuspage" },
    // Communications / messaging
    { id: "bird", name: "Bird", tags: ["communications", "sms", "email", "messaging"], status_url: "https://status.bird.com/api/v2/status.json", page_url: "https://status.bird.com", type: "statuspage" },
    { id: "mailersend", name: "MailerSend", tags: ["email", "transactional", "api", "developer-tools"], status_url: "https://status.mailersend.com/api/v2/status.json", page_url: "https://status.mailersend.com", type: "statuspage" },
    // Payments / e-commerce
    { id: "flutterwave", name: "Flutterwave", tags: ["payments", "fintech", "africa", "api"], status_url: "https://status.flutterwave.com/api/v2/status.json", page_url: "https://status.flutterwave.com", type: "statuspage" },
    { id: "fastspring", name: "FastSpring", tags: ["ecommerce", "payments", "saas", "subscriptions"], status_url: "https://status.fastspring.com/api/v2/status.json", page_url: "https://status.fastspring.com", type: "statuspage" },
    { id: "bold_commerce", name: "Bold Commerce", tags: ["ecommerce", "checkout", "subscriptions", "shopify"], status_url: "https://status.boldcommerce.com/api/v2/status.json", page_url: "https://status.boldcommerce.com", type: "statuspage" },
    // Creator platforms
    { id: "patreon", name: "Patreon", tags: ["creator", "membership", "subscriptions", "saas"], status_url: "https://status.patreon.com/api/v2/status.json", page_url: "https://status.patreon.com", type: "statuspage" },
    { id: "memberful", name: "Memberful", tags: ["membership", "creator", "subscriptions", "saas"], status_url: "https://status.memberful.com/api/v2/status.json", page_url: "https://status.memberful.com", type: "statuspage" },
    // Ad tech
    { id: "kevel", name: "Kevel", tags: ["ad-tech", "api", "advertising", "saas"], status_url: "https://status.kevel.co/api/v2/status.json", page_url: "https://status.kevel.co", type: "statuspage" },
    // AI evaluation / LLM tooling
    { id: "braintrust", name: "Braintrust", tags: ["ai", "llm", "evaluation", "developer-tools"], status_url: "https://status.braintrust.dev/api/v2/status.json", page_url: "https://status.braintrust.dev", type: "statuspage" },
    // Auth / Web3
    { id: "magic_link", name: "Magic.link", tags: ["auth", "web3", "passwordless", "identity"], status_url: "https://status.magic.link/api/v2/status.json", page_url: "https://status.magic.link", type: "statuspage" },
    // BI / Analytics
    { id: "mode_analytics", name: "Mode Analytics", tags: ["analytics", "bi", "sql", "data"], status_url: "https://status.modeanalytics.com/api/v2/status.json", page_url: "https://status.modeanalytics.com", type: "statuspage" },
    // Customer success
    { id: "planhat", name: "Planhat", tags: ["customer-success", "crm", "saas", "analytics"], status_url: "https://status.planhat.com/api/v2/status.json", page_url: "https://status.planhat.com", type: "statuspage" },
    { id: "catalyst_io", name: "Catalyst", tags: ["customer-success", "crm", "saas", "analytics"], status_url: "https://status.catalyst.io/api/v2/status.json", page_url: "https://status.catalyst.io", type: "statuspage" },
    // Security / AppSec
    { id: "cycode", name: "Cycode", tags: ["security", "appsec", "devsecops", "code-security"], status_url: "https://status.cycode.com/api/v2/status.json", page_url: "https://status.cycode.com", type: "statuspage" },
    // DNS security
    { id: "dnsfilter", name: "DNSFilter", tags: ["dns", "security", "filtering", "network"], status_url: "https://status.dnsfilter.com/api/v2/status.json", page_url: "https://status.dnsfilter.com", type: "statuspage" },
    // CDN / edge
    { id: "section_io", name: "Section.io", tags: ["cdn", "edge", "platform", "devops"], status_url: "https://status.section.io/api/v2/status.json", page_url: "https://status.section.io", type: "statuspage" },
    // GPU compute
    { id: "sfcompute", name: "SF Compute", tags: ["gpu", "compute", "cloud", "ai"], status_url: "https://status.sfcompute.com/api/v2/status.json", page_url: "https://status.sfcompute.com", type: "statuspage" },
    // AI / inference
    { id: "cartesia", name: "Cartesia AI", tags: ["ai", "tts", "audio", "inference"], status_url: "https://status.cartesia.ai/api/v2/status.json", page_url: "https://status.cartesia.ai", type: "statuspage" },
    { id: "cerebras", name: "Cerebras Inference", tags: ["ai", "llm", "inference", "cloud"], status_url: "https://status.cerebras.ai/api/v2/status.json", page_url: "https://status.cerebras.ai", type: "statuspage" },
    // Payments / fintech
    { id: "gocardless", name: "GoCardless", tags: ["payments", "bank-debit", "fintech", "api"], status_url: "https://status.gocardless.com/api/v2/status.json", page_url: "https://status.gocardless.com", type: "statuspage" },
    { id: "airwallex", name: "Airwallex", tags: ["payments", "fintech", "global", "api"], status_url: "https://status.airwallex.com/api/v2/status.json", page_url: "https://status.airwallex.com", type: "statuspage" },
    // Media intelligence
    { id: "meltwater", name: "Meltwater", tags: ["media-intelligence", "monitoring", "pr", "analytics"], status_url: "https://status.meltwater.com/api/v2/status.json", page_url: "https://status.meltwater.com", type: "statuspage" },
    // Marketing / CMS
    { id: "bloomreach", name: "Bloomreach", tags: ["marketing", "cms", "personalization", "ecommerce"], status_url: "https://status.bloomreach.com/api/v2/status.json", page_url: "https://status.bloomreach.com", type: "statuspage" },
    // CRM
    { id: "affinity", name: "Affinity", tags: ["crm", "relationship-intelligence", "sales", "vc"], status_url: "https://status.affinity.co/api/v2/status.json", page_url: "https://status.affinity.co", type: "statuspage" },
    // API tooling
    { id: "swaggerhub", name: "SwaggerHub", tags: ["api", "openapi", "documentation", "developer-tools"], status_url: "https://status.swaggerhub.com/api/v2/status.json", page_url: "https://status.swaggerhub.com", type: "statuspage" },
    // Financial reporting / GRC
    { id: "workiva", name: "Workiva", tags: ["financial-reporting", "grc", "compliance", "enterprise"], status_url: "https://status.workiva.com/api/v2/status.json", page_url: "https://status.workiva.com", type: "statuspage" },
    // Construction / project
    { id: "procore", name: "Procore", tags: ["construction", "project-management", "enterprise", "saas"], status_url: "https://status.procore.com/api/v2/status.json", page_url: "https://status.procore.com", type: "statuspage" },
    // Sales enablement
    { id: "seismic", name: "Seismic", tags: ["sales-enablement", "content", "marketing", "enterprise"], status_url: "https://status.seismic.com/api/v2/status.json", page_url: "https://status.seismic.com", type: "statuspage" },
    { id: "highspot", name: "Highspot", tags: ["sales-enablement", "content", "training", "enterprise"], status_url: "https://status.highspot.com/api/v2/status.json", page_url: "https://status.highspot.com", type: "statuspage" },
    { id: "showpad", name: "Showpad", tags: ["sales-enablement", "content", "coaching", "enterprise"], status_url: "https://status.showpad.com/api/v2/status.json", page_url: "https://status.showpad.com", type: "statuspage" },
    // Revenue ops
    { id: "leandata", name: "LeanData", tags: ["revenue-ops", "routing", "attribution", "sales"], status_url: "https://status.leandata.com/api/v2/status.json", page_url: "https://status.leandata.com", type: "statuspage" },
    // Competitive intelligence
    { id: "klue", name: "Klue", tags: ["competitive-intelligence", "sales", "marketing", "saas"], status_url: "https://status.klue.com/api/v2/status.json", page_url: "https://status.klue.com", type: "statuspage" },
    // Interactive demos
    { id: "navattic", name: "Navattic", tags: ["demos", "product", "sales", "saas"], status_url: "https://status.navattic.com/api/v2/status.json", page_url: "https://status.navattic.com", type: "statuspage" },
    // Meeting intelligence
    { id: "grain", name: "Grain", tags: ["meeting-intelligence", "recording", "ai", "sales"], status_url: "https://status.grain.com/api/v2/status.json", page_url: "https://status.grain.com", type: "statuspage" },
    { id: "fathom", name: "Fathom Video", tags: ["meeting-recorder", "ai", "notes", "productivity"], status_url: "https://status.fathom.video/api/v2/status.json", page_url: "https://status.fathom.video", type: "statuspage" },
    // Legal practice management
    { id: "mycase", name: "MyCase", tags: ["legal", "practice-management", "law-firm", "saas"], status_url: "https://status.mycase.com/api/v2/status.json", page_url: "https://status.mycase.com", type: "statuspage" },
    // Fitness / wellness
    { id: "mindbody", name: "Mindbody", tags: ["fitness", "wellness", "scheduling", "saas"], status_url: "https://status.mindbodyonline.com/api/v2/status.json", page_url: "https://status.mindbodyonline.com", type: "statuspage" },
    // Scheduling
    { id: "acuity", name: "Acuity Scheduling", tags: ["scheduling", "calendar", "appointments", "saas"], status_url: "https://status.acuityscheduling.com/api/v2/status.json", page_url: "https://status.acuityscheduling.com", type: "statuspage" },
    // Reputation / reviews
    { id: "birdeye", name: "Birdeye", tags: ["reputation", "reviews", "listings", "cx"], status_url: "https://status.birdeye.com/api/v2/status.json", page_url: "https://status.birdeye.com", type: "statuspage" },
    { id: "trustpilot", name: "Trustpilot", tags: ["reviews", "reputation", "ecommerce", "trust"], status_url: "https://status.trustpilot.com/api/v2/status.json", page_url: "https://status.trustpilot.com", type: "statuspage" },
    { id: "feefo", name: "Feefo", tags: ["reviews", "reputation", "ecommerce", "verified"], status_url: "https://status.feefo.com/api/v2/status.json", page_url: "https://status.feefo.com", type: "statuspage" },
    // SMS / messaging
    { id: "textmagic", name: "Textmagic", tags: ["sms", "messaging", "api", "business"], status_url: "https://status.textmagic.com/api/v2/status.json", page_url: "https://status.textmagic.com", type: "statuspage" },
    // Chatbots
    { id: "chatfuel", name: "Chatfuel", tags: ["chatbot", "messaging", "automation", "ai"], status_url: "https://status.chatfuel.com/api/v2/status.json", page_url: "https://status.chatfuel.com", type: "statuspage" },
    // ATS / recruiting
    { id: "jobvite", name: "Jobvite", tags: ["ats", "recruiting", "hr", "talent"], status_url: "https://status.jobvite.com/api/v2/status.json", page_url: "https://status.jobvite.com", type: "statuspage" },
    { id: "smartrecruiters", name: "SmartRecruiters", tags: ["ats", "recruiting", "hr", "enterprise"], status_url: "https://status.smartrecruiters.com/api/v2/status.json", page_url: "https://status.smartrecruiters.com", type: "statuspage" },
    { id: "teamtailor", name: "Teamtailor", tags: ["ats", "recruiting", "employer-brand", "hr"], status_url: "https://status.teamtailor.com/api/v2/status.json", page_url: "https://status.teamtailor.com", type: "statuspage" },
    // Tick 103 additions — cloud/IaaS, dev tools, logistics, legal tech, tax, e-commerce, CX
    // Cloud / IaaS
    { id: "oracle_cloud", name: "Oracle Cloud (OCI)", tags: ["cloud", "infrastructure", "iaas", "hosting"], status_url: "https://ocistatus.oraclecloud.com/api/v2/status.json", page_url: "https://ocistatus.oraclecloud.com", type: "statuspage" },
    // Dev tools / DevOps
    { id: "gitlab", name: "GitLab", tags: ["devtools", "git", "ci-cd", "hosting"], status_url: "https://api.status.io/1.0/status/5b36dc6502d06804c08349f7", page_url: "https://status.gitlab.com", type: "statusio" },
    // Headless commerce
    { id: "nacelle", name: "Nacelle", tags: ["ecommerce", "headless", "commerce", "saas"], status_url: "https://status.nacelle.com/api/v2/status.json", page_url: "https://status.nacelle.com", type: "statuspage" },
    // Legal tech
    { id: "litify", name: "Litify", tags: ["legal", "crm", "saas", "law"], status_url: "https://status.litify.com/api/v2/status.json", page_url: "https://status.litify.com", type: "statuspage" },
    // Finance / investment management
    { id: "allvue", name: "Allvue Systems", tags: ["finance", "investment-management", "alts", "saas"], status_url: "https://status.allvuesystems.com/api/v2/status.json", page_url: "https://status.allvuesystems.com", type: "statuspage" },
    // Tax compliance
    { id: "vertex", name: "Vertex Inc", tags: ["tax", "compliance", "finance", "saas"], status_url: "https://status.vertexinc.com/api/v2/status.json", page_url: "https://status.vertexinc.com", type: "statuspage" },
    // Logistics / supply chain visibility
    { id: "project44", name: "project44", tags: ["logistics", "supply-chain", "visibility", "saas"], status_url: "https://status.project44.com/api/v2/status.json", page_url: "https://status.project44.com", type: "statuspage" },
    { id: "bringg", name: "Bringg", tags: ["logistics", "delivery", "last-mile", "saas"], status_url: "https://status.bringg.com/api/v2/status.json", page_url: "https://status.bringg.com", type: "statuspage" },
    // E-commerce fulfillment / shipping
    { id: "shipbob", name: "ShipBob", tags: ["logistics", "fulfillment", "ecommerce", "shipping"], status_url: "https://status.shipbob.com/api/v2/status.json", page_url: "https://status.shipbob.com", type: "statuspage" },
    { id: "stamps", name: "Stamps.com", tags: ["shipping", "postage", "ecommerce", "logistics"], status_url: "https://status.stamps.com/api/v2/status.json", page_url: "https://status.stamps.com", type: "statuspage" },
    { id: "pirateship", name: "Pirate Ship", tags: ["shipping", "postage", "ecommerce", "logistics"], status_url: "https://status.pirateship.com/api/v2/status.json", page_url: "https://status.pirateship.com", type: "statuspage" },
    // Subscription commerce
    { id: "ordergroove", name: "Ordergroove", tags: ["ecommerce", "subscriptions", "retention", "saas"], status_url: "https://status.ordergroove.com/api/v2/status.json", page_url: "https://status.ordergroove.com", type: "statuspage" },
    // Customer experience / UX research
    { id: "satismeter", name: "SatisMeter", tags: ["analytics", "feedback", "nps", "customer-success"], status_url: "https://status.satismeter.com/api/v2/status.json", page_url: "https://status.satismeter.com", type: "statuspage" },
    { id: "userzoom", name: "UserZoom", tags: ["ux-research", "usability-testing", "analytics", "saas"], status_url: "https://status.userzoom.com/api/v2/status.json", page_url: "https://status.userzoom.com", type: "statuspage" },
    // Tick 104 additions — scheduling, writing, PIM, CMS, fundraising, training/LMS, billing, KB
    // Scheduling
    { id: "calendly", name: "Calendly", tags: ["scheduling", "calendar", "productivity", "saas"], status_url: "https://calendlystatus.com/api/v2/status.json", page_url: "https://calendlystatus.com", type: "statuspage" },
    // Writing assistant
    { id: "grammarly", name: "Grammarly", tags: ["writing", "ai", "productivity", "saas"], status_url: "https://status.grammarly.com/api/v2/status.json", page_url: "https://status.grammarly.com", type: "statuspage" },
    // Product Information Management (PIM)
    { id: "salsify", name: "Salsify", tags: ["pim", "ecommerce", "product-data", "saas"], status_url: "https://status.salsify.com/api/v2/status.json", page_url: "https://status.salsify.com", type: "statuspage" },
    { id: "akeneo", name: "Akeneo", tags: ["pim", "ecommerce", "product-data", "saas"], status_url: "https://status.akeneo.com/api/v2/status.json", page_url: "https://status.akeneo.com", type: "statuspage" },
    // Headless CMS
    { id: "buttercms", name: "ButterCMS", tags: ["cms", "headless", "content", "saas"], status_url: "https://status.buttercms.com/api/v2/status.json", page_url: "https://status.buttercms.com", type: "statuspage" },
    // Nonprofit fundraising
    { id: "classy", name: "Classy (GoFundMe Pro)", tags: ["fundraising", "nonprofit", "payments", "saas"], status_url: "https://status.classy.org/api/v2/status.json", page_url: "https://status.classy.org", type: "statuspage" },
    // Employee training / SOPs / LMS
    { id: "trainual", name: "Trainual", tags: ["training", "lms", "hr", "saas"], status_url: "https://status.trainual.com/api/v2/status.json", page_url: "https://status.trainual.com", type: "statuspage" },
    { id: "degreed", name: "Degreed", tags: ["lms", "learning", "hr", "enterprise"], status_url: "https://status.degreed.com/api/v2/status.json", page_url: "https://status.degreed.com", type: "statuspage" },
    { id: "northpass", name: "Northpass", tags: ["lms", "training", "customer-education", "saas"], status_url: "https://status.northpass.com/api/v2/status.json", page_url: "https://status.northpass.com", type: "statuspage" },
    // Knowledge base
    { id: "helpjuice", name: "Helpjuice", tags: ["knowledge-base", "help-center", "support", "saas"], status_url: "https://status.helpjuice.com/api/v2/status.json", page_url: "https://status.helpjuice.com", type: "statuspage" },
    // Recurring billing
    { id: "chargeover", name: "ChargeOver", tags: ["billing", "subscriptions", "payments", "saas"], status_url: "https://status.chargeover.com/api/v2/status.json", page_url: "https://status.chargeover.com", type: "statuspage" },
    // Payments / BNPL
    { id: "afterpay", name: "Afterpay", tags: ["payments", "bnpl", "ecommerce", "fintech"], status_url: "https://status.afterpay.com/api/v2/status.json", page_url: "https://status.afterpay.com", type: "statuspage" },
    // Identity verification
    { id: "onfido", name: "Onfido", tags: ["identity", "kyc", "verification", "security"], status_url: "https://status.onfido.com/api/v2/status.json", page_url: "https://status.onfido.com", type: "statuspage" },
    { id: "veriff", name: "Veriff", tags: ["identity", "kyc", "verification", "security"], status_url: "https://status.veriff.com/api/v2/status.json", page_url: "https://status.veriff.com", type: "statuspage" },
    { id: "socure", name: "Socure", tags: ["identity", "fraud", "kyc", "fintech"], status_url: "https://status.socure.com/api/v2/status.json", page_url: "https://status.socure.com", type: "statuspage" },
    { id: "alloy", name: "Alloy", tags: ["fintech", "kyc", "compliance", "fraud"], status_url: "https://status.alloy.com/api/v2/status.json", page_url: "https://status.alloy.com", type: "statuspage" },
    // Project management / SaaS
    { id: "37signals", name: "37signals (Basecamp / HEY)", tags: ["project-management", "email", "saas", "productivity"], status_url: "https://www.37status.com/api/v2/status.json", page_url: "https://www.37status.com", type: "statuspage" },
    // Sales intelligence / data enrichment
    { id: "rocketreach", name: "RocketReach", tags: ["sales", "data-enrichment", "prospecting", "saas"], status_url: "https://status.rocketreach.co/api/v2/status.json", page_url: "https://status.rocketreach.co", type: "statuspage" },
    // Partnerships / co-selling
    { id: "crossbeam", name: "Crossbeam", tags: ["partnerships", "co-selling", "data-sharing", "saas"], status_url: "https://status.crossbeam.com/api/v2/status.json", page_url: "https://status.crossbeam.com", type: "statuspage" },
    // Affiliate marketing
    { id: "awin", name: "Awin", tags: ["affiliate", "marketing", "partnerships", "ecommerce"], status_url: "https://status.awin.com/api/v2/status.json", page_url: "https://status.awin.com", type: "statuspage" },
    // Global HR / employer of record
    { id: "oysterhr", name: "OysterHR", tags: ["hr", "eor", "global-payroll", "remote-work"], status_url: "https://status.oysterhr.com/api/v2/status.json", page_url: "https://status.oysterhr.com", type: "statuspage" },
    // Ad tech
    { id: "criteo", name: "Criteo", tags: ["advertising", "retargeting", "ecommerce", "adtech"], status_url: "https://status.criteo.com/api/v2/status.json", page_url: "https://status.criteo.com", type: "statuspage" },
    // Interactive product demos
    { id: "storylane", name: "Storylane", tags: ["demos", "sales", "product", "saas"], status_url: "https://status.storylane.io/api/v2/status.json", page_url: "https://status.storylane.io", type: "statuspage" },
    { id: "reprise", name: "Reprise", tags: ["demos", "sales", "product", "saas"], status_url: "https://status.reprise.com/api/v2/status.json", page_url: "https://status.reprise.com", type: "statuspage" },
    // Developer tunneling
    { id: "ngrok", name: "ngrok", tags: ["devtools", "tunneling", "networking", "developer"], status_url: "https://status.ngrok.com/api/v2/status.json", page_url: "https://status.ngrok.com", type: "statuspage" },
    // PKI / SSL
    { id: "digicert", name: "DigiCert", tags: ["ssl", "pki", "certificates", "security"], status_url: "https://status.digicert.com/api/v2/status.json", page_url: "https://status.digicert.com", type: "statuspage" },
    // Domain registrar / hosting
    { id: "godaddy", name: "GoDaddy", tags: ["domains", "hosting", "dns", "registrar"], status_url: "https://status.godaddy.com/api/v2/status.json", page_url: "https://status.godaddy.com", type: "statuspage" },
    // Developer tools / terminal
    { id: "warp", name: "Warp", tags: ["devtools", "terminal", "ai", "developer"], status_url: "https://status.warp.dev/api/v2/status.json", page_url: "https://status.warp.dev", type: "statuspage" },
    // Data streaming
    { id: "redpanda", name: "Redpanda", tags: ["data-streaming", "kafka", "messaging", "developer"], status_url: "https://status.redpanda.com/api/v2/status.json", page_url: "https://status.redpanda.com", type: "statuspage" },
    // Data integration / ETL
    { id: "estuary", name: "Estuary", tags: ["data-integration", "etl", "streaming", "developer"], status_url: "https://status.estuary.dev/api/v2/status.json", page_url: "https://status.estuary.dev", type: "statuspage" },
    // Vector database
    { id: "turbopuffer", name: "turbopuffer", tags: ["vector-db", "search", "ai", "developer"], status_url: "https://status.turbopuffer.com/api/v2/status.json", page_url: "https://status.turbopuffer.com", type: "statuspage" },
    // Open banking / fintech data
    { id: "truelayer", name: "TrueLayer", tags: ["fintech", "open-banking", "payments", "api"], status_url: "https://status.truelayer.com/api/v2/status.json", page_url: "https://status.truelayer.com", type: "statuspage" },
    { id: "codat", name: "Codat", tags: ["fintech", "financial-data", "accounting", "api"], status_url: "https://status.codat.io/api/v2/status.json", page_url: "https://status.codat.io", type: "statuspage" },
    // Live chat / customer support
    { id: "tawk_to", name: "tawk.to", tags: ["live-chat", "customer-support", "messaging", "saas"], status_url: "https://status.tawk.to/api/v2/status.json", page_url: "https://status.tawk.to", type: "statuspage" },
    { id: "olark", name: "Olark", tags: ["live-chat", "customer-support", "messaging", "saas"], status_url: "https://status.olark.com/api/v2/status.json", page_url: "https://status.olark.com", type: "statuspage" },
    // Network security
    { id: "barracuda", name: "Barracuda Networks", tags: ["security", "email-security", "networking", "enterprise"], status_url: "https://status.barracuda.com/api/v2/status.json", page_url: "https://status.barracuda.com", type: "statuspage" },
    // Enterprise file sharing / content management
    { id: "sharefile", name: "ShareFile", tags: ["file-sharing", "documents", "cloud-storage", "enterprise"], status_url: "https://status.sharefile.com/api/v2/status.json", page_url: "https://status.sharefile.com", type: "statuspage" },
    { id: "egnyte", name: "Egnyte", tags: ["content-management", "file-sharing", "cloud-storage", "enterprise"], status_url: "https://status.egnyte.com/api/v2/status.json", page_url: "https://status.egnyte.com", type: "statuspage" },
    // Visual testing
    { id: "percy", name: "Percy", tags: ["testing", "visual-testing", "qa", "devtools"], status_url: "https://status.percy.io/api/v2/status.json", page_url: "https://status.percy.io", type: "statuspage" },
    // Email testing
    { id: "mailosaur", name: "Mailosaur", tags: ["email", "testing", "qa", "developer"], status_url: "https://status.mailosaur.com/api/v2/status.json", page_url: "https://status.mailosaur.com", type: "statuspage" },
    // Construction management
    { id: "fieldwire", name: "Fieldwire", tags: ["construction", "project-management", "field-service", "saas"], status_url: "https://status.fieldwire.com/api/v2/status.json", page_url: "https://status.fieldwire.com", type: "statuspage" },
    // Spa / salon / wellness management
    { id: "zenoti", name: "Zenoti", tags: ["wellness", "spa", "salon", "saas"], status_url: "https://status.zenoti.com/api/v2/status.json", page_url: "https://status.zenoti.com", type: "statuspage" },
    // POS / retail
    { id: "lightspeedhq", name: "Lightspeed", tags: ["pos", "retail", "ecommerce", "payments"], status_url: "https://status.lightspeedhq.com/api/v2/status.json", page_url: "https://status.lightspeedhq.com", type: "statuspage" },
    { id: "clover", name: "Clover", tags: ["pos", "payments", "retail", "smb"], status_url: "https://status.clover.com/api/v2/status.json", page_url: "https://status.clover.com", type: "statuspage" },
    { id: "shopkeep", name: "ShopKeep", tags: ["pos", "retail", "smb", "payments"], status_url: "https://status.shopkeep.com/api/v2/status.json", page_url: "https://status.shopkeep.com", type: "statuspage" },
    // Tick 107 additions
    { id: "goto", name: "GoTo", tags: ["collaboration", "meetings", "remote-work", "ucaas"], status_url: "https://status.goto.com/api/v2/status.json", page_url: "https://status.goto.com", type: "statuspage" },
    { id: "splashtop", name: "Splashtop", tags: ["remote-access", "remote-desktop", "it", "saas"], status_url: "https://status.splashtop.com/api/v2/status.json", page_url: "https://status.splashtop.com", type: "statuspage" },
    { id: "teamviewer", name: "TeamViewer", tags: ["remote-access", "remote-desktop", "it", "enterprise"], status_url: "https://status.teamviewer.com/api/v2/status.json", page_url: "https://status.teamviewer.com", type: "statuspage" },
    { id: "easyship", name: "Easyship", tags: ["ecommerce", "shipping", "logistics", "saas"], status_url: "https://status.easyship.com/api/v2/status.json", page_url: "https://status.easyship.com", type: "statuspage" },
    { id: "conductor", name: "Conductor", tags: ["seo", "content", "marketing", "analytics"], status_url: "https://status.conductor.com/api/v2/status.json", page_url: "https://status.conductor.com", type: "statuspage" },
    { id: "manatal", name: "Manatal", tags: ["ats", "recruitment", "hr", "saas"], status_url: "https://status.manatal.com/api/v2/status.json", page_url: "https://status.manatal.com", type: "statuspage" },
    { id: "workleap", name: "Workleap", tags: ["hr", "employee-experience", "engagement", "saas"], status_url: "https://status.workleap.com/api/v2/status.json", page_url: "https://status.workleap.com", type: "statuspage" },
    { id: "servicetitan", name: "ServiceTitan", tags: ["field-service", "hvac", "plumbing", "saas"], status_url: "https://status.servicetitan.com/api/v2/status.json", page_url: "https://status.servicetitan.com", type: "statuspage" },
    { id: "bizzabo", name: "Bizzabo", tags: ["events", "event-management", "marketing", "saas"], status_url: "https://status.bizzabo.com/api/v2/status.json", page_url: "https://status.bizzabo.com", type: "statuspage" },
    { id: "airmeet", name: "Airmeet", tags: ["events", "virtual-events", "webinars", "saas"], status_url: "https://status.airmeet.com/api/v2/status.json", page_url: "https://status.airmeet.com", type: "statuspage" },
    { id: "goldcast", name: "Goldcast", tags: ["events", "webinars", "marketing", "saas"], status_url: "https://status.goldcast.io/api/v2/status.json", page_url: "https://status.goldcast.io", type: "statuspage" },
    { id: "demio", name: "Demio", tags: ["webinars", "events", "marketing", "saas"], status_url: "https://status.demio.com/api/v2/status.json", page_url: "https://status.demio.com", type: "statuspage" },
    { id: "webinarjam", name: "WebinarJam", tags: ["webinars", "events", "marketing", "saas"], status_url: "https://status.webinarjam.com/api/v2/status.json", page_url: "https://status.webinarjam.com", type: "statuspage" },
    { id: "lumigo", name: "Lumigo", tags: ["observability", "serverless", "monitoring", "developer"], status_url: "https://status.lumigo.io/api/v2/status.json", page_url: "https://status.lumigo.io", type: "statuspage" },
    { id: "tomorrow_io", name: "Tomorrow.io", tags: ["weather", "api", "climate", "developer"], status_url: "https://status.tomorrow.io/api/v2/status.json", page_url: "https://status.tomorrow.io", type: "statuspage" },
    // Tick 108 additions
    // Cybersecurity / enterprise security
    { id: "paloalto_networks", name: "Palo Alto Networks", tags: ["security", "firewall", "cloud-security", "enterprise"], status_url: "https://status.paloaltonetworks.com/api/v2/status.json", page_url: "https://status.paloaltonetworks.com", type: "statuspage" },
    { id: "rubrik", name: "Rubrik", tags: ["security", "backup", "data-management", "enterprise"], status_url: "https://status.rubrik.com/api/v2/status.json", page_url: "https://status.rubrik.com", type: "statuspage" },
    { id: "cohesity", name: "Cohesity", tags: ["security", "data-management", "backup", "enterprise"], status_url: "https://status.cohesity.com/api/v2/status.json", page_url: "https://status.cohesity.com", type: "statuspage" },
    // Device management
    { id: "jamf", name: "Jamf", tags: ["device-management", "apple", "mdm", "enterprise"], status_url: "https://status.jamf.com/api/v2/status.json", page_url: "https://status.jamf.com", type: "statuspage" },
    // Healthcare tech
    { id: "drchrono", name: "DrChrono", tags: ["healthcare", "ehr", "medical", "saas"], status_url: "https://status.drchrono.com/api/v2/status.json", page_url: "https://status.drchrono.com", type: "statuspage" },
    { id: "healthsherpa", name: "HealthSherpa", tags: ["healthcare", "health-insurance", "marketplace", "saas"], status_url: "https://status.healthsherpa.com/api/v2/status.json", page_url: "https://status.healthsherpa.com", type: "statuspage" },
    // Real estate / property management
    { id: "yardi", name: "Yardi Systems", tags: ["real-estate", "property-management", "erp", "enterprise"], status_url: "https://status.yardi.com/api/v2/status.json", page_url: "https://status.yardi.com", type: "statuspage" },
    { id: "buildium", name: "Buildium", tags: ["real-estate", "property-management", "landlord", "saas"], status_url: "https://status.buildium.com/api/v2/status.json", page_url: "https://status.buildium.com", type: "statuspage" },
    { id: "propertyware", name: "Propertyware", tags: ["real-estate", "property-management", "landlord", "saas"], status_url: "https://status.propertyware.com/api/v2/status.json", page_url: "https://status.propertyware.com", type: "statuspage" },
    // Enterprise content management
    { id: "opentext", name: "OpenText", tags: ["content-management", "ecm", "information-management", "enterprise"], status_url: "https://status.opentext.com/api/v2/status.json", page_url: "https://status.opentext.com", type: "statuspage" },
    { id: "laserfiche", name: "Laserfiche", tags: ["content-management", "ecm", "document-management", "enterprise"], status_url: "https://status.laserfiche.com/api/v2/status.json", page_url: "https://status.laserfiche.com", type: "statuspage" },
    // Construction / BIM tech
    { id: "newforma_konekt", name: "Newforma Konekt", tags: ["construction", "project-management", "bim", "enterprise"], status_url: "https://status.bimtrack.co/api/v2/status.json", page_url: "https://status.bimtrack.co", type: "statuspage" },
    // Tick 109 additions
    // Restaurant / hospitality tech
    { id: "toasttab", name: "Toast POS", tags: ["pos", "restaurant", "hospitality", "payments"], status_url: "https://status.toasttab.com/api/v2/status.json", page_url: "https://status.toasttab.com", type: "statuspage" },
    { id: "olo", name: "Olo", tags: ["restaurant", "online-ordering", "delivery", "saas"], status_url: "https://status.olo.com/api/v2/status.json", page_url: "https://status.olo.com", type: "statuspage" },
    // CRM / sales
    { id: "capsulecrm", name: "Capsule CRM", tags: ["crm", "sales", "smb", "saas"], status_url: "https://status.capsulecrm.com/api/v2/status.json", page_url: "https://status.capsulecrm.com", type: "statuspage" },
    // Social media management
    { id: "buffer", name: "Buffer", tags: ["social-media", "marketing", "scheduling", "saas"], status_url: "https://status.buffer.com/api/v2/status.json", page_url: "https://status.buffer.com", type: "statuspage" },
    { id: "statusbrew", name: "Statusbrew", tags: ["social-media", "marketing", "analytics", "saas"], status_url: "https://status.statusbrew.com/api/v2/status.json", page_url: "https://status.statusbrew.com", type: "statuspage" },
    // Sales enablement / training
    { id: "mindtickle", name: "MindTickle", tags: ["sales-enablement", "training", "revenue", "enterprise"], status_url: "https://status.mindtickle.com/api/v2/status.json", page_url: "https://status.mindtickle.com", type: "statuspage" },
    // ERP / integration
    { id: "salto", name: "Salto", tags: ["erp", "integration", "netsuite", "saas"], status_url: "https://status.salto.io/api/v2/status.json", page_url: "https://status.salto.io", type: "statuspage" },
    // Field service / home services
    { id: "housecallpro", name: "Housecall Pro", tags: ["field-service", "home-services", "hvac", "saas"], status_url: "https://status.housecallpro.com/api/v2/status.json", page_url: "https://status.housecallpro.com", type: "statuspage" },
    // HR / recruiting
    { id: "recruitee", name: "Tellent (Recruitee)", tags: ["ats", "recruiting", "hr", "saas"], status_url: "https://status.recruitee.com/api/v2/status.json", page_url: "https://status.recruitee.com", type: "statuspage" },
    { id: "comeet", name: "Comeet", tags: ["ats", "recruiting", "hr", "saas"], status_url: "https://status.comeet.com/api/v2/status.json", page_url: "https://status.comeet.com", type: "statuspage" },
    // Proposals / e-signatures
    { id: "proposify", name: "Proposify", tags: ["proposals", "sales", "e-signature", "saas"], status_url: "https://status.proposify.com/api/v2/status.json", page_url: "https://status.proposify.com", type: "statuspage" },
    { id: "qwilr", name: "Qwilr", tags: ["proposals", "sales", "content", "saas"], status_url: "https://status.qwilr.com/api/v2/status.json", page_url: "https://status.qwilr.com", type: "statuspage" },
    // Spend management / corporate cards
    { id: "spendesk", name: "Spendesk", tags: ["spend-management", "finance", "corporate-cards", "saas"], status_url: "https://status.spendesk.com/api/v2/status.json", page_url: "https://status.spendesk.com", type: "statuspage" },
    { id: "pleo", name: "Pleo", tags: ["spend-management", "finance", "corporate-cards", "saas"], status_url: "https://status.pleo.io/api/v2/status.json", page_url: "https://status.pleo.io", type: "statuspage" },
    // IT management / MSP / RMM
    { id: "ninjaone", name: "NinjaOne", tags: ["it-management", "rmm", "msp", "endpoint"], status_url: "https://status.ninjaone.com/api/v2/status.json", page_url: "https://status.ninjaone.com", type: "statuspage" },
    { id: "atera", name: "Atera", tags: ["it-management", "rmm", "msp", "saas"], status_url: "https://status.atera.com/api/v2/status.json", page_url: "https://status.atera.com", type: "statuspage" },
    { id: "kaseya", name: "Kaseya", tags: ["it-management", "rmm", "msp", "enterprise"], status_url: "https://status.kaseya.com/api/v2/status.json", page_url: "https://status.kaseya.com", type: "statuspage" },
    { id: "auvik", name: "Auvik Networks", tags: ["network-monitoring", "it-management", "msp", "saas"], status_url: "https://status.auvik.com/api/v2/status.json", page_url: "https://status.auvik.com", type: "statuspage" },
    { id: "datto", name: "Datto", tags: ["backup", "disaster-recovery", "msp", "enterprise"], status_url: "https://status.datto.com/api/v2/status.json", page_url: "https://status.datto.com", type: "statuspage" },
    // Education / LMS
    { id: "instructure", name: "Instructure (Canvas LMS)", tags: ["edtech", "lms", "education", "saas"], status_url: "https://status.instructure.com/api/v2/status.json", page_url: "https://status.instructure.com", type: "statuspage" },
    { id: "blackboard", name: "Blackboard", tags: ["edtech", "lms", "education", "saas"], status_url: "https://status.blackboard.com/api/v2/status.json", page_url: "https://status.blackboard.com", type: "statuspage" },
    { id: "coursera", name: "Coursera", tags: ["edtech", "education", "saas"], status_url: "https://status.coursera.org/api/v2/status.json", page_url: "https://status.coursera.org", type: "statuspage" },
    { id: "udemy", name: "Udemy for Business", tags: ["edtech", "education", "hr", "saas"], status_url: "https://status.udemy.com/api/v2/status.json", page_url: "https://status.udemy.com", type: "statuspage" },
    { id: "learnupon", name: "LearnUpon LMS", tags: ["edtech", "lms", "hr", "saas"], status_url: "https://status.learnupon.com/api/v2/status.json", page_url: "https://status.learnupon.com", type: "statuspage" },
    { id: "threesixtylearning", name: "360Learning", tags: ["edtech", "lms", "hr", "saas"], status_url: "https://status.360learning.com/api/v2/status.json", page_url: "https://status.360learning.com", type: "statuspage" },
    // Data streaming / event platforms
    { id: "confluent", name: "Confluent Cloud", tags: ["data", "kafka", "streaming", "saas"], status_url: "https://status.confluent.cloud/api/v2/status.json", page_url: "https://status.confluent.cloud", type: "statuspage" },
    // Engineering / CAD / AEC
    { id: "autodesk", name: "Autodesk", tags: ["developer-tools", "construction", "manufacturing", "saas"], status_url: "https://health.autodesk.com/api/v2/status.json", page_url: "https://health.autodesk.com", type: "statuspage" },
    { id: "bentley", name: "Bentley Systems", tags: ["construction", "engineering", "infrastructure", "saas"], status_url: "https://status.bentley.com/api/v2/status.json", page_url: "https://status.bentley.com", type: "statuspage" },
    // Insurance software
    { id: "guidewire", name: "Guidewire", tags: ["insurance", "enterprise", "saas"], status_url: "https://status.guidewire.com/api/v2/status.json", page_url: "https://status.guidewire.com", type: "statuspage" },
    // Video / media delivery
    { id: "jwplayer", name: "JW Player", tags: ["video", "media", "cdn", "saas"], status_url: "https://status.jwplayer.com/api/v2/status.json", page_url: "https://status.jwplayer.com", type: "statuspage" },
    { id: "kaltura", name: "Kaltura", tags: ["video", "media", "edtech", "saas"], status_url: "https://status.kaltura.com/api/v2/status.json", page_url: "https://status.kaltura.com", type: "statuspage" },
    { id: "dailymotion", name: "Dailymotion", tags: ["video", "media", "saas"], status_url: "https://status.dailymotion.com/api/v2/status.json", page_url: "https://status.dailymotion.com", type: "statuspage" },
    // Nonprofit CRM
    { id: "bloomerang", name: "Bloomerang", tags: ["crm", "nonprofit", "saas"], status_url: "https://status.bloomerang.co/api/v2/status.json", page_url: "https://status.bloomerang.co", type: "statuspage" },
    { id: "blackbaud", name: "Blackbaud", tags: ["nonprofit", "crm", "fundraising", "saas"], status_url: "https://status.blackbaud.com/api/v2/status.json", page_url: "https://status.blackbaud.com", type: "statuspage" },
    // Supply chain / logistics
    { id: "fourkites", name: "FourKites", tags: ["logistics", "supply-chain", "saas"], status_url: "https://status.fourkites.com/api/v2/status.json", page_url: "https://status.fourkites.com", type: "statuspage" },
    // Fleet management
    { id: "fleetio", name: "Fleetio", tags: ["fleet", "logistics", "saas"], status_url: "https://status.fleetio.com/api/v2/status.json", page_url: "https://status.fleetio.com", type: "statuspage" },
    // UX research
    { id: "usertesting", name: "UserTesting", tags: ["ux", "research", "testing", "saas"], status_url: "https://status.usertesting.com/api/v2/status.json", page_url: "https://status.usertesting.com", type: "statuspage" },
    // Mobile attribution / analytics
    { id: "appsflyer", name: "AppsFlyer", tags: ["analytics", "mobile", "attribution", "marketing"], status_url: "https://status.appsflyer.com/api/v2/status.json", page_url: "https://status.appsflyer.com", type: "statuspage" },
    // Security / identity access management
    { id: "cerby", name: "Cerby", tags: ["security", "iam", "access-management", "saas"], status_url: "https://status.cerby.com/api/v2/status.json", page_url: "https://status.cerby.com", type: "statuspage" },
    { id: "socket_dev", name: "Socket", tags: ["security", "supply-chain", "npm", "devtools"], status_url: "https://status.socket.dev/api/v2/status.json", page_url: "https://status.socket.dev", type: "statuspage" },
    // AI coding assistant
    { id: "tabnine", name: "Tabnine", tags: ["ai", "developer-tools", "code-completion", "ide"], status_url: "https://status.tabnine.com/api/v2/status.json", page_url: "https://status.tabnine.com", type: "statuspage" },
    // Bare-metal / colocation cloud
    { id: "equinix_metal", name: "Equinix Metal", tags: ["cloud", "bare-metal", "infrastructure", "iaas"], status_url: "https://status.equinixmetal.com/api/v2/status.json", page_url: "https://status.equinixmetal.com", type: "statuspage" },
    // Visual collaboration
    { id: "mural", name: "Mural", tags: ["collaboration", "whiteboard", "design", "saas"], status_url: "https://status.mural.co/api/v2/status.json", page_url: "https://status.mural.co", type: "statuspage" },
    // Checkout / payments
    { id: "bolt_payments", name: "Bolt", tags: ["payments", "checkout", "ecommerce", "fintech"], status_url: "https://status.bolt.com/api/v2/status.json", page_url: "https://status.bolt.com", type: "statuspage" },
    // Serverless GPU compute
    { id: "beam_cloud", name: "Beam Cloud", tags: ["cloud", "serverless", "gpu", "ai-infra"], status_url: "https://status.beam.cloud/api/v2/status.json", page_url: "https://status.beam.cloud", type: "statuspage" },
    // Compliance cloud / HIPAA PaaS
    { id: "aptible", name: "Aptible", tags: ["cloud", "compliance", "hipaa", "paas"], status_url: "https://status.aptible.com/api/v2/status.json", page_url: "https://status.aptible.com", type: "statuspage" },
    // Business VoIP / call center
    { id: "cloudtalk", name: "CloudTalk", tags: ["voip", "telephony", "call-center", "saas"], status_url: "https://status.cloudtalk.io/api/v2/status.json", page_url: "https://status.cloudtalk.io", type: "statuspage" },
    // Card issuing / payments infrastructure
    { id: "marqeta", name: "Marqeta", tags: ["payments", "card-issuing", "fintech", "api"], status_url: "https://status.marqeta.com/api/v2/status.json", page_url: "https://status.marqeta.com", type: "statuspage" },
    // Event-driven background jobs / queues
    { id: "inngest", name: "Inngest", tags: ["devtools", "queues", "background-jobs", "serverless"], status_url: "https://status.inngest.com/api/v2/status.json", page_url: "https://status.inngest.com", type: "statuspage" },
    // Gaming / digital content platform
    { id: "epicgames", name: "Epic Games", tags: ["gaming", "marketplace", "digital-content", "saas"], status_url: "https://status.epicgames.com/api/v2/status.json", page_url: "https://status.epicgames.com", type: "statuspage" },
    // Real-time collaborative comments SDK
    { id: "velt", name: "Velt", tags: ["devtools", "collaboration", "sdk", "realtime"], status_url: "https://status.velt.dev/api/v2/status.json", page_url: "https://status.velt.dev", type: "statuspage" },
    // Zero-trust network access
    { id: "twingate", name: "Twingate", tags: ["security", "vpn", "zero-trust", "networking"], status_url: "https://status.twingate.com/api/v2/status.json", page_url: "https://status.twingate.com", type: "statuspage" },
    // Global payments / money movement (APAC/emerging markets)
    { id: "nium", name: "Nium", tags: ["payments", "fintech", "global", "api"], status_url: "https://status.nium.com/api/v2/status.json", page_url: "https://status.nium.com", type: "statuspage" },
    // Secrets detection / developer security
    { id: "gitguardian", name: "GitGuardian", tags: ["security", "secrets", "devsecops", "devtools"], status_url: "https://status.gitguardian.com/api/v2/status.json", page_url: "https://status.gitguardian.com", type: "statuspage" },
    // Southeast Asian payment gateway
    { id: "xendit", name: "Xendit", tags: ["payments", "fintech", "southeast-asia", "api"], status_url: "https://status.xendit.co/api/v2/status.json", page_url: "https://status.xendit.co", type: "statuspage" },
    // 3D printing / digital manufacturing
    { id: "formlabs", name: "Formlabs", tags: ["manufacturing", "3d-printing", "iot", "cloud"], status_url: "https://status.formlabs.com/api/v2/status.json", page_url: "https://status.formlabs.com", type: "statuspage" },
    // ML data labeling / annotation platform
    { id: "kili_technology", name: "Kili Technology", tags: ["ai", "ml", "data-labeling", "annotation"], status_url: "https://status.kili-technology.com/api/v2/status.json", page_url: "https://status.kili-technology.com", type: "statuspage" },
    // ML training data / annotation platform
    { id: "encord", name: "Encord", tags: ["ai", "ml", "data-labeling", "annotation"], status_url: "https://status.encord.com/api/v2/status.json", page_url: "https://status.encord.com", type: "statuspage" },
    // IoT cloud platform
    { id: "particle", name: "Particle", tags: ["iot", "cloud", "hardware", "developer-tools"], status_url: "https://status.particle.io/api/v2/status.json", page_url: "https://status.particle.io", type: "statuspage" },
    // HR software (Europe)
    { id: "factorial", name: "Factorial", tags: ["hr", "payroll", "people-ops", "saas"], status_url: "https://status.factorialhr.com/api/v2/status.json", page_url: "https://status.factorialhr.com", type: "statuspage" },
    // AI video generation
    { id: "synthesia", name: "Synthesia", tags: ["ai", "video", "generation", "saas"], status_url: "https://status.synthesia.io/api/v2/status.json", page_url: "https://status.synthesia.io", type: "statuspage" },
    // Code search and intelligence platform
    { id: "sourcegraph", name: "Sourcegraph", tags: ["devtools", "code-search", "developer-tools", "saas"], status_url: "https://sourcegraphstatus.com/api/v2/status.json", page_url: "https://sourcegraphstatus.com", type: "statuspage" },
    // Landing page builder
    { id: "unbounce", name: "Unbounce", tags: ["marketing", "landing-pages", "conversion", "saas"], status_url: "https://status.unbounce.com/api/v2/status.json", page_url: "https://status.unbounce.com", type: "statuspage" },
    // Identity verification platform
    { id: "persona", name: "Persona", tags: ["identity", "kyc", "verification", "security"], status_url: "https://status.withpersona.com/api/v2/status.json", page_url: "https://status.withpersona.com", type: "statuspage" },
    // Conversational AI / chatbot builder
    { id: "voiceflow", name: "Voiceflow", tags: ["ai", "chatbot", "conversational-ai", "devtools"], status_url: "https://status.voiceflow.com/api/v2/status.json", page_url: "https://status.voiceflow.com", type: "statuspage" },
    // ACH payments platform
    { id: "dwolla", name: "Dwolla", tags: ["payments", "ach", "fintech", "api"], status_url: "https://status.dwolla.com/api/v2/status.json", page_url: "https://status.dwolla.com", type: "statuspage" },
    // Employment background checks
    { id: "checkr", name: "Checkr", tags: ["hr", "background-checks", "compliance", "saas"], status_url: "https://checkrstatus.com/api/v2/status.json", page_url: "https://checkrstatus.com", type: "statuspage" },
    // AI-powered fraud prevention
    { id: "sardine_ai", name: "Sardine", tags: ["security", "fraud-prevention", "fintech", "api"], status_url: "https://status.sardine.ai/api/v2/status.json", page_url: "https://status.sardine.ai", type: "statuspage" },
    // HR software (Canada)
    { id: "humi", name: "Humi", tags: ["hr", "payroll", "people-ops", "canada"], status_url: "https://status.humi.ca/api/v2/status.json", page_url: "https://status.humi.ca", type: "statuspage" },
    // Payment facilitation (Worldpay for Platforms)
    { id: "payrix", name: "Payrix", tags: ["payments", "payfac", "fintech", "api"], status_url: "https://status.payrix.com/api/v2/status.json", page_url: "https://status.payrix.com", type: "statuspage" },
    // Payment orchestration platform
    { id: "spreedly", name: "Spreedly", tags: ["payments", "orchestration", "fintech", "api"], status_url: "https://status.spreedly.com/api/v2/status.json", page_url: "https://status.spreedly.com", type: "statuspage" },
    // Async standup / team updates bot
    { id: "geekbot", name: "Geekbot", tags: ["productivity", "standup", "slack", "saas"], status_url: "https://status.geekbot.com/api/v2/status.json", page_url: "https://status.geekbot.com", type: "statuspage" },
    // Chatbot builder platform
    { id: "botpress", name: "Botpress", tags: ["ai", "chatbot", "conversational-ai", "devtools"], status_url: "https://status.botpress.com/api/v2/status.json", page_url: "https://status.botpress.com", type: "statuspage" },
    // No-code chatbot builder
    { id: "landbot", name: "Landbot", tags: ["chatbot", "no-code", "conversational-ai", "saas"], status_url: "https://status.landbot.io/api/v2/status.json", page_url: "https://status.landbot.io", type: "statuspage" },
    // Roofing contractor management software
    { id: "acculynx", name: "AccuLynx", tags: ["construction", "roofing", "field-service", "saas"], status_url: "https://status.acculynx.com/api/v2/status.json", page_url: "https://status.acculynx.com", type: "statuspage" },
    // Banking API (ACH / RTP)
    { id: "increase", name: "Increase", tags: ["banking", "fintech", "api", "payments"], status_url: "https://status.increase.com/api/v2/status.json", page_url: "https://status.increase.com", type: "statuspage" },
    // Banking-as-a-Service platform
    { id: "treasury_prime", name: "Treasury Prime", tags: ["banking", "baas", "fintech", "api"], status_url: "https://status.treasuryprime.com/api/v2/status.json", page_url: "https://status.treasuryprime.com", type: "statuspage" },
    // Modern card issuing
    { id: "lithic", name: "Lithic", tags: ["payments", "card-issuing", "fintech", "api"], status_url: "https://status.lithic.com/api/v2/status.json", page_url: "https://status.lithic.com", type: "statuspage" },
    // Card issuing / embedded finance
    { id: "highnote", name: "Highnote", tags: ["payments", "card-issuing", "fintech", "api"], status_url: "https://status.highnote.com/api/v2/status.json", page_url: "https://status.highnote.com", type: "statuspage" },
    // Low-code / no-code platforms
    { id: "outsystems", name: "OutSystems", tags: ["low-code", "no-code", "development", "saas"], status_url: "https://status.outsystems.com/api/v2/status.json", page_url: "https://status.outsystems.com", type: "statuspage" },
    { id: "mendix", name: "Mendix", tags: ["low-code", "no-code", "development", "saas"], status_url: "https://status.mendix.com/api/v2/status.json", page_url: "https://status.mendix.com", type: "statuspage" },
    // Automation / integration
    { id: "make_com", name: "Make", tags: ["automation", "integration", "no-code", "workflow"], status_url: "https://status.make.com/api/v2/status.json", page_url: "https://status.make.com", type: "statuspage" },
    { id: "stitch_data", name: "Stitch Data", tags: ["etl", "data-integration", "pipeline", "analytics"], status_url: "https://status.stitchdata.com/api/v2/status.json", page_url: "https://status.stitchdata.com", type: "statuspage" },
    // Code quality / security
    { id: "sonarqube", name: "SonarQube", tags: ["code-quality", "sast", "devtools", "ci-cd"], status_url: "https://status.sonarqube.com/api/v2/status.json", page_url: "https://status.sonarqube.com", type: "statuspage" },
    // Monitoring / observability
    { id: "newrelic", name: "New Relic", tags: ["monitoring", "observability", "apm", "saas"], status_url: "https://status.newrelic.com/api/v2/status.json", page_url: "https://status.newrelic.com", type: "statuspage" },
    { id: "logz_io", name: "Logz.io", tags: ["monitoring", "observability", "logging", "saas"], status_url: "https://status.logz.io/api/v2/status.json", page_url: "https://status.logz.io", type: "statuspage" },
    // LMS / e-learning
    { id: "skilljar", name: "Skilljar", tags: ["lms", "e-learning", "training", "saas"], status_url: "https://status.skilljar.com/api/v2/status.json", page_url: "https://status.skilljar.com", type: "statuspage" },
    // CRM / sales
    { id: "nutshell", name: "Nutshell", tags: ["crm", "sales", "email", "saas"], status_url: "https://status.nutshell.com/api/v2/status.json", page_url: "https://status.nutshell.com", type: "statuspage" },
    // Email marketing
    { id: "listrak", name: "Listrak", tags: ["email", "marketing", "ecommerce", "saas"], status_url: "https://status.listrak.com/api/v2/status.json", page_url: "https://status.listrak.com", type: "statuspage" },
    // Legal tech
    { id: "practicepanther", name: "PracticePanther", tags: ["legal", "law-firm", "practice-management", "saas"], status_url: "https://status.practicepanther.com/api/v2/status.json", page_url: "https://status.practicepanther.com", type: "statuspage" },
    // Analytics / BI
    { id: "count_co", name: "Count", tags: ["analytics", "bi", "sql", "data"], status_url: "https://status.count.co/api/v2/status.json", page_url: "https://status.count.co", type: "statuspage" },
    // Reputation management
    { id: "reputation", name: "Reputation.com", tags: ["reputation", "reviews", "marketing", "saas"], status_url: "https://status.reputation.com/api/v2/status.json", page_url: "https://status.reputation.com", type: "statuspage" },
    // JavaScript error tracking
    { id: "trackjs", name: "TrackJS", tags: ["error-tracking", "javascript", "monitoring", "developer-tools"], status_url: "https://status.trackjs.com/api/v2/status.json", page_url: "https://status.trackjs.com", type: "statuspage" },
    // Video hosting / streaming API
    { id: "api_video", name: "api.video", tags: ["video", "api", "media", "streaming"], status_url: "https://status.api.video/api/v2/status.json", page_url: "https://status.api.video", type: "statuspage" },
    // AI image generation
    { id: "ideogram", name: "Ideogram", tags: ["ai", "image-generation", "creative", "saas"], status_url: "https://status.ideogram.ai/api/v2/status.json", page_url: "https://status.ideogram.ai", type: "statuspage" },
    // Payment orchestration platform
    { id: "primer", name: "Primer", tags: ["payments", "fintech", "api", "orchestration"], status_url: "https://status.primer.io/api/v2/status.json", page_url: "https://status.primer.io", type: "statuspage" },
    // Email marketing for creators / small business
    { id: "emailoctopus", name: "EmailOctopus", tags: ["email", "marketing", "saas", "automation"], status_url: "https://status.emailoctopus.com/api/v2/status.json", page_url: "https://status.emailoctopus.com", type: "statuspage" },
    // Cold email / outreach automation
    { id: "woodpecker", name: "Woodpecker", tags: ["email", "sales", "outreach", "automation"], status_url: "https://status.woodpecker.co/api/v2/status.json", page_url: "https://status.woodpecker.co", type: "statuspage" },
    // Shipment tracking / post-purchase
    { id: "aftership", name: "AfterShip", tags: ["logistics", "shipping", "tracking", "ecommerce"], status_url: "https://status.aftership.com/api/v2/status.json", page_url: "https://status.aftership.com", type: "statuspage" },
    // Multi-carrier shipping API
    { id: "shipengine", name: "ShipEngine", tags: ["shipping", "logistics", "api", "ecommerce"], status_url: "https://status.shipengine.com/api/v2/status.json", page_url: "https://status.shipengine.com", type: "statuspage" },
    // E-commerce subscription management
    { id: "skio", name: "Skio", tags: ["subscriptions", "ecommerce", "payments", "saas"], status_url: "https://status.skio.com/api/v2/status.json", page_url: "https://status.skio.com", type: "statuspage" },
    // Loyalty & rewards platform
    { id: "loyaltylion", name: "LoyaltyLion", tags: ["loyalty", "rewards", "ecommerce", "marketing"], status_url: "https://status.loyaltylion.com/api/v2/status.json", page_url: "https://status.loyaltylion.com", type: "statuspage" },
    // Compliance evidence automation
    { id: "anecdotes", name: "Anecdotes.ai", tags: ["compliance", "grc", "security", "saas"], status_url: "https://status.anecdotes.ai/api/v2/status.json", page_url: "https://status.anecdotes.ai", type: "statuspage" },
    // Cloud object storage (S3-compatible)
    { id: "wasabi", name: "Wasabi Cloud Storage", tags: ["storage", "cloud", "object-storage", "s3"], status_url: "https://status.wasabi.com/api/v2/status.json", page_url: "https://status.wasabi.com", type: "statuspage" },
    // AI prompt engineering & evaluation platform
    { id: "humanloop", name: "Humanloop", tags: ["ai", "llm", "prompts", "evaluation"], status_url: "https://humanloop.statuspage.io/api/v2/status.json", page_url: "https://humanloop.statuspage.io", type: "statuspage" },
    // Headless commerce infrastructure
    { id: "commercelayer", name: "Commerce Layer", tags: ["ecommerce", "headless", "api", "payments"], status_url: "https://status.commercelayer.io/api/v2/status.json", page_url: "https://status.commercelayer.io", type: "statuspage" },
    // Managed detection & response (MDR) security
    { id: "huntress", name: "Huntress", tags: ["security", "mdr", "endpoint", "saas"], status_url: "https://status.huntress.com/api/v2/status.json", page_url: "https://status.huntress.com", type: "statuspage" },
    // AI-powered email security
    { id: "abnormal_security", name: "Abnormal Security", tags: ["security", "email", "ai", "threat-protection"], status_url: "https://status.abnormalsecurity.com/api/v2/status.json", page_url: "https://status.abnormalsecurity.com", type: "statuspage" },
    // Computer vision & AI platform
    { id: "clarifai", name: "Clarifai", tags: ["ai", "computer-vision", "ml", "api"], status_url: "https://status.clarifai.com/api/v2/status.json", page_url: "https://status.clarifai.com", type: "statuspage" },
    // Marketing automation (EU-focused)
    { id: "actito", name: "Actito", tags: ["marketing", "automation", "email", "crm"], status_url: "https://status.actito.com/api/v2/status.json", page_url: "https://status.actito.com", type: "statuspage" },
    // Email retargeting & cart abandonment
    { id: "rejoiner", name: "Rejoiner", tags: ["email", "marketing", "ecommerce", "retargeting"], status_url: "https://status.rejoiner.com/api/v2/status.json", page_url: "https://status.rejoiner.com", type: "statuspage" },
    // Healthcare data integration platform
    { id: "redox", name: "Redox", tags: ["healthcare", "ehr", "api", "data-integration"], status_url: "https://status.redoxengine.com/api/v2/status.json", page_url: "https://status.redoxengine.com", type: "statuspage" },
    // Health data network & FHIR API
    { id: "healthgorilla", name: "Health Gorilla", tags: ["healthcare", "fhir", "api", "health-data"], status_url: "https://status.healthgorilla.com/api/v2/status.json", page_url: "https://status.healthgorilla.com", type: "statuspage" },
    // Mobile push notification platform
    { id: "batch", name: "Batch", tags: ["push-notifications", "mobile", "messaging", "engagement"], status_url: "https://status.batch.com/api/v2/status.json", page_url: "https://status.batch.com", type: "statuspage" },
    // Apple device management (MDM)
    { id: "addigy", name: "Addigy", tags: ["mdm", "apple", "device-management", "it"], status_url: "https://status.addigy.com/api/v2/status.json", page_url: "https://status.addigy.com", type: "statuspage" },
    // Apple device management platform
    { id: "kandji", name: "Kandji", tags: ["mdm", "apple", "device-management", "security"], status_url: "https://status.kandji.io/api/v2/status.json", page_url: "https://status.kandji.io", type: "statuspage" },
    // AI video generation (talking avatars)
    { id: "d_id", name: "D-ID", tags: ["ai", "video", "avatars", "generative"], status_url: "https://status.d-id.com/api/v2/status.json", page_url: "https://status.d-id.com", type: "statuspage" },
    // Decentralized IoT wireless network
    { id: "helium", name: "Helium", tags: ["iot", "blockchain", "wireless", "network"], status_url: "https://status.helium.com/api/v2/status.json", page_url: "https://status.helium.com", type: "statuspage" },
    // BNPL / installment payments
    { id: "sezzle", name: "Sezzle", tags: ["payments", "bnpl", "fintech", "ecommerce"], status_url: "https://status.sezzle.com/api/v2/status.json", page_url: "https://status.sezzle.com", type: "statuspage" },
    { id: "splitit", name: "Splitit", tags: ["payments", "bnpl", "fintech", "ecommerce"], status_url: "https://status.splitit.com/api/v2/status.json", page_url: "https://status.splitit.com", type: "statuspage" },
    { id: "paidy", name: "Paidy", tags: ["payments", "bnpl", "fintech", "japan"], status_url: "https://status.paidy.com/api/v2/status.json", page_url: "https://status.paidy.com", type: "statuspage" },
    // Time-series database platform
    { id: "influxdata", name: "InfluxDB Cloud", tags: ["database", "time-series", "iot", "observability"], status_url: "https://status.influxdata.com/api/v2/status.json", page_url: "https://status.influxdata.com", type: "statuspage" },
    // Monitoring platform (status.io)
    { id: "dynatrace", name: "Dynatrace", tags: ["monitoring", "observability", "apm", "infrastructure"], status_url: "https://api.status.io/1.0/status/546d8cb6af8407b6730000cb", page_url: "https://dynatrace.status.io", type: "statusio" },
    // Google Firebase (GCP incident format)
    { id: "firebase", name: "Google Firebase", tags: ["database", "hosting", "mobile", "google"], status_url: "https://status.firebase.google.com/incidents.json", page_url: "https://status.firebase.google.com", type: "gcp" },
    // Social media platform
    { id: "reddit", name: "Reddit", tags: ["social", "community", "media"], status_url: "https://www.redditstatus.com/api/v2/status.json", page_url: "https://www.redditstatus.com", type: "statuspage" },
    // Serverless database with branching
    { id: "xata", name: "Xata", tags: ["database", "postgres", "search", "serverless"], status_url: "https://www.xatastatus.com/api/v2/status.json", page_url: "https://www.xatastatus.com", type: "statuspage" },
    // Email marketing platform
    { id: "getresponse", name: "GetResponse", tags: ["email", "marketing", "automation", "saas"], status_url: "https://status.getresponse.com/api/v2/status.json", page_url: "https://status.getresponse.com", type: "statuspage" },
    // Code quality and test coverage
    { id: "codeclimate", name: "Code Climate", tags: ["code-quality", "testing", "devtools", "ci-cd"], status_url: "https://status.codeclimate.com/api/v2/status.json", page_url: "https://status.codeclimate.com", type: "statuspage" },
    // Investing platform
    { id: "wealthsimple", name: "Wealthsimple", tags: ["fintech", "investing", "trading", "canada"], status_url: "https://status.wealthsimple.com/api/v2/status.json", page_url: "https://status.wealthsimple.com", type: "statuspage" },
    { id: "robinhood", name: "Robinhood", tags: ["fintech", "investing", "trading", "stocks"], status_url: "https://status.robinhood.com/api/v2/status.json", page_url: "https://status.robinhood.com", type: "statuspage" },
    // Neobank
    { id: "chime", name: "Chime", tags: ["fintech", "banking", "neobank", "payments"], status_url: "https://status.chime.com/api/v2/status.json", page_url: "https://status.chime.com", type: "statuspage" },
    // Presentation platform
    { id: "prezi", name: "Prezi", tags: ["productivity", "presentations", "collaboration", "saas"], status_url: "https://status.prezi.com/api/v2/status.json", page_url: "https://status.prezi.com", type: "statuspage" },
    // Mobile/app development platform
    { id: "expo", name: "Expo", tags: ["mobile", "react-native", "developer-tools", "deployment"], status_url: "https://status.expo.dev/api/v2/status.json", page_url: "https://status.expo.dev", type: "statuspage" },
    // Security / bug bounty
    { id: "hackerone", name: "HackerOne", tags: ["security", "bug-bounty", "vulnerability", "saas"], status_url: "https://www.hackeronestatus.com/api/v2/status.json", page_url: "https://www.hackeronestatus.com", type: "statuspage" },
    // Passwordless / zero-trust authentication
    { id: "beyondidentity", name: "Beyond Identity", tags: ["auth", "identity", "security", "zero-trust"], status_url: "https://status.beyondidentity.com/api/v2/status.json", page_url: "https://status.beyondidentity.com", type: "statuspage" },
    // Privileged Access Management (PAM)
    { id: "delinea", name: "Delinea", tags: ["security", "pam", "identity", "privileged-access"], status_url: "https://status.delinea.com/api/v2/status.json", page_url: "https://status.delinea.com", type: "statuspage" },
    // Financial modeling / BI
    { id: "causal", name: "Causal", tags: ["analytics", "bi", "financial-modeling", "saas"], status_url: "https://status.causal.app/api/v2/status.json", page_url: "https://status.causal.app", type: "statuspage" },
    // Secure file sharing / collaboration
    { id: "tresorit", name: "Tresorit", tags: ["file-sharing", "security", "cloud-storage", "collaboration"], status_url: "https://status.tresorit.com/api/v2/status.json", page_url: "https://status.tresorit.com", type: "statuspage" },
    // Document parsing / data extraction
    { id: "docparser", name: "Docparser", tags: ["document-processing", "ocr", "api", "automation"], status_url: "https://status.docparser.com/api/v2/status.json", page_url: "https://status.docparser.com", type: "statuspage" },
    // GraphQL platform / federation
    { id: "apollographql", name: "Apollo GraphQL", tags: ["graphql", "api", "developer-tools", "platform"], status_url: "https://status.apollographql.com/api/v2/status.json", page_url: "https://status.apollographql.com", type: "statuspage" },
    // Cloud architecture diagramming
    { id: "cloudcraft", name: "Cloudcraft", tags: ["devops", "cloud", "diagramming", "developer-tools"], status_url: "https://status.cloudcraft.co/api/v2/status.json", page_url: "https://status.cloudcraft.co", type: "statuspage" },
    // AI voice conversations
    { id: "retellai", name: "Retell AI", tags: ["ai", "voice", "telephony", "api"], status_url: "https://status.retellai.com/api/v2/status.json", page_url: "https://status.retellai.com", type: "statuspage" },
    // AI inference (SambaNova Systems)
    { id: "sambanova", name: "SambaNova", tags: ["ai", "llm", "inference", "api"], status_url: "https://status.sambanova.ai/api/v2/status.json", page_url: "https://status.sambanova.ai", type: "statuspage" },
    // Lambda AI cloud inference
    { id: "lambda_ai", name: "Lambda AI", tags: ["ai", "cloud", "inference", "gpu"], status_url: "https://status.lambda.ai/api/v2/status.json", page_url: "https://status.lambda.ai", type: "statuspage" },
    // Data catalog / data governance
    { id: "atlan", name: "Atlan", tags: ["data", "catalog", "governance", "metadata"], status_url: "https://status.atlan.com/api/v2/status.json", page_url: "https://status.atlan.com", type: "statuspage" },
    // No-code app builder
    { id: "stacker", name: "Stacker", tags: ["no-code", "app-builder", "productivity", "saas"], status_url: "https://status.stacker.app/api/v2/status.json", page_url: "https://status.stacker.app", type: "statuspage" },
    // Business intelligence / analytics
    { id: "omni", name: "Omni Analytics", tags: ["bi", "analytics", "data", "saas"], status_url: "https://status.omni.co/api/v2/status.json", page_url: "https://status.omni.co", type: "statuspage" },
    // Crypto exchanges
    { id: "coinbase", name: "Coinbase", tags: ["crypto", "exchange", "fintech", "payments"], status_url: "https://status.coinbase.com/api/v2/status.json", page_url: "https://status.coinbase.com", type: "statuspage" },
    { id: "kraken", name: "Kraken", tags: ["crypto", "exchange", "fintech", "trading"], status_url: "https://status.kraken.com/api/v2/status.json", page_url: "https://status.kraken.com", type: "statuspage" },
    { id: "gemini", name: "Gemini Exchange", tags: ["crypto", "exchange", "fintech", "trading"], status_url: "https://status.gemini.com/api/v2/status.json", page_url: "https://status.gemini.com", type: "statuspage" },
    { id: "blockchain_com", name: "Blockchain.com", tags: ["crypto", "bitcoin", "fintech", "wallet"], status_url: "https://status.blockchain.com/api/v2/status.json", page_url: "https://status.blockchain.com", type: "statuspage" },
    { id: "cexio", name: "CEX.IO", tags: ["crypto", "exchange", "fintech", "trading"], status_url: "https://status.cex.io/api/v2/status.json", page_url: "https://status.cex.io", type: "statuspage" },
    // Project management
    { id: "workflowmax", name: "WorkflowMax", tags: ["project-management", "job-management", "saas", "productivity"], status_url: "https://status.workflowmax.com/api/v2/status.json", page_url: "https://status.workflowmax.com", type: "statuspage" },
    // AI / vector search
    { id: "vectara", name: "Vectara", tags: ["ai", "search", "vector-db", "llm", "rag"], status_url: "https://status.vectara.com/api/v2/status.json", page_url: "https://status.vectara.com", type: "statuspage" },
    // Education
    { id: "duolingo", name: "Duolingo", tags: ["education", "language-learning", "saas", "mobile"], status_url: "https://status.duolingo.com/api/v2/status.json", page_url: "https://status.duolingo.com", type: "statuspage" },
    { id: "kahoot", name: "Kahoot", tags: ["education", "learning", "gamification", "saas"], status_url: "https://status.kahoot.com/api/v2/status.json", page_url: "https://status.kahoot.com", type: "statuspage" },
    // Email clients / privacy
    { id: "superhuman", name: "Superhuman", tags: ["email", "productivity", "saas", "enterprise"], status_url: "https://status.superhuman.com/api/v2/status.json", page_url: "https://status.superhuman.com", type: "statuspage" },
    { id: "proton", name: "Proton", tags: ["email", "privacy", "security", "vpn"], status_url: "https://status.proton.me/api/v2/status.json", page_url: "https://status.proton.me", type: "statuspage" },
    // 3D design
    { id: "spline", name: "Spline", tags: ["design", "3d", "creative", "developer-tools"], status_url: "https://status.spline.design/api/v2/status.json", page_url: "https://status.spline.design", type: "statuspage" },
    // Website builder
    { id: "duda", name: "Duda", tags: ["website-builder", "cms", "saas", "agencies"], status_url: "https://status.duda.co/api/v2/status.json", page_url: "https://status.duda.co", type: "statuspage" },
    // Web performance testing
    { id: "webpagetest", name: "WebPageTest", tags: ["performance", "testing", "developer-tools", "monitoring"], status_url: "https://status.webpagetest.org/api/v2/status.json", page_url: "https://status.webpagetest.org", type: "statuspage" },
    // Databases
    { id: "tembo", name: "Tembo", tags: ["database", "postgres", "cloud", "saas"], status_url: "https://status.tembo.io/api/v2/status.json", page_url: "https://status.tembo.io", type: "statuspage" },
    // Tick 120 additions
    { id: "khan_academy", name: "Khan Academy", tags: ["education", "learning", "nonprofit", "saas"], status_url: "https://status.khanacademy.org/api/v2/status.json", page_url: "https://status.khanacademy.org", type: "statuspage" },
    { id: "strava", name: "Strava", tags: ["fitness", "sports", "social", "mobile"], status_url: "https://status.strava.com/api/v2/status.json", page_url: "https://status.strava.com", type: "statuspage" },
    { id: "peloton", name: "Peloton", tags: ["fitness", "hardware", "streaming", "saas"], status_url: "https://status.onepeloton.com/api/v2/status.json", page_url: "https://status.onepeloton.com", type: "statuspage" },
    { id: "mightynetworks", name: "Mighty Networks", tags: ["community", "courses", "social", "saas"], status_url: "https://status.mightynetworks.com/api/v2/status.json", page_url: "https://status.mightynetworks.com", type: "statuspage" },
    { id: "insightly", name: "Insightly", tags: ["crm", "project-management", "saas", "sales"], status_url: "https://status.insightly.com/api/v2/status.json", page_url: "https://status.insightly.com", type: "statuspage" },
    { id: "freeagent", name: "FreeAgent", tags: ["accounting", "fintech", "small-business", "saas"], status_url: "https://status.freeagent.com/api/v2/status.json", page_url: "https://status.freeagent.com", type: "statuspage" },
    { id: "vindicia", name: "Vindicia", tags: ["billing", "subscriptions", "payments", "fintech"], status_url: "https://status.vindicia.com/api/v2/status.json", page_url: "https://status.vindicia.com", type: "statuspage" },
    { id: "fera", name: "Fera.ai", tags: ["reviews", "ecommerce", "social-proof", "saas"], status_url: "https://status.fera.ai/api/v2/status.json", page_url: "https://status.fera.ai", type: "statuspage" },
    { id: "judge_me", name: "Judge.me", tags: ["reviews", "ecommerce", "social-proof", "shopify"], status_url: "https://status.judge.me/api/v2/status.json", page_url: "https://status.judge.me", type: "statuspage" },
    { id: "taxbit", name: "TaxBit", tags: ["crypto", "tax", "fintech", "compliance"], status_url: "https://status.taxbit.com/api/v2/status.json", page_url: "https://status.taxbit.com", type: "statuspage" },
    { id: "cointracker", name: "CoinTracker", tags: ["crypto", "tax", "portfolio", "fintech"], status_url: "https://status.cointracker.io/api/v2/status.json", page_url: "https://status.cointracker.io", type: "statuspage" },
    { id: "emailonacid", name: "Email on Acid", tags: ["email", "testing", "qa", "deliverability"], status_url: "https://status.emailonacid.com/api/v2/status.json", page_url: "https://status.emailonacid.com", type: "statuspage" },
    { id: "litmus", name: "Litmus", tags: ["email", "testing", "marketing", "analytics"], status_url: "https://status.litmus.com/api/v2/status.json", page_url: "https://status.litmus.com", type: "statuspage" },
    { id: "mediasite", name: "Mediasite", tags: ["video", "webinar", "learning", "enterprise"], status_url: "https://status.mediasite.com/api/v2/status.json", page_url: "https://status.mediasite.com", type: "statuspage" },
    { id: "appcenter", name: "Visual Studio App Center", tags: ["mobile", "ci-cd", "testing", "microsoft"], status_url: "https://status.appcenter.ms/api/v2/status.json", page_url: "https://status.appcenter.ms", type: "statuspage" },
    // Tick 121 additions
    { id: "teleport", name: "Teleport Cloud", tags: ["security", "infrastructure", "zero-trust", "devops"], status_url: "https://status.teleport.sh/api/v2/status.json", page_url: "https://status.teleport.sh", type: "statuspage" },
    { id: "bigpanda", name: "BigPanda", tags: ["aiops", "monitoring", "incident-management", "observability"], status_url: "https://status.bigpanda.io/api/v2/status.json", page_url: "https://status.bigpanda.io", type: "statuspage" },
    { id: "lastpass", name: "LastPass", tags: ["security", "password-manager", "identity", "saas"], status_url: "https://lastpass.statuspage.io/api/v2/status.json", page_url: "https://status.lastpass.com", type: "statuspage" },
    { id: "cdnjs", name: "cdnjs", tags: ["cdn", "javascript", "open-source", "developer-tools"], status_url: "https://status.cdnjs.com/api/v2/status.json", page_url: "https://status.cdnjs.com", type: "statuspage" },
    { id: "nosto", name: "Nosto", tags: ["ecommerce", "personalization", "marketing", "saas"], status_url: "https://status.nosto.com/api/v2/status.json", page_url: "https://status.nosto.com", type: "statuspage" },
    { id: "wire", name: "Wire", tags: ["messaging", "security", "collaboration", "enterprise"], status_url: "https://status.wire.com/api/v2/status.json", page_url: "https://status.wire.com", type: "statuspage" },
    { id: "matrix_org", name: "Matrix.org", tags: ["messaging", "open-source", "protocol", "decentralized"], status_url: "https://status.matrix.org/api/v2/status.json", page_url: "https://status.matrix.org", type: "statuspage" },
    { id: "trint", name: "Trint", tags: ["transcription", "media", "ai", "journalism"], status_url: "https://status.trint.com/api/v2/status.json", page_url: "https://status.trint.com", type: "statuspage" },
    { id: "worldpay", name: "Worldpay", tags: ["payments", "fintech", "acquiring", "processing"], status_url: "https://status.worldpay.com/api/v2/status.json", page_url: "https://status.worldpay.com", type: "statuspage" },
    { id: "360learning", name: "360Learning", tags: ["lms", "learning", "training", "saas"], status_url: "https://status.360learning.com/api/v2/status.json", page_url: "https://status.360learning.com", type: "statuspage" },
    { id: "litmos", name: "Litmos", tags: ["lms", "learning", "training", "saas"], status_url: "https://litmos.statuspage.io/api/v2/status.json", page_url: "https://litmos.statuspage.io", type: "statuspage" },
    // Tick 122 additions
    // Mobile attribution / engagement
    { id: "branch", name: "Branch", tags: ["mobile", "attribution", "deep-links", "analytics"], status_url: "https://status.branch.io/api/v2/status.json", page_url: "https://status.branch.io", type: "statuspage" },
    { id: "adjust", name: "Adjust", tags: ["mobile", "attribution", "analytics", "adtech"], status_url: "https://status.adjust.com/api/v2/status.json", page_url: "https://status.adjust.com", type: "statuspage" },
    { id: "clevertap", name: "CleverTap", tags: ["mobile", "analytics", "engagement", "marketing"], status_url: "https://status.clevertap.com/api/v2/status.json", page_url: "https://status.clevertap.com", type: "statuspage" },
    { id: "moengage", name: "MoEngage", tags: ["mobile", "engagement", "marketing", "saas"], status_url: "https://status.moengage.com/api/v2/status.json", page_url: "https://status.moengage.com", type: "statuspage" },
    // ABM / revenue intelligence
    { id: "sixsense", name: "6sense", tags: ["abm", "revenue-intelligence", "marketing", "saas"], status_url: "https://status.6sense.com/api/v2/status.json", page_url: "https://status.6sense.com", type: "statuspage" },
    // Video conferencing infrastructure
    { id: "pexip", name: "Pexip", tags: ["video-conferencing", "infrastructure", "enterprise", "saas"], status_url: "https://status.pexip.com/api/v2/status.json", page_url: "https://status.pexip.com", type: "statuspage" },
    // Business messaging / VoIP / contact center
    { id: "avochato", name: "Avochato", tags: ["sms", "messaging", "business", "saas"], status_url: "https://status.avochato.com/api/v2/status.json", page_url: "https://status.avochato.com", type: "statuspage" },
    { id: "kixie", name: "Kixie", tags: ["voip", "sales-dialer", "crm", "saas"], status_url: "https://status.kixie.com/api/v2/status.json", page_url: "https://status.kixie.com", type: "statuspage" },
    { id: "aloware", name: "Aloware", tags: ["contact-center", "voip", "sales", "saas"], status_url: "https://status.aloware.com/api/v2/status.json", page_url: "https://status.aloware.com", type: "statuspage" },
    // Web accessibility
    { id: "audioeye", name: "AudioEye", tags: ["accessibility", "ada", "compliance", "saas"], status_url: "https://status.audioeye.com/api/v2/status.json", page_url: "https://status.audioeye.com", type: "statuspage" },
    // Tick 123 additions
    // Cap table / equity management
    { id: "carta", name: "Carta", tags: ["fintech", "cap-table", "equity", "saas"], status_url: "https://status.carta.com/api/v2/status.json", page_url: "https://status.carta.com", type: "statuspage" },
    // Streaming SQL / real-time database
    { id: "materialize", name: "Materialize", tags: ["database", "streaming", "sql", "real-time"], status_url: "https://status.materialize.com/api/v2/status.json", page_url: "https://status.materialize.com", type: "statuspage" },
    // Developer portal / internal developer platform
    { id: "port", name: "Port", tags: ["developer-portal", "platform-engineering", "idp", "devops"], status_url: "https://status.getport.io/api/v2/status.json", page_url: "https://status.getport.io", type: "statuspage" },
    // Email newsletter platform
    { id: "buttondown", name: "Buttondown", tags: ["email", "newsletter", "publishing", "saas"], status_url: "https://status.buttondown.com/api/v2/status.json", page_url: "https://status.buttondown.com", type: "statuspage" },
    // AI speech recognition / transcription
    { id: "speechmatics", name: "Speechmatics", tags: ["ai", "speech-recognition", "transcription", "api"], status_url: "https://status.speechmatics.com/api/v2/status.json", page_url: "https://status.speechmatics.com", type: "statuspage" },
    // Mortgage / lending technology
    { id: "blend", name: "Blend", tags: ["fintech", "mortgage", "lending", "saas"], status_url: "https://status.blend.com/api/v2/status.json", page_url: "https://status.blend.com", type: "statuspage" },
    // In-app subscription / monetization management
    { id: "revenuecat", name: "RevenueCat", tags: ["mobile", "subscriptions", "payments", "saas"], status_url: "https://status.revenuecat.com/api/v2/status.json", page_url: "https://status.revenuecat.com", type: "statuspage" },
    // No-code data automation / ETL
    { id: "parabola", name: "Parabola", tags: ["no-code", "data", "automation", "etl"], status_url: "https://status.parabola.io/api/v2/status.json", page_url: "https://status.parabola.io", type: "statuspage" },
    // Read-it-later / article saving
    { id: "omnivore", name: "Omnivore", tags: ["read-it-later", "reading", "content", "open-source"], status_url: "https://status.omnivore.io/api/v2/status.json", page_url: "https://status.omnivore.io", type: "statuspage" },
    // Restaurant tech / digital ordering platform
    { id: "lunchbox", name: "Lunchbox", tags: ["restaurant", "online-ordering", "delivery", "saas"], status_url: "https://status.lunchbox.io/api/v2/status.json", page_url: "https://status.lunchbox.io", type: "statuspage" },
    { id: "aweber", name: "AWeber", tags: ["email-marketing", "marketing", "newsletters", "saas"], status_url: "https://status.aweber.com/api/v2/status.json", page_url: "https://status.aweber.com", type: "statuspage" },
    { id: "clickfunnels", name: "ClickFunnels", tags: ["marketing", "funnels", "landing-pages", "saas"], status_url: "https://status.clickfunnels.com/api/v2/status.json", page_url: "https://status.clickfunnels.com", type: "statuspage" },
    { id: "sevenrooms", name: "SevenRooms", tags: ["restaurant", "reservations", "hospitality", "saas"], status_url: "https://status.sevenrooms.com/api/v2/status.json", page_url: "https://status.sevenrooms.com", type: "statuspage" },
    { id: "beehiiv", name: "beehiiv", tags: ["newsletters", "email-marketing", "publishing", "creator"], status_url: "https://status.beehiiv.com/api/v2/status.json", page_url: "https://status.beehiiv.com", type: "statuspage" },
    { id: "uipath", name: "UiPath", tags: ["rpa", "automation", "enterprise", "saas"], status_url: "https://status.uipath.com/api/v2/status.json", page_url: "https://status.uipath.com", type: "statuspage" },
    { id: "datarobot", name: "DataRobot", tags: ["ai", "ml", "machine-learning", "data-science"], status_url: "https://status.datarobot.com/api/v2/status.json", page_url: "https://status.datarobot.com", type: "statuspage" },
    { id: "robin", name: "Robin", tags: ["workplace", "desk-booking", "office", "facilities"], status_url: "https://status.robinpowered.com/api/v2/status.json", page_url: "https://status.robinpowered.com", type: "statuspage" },
    { id: "envoy", name: "Envoy", tags: ["visitor-management", "workplace", "office", "facilities"], status_url: "https://status.envoy.com/api/v2/status.json", page_url: "https://status.envoy.com", type: "statuspage" },
    { id: "brivo", name: "Brivo", tags: ["access-control", "security", "physical-security", "saas"], status_url: "https://status.brivo.com/api/v2/status.json", page_url: "https://status.brivo.com", type: "statuspage" },
    { id: "eptura_visitor", name: "Eptura Visitor", tags: ["visitor-management", "workplace", "facilities", "saas"], status_url: "https://status.proxyclick.com/api/v2/status.json", page_url: "https://status.proxyclick.com", type: "statuspage" },
    // Tick 125 additions
    // Security awareness training / phishing simulation
    { id: "knowbe4", name: "KnowBe4", tags: ["security", "awareness-training", "phishing-simulation", "saas"], status_url: "https://status.knowbe4.com/api/v2/status.json", page_url: "https://status.knowbe4.com", type: "statuspage" },
    // Image CDN and optimization
    { id: "imagekit", name: "ImageKit", tags: ["cdn", "image-optimization", "media", "api"], status_url: "https://imagekit.statuspage.io/api/v2/status.json", page_url: "https://imagekit.statuspage.io", type: "statuspage" },
    // Applicant tracking system
    { id: "jazzhr", name: "JazzHR", tags: ["hr", "ats", "recruiting", "saas"], status_url: "https://status.jazzhr.com/api/v2/status.json", page_url: "https://status.jazzhr.com", type: "statuspage" },
    // Recruiting platform
    { id: "workable", name: "Workable", tags: ["hr", "recruiting", "ats", "saas"], status_url: "https://workable.statuspage.io/api/v2/status.json", page_url: "https://workable.statuspage.io", type: "statuspage" },
    // Learning and talent management suite
    { id: "cornerstoneondemand", name: "Cornerstone OnDemand", tags: ["lms", "learning", "talent-management", "hr"], status_url: "https://cornerstoneondemand.statuspage.io/api/v2/status.json", page_url: "https://cornerstoneondemand.statuspage.io", type: "statuspage" },
    // Construction project management
    { id: "buildertrend", name: "Buildertrend", tags: ["construction", "project-management", "field-service", "saas"], status_url: "https://status.buildertrend.net/api/v2/status.json", page_url: "https://status.buildertrend.net", type: "statuspage" },
    // IoT fleet management and device OS
    { id: "balena", name: "Balena", tags: ["iot", "fleet-management", "embedded", "devices"], status_url: "https://status.balena.io/api/v2/status.json", page_url: "https://status.balena.io", type: "statuspage" },
    // Cellular IoT connectivity
    { id: "hologram", name: "Hologram", tags: ["iot", "cellular", "connectivity", "hardware"], status_url: "https://status.hologram.io/api/v2/status.json", page_url: "https://status.hologram.io", type: "statuspage" },
    // Game development / real-time 3D platform
    { id: "unity", name: "Unity", tags: ["gaming", "game-engine", "developer-tools", "3d"], status_url: "https://unity.statuspage.io/api/v2/status.json", page_url: "https://unity.statuspage.io", type: "statuspage" },
    // IT service management
    { id: "topdesk", name: "TOPdesk", tags: ["itsm", "service-management", "help-desk", "saas"], status_url: "https://status.topdesk.com/api/v2/status.json", page_url: "https://status.topdesk.com", type: "statuspage" },
    // Reverse ETL / data activation
    { id: "census", name: "Census", tags: ["data", "reverse-etl", "data-activation", "analytics"], status_url: "https://status.getcensus.com/api/v2/status.json", page_url: "https://status.getcensus.com", type: "statuspage" },
    // Cloud ETL / data pipeline
    { id: "stitch_data", name: "Stitch Data", tags: ["data", "etl", "data-integration", "saas"], status_url: "https://status.stitchdata.com/api/v2/status.json", page_url: "https://status.stitchdata.com", type: "statuspage" },
    // Blockchain analytics / compliance intelligence
    { id: "chainalysis", name: "Chainalysis", tags: ["blockchain", "crypto", "compliance", "analytics"], status_url: "https://status.chainalysis.com/api/v2/status.json", page_url: "https://status.chainalysis.com", type: "statuspage" },
    // Blockchain infrastructure / node management
    { id: "blockdaemon", name: "Blockdaemon", tags: ["blockchain", "infrastructure", "nodes", "crypto"], status_url: "https://status.blockdaemon.com/api/v2/status.json", page_url: "https://status.blockdaemon.com", type: "statuspage" },
    // Subscription revenue analytics
    { id: "baremetrics", name: "Baremetrics", tags: ["analytics", "subscriptions", "revenue", "saas"], status_url: "https://status.baremetrics.com/api/v2/status.json", page_url: "https://status.baremetrics.com", type: "statuspage" },
    // 3PL e-commerce fulfillment
    { id: "shipmonk", name: "ShipMonk", tags: ["logistics", "fulfillment", "e-commerce", "shipping"], status_url: "https://status.shipmonk.com/api/v2/status.json", page_url: "https://status.shipmonk.com", type: "statuspage" },
    // Algorithmic stock trading API
    { id: "alpaca", name: "Alpaca", tags: ["fintech", "trading", "api", "stocks"], status_url: "https://status.alpaca.markets/api/v2/status.json", page_url: "https://status.alpaca.markets", type: "statuspage" },
    // Financial market data API
    { id: "iex_cloud", name: "IEX Cloud", tags: ["fintech", "market-data", "api", "stocks"], status_url: "https://status.iexapis.com/api/v2/status.json", page_url: "https://status.iexapis.com", type: "statuspage" },
    // Bitcoin / Stacks blockchain developer tools
    { id: "hiro", name: "Hiro Systems", tags: ["blockchain", "bitcoin", "developer-tools", "stacks"], status_url: "https://status.hiro.so/api/v2/status.json", page_url: "https://status.hiro.so", type: "statuspage" },
    // Banking-as-a-Service platform
    { id: "treasury_prime", name: "Treasury Prime", tags: ["fintech", "banking", "baas", "api"], status_url: "https://status.treasuryprime.com/api/v2/status.json", page_url: "https://status.treasuryprime.com", type: "statuspage" },
    // Payment processing / instant ACH
    { id: "tabapay", name: "TabaPay", tags: ["payments", "fintech", "ach", "instant-payments"], status_url: "https://status.tabapay.com/api/v2/status.json", page_url: "https://status.tabapay.com", type: "statuspage" },
    // Embedded lending / revenue-based financing
    { id: "parafin", name: "Parafin", tags: ["fintech", "lending", "embedded-finance", "api"], status_url: "https://status.parafin.com/api/v2/status.json", page_url: "https://status.parafin.com", type: "statuspage" },
    // Business identity verification / KYB
    { id: "middesk", name: "Middesk", tags: ["identity", "kyb", "compliance", "fintech"], status_url: "https://status.middesk.com/api/v2/status.json", page_url: "https://status.middesk.com", type: "statuspage" },
    // Project management / team collaboration
    { id: "hive", name: "Hive", tags: ["collaboration", "project-management", "productivity", "saas"], status_url: "https://status.hive.com/api/v2/status.json", page_url: "https://status.hive.com", type: "statuspage" },
    // E-signature platforms
    { id: "boldsign", name: "BoldSign", tags: ["esignature", "documents", "saas", "api"], status_url: "https://status.boldsign.com/api/v2/status.json", page_url: "https://status.boldsign.com", type: "statuspage" },
    { id: "scrive", name: "Scrive", tags: ["esignature", "e-identification", "documents", "compliance"], status_url: "https://status.scrive.com/api/v2/status.json", page_url: "https://status.scrive.com", type: "statuspage" },
    // Password manager
    { id: "nordpass", name: "NordPass", tags: ["password-manager", "security", "identity", "saas"], status_url: "https://status.nordpass.com/api/v2/status.json", page_url: "https://status.nordpass.com", type: "statuspage" },
    // Cross-border payments / FX
    { id: "currencycloud", name: "CurrencyCloud", tags: ["fintech", "fx", "cross-border-payments", "api"], status_url: "https://status.currencycloud.com/api/v2/status.json", page_url: "https://status.currencycloud.com", type: "statuspage" },
    // Tax technology
    { id: "vertexinc", name: "Vertex Inc", tags: ["tax", "compliance", "fintech", "saas"], status_url: "https://status.vertexinc.com/api/v2/status.json", page_url: "https://status.vertexinc.com", type: "statuspage" },
    // HR / LMS
    { id: "eloomi", name: "eloomi", tags: ["hr", "lms", "learning-management", "saas"], status_url: "https://status.eloomi.com/api/v2/status.json", page_url: "https://status.eloomi.com", type: "statuspage" },
    // Shipping / fulfillment
    { id: "shippingeasy", name: "ShippingEasy", tags: ["shipping", "ecommerce", "fulfillment", "logistics"], status_url: "https://status.shippingeasy.com/api/v2/status.json", page_url: "https://status.shippingeasy.com", type: "statuspage" },
    // Freight marketplace / logistics
    { id: "freightos", name: "Freightos", tags: ["freight", "logistics", "supply-chain", "marketplace"], status_url: "https://status.freightos.com/api/v2/status.json", page_url: "https://status.freightos.com", type: "statuspage" },
    // E-commerce platform
    { id: "volusion", name: "Volusion", tags: ["ecommerce", "saas", "online-store", "payments"], status_url: "https://status.volusion.com/api/v2/status.json", page_url: "https://status.volusion.com", type: "statuspage" },
    // Online course platform
    { id: "learnworlds", name: "LearnWorlds", tags: ["elearning", "lms", "online-courses", "saas"], status_url: "https://status.learnworlds.com/api/v2/status.json", page_url: "https://status.learnworlds.com", type: "statuspage" },
    // Domain registrar / hosting
    { id: "gandi", name: "Gandi", tags: ["domain", "registrar", "hosting", "dns"], status_url: "https://status.gandi.net/api/v2/status.json", page_url: "https://status.gandi.net", type: "statuspage" },
    // IT financial management
    { id: "apptio", name: "Apptio", tags: ["it-finance", "cloud-cost", "finops", "saas"], status_url: "https://status.apptio.com/api/v2/status.json", page_url: "https://status.apptio.com", type: "statuspage" },
    // Local business digital platform
    { id: "vendasta", name: "Vendasta", tags: ["marketing", "local-business", "saas", "white-label"], status_url: "https://status.vendasta.com/api/v2/status.json", page_url: "https://status.vendasta.com", type: "statuspage" },
    // Employee rewards / gifting
    { id: "rybbon", name: "Rybbon (BHN Rewards)", tags: ["rewards", "gifting", "employee-engagement", "saas"], status_url: "https://status.rybbon.net/api/v2/status.json", page_url: "https://status.rybbon.net", type: "statuspage" },
    { id: "xoxoday", name: "Xoxoday", tags: ["rewards", "gifting", "employee-engagement", "saas"], status_url: "https://status.xoxoday.com/api/v2/status.json", page_url: "https://status.xoxoday.com", type: "statuspage" },
    // AI image generation / inference
    { id: "fal", name: "Fal.ai", tags: ["ai", "inference", "image-generation", "api"], status_url: "https://fal.statuspage.io/api/v2/status.json", page_url: "https://fal.statuspage.io", type: "statuspage" },
    // Vector / ML database
    { id: "lancedb", name: "LanceDB", tags: ["database", "vector", "ai", "ml"], status_url: "https://lancedb.statuspage.io/api/v2/status.json", page_url: "https://lancedb.statuspage.io", type: "statuspage" },
    // Communications API
    { id: "vonage", name: "Vonage API", tags: ["communications", "sms", "voice", "api"], status_url: "https://vonageapi.statuspage.io/api/v2/status.json", page_url: "https://vonageapi.statuspage.io", type: "statuspage" },
    // Email security / secure email gateway
    { id: "mimecast", name: "Mimecast", tags: ["email", "security", "enterprise", "compliance"], status_url: "https://api.status.io/1.0/status/5d849b1c02e65b3ec45369d4", page_url: "https://status.mimecast.com", type: "statusio" },
    // Customer data platform
    { id: "lytics", name: "Lytics", tags: ["cdp", "analytics", "personalization", "data"], status_url: "https://lytics.statuspage.io/api/v2/status.json", page_url: "https://lytics.statuspage.io", type: "statuspage" },
    // Data management platform (formerly Treasure Data, now Treasure AI by ARM)
    { id: "treasure_ai", name: "Treasure AI", tags: ["cdp", "data", "analytics", "enterprise"], status_url: "https://treasure-data.statuspage.io/api/v2/status.json", page_url: "https://status.treasure.ai", type: "statuspage" },
    // CDN
    { id: "cachefly", name: "CacheFly", tags: ["cdn", "networking", "media", "performance"], status_url: "https://cachefly.statuspage.io/api/v2/status.json", page_url: "https://cachefly.statuspage.io", type: "statuspage" },
    // CockroachDB Cloud (managed / cloud)
    { id: "cockroachdb_cloud", name: "CockroachDB Cloud", tags: ["database", "distributed", "sql", "cloud"], status_url: "https://cockroachcloud.statuspage.io/api/v2/status.json", page_url: "https://cockroachcloud.statuspage.io", type: "statuspage" },
    // Billing / subscription management
    { id: "maxio", name: "Maxio", tags: ["billing", "subscription", "revenue", "saas"], status_url: "https://maxio.statuspage.io/api/v2/status.json", page_url: "https://maxio.statuspage.io", type: "statuspage" },
    // E-commerce personalization
    { id: "rebuy", name: "Rebuy", tags: ["ecommerce", "personalization", "shopify", "saas"], status_url: "https://rebuy.statuspage.io/api/v2/status.json", page_url: "https://rebuy.statuspage.io", type: "statuspage" },
    // API testing / collaboration
    { id: "hoppscotch", name: "Hoppscotch", tags: ["api", "developer-tools", "testing", "open-source"], status_url: "https://hoppscotch.statuspage.io/api/v2/status.json", page_url: "https://hoppscotch.statuspage.io", type: "statuspage" },
    // Logistics / TMS
    { id: "turvo", name: "Turvo", tags: ["logistics", "supply-chain", "tms", "saas"], status_url: "https://turvo.statuspage.io/api/v2/status.json", page_url: "https://status.turvo.com", type: "statuspage" },
    // Banking-as-a-service
    { id: "treasury_prime", name: "Treasury Prime", tags: ["fintech", "banking", "baas", "api"], status_url: "https://treasuryprime.statuspage.io/api/v2/status.json", page_url: "https://status.treasuryprime.com", type: "statuspage" },
    // IoT / hardware platform
    { id: "arduino", name: "Arduino", tags: ["iot", "hardware", "embedded", "cloud"], status_url: "https://arduino.statuspage.io/api/v2/status.json", page_url: "https://status.arduino.cc", type: "statuspage" },
    // Education LMS (now part of PowerSchool)
    { id: "schoology", name: "Schoology", tags: ["education", "lms", "k12", "saas"], status_url: "https://schoology.statuspage.io/api/v2/status.json", page_url: "https://schoology.statuspage.io", type: "statuspage" },
    // Education platform for K-12
    { id: "seesaw", name: "Seesaw", tags: ["education", "k12", "learning", "saas"], status_url: "https://seesaw.statuspage.io/api/v2/status.json", page_url: "https://seesaw.statuspage.io", type: "statuspage" },
    // Field service management
    { id: "servicemax", name: "ServiceMax", tags: ["field-service", "iot", "enterprise", "saas"], status_url: "https://servicemax.statuspage.io/api/v2/status.json", page_url: "https://servicemax.statuspage.io", type: "statuspage" },
    // Hospitality / hotel property management system
    { id: "mews", name: "Mews", tags: ["hospitality", "pms", "hotel", "saas"], status_url: "https://mews.statuspage.io/api/v2/status.json", page_url: "https://mews.statuspage.io", type: "statuspage" },
    // Point-of-sale (restaurant / retail)
    { id: "revel", name: "Revel Systems", tags: ["pos", "retail", "restaurant", "saas"], status_url: "https://revel.statuspage.io/api/v2/status.json", page_url: "https://revel.statuspage.io", type: "statuspage" },
    // Commercial real estate CRM / marketing
    { id: "buildout", name: "Buildout", tags: ["real-estate", "crm", "commercial", "saas"], status_url: "https://buildout.statuspage.io/api/v2/status.json", page_url: "https://buildout.statuspage.io", type: "statuspage" },
    // Customer experience / voice-of-customer platform
    { id: "medallia", name: "Medallia", tags: ["cx", "voc", "survey", "enterprise"], status_url: "https://medallia.statuspage.io/api/v2/status.json", page_url: "https://medallia.statuspage.io", type: "statuspage" },
    // Frontline workforce communications
    { id: "beekeeper", name: "Beekeeper", tags: ["communications", "workforce", "frontline", "saas"], status_url: "https://beekeeper.statuspage.io/api/v2/status.json", page_url: "https://beekeeper.statuspage.io", type: "statuspage" },
    // Email delivery service
    { id: "smtp2go", name: "SMTP2GO", tags: ["email", "transactional", "smtp", "delivery"], status_url: "https://smtp2go.statuspage.io/api/v2/status.json", page_url: "https://smtp2go.statuspage.io", type: "statuspage" },
    // Open-source LMS / e-learning platform
    { id: "moodle", name: "Moodle", tags: ["education", "lms", "open-source", "e-learning"], status_url: "https://moodle.statuspage.io/api/v2/status.json", page_url: "https://moodle.statuspage.io", type: "statuspage" },
    // Sports team management platform
    { id: "teamsnap", name: "TeamSnap", tags: ["sports", "team-management", "scheduling", "saas"], status_url: "https://teamsnap.statuspage.io/api/v2/status.json", page_url: "https://teamsnap.statuspage.io", type: "statuspage" },
    // Data science & AI e-learning
    { id: "datacamp", name: "DataCamp", tags: ["education", "data-science", "e-learning", "ai"], status_url: "https://status.datacamp.com/api/v2/status.json", page_url: "https://status.datacamp.com", type: "statuspage" },
    // Hotel/hospitality PMS platform
    { id: "apaleo", name: "Apaleo", tags: ["hospitality", "pms", "hotel", "api-first"], status_url: "https://apaleo.statuspage.io/api/v2/status.json", page_url: "https://apaleo.statuspage.io", type: "statuspage" },
    // Open source foundation (hosts npm, PyPI, Maven, etc. infra)
    { id: "linuxfoundation", name: "Linux Foundation", tags: ["open-source", "foundation", "developer", "infrastructure"], status_url: "https://status.linuxfoundation.org/api/v2/status.json", page_url: "https://status.linuxfoundation.org", type: "statuspage" },
    // Accounting close management / financial close automation
    { id: "floqast", name: "FloQast", tags: ["accounting", "finance", "close-management", "saas"], status_url: "https://status.floqast.com/api/v2/status.json", page_url: "https://status.floqast.com", type: "statuspage" },
    // Connected planning platform (enterprise FP&A / supply chain)
    { id: "anaplan", name: "Anaplan", tags: ["planning", "finance", "fpa", "enterprise"], status_url: "https://status.anaplan.com/api/v2/status.json", page_url: "https://status.anaplan.com", type: "statuspage" },
    // Enterprise data management / backup
    { id: "veritas", name: "Veritas", tags: ["backup", "data-management", "enterprise", "storage"], status_url: "https://veritas.statuspage.io/api/v2/status.json", page_url: "https://veritas.statuspage.io", type: "statuspage" },
    // Print-on-demand / dropshipping
    { id: "spod", name: "SPOD", tags: ["print-on-demand", "ecommerce", "dropshipping", "fulfillment"], status_url: "https://spod.statuspage.io/api/v2/status.json", page_url: "https://spod.statuspage.io", type: "statuspage" },
    // Procurement / spend management
    { id: "zip_hq", name: "Zip", tags: ["procurement", "spend-management", "finance", "enterprise"], status_url: "https://status.ziphq.com/api/v2/status.json", page_url: "https://status.ziphq.com", type: "statuspage" },
    // Real estate / property management software
    { id: "mri_software", name: "MRI Software", tags: ["real-estate", "property-management", "enterprise", "saas"], status_url: "https://status.mrisoftware.com/api/v2/status.json", page_url: "https://status.mrisoftware.com", type: "statuspage" },
    // Medical practice management (EHR / billing)
    { id: "advancedmd", name: "AdvancedMD", tags: ["healthcare", "ehr", "practice-management", "medical"], status_url: "https://advancedmd.statuspage.io/api/v2/status.json", page_url: "https://advancedmd.statuspage.io", type: "statuspage" },
    // Property management / landlord software
    { id: "doorloop", name: "DoorLoop", tags: ["real-estate", "property-management", "landlord", "saas"], status_url: "https://status.doorloop.com/api/v2/status.json", page_url: "https://status.doorloop.com", type: "statuspage" },
    // Field service management / FSM
    { id: "servicefusion", name: "ServiceFusion", tags: ["field-service", "fsm", "hvac", "saas"], status_url: "https://servicefusion.statuspage.io/api/v2/status.json", page_url: "https://servicefusion.statuspage.io", type: "statuspage" },
    // Healthcare scheduling & practice management
    { id: "jane_app", name: "Jane App", tags: ["healthcare", "scheduling", "practice-management", "saas"], status_url: "https://status.janeapp.com/api/v2/status.json", page_url: "https://status.janeapp.com", type: "statuspage" },
    // Mental health / behavioral health practice management
    { id: "theranest", name: "TheraNest", tags: ["healthcare", "mental-health", "ehr", "saas"], status_url: "https://theranest.statuspage.io/api/v2/status.json", page_url: "https://theranest.statuspage.io", type: "statuspage" },
    // Healthcare practice management (allied health, PT, chiro)
    { id: "cliniko", name: "Cliniko", tags: ["healthcare", "practice-management", "allied-health", "saas"], status_url: "https://status.cliniko.com/api/v2/status.json", page_url: "https://status.cliniko.com", type: "statuspage" },
    // Real estate closing / title & escrow platform
    { id: "qualia", name: "Qualia", tags: ["real-estate", "closing", "title", "fintech"], status_url: "https://status.qualia.com/api/v2/status.json", page_url: "https://status.qualia.com", type: "statuspage" },
    // Digital mortgage / e-closing platform
    { id: "snapdocs", name: "Snapdocs", tags: ["mortgage", "real-estate", "fintech", "e-signing"], status_url: "https://status.snapdocs.com/api/v2/status.json", page_url: "https://status.snapdocs.com", type: "statuspage" },
    // Graph database cloud service
    { id: "neo4j", name: "Neo4j Aura", tags: ["database", "graph", "cloud", "saas"], status_url: "https://status.neo4j.io/api/v2/status.json", page_url: "https://status.neo4j.io", type: "statuspage" },
    // Code coverage service
    { id: "coveralls", name: "Coveralls", tags: ["devtools", "ci-cd", "code-coverage", "testing"], status_url: "https://status.coveralls.io/api/v2/status.json", page_url: "https://status.coveralls.io", type: "statuspage" },
    // HTML/CSS screenshot & image generation API
    { id: "hcti", name: "HTML/CSS to Image", tags: ["api", "image-generation", "screenshot", "devtools"], status_url: "https://status.htmlcsstoimage.com/api/v2/status.json", page_url: "https://status.htmlcsstoimage.com", type: "statuspage" },
    // QA testing automation
    { id: "rainforestqa", name: "Rainforest QA", tags: ["testing", "qa", "automation", "devtools"], status_url: "https://status.rainforestqa.com/api/v2/status.json", page_url: "https://status.rainforestqa.com", type: "statuspage" },
    { id: "applitools", name: "Applitools", tags: ["testing", "visual-testing", "ai", "qa"], status_url: "https://status.applitools.com/api/v2/status.json", page_url: "https://status.applitools.com", type: "statuspage" },
    { id: "testsigma", name: "Testsigma", tags: ["testing", "qa", "cloud", "automation"], status_url: "https://status.testsigma.com/api/v2/status.json", page_url: "https://status.testsigma.com", type: "statuspage" },
    { id: "katalon", name: "Katalon", tags: ["testing", "qa", "automation", "devtools"], status_url: "https://status.katalon.com/api/v2/status.json", page_url: "https://status.katalon.com", type: "statuspage" },
    // Mobile/web logging & crash reporting
    { id: "bugfender", name: "Bugfender", tags: ["monitoring", "mobile", "logging", "crash-reporting"], status_url: "https://status.bugfender.com/api/v2/status.json", page_url: "https://status.bugfender.com", type: "statuspage" },
    // Mobile attribution / marketing analytics
    { id: "singular", name: "Singular", tags: ["mobile", "attribution", "marketing", "analytics"], status_url: "https://status.singular.net/api/v2/status.json", page_url: "https://status.singular.net", type: "statuspage" },
    { id: "airbridge", name: "Airbridge", tags: ["mobile", "attribution", "marketing", "analytics"], status_url: "https://status.airbridge.io/api/v2/status.json", page_url: "https://status.airbridge.io", type: "statuspage" },
    // Open banking / financial data APIs
    { id: "mono", name: "Mono", tags: ["fintech", "open-banking", "api", "africa"], status_url: "https://status.mono.co/api/v2/status.json", page_url: "https://status.mono.co", type: "statuspage" },
    { id: "tink", name: "Tink", tags: ["fintech", "open-banking", "api", "europe"], status_url: "https://status.tink.com/api/v2/status.json", page_url: "https://status.tink.com", type: "statuspage" },
    { id: "yapily", name: "Yapily", tags: ["fintech", "open-banking", "api", "europe"], status_url: "https://status.yapily.com/api/v2/status.json", page_url: "https://status.yapily.com", type: "statuspage" },
    // Sales intelligence / B2B data
    { id: "leadfeeder", name: "Leadfeeder", tags: ["sales", "b2b", "analytics", "website-tracking"], status_url: "https://status.leadfeeder.com/api/v2/status.json", page_url: "https://status.leadfeeder.com", type: "statuspage" },
    { id: "phantombuster", name: "PhantomBuster", tags: ["automation", "scraping", "sales", "b2b"], status_url: "https://status.phantombuster.com/api/v2/status.json", page_url: "https://status.phantombuster.com", type: "statuspage" },
    { id: "uplead", name: "UpLead", tags: ["b2b", "data", "sales", "leads"], status_url: "https://status.uplead.com/api/v2/status.json", page_url: "https://status.uplead.com", type: "statuspage" },
    { id: "bookyourdata", name: "BookYourData", tags: ["b2b", "data", "email", "leads"], status_url: "https://status.bookyourdata.com/api/v2/status.json", page_url: "https://status.bookyourdata.com", type: "statuspage" },
    // Email builder / template tools
    { id: "dyspatch", name: "Dyspatch", tags: ["email", "template", "builder", "saas"], status_url: "https://status.dyspatch.io/api/v2/status.json", page_url: "https://status.dyspatch.io", type: "statuspage" },
    { id: "movableink", name: "Movable Ink", tags: ["email", "personalization", "marketing", "saas"], status_url: "https://status.movableink.com/api/v2/status.json", page_url: "https://status.movableink.com", type: "statuspage" },
    { id: "beefree", name: "Beefree", tags: ["email", "builder", "sdk", "templates"], status_url: "https://status.beefree.io/api/v2/status.json", page_url: "https://status.beefree.io", type: "statuspage" },
    { id: "stripo", name: "Stripo", tags: ["email", "builder", "templates", "saas"], status_url: "https://status.stripo.email/api/v2/status.json", page_url: "https://status.stripo.email", type: "statuspage" },
    // API gateway / management
    { id: "tyk", name: "Tyk Cloud", tags: ["api", "gateway", "api-management", "devtools"], status_url: "https://status.tyk.io/api/v2/status.json", page_url: "https://status.tyk.io", type: "statuspage" },
    // Crypto exchanges
    { id: "bitstamp", name: "Bitstamp", tags: ["crypto", "exchange", "fintech", "trading"], status_url: "https://status.bitstamp.net/api/v2/status.json", page_url: "https://status.bitstamp.net", type: "statuspage" },
    { id: "crypto_com", name: "Crypto.com", tags: ["crypto", "exchange", "fintech", "trading"], status_url: "https://status.crypto.com/api/v2/status.json", page_url: "https://status.crypto.com", type: "statuspage" },
    // Customer support / help desk
    { id: "helpdesk", name: "HelpDesk", tags: ["customer-support", "helpdesk", "saas", "ticketing"], status_url: "https://status.helpdesk.com/api/v2/status.json", page_url: "https://status.helpdesk.com", type: "statuspage" },
    // Tick 131 additions
    // Scheduling / appointment booking (fitness, beauty, wellness verticals)
    { id: "acuityscheduling", name: "Acuity Scheduling", tags: ["scheduling", "appointments", "booking", "saas"], status_url: "https://status.acuityscheduling.com/api/v2/status.json", page_url: "https://status.acuityscheduling.com", type: "statuspage" },
    { id: "vagaro", name: "Vagaro", tags: ["scheduling", "salon", "spa", "fitness"], status_url: "https://status.vagaro.com/api/v2/status.json", page_url: "https://status.vagaro.com", type: "statuspage" },
    { id: "pike13", name: "Pike13", tags: ["scheduling", "fitness", "classes", "booking"], status_url: "https://status.pike13.com/api/v2/status.json", page_url: "https://status.pike13.com", type: "statuspage" },
    { id: "glofox", name: "Glofox", tags: ["fitness", "gym-management", "scheduling", "saas"], status_url: "https://status.glofox.com/api/v2/status.json", page_url: "https://status.glofox.com", type: "statuspage" },
    // Live chat widget
    { id: "tawkto", name: "tawk.to", tags: ["live-chat", "customer-support", "messaging", "saas"], status_url: "https://status.tawk.to/api/v2/status.json", page_url: "https://status.tawk.to", type: "statuspage" },
    // Landing page builders
    { id: "instapage", name: "Instapage", tags: ["landing-pages", "marketing", "conversion", "saas"], status_url: "https://status.instapage.com/api/v2/status.json", page_url: "https://status.instapage.com", type: "statuspage" },
    { id: "landingi", name: "Landingi", tags: ["landing-pages", "marketing", "no-code", "saas"], status_url: "https://status.landingi.com/api/v2/status.json", page_url: "https://status.landingi.com", type: "statuspage" },
    // Customer onboarding / project delivery
    { id: "rocketlane", name: "Rocketlane", tags: ["project-management", "onboarding", "client-portal", "saas"], status_url: "https://status.rocketlane.com/api/v2/status.json", page_url: "https://status.rocketlane.com", type: "statuspage" },
    // Security compliance / vendor risk management
    { id: "conveyor", name: "Conveyor", tags: ["security", "compliance", "vendor-risk", "saas"], status_url: "https://status.conveyor.com/api/v2/status.json", page_url: "https://status.conveyor.com", type: "statuspage" },
    // Embedded integration / workflow automation platform
    { id: "paragon", name: "Paragon", tags: ["integrations", "embedded-ipaas", "developer-tools", "saas"], status_url: "https://status.useparagon.com/api/v2/status.json", page_url: "https://status.useparagon.com", type: "statuspage" },
    // Creator / course platforms
    { id: "thinkific", name: "Thinkific", tags: ["elearning", "courses", "saas", "creators"], status_url: "https://status.thinkific.com/api/v2/status.json", page_url: "https://status.thinkific.com", type: "statuspage" },
    { id: "kartra", name: "Kartra", tags: ["marketing", "funnels", "courses", "saas"], status_url: "https://status.kartra.com/api/v2/status.json", page_url: "https://status.kartra.com", type: "statuspage" },
    { id: "kit", name: "Kit (ConvertKit)", tags: ["email", "newsletter", "creators", "marketing"], status_url: "https://status.kit.com/api/v2/status.json", page_url: "https://status.kit.com", type: "statuspage" },
    // Email deliverability / newsletter platform
    { id: "simplero", name: "Simplero", tags: ["email", "courses", "membership", "creators"], status_url: "https://status.simplero.com/api/v2/status.json", page_url: "https://status.simplero.com", type: "statuspage" },
    // Marketing analytics / call tracking
    { id: "callrail", name: "CallRail", tags: ["marketing", "analytics", "call-tracking", "saas"], status_url: "https://status.callrail.com/api/v2/status.json", page_url: "https://status.callrail.com", type: "statuspage" },
    // Media / audio / video APIs
    { id: "dolby", name: "Dolby.io", tags: ["media", "audio", "video", "api"], status_url: "https://status.dolby.io/api/v2/status.json", page_url: "https://status.dolby.io", type: "statuspage" },
    // Work management / project collaboration
    { id: "smartsuite", name: "SmartSuite", tags: ["project-management", "collaboration", "no-code", "saas"], status_url: "https://status.smartsuite.com/api/v2/status.json", page_url: "https://status.smartsuite.com", type: "statuspage" },
    // Events / virtual event platform
    { id: "spotme", name: "SpotMe", tags: ["events", "virtual-events", "conference", "saas"], status_url: "https://status.spotme.com/api/v2/status.json", page_url: "https://status.spotme.com", type: "statuspage" },
    // Sports league / team management
    { id: "sportsengine", name: "SportsEngine", tags: ["sports", "team-management", "scheduling", "saas"], status_url: "https://status.sportsengine.com/api/v2/status.json", page_url: "https://status.sportsengine.com", type: "statuspage" },
    // Sports video analysis
    { id: "hudl", name: "Hudl", tags: ["sports", "video-analysis", "coaching", "saas"], status_url: "https://status.hudl.com/api/v2/status.json", page_url: "https://status.hudl.com", type: "statuspage" },
    // Community / member engagement platform
    { id: "higher_logic", name: "Higher Logic", tags: ["community", "membership", "associations", "saas"], status_url: "https://status.higherlogic.com/api/v2/status.json", page_url: "https://status.higherlogic.com", type: "statuspage" },
    // Workforce / shift management
    { id: "deputy", name: "Deputy", tags: ["workforce", "scheduling", "hr", "saas"], status_url: "https://status.deputy.com/api/v2/status.json", page_url: "https://status.deputy.com", type: "statuspage" },
    { id: "sevenshift", name: "7shifts", tags: ["restaurant", "scheduling", "workforce", "saas"], status_url: "https://status.7shifts.com/api/v2/status.json", page_url: "https://status.7shifts.com", type: "statuspage" },
    // Space / room booking
    { id: "skedda", name: "Skedda", tags: ["scheduling", "room-booking", "facilities", "saas"], status_url: "https://status.skedda.com/api/v2/status.json", page_url: "https://status.skedda.com", type: "statuspage" },
    // Healthcare practice management
    { id: "noterro", name: "Noterro", tags: ["healthcare", "practice-management", "allied-health", "saas"], status_url: "https://status.noterro.com/api/v2/status.json", page_url: "https://status.noterro.com", type: "statuspage" },
    // Document automation / CPQ
    { id: "conga", name: "Conga", tags: ["document-automation", "contracts", "cpq", "enterprise"], status_url: "https://status.conga.com/api/v2/status.json", page_url: "https://status.conga.com", type: "statuspage" },
    // Legal practice management
    { id: "smokeball", name: "Smokeball", tags: ["legal", "law-firm", "practice-management", "saas"], status_url: "https://status.smokeball.com/api/v2/status.json", page_url: "https://status.smokeball.com", type: "statuspage" },
    // Field service / trade software
    { id: "fieldedge", name: "FieldEdge", tags: ["field-service", "hvac", "plumbing", "saas"], status_url: "https://status.fieldedge.com/api/v2/status.json", page_url: "https://status.fieldedge.com", type: "statuspage" },
    // Log management
    { id: "humio", name: "Humio (CrowdStrike)", tags: ["logging", "observability", "devops", "security"], status_url: "https://status.humio.com/api/v2/status.json", page_url: "https://status.humio.com", type: "statuspage" },
    { id: "logdna", name: "LogDNA (Mezmo)", tags: ["logging", "observability", "devops", "cloud"], status_url: "https://status.logdna.com/api/v2/status.json", page_url: "https://status.logdna.com", type: "statuspage" },
    // IT helpdesk / ITSM
    { id: "spiceworks", name: "Spiceworks", tags: ["it-helpdesk", "itsm", "community", "saas"], status_url: "https://status.spiceworks.com/api/v2/status.json", page_url: "https://status.spiceworks.com", type: "statuspage" },
    { id: "samanage", name: "Samanage (SolarWinds ITSM)", tags: ["itsm", "it-service-management", "saas", "enterprise"], status_url: "https://status.samanage.com/api/v2/status.json", page_url: "https://status.samanage.com", type: "statuspage" },
    // Talent acquisition / recruiting
    { id: "fountain", name: "Fountain", tags: ["recruiting", "hr", "hourly-hiring", "saas"], status_url: "https://status.fountain.com/api/v2/status.json", page_url: "https://status.fountain.com", type: "statuspage" },
    { id: "phenom", name: "Phenom", tags: ["recruiting", "talent", "hr", "saas"], status_url: "https://status.phenom.com/api/v2/status.json", page_url: "https://status.phenom.com", type: "statuspage" },
    { id: "paradox_ai", name: "Paradox", tags: ["recruiting", "ai", "conversational", "hr"], status_url: "https://status.paradox.ai/api/v2/status.json", page_url: "https://status.paradox.ai", type: "statuspage" },
    // Automotive connectivity
    { id: "smartcar", name: "Smartcar", tags: ["automotive", "api", "connected-car", "developer-tools"], status_url: "https://status.smartcar.com/api/v2/status.json", page_url: "https://status.smartcar.com", type: "statuspage" },
    // Business VPN / network security
    { id: "nordlayer", name: "NordLayer", tags: ["vpn", "network-security", "zero-trust", "saas"], status_url: "https://status.nordlayer.com/api/v2/status.json", page_url: "https://status.nordlayer.com", type: "statuspage" },
    // Cannabis tech / retail POS
    { id: "dutchie", name: "Dutchie", tags: ["cannabis", "pos", "ecommerce", "retail"], status_url: "https://status.dutchie.com/api/v2/status.json", page_url: "https://status.dutchie.com", type: "statuspage" },
    { id: "flowhub", name: "Flowhub", tags: ["cannabis", "pos", "retail", "compliance"], status_url: "https://status.flowhub.com/api/v2/status.json", page_url: "https://status.flowhub.com", type: "statuspage" },
    // Property management
    { id: "entrata", name: "Entrata", tags: ["real-estate", "property-management", "multifamily", "saas"], status_url: "https://status.entrata.com/api/v2/status.json", page_url: "https://status.entrata.com", type: "statuspage" },
    // Test management
    { id: "testmo", name: "Testmo", tags: ["testing", "qa", "test-management", "developer-tools"], status_url: "https://status.testmo.com/api/v2/status.json", page_url: "https://status.testmo.com", type: "statuspage" },
    // Business process automation
    { id: "camunda", name: "Camunda", tags: ["workflow", "bpm", "process-automation", "developer-tools"], status_url: "https://status.camunda.io/api/v2/status.json", page_url: "https://status.camunda.io", type: "statuspage" },
    // Workforce / people analytics
    { id: "visier", name: "Visier", tags: ["hr", "workforce-analytics", "people-analytics", "enterprise"], status_url: "https://status.visier.com/api/v2/status.json", page_url: "https://status.visier.com", type: "statuspage" },
    // Network monitoring / MSP
    { id: "domotz", name: "Domotz", tags: ["network-monitoring", "msp", "iot", "it-management"], status_url: "https://status.domotz.com/api/v2/status.json", page_url: "https://status.domotz.com", type: "statuspage" },
    // Customer / extended-enterprise LMS
    { id: "thought_industries", name: "Thought Industries", tags: ["lms", "learning", "customer-education", "saas"], status_url: "https://status.thoughtindustries.com/api/v2/status.json", page_url: "https://status.thoughtindustries.com", type: "statuspage" },
    // Payments / fintech
    { id: "gocardless", name: "GoCardless", tags: ["payments", "fintech", "saas", "api"], status_url: "https://status.gocardless.com/api/v2/status.json", page_url: "https://status.gocardless.com", type: "statuspage" },
    { id: "zuora", name: "Zuora", tags: ["payments", "billing", "subscription-management", "saas", "enterprise"], status_url: "https://zuora.statuspage.io/api/v2/status.json", page_url: "https://zuora.statuspage.io", type: "statuspage" },
    // Observability / error tracking
    { id: "honeycomb", name: "Honeycomb", tags: ["observability", "monitoring", "devtools", "saas"], status_url: "https://honeycomb.statuspage.io/api/v2/status.json", page_url: "https://honeycomb.statuspage.io", type: "statuspage" },
    { id: "rollbar", name: "Rollbar", tags: ["observability", "error-tracking", "devtools", "saas"], status_url: "https://status.rollbar.com/api/v2/status.json", page_url: "https://status.rollbar.com", type: "statuspage" },
    { id: "logrocket", name: "LogRocket", tags: ["observability", "analytics", "devtools", "saas"], status_url: "https://status.logrocket.com/api/v2/status.json", page_url: "https://status.logrocket.com", type: "statuspage" },
    { id: "scout_apm", name: "Scout APM", tags: ["observability", "monitoring", "devtools", "saas"], status_url: "https://status.scoutapm.com/api/v2/status.json", page_url: "https://status.scoutapm.com", type: "statuspage" },
    // Analytics / session replay
    { id: "fullstory", name: "FullStory", tags: ["analytics", "session-replay", "saas", "enterprise"], status_url: "https://status.fullstory.com/api/v2/status.json", page_url: "https://status.fullstory.com", type: "statuspage" },
    // Database / cache infrastructure
    { id: "upstash", name: "Upstash", tags: ["database", "cache", "serverless", "infrastructure"], status_url: "https://upstash.statuspage.io/api/v2/status.json", page_url: "https://upstash.statuspage.io", type: "statuspage" },
    // Marketing / local search
    { id: "yext", name: "Yext", tags: ["marketing", "local-search", "saas", "enterprise"], status_url: "https://yext.statuspage.io/api/v2/status.json", page_url: "https://yext.statuspage.io", type: "statuspage" },
    // Security / identity
    { id: "onepassword", name: "1Password", tags: ["security", "identity", "saas", "enterprise"], status_url: "https://status.1password.com/api/v2/status.json", page_url: "https://status.1password.com", type: "statuspage" },
    { id: "jumpcloud", name: "JumpCloud", tags: ["identity", "security", "saas", "enterprise", "directory"], status_url: "https://status.jumpcloud.com/api/v2/status.json", page_url: "https://status.jumpcloud.com", type: "statuspage" },
    // Communications / voice / SMS
    { id: "telnyx", name: "Telnyx", tags: ["communications", "sms", "voice", "api", "saas"], status_url: "https://status.telnyx.com/api/v2/status.json", page_url: "https://status.telnyx.com", type: "statuspage" },
    { id: "bandwidth", name: "Bandwidth", tags: ["communications", "sms", "voice", "api", "saas"], status_url: "https://status.bandwidth.com/api/v2/status.json", page_url: "https://status.bandwidth.com", type: "statuspage" },
    // Headless CMS
    { id: "prismic", name: "Prismic", tags: ["cms", "headless-cms", "saas", "developer-tools"], status_url: "https://status.prismic.io/api/v2/status.json", page_url: "https://status.prismic.io", type: "statuspage" },
    // E-commerce
    { id: "bigcommerce", name: "BigCommerce", tags: ["ecommerce", "saas", "enterprise"], status_url: "https://status.bigcommerce.com/api/v2/status.json", page_url: "https://status.bigcommerce.com", type: "statuspage" },
    { id: "squarespace", name: "Squarespace", tags: ["website-builder", "ecommerce", "saas"], status_url: "https://status.squarespace.com/api/v2/status.json", page_url: "https://status.squarespace.com", type: "statuspage" },
    { id: "ecwid", name: "Ecwid", tags: ["ecommerce", "saas"], status_url: "https://status.ecwid.com/api/v2/status.json", page_url: "https://status.ecwid.com", type: "statuspage" },
    // Restaurant technology
    { id: "toast", name: "Toast POS", tags: ["pos", "restaurant-technology", "payments", "saas"], status_url: "https://status.toasttab.com/api/v2/status.json", page_url: "https://status.toasttab.com", type: "statuspage" },
    // Productivity / collaboration
    { id: "coda", name: "Coda", tags: ["productivity", "collaboration", "saas"], status_url: "https://status.coda.io/api/v2/status.json", page_url: "https://status.coda.io", type: "statuspage" },
    { id: "smartsheet", name: "Smartsheet", tags: ["productivity", "project-management", "enterprise", "saas"], status_url: "https://status.smartsheet.com/api/v2/status.json", page_url: "https://status.smartsheet.com", type: "statuspage" },
    // Cloud storage
    { id: "storj", name: "Storj DCS", tags: ["storage", "cloud", "infrastructure", "developer-tools"], status_url: "https://status.storj.io/api/v2/status.json", page_url: "https://status.storj.io", type: "statuspage" },
    // CI/CD
    { id: "appveyor", name: "AppVeyor", tags: ["ci-cd", "developer-tools", "windows", "automation"], status_url: "https://status.appveyor.com/api/v2/status.json", page_url: "https://status.appveyor.com", type: "statuspage" },
    // Customer support
    { id: "groovehq", name: "Groove", tags: ["customer-support", "helpdesk", "saas"], status_url: "https://status.groovehq.com/api/v2/status.json", page_url: "https://status.groovehq.com", type: "statuspage" },
    // Video / webinars
    { id: "crowdcast", name: "Crowdcast", tags: ["video", "webinar", "events", "streaming"], status_url: "https://status.crowdcast.io/api/v2/status.json", page_url: "https://status.crowdcast.io", type: "statuspage" },
    // Social media monitoring
    { id: "mention", name: "Mention", tags: ["social-media", "monitoring", "analytics", "marketing"], status_url: "https://status.mention.com/api/v2/status.json", page_url: "https://status.mention.com", type: "statuspage" },
    // E-commerce / SMS marketing
    { id: "recart", name: "Recart", tags: ["ecommerce", "sms", "messaging", "marketing"], status_url: "https://status.recart.com/api/v2/status.json", page_url: "https://status.recart.com", type: "statuspage" },
    // Network security / zero-trust
    { id: "perimeter81", name: "Perimeter 81", tags: ["security", "networking", "vpn", "zero-trust"], status_url: "https://status.perimeter81.com/api/v2/status.json", page_url: "https://status.perimeter81.com", type: "statuspage" },
    // CPaaS / messaging
    { id: "cm_com", name: "CM.com", tags: ["communications", "sms", "messaging", "api"], status_url: "https://status.cm.com/api/v2/status.json", page_url: "https://status.cm.com", type: "statuspage" },
    // Push notifications
    { id: "webpushr", name: "Webpushr", tags: ["push-notifications", "marketing", "web", "mobile"], status_url: "https://status.webpushr.com/api/v2/status.json", page_url: "https://status.webpushr.com", type: "statuspage" },
    // Email security / anti-phishing
    { id: "ironscales", name: "IRONSCALES", tags: ["security", "email-security", "phishing", "saas"], status_url: "https://status.ironscales.com/api/v2/status.json", page_url: "https://status.ironscales.com", type: "statuspage" },
    // E-signature
    { id: "signwell", name: "SignWell", tags: ["e-signature", "documents", "saas"], status_url: "https://status.signwell.com/api/v2/status.json", page_url: "https://status.signwell.com", type: "statuspage" },
    // Open-source license compliance
    { id: "fossa", name: "FOSSA", tags: ["security", "open-source", "license-compliance", "developer-tools"], status_url: "https://status.fossa.com/api/v2/status.json", page_url: "https://status.fossa.com", type: "statuspage" },
    // Developer portal (Atlassian)
    { id: "compass", name: "Compass", tags: ["developer-portal", "devtools", "atlassian", "saas"], status_url: "https://compass.status.atlassian.com/api/v2/status.json", page_url: "https://compass.status.atlassian.com", type: "statuspage" },
    // Remote access
    { id: "anydesk", name: "AnyDesk", tags: ["remote-access", "desktop", "saas"], status_url: "https://status.anydesk.com/api/v2/status.json", page_url: "https://status.anydesk.com", type: "statuspage" },
    // Web3 video conferencing
    { id: "huddle01", name: "Huddle01", tags: ["video", "web3", "conferencing", "decentralized"], status_url: "https://status.huddle01.com/api/v2/status.json", page_url: "https://status.huddle01.com", type: "statuspage" },
    // Fitness / trainer platform
    { id: "trainerize", name: "ABC Trainerize", tags: ["fitness", "training", "wellness", "saas"], status_url: "https://status.trainerize.com/api/v2/status.json", page_url: "https://status.trainerize.com", type: "statuspage" },
    // Indoor cycling / fitness gaming
    { id: "zwift", name: "Zwift", tags: ["fitness", "gaming", "cycling", "sports"], status_url: "https://status.zwift.com/api/v2/status.json", page_url: "https://status.zwift.com", type: "statuspage" },
    // Donation / fundraising platform
    { id: "donorbox", name: "Donorbox", tags: ["nonprofit", "donations", "fundraising", "payments"], status_url: "https://status.donorbox.org/api/v2/status.json", page_url: "https://status.donorbox.org", type: "statuspage" },
    // Financial data / market data API
    { id: "intrinio", name: "Intrinio", tags: ["financial-data", "market-data", "api", "fintech"], status_url: "https://status.intrinio.com/api/v2/status.json", page_url: "https://status.intrinio.com", type: "statuspage" },
    // IoT application platform
    { id: "losant", name: "Losant", tags: ["iot", "platform", "developer-tools", "saas"], status_url: "https://status.losant.com/api/v2/status.json", page_url: "https://status.losant.com", type: "statuspage" },
    // Academic LaTeX editor
    { id: "overleaf", name: "Overleaf", tags: ["academic", "latex", "collaboration", "writing"], status_url: "https://status.overleaf.com/api/v2/status.json", page_url: "https://status.overleaf.com", type: "statuspage" },
    // Government / civic technology
    { id: "granicus", name: "Granicus", tags: ["govtech", "government", "civic", "saas"], status_url: "https://status.granicus.com/api/v2/status.json", page_url: "https://status.granicus.com", type: "statuspage" },
    // Hedera distributed ledger network
    { id: "hedera", name: "Hedera", tags: ["blockchain", "distributed-ledger", "web3", "infrastructure"], status_url: "https://status.hedera.com/api/v2/status.json", page_url: "https://status.hedera.com", type: "statuspage" },
    // Solana blockchain network
    { id: "solana", name: "Solana", tags: ["blockchain", "web3", "crypto", "infrastructure"], status_url: "https://status.solana.com/api/v2/status.json", page_url: "https://status.solana.com", type: "statuspage" },
    // Medium publishing platform
    { id: "medium", name: "Medium", tags: ["publishing", "blogging", "content", "saas"], status_url: "https://status.medium.com/api/v2/status.json", page_url: "https://status.medium.com", type: "statuspage" },
    // Avalanche blockchain
    { id: "avalanche", name: "Avalanche", tags: ["blockchain", "web3", "crypto", "infrastructure"], status_url: "https://status.avax.network/api/v2/status.json", page_url: "https://status.avax.network", type: "statuspage" },
    // Polygon blockchain
    { id: "polygon", name: "Polygon", tags: ["blockchain", "web3", "crypto", "layer2"], status_url: "https://status.polygon.technology/api/v2/status.json", page_url: "https://status.polygon.technology", type: "statuspage" },
    // Flow blockchain (Dapper Labs)
    { id: "flow_blockchain", name: "Flow", tags: ["blockchain", "web3", "nft", "gaming"], status_url: "https://status.flow.com/api/v2/status.json", page_url: "https://status.flow.com", type: "statuspage" },
    // Consent management / data privacy
    { id: "osano", name: "Osano", tags: ["privacy", "consent", "compliance", "gdpr"], status_url: "https://status.osano.com/api/v2/status.json", page_url: "https://status.osano.com", type: "statuspage" },
    // Cookie consent management
    { id: "cookiebot", name: "Cookiebot", tags: ["privacy", "consent", "cookies", "compliance"], status_url: "https://status.cookiebot.com/api/v2/status.json", page_url: "https://status.cookiebot.com", type: "statuspage" },
    // Tick 138 additions
    { id: "brandwatch", name: "Brandwatch", tags: ["social media", "analytics", "monitoring", "marketing"], status_url: "https://status.brandwatch.com/api/v2/status.json", page_url: "https://status.brandwatch.com", type: "statuspage" },
    { id: "sumup", name: "SumUp", tags: ["payments", "pos", "card", "fintech"], status_url: "https://status.sumup.com/api/v2/status.json", page_url: "https://status.sumup.com", type: "statuspage" },
    { id: "frontify", name: "Frontify", tags: ["brand management", "dam", "design", "assets"], status_url: "https://status.frontify.com/api/v2/status.json", page_url: "https://status.frontify.com", type: "statuspage" },
    { id: "sumsub", name: "Sumsub", tags: ["kyc", "identity", "verification", "compliance"], status_url: "https://status.sumsub.com/api/v2/status.json", page_url: "https://status.sumsub.com", type: "statuspage" },
    { id: "lilt", name: "Lilt", tags: ["translation", "localization", "ai", "enterprise"], status_url: "https://status.lilt.com/api/v2/status.json", page_url: "https://status.lilt.com", type: "statuspage" },
    { id: "smartcat", name: "Smartcat", tags: ["translation", "localization", "tms", "enterprise"], status_url: "https://status.smartcat.ai/api/v2/status.json", page_url: "https://status.smartcat.ai", type: "statuspage" },
    { id: "vouched", name: "Vouched", tags: ["identity", "verification", "kyc", "ai"], status_url: "https://status.vouched.id/api/v2/status.json", page_url: "https://status.vouched.id", type: "statuspage" },
    { id: "ometria", name: "Ometria", tags: ["crm", "retail", "marketing", "customer"], status_url: "https://status.ometria.com/api/v2/status.json", page_url: "https://status.ometria.com", type: "statuspage" },
    { id: "walnut", name: "Walnut", tags: ["demos", "sales", "product", "interactive"], status_url: "https://status.walnut.io/api/v2/status.json", page_url: "https://status.walnut.io", type: "statuspage" },
    { id: "metronome", name: "Metronome", tags: ["billing", "usage", "metering", "saas"], status_url: "https://status.metronome.com/api/v2/status.json", page_url: "https://status.metronome.com", type: "statuspage" },
    // Tick 139 additions
    { id: "practice_fusion", name: "Practice Fusion", tags: ["healthcare", "ehr", "emr", "medical"], status_url: "https://status.practicefusion.com/api/v2/status.json", page_url: "https://status.practicefusion.com", type: "statuspage" },
    { id: "login_gov", name: "Login.gov", tags: ["government", "identity", "authentication", "federal"], status_url: "https://status.login.gov/api/v2/status.json", page_url: "https://status.login.gov", type: "statuspage" },
    { id: "idme", name: "ID.me", tags: ["identity", "verification", "government", "authentication"], status_url: "https://status.id.me/api/v2/status.json", page_url: "https://status.id.me", type: "statuspage" },
    { id: "morningstar", name: "Morningstar", tags: ["finance", "data", "analytics", "investment"], status_url: "https://status.morningstar.com/api/v2/status.json", page_url: "https://status.morningstar.com", type: "statuspage" },
    { id: "hint_health", name: "Hint Health", tags: ["healthcare", "direct-primary-care", "saas", "medical"], status_url: "https://status.hint.com/api/v2/status.json", page_url: "https://status.hint.com", type: "statuspage" },
    { id: "tebra", name: "Tebra", tags: ["healthcare", "practice-management", "ehr", "medical"], status_url: "https://status.tebra.com/api/v2/status.json", page_url: "https://status.tebra.com", type: "statuspage" },
    { id: "tigerconnect", name: "TigerConnect", tags: ["healthcare", "communication", "messaging", "clinical"], status_url: "https://status.tigerconnect.com/api/v2/status.json", page_url: "https://status.tigerconnect.com", type: "statuspage" },
    { id: "powerschool", name: "PowerSchool", tags: ["edtech", "k12", "sis", "education"], status_url: "https://status.powerschool.com/api/v2/status.json", page_url: "https://status.powerschool.com", type: "statuspage" },
    { id: "solutionreach", name: "Solutionreach", tags: ["healthcare", "patient-communication", "dental", "medical"], status_url: "https://status.solutionreach.com/api/v2/status.json", page_url: "https://status.solutionreach.com", type: "statuspage" },
    { id: "civicplus", name: "CivicPlus", tags: ["govtech", "government", "municipal", "civic"], status_url: "https://status.civicplus.com/api/v2/status.json", page_url: "https://status.civicplus.com", type: "statuspage" },
    { id: "trustarc", name: "TrustArc", tags: ["privacy", "compliance", "gdpr", "consent"], status_url: "https://status.trustarc.com/api/v2/status.json", page_url: "https://status.trustarc.com", type: "statuspage" },
    { id: "turbot", name: "Turbot", tags: ["cloud", "compliance", "security", "infrastructure"], status_url: "https://status.turbot.com/api/v2/status.json", page_url: "https://status.turbot.com", type: "statuspage" },
    { id: "getdbt", name: "dbt Cloud", tags: ["data", "analytics", "transformation", "devtools"], status_url: "https://status.getdbt.com/api/v2/status.json", page_url: "https://status.getdbt.com", type: "statuspage" },
    { id: "panther", name: "Panther", tags: ["security", "siem", "detection", "cloud"], status_url: "https://status.panther.com/api/v2/status.json", page_url: "https://status.panther.com", type: "statuspage" },
    { id: "deepwatch", name: "Deepwatch", tags: ["security", "mdr", "detection", "managed-services"], status_url: "https://status.deepwatch.com/api/v2/status.json", page_url: "https://status.deepwatch.com", type: "statuspage" },
    { id: "corelight", name: "Corelight", tags: ["security", "network", "detection", "monitoring"], status_url: "https://status.corelight.com/api/v2/status.json", page_url: "https://status.corelight.com", type: "statuspage" },
    { id: "expel", name: "Expel", tags: ["security", "operations", "mdr", "managed-services"], status_url: "https://status.expel.io/api/v2/status.json", page_url: "https://status.expel.io", type: "statuspage" },
    { id: "orca_security", name: "Orca Security", tags: ["security", "cloud", "cnapp", "compliance"], status_url: "https://status.orcasecurity.io/api/v2/status.json", page_url: "https://status.orcasecurity.io", type: "statuspage" },
    { id: "scale_ai", name: "Scale AI", tags: ["ai", "data", "annotation", "training"], status_url: "https://status.scale.com/api/v2/status.json", page_url: "https://status.scale.com", type: "statuspage" },
    { id: "wordtune", name: "Wordtune", tags: ["ai", "writing", "productivity", "saas"], status_url: "https://status.wordtune.com/api/v2/status.json", page_url: "https://status.wordtune.com", type: "statuspage" },
    { id: "quantumworkplace", name: "Quantum Workplace", tags: ["hr", "employee-engagement", "performance", "saas"], status_url: "https://status.quantumworkplace.com/api/v2/status.json", page_url: "https://status.quantumworkplace.com", type: "statuspage" },
    { id: "precisely", name: "Precisely", tags: ["data", "quality", "enrichment", "analytics"], status_url: "https://status.precisely.com/api/v2/status.json", page_url: "https://status.precisely.com", type: "statuspage" },
    { id: "broadvoice", name: "Broadvoice", tags: ["voip", "communications", "cloud", "telephony"], status_url: "https://status.broadvoice.com/api/v2/status.json", page_url: "https://status.broadvoice.com", type: "statuspage" },
    { id: "logz", name: "Logz.io", tags: ["observability", "logging", "monitoring", "devops"], status_url: "https://status.logz.io/api/v2/status.json", page_url: "https://status.logz.io", type: "statuspage" },
    { id: "getstream", name: "Stream", tags: ["messaging", "chat", "feeds", "real-time"], status_url: "https://status.getstream.io/api/v2/status.json", page_url: "https://status.getstream.io", type: "statuspage" },
    { id: "otter", name: "Otter.ai", tags: ["ai", "transcription", "meeting", "productivity"], status_url: "https://status.otter.ai/api/v2/status.json", page_url: "https://status.otter.ai", type: "statuspage" },
    { id: "wheniwork", name: "When I Work", tags: ["workforce", "scheduling", "hr", "shift-management"], status_url: "https://status.wheniwork.com/api/v2/status.json", page_url: "https://status.wheniwork.com", type: "statuspage" },
    { id: "sigmacomputing", name: "Sigma Computing", tags: ["bi", "analytics", "data", "spreadsheet"], status_url: "https://status.sigmacomputing.com/api/v2/status.json", page_url: "https://status.sigmacomputing.com", type: "statuspage" },
    { id: "diligent", name: "Diligent", tags: ["governance", "board", "grc", "compliance"], status_url: "https://status.diligent.com/api/v2/status.json", page_url: "https://status.diligent.com", type: "statuspage" },
    { id: "onspring", name: "Onspring", tags: ["grc", "no-code", "workflow", "compliance"], status_url: "https://status.onspring.com/api/v2/status.json", page_url: "https://status.onspring.com", type: "statuspage" },
    { id: "assembly", name: "Assembly", tags: ["employee-engagement", "hr", "recognition", "intranet"], status_url: "https://status.assembly.com/api/v2/status.json", page_url: "https://status.assembly.com", type: "statuspage" },
    { id: "performyard", name: "PerformYard", tags: ["hr", "performance", "reviews", "goals"], status_url: "https://status.performyard.com/api/v2/status.json", page_url: "https://status.performyard.com", type: "statuspage" },
    { id: "everstage", name: "Everstage", tags: ["sales", "compensation", "commissions", "revenue"], status_url: "https://status.everstage.com/api/v2/status.json", page_url: "https://status.everstage.com", type: "statuspage" },
    { id: "reclaim", name: "Reclaim.ai", tags: ["ai", "scheduling", "calendar", "productivity"], status_url: "https://status.reclaim.ai/api/v2/status.json", page_url: "https://status.reclaim.ai", type: "statuspage" },
    { id: "ashby", name: "Ashby", tags: ["ats", "recruiting", "hiring", "hr"], status_url: "https://status.ashbyhq.com/api/v2/status.json", page_url: "https://status.ashbyhq.com", type: "statuspage" },
    { id: "shiphero", name: "ShipHero", tags: ["logistics", "fulfillment", "warehouse", "ecommerce"], status_url: "https://status.shiphero.com/api/v2/status.json", page_url: "https://status.shiphero.com", type: "statuspage" },
    { id: "extensiv", name: "Extensiv", tags: ["logistics", "fulfillment", "warehouse", "3pl"], status_url: "https://status.extensiv.com/api/v2/status.json", page_url: "https://status.extensiv.com", type: "statuspage" },
    { id: "incident_io", name: "Incident.io", tags: ["incident-management", "ops", "on-call", "devops"], status_url: "https://status.incident.io/api/v2/status.json", page_url: "https://status.incident.io", type: "statuspage" },
    { id: "playfab", name: "PlayFab", tags: ["gaming", "backend", "game-services", "microsoft"], status_url: "https://status.playfab.com/api/v2/status.json", page_url: "https://status.playfab.com", type: "statuspage" },
    { id: "lightspeed", name: "Lightspeed", tags: ["pos", "retail", "restaurant", "ecommerce"], status_url: "https://status.lightspeedhq.com/api/v2/status.json", page_url: "https://status.lightspeedhq.com", type: "statuspage" },
    { id: "tawkto", name: "Tawk.to", tags: ["live-chat", "customer-support", "messaging", "saas"], status_url: "https://status.tawk.to/api/v2/status.json", page_url: "https://status.tawk.to", type: "statuspage" },
    { id: "inspectlet", name: "Inspectlet", tags: ["analytics", "session-recording", "heatmaps", "ux"], status_url: "https://status.inspectlet.com/api/v2/status.json", page_url: "https://status.inspectlet.com", type: "statuspage" },
    { id: "zenduty", name: "Zenduty", tags: ["incident-management", "on-call", "alerting", "devops"], status_url: "https://status.zenduty.com/api/v2/status.json", page_url: "https://status.zenduty.com", type: "statuspage" },
    { id: "localytics", name: "Localytics", tags: ["analytics", "mobile", "marketing", "engagement"], status_url: "https://status.localytics.com/api/v2/status.json", page_url: "https://status.localytics.com", type: "statuspage" },
    { id: "procurify", name: "Procurify", tags: ["procurement", "spend-management", "purchasing", "finance"], status_url: "https://status.procurify.com/api/v2/status.json", page_url: "https://status.procurify.com", type: "statuspage" },
    { id: "socio_events", name: "Socio Events", tags: ["events", "virtual", "hybrid", "engagement"], status_url: "https://status.socio.events/api/v2/status.json", page_url: "https://status.socio.events", type: "statuspage" },
    { id: "slido", name: "Slido", tags: ["events", "polls", "q-and-a", "audience-engagement"], status_url: "https://status.slido.com/api/v2/status.json", page_url: "https://status.slido.com", type: "statuspage" },
    { id: "jellyfish", name: "Jellyfish", tags: ["engineering", "analytics", "productivity", "devtools"], status_url: "https://status.jellyfish.co/api/v2/status.json", page_url: "https://status.jellyfish.co", type: "statuspage" },
    { id: "higher_logic", name: "Higher Logic", tags: ["community", "association", "member-engagement", "collaboration"], status_url: "https://status.higherlogic.com/api/v2/status.json", page_url: "https://status.higherlogic.com", type: "statuspage" },
    { id: "planning_center", name: "Planning Center", tags: ["church", "faith", "nonprofit", "management"], status_url: "https://status.planningcenter.com/api/v2/status.json", page_url: "https://status.planningcenter.com", type: "statuspage" },
    { id: "bullhorn", name: "Bullhorn", tags: ["recruiting", "staffing", "crm", "ats"], status_url: "https://status.bullhorn.com/api/v2/status.json", page_url: "https://status.bullhorn.com", type: "statuspage" },
    { id: "process_street", name: "Process Street", tags: ["workflow", "process", "checklist", "productivity"], status_url: "https://status.process.st/api/v2/status.json", page_url: "https://status.process.st", type: "statuspage" },
    { id: "onfleet", name: "Onfleet", tags: ["delivery", "logistics", "last-mile", "fleet"], status_url: "https://status.onfleet.com/api/v2/status.json", page_url: "https://status.onfleet.com", type: "statuspage" },
    { id: "kickserv", name: "Kickserv", tags: ["field-service", "scheduling", "service-management", "operations"], status_url: "https://status.kickserv.com/api/v2/status.json", page_url: "https://status.kickserv.com", type: "statuspage" },
    { id: "jobnimbus", name: "JobNimbus", tags: ["crm", "contractors", "construction", "project-management"], status_url: "https://status.jobnimbus.com/api/v2/status.json", page_url: "https://status.jobnimbus.com", type: "statuspage" },
    { id: "reggora", name: "Reggora", tags: ["appraisal", "mortgage", "real-estate", "fintech"], status_url: "https://status.reggora.com/api/v2/status.json", page_url: "https://status.reggora.com", type: "statuspage" },
    { id: "eltropy", name: "Eltropy", tags: ["banking", "credit-union", "digital-banking", "communications"], status_url: "https://status.eltropy.com/api/v2/status.json", page_url: "https://status.eltropy.com", type: "statuspage" },
    { id: "glia", name: "Glia", tags: ["customer-service", "banking", "digital-service", "fintech"], status_url: "https://status.glia.com/api/v2/status.json", page_url: "https://status.glia.com", type: "statuspage" },
    // Climate / sustainability tech
    { id: "watershed", name: "Watershed", tags: ["climate", "carbon", "sustainability", "esg"], status_url: "https://status.watershed.com/api/v2/status.json", page_url: "https://status.watershed.com", type: "statuspage" },
    { id: "persefoni", name: "Persefoni", tags: ["climate", "esg", "carbon-accounting", "sustainability"], status_url: "https://status.persefoni.com/api/v2/status.json", page_url: "https://status.persefoni.com", type: "statuspage" },
    { id: "arcadia", name: "Arcadia", tags: ["energy", "utilities", "clean-energy", "climate"], status_url: "https://status.arcadia.com/api/v2/status.json", page_url: "https://status.arcadia.com", type: "statuspage" },
    // Mental health benefits
    { id: "spring_health", name: "Spring Health", tags: ["mental-health", "hr", "benefits", "wellness"], status_url: "https://springhealth.statuspage.io/api/v2/status.json", page_url: "https://springhealth.statuspage.io", type: "statuspage" },
    // Accounting automation
    { id: "botkeeper", name: "Botkeeper", tags: ["accounting", "bookkeeping", "ai", "automation"], status_url: "https://status.botkeeper.com/api/v2/status.json", page_url: "https://status.botkeeper.com", type: "statuspage" },
    // Payment orchestration
    { id: "gr4vy", name: "Gr4vy", tags: ["payments", "orchestration", "fintech", "api"], status_url: "https://status.gr4vy.com/api/v2/status.json", page_url: "https://status.gr4vy.com", type: "statuspage" },
    // Master data management
    { id: "reltio", name: "Reltio", tags: ["mdm", "master-data", "data-management", "cloud"], status_url: "https://status.reltio.com/api/v2/status.json", page_url: "https://status.reltio.com", type: "statuspage" },
    // Email creation platform
    { id: "stensul", name: "Stensul", tags: ["email", "marketing", "creation", "saas"], status_url: "https://status.stensul.com/api/v2/status.json", page_url: "https://status.stensul.com", type: "statuspage" },
    // Digital asset management
    { id: "acquia_dam", name: "Acquia DAM (Widen)", tags: ["dam", "digital-asset-management", "marketing", "cms"], status_url: "https://status.widen.com/api/v2/status.json", page_url: "https://status.widen.com", type: "statuspage" },
    { id: "air", name: "Air", tags: ["creative-ops", "dam", "collaboration", "design"], status_url: "https://status.air.inc/api/v2/status.json", page_url: "https://status.air.inc", type: "statuspage" },
    // Privacy / consent management
    { id: "privacera", name: "Privacera", tags: ["data-privacy", "governance", "security", "cloud"], status_url: "https://status.privacera.com/api/v2/status.json", page_url: "https://status.privacera.com", type: "statuspage" },
    { id: "transcend", name: "Transcend", tags: ["privacy", "data-rights", "compliance", "saas"], status_url: "https://status.transcend.io/api/v2/status.json", page_url: "https://status.transcend.io", type: "statuspage" },
    { id: "ketch", name: "Ketch", tags: ["privacy", "consent", "data-governance", "compliance"], status_url: "https://status.ketch.com/api/v2/status.json", page_url: "https://status.ketch.com", type: "statuspage" },
    { id: "didomi", name: "Didomi", tags: ["consent", "privacy", "gdpr", "saas"], status_url: "https://status.didomi.io/api/v2/status.json", page_url: "https://status.didomi.io", type: "statuspage" },
    // Restaurant operations
    { id: "restaurant365", name: "Restaurant365", tags: ["restaurant", "accounting", "operations", "saas"], status_url: "https://status.restaurant365.com/api/v2/status.json", page_url: "https://status.restaurant365.com", type: "statuspage" },
    // Communications / CPaaS
    { id: "kaleyra", name: "Kaleyra", tags: ["sms", "communications", "cpaas", "api"], status_url: "https://status.kaleyra.com/api/v2/status.json", page_url: "https://status.kaleyra.com", type: "statuspage" },
    // Fleet telematics / IoT
    { id: "lytx", name: "Lytx", tags: ["fleet", "telematics", "video", "iot"], status_url: "https://status.lytx.com/api/v2/status.json", page_url: "https://status.lytx.com", type: "statuspage" },
    // B2B chemical commerce platform
    { id: "knowde", name: "Knowde", tags: ["chemicals", "b2b", "marketplace", "saas"], status_url: "https://status.knowde.com/api/v2/status.json", page_url: "https://status.knowde.com", type: "statuspage" },
    // Product analytics / digital experience
    { id: "quantum_metric", name: "Quantum Metric", tags: ["analytics", "digital-experience", "product", "enterprise"], status_url: "https://status.quantummetric.com/api/v2/status.json", page_url: "https://status.quantummetric.com", type: "statuspage" },
    // QA / test management
    { id: "qase", name: "Qase", tags: ["testing", "qa", "test-management", "devtools"], status_url: "https://status.qase.io/api/v2/status.json", page_url: "https://status.qase.io", type: "statuspage" },
    // GraphQL platform
    { id: "apollo_graphql", name: "Apollo GraphQL", tags: ["graphql", "api", "developer-tools", "platform"], status_url: "https://status.apollographql.com/api/v2/status.json", page_url: "https://status.apollographql.com", type: "statuspage" },
    // UGC / visual content marketing
    { id: "crowdriff", name: "CrowdRiff", tags: ["ugc", "marketing", "visual-content", "saas"], status_url: "https://status.crowdriff.com/api/v2/status.json", page_url: "https://status.crowdriff.com", type: "statuspage" },
    // Cloud database (DataStax Astra)
    { id: "astradb", name: "DataStax Astra", tags: ["database", "cassandra", "cloud", "nosql"], status_url: "https://status.astra.datastax.com/api/v2/status.json", page_url: "https://status.astra.datastax.com", type: "statuspage" },
    // Global HR / employer of record
    { id: "oyster_hr", name: "Oyster HR", tags: ["hr", "employer-of-record", "global-payroll", "saas"], status_url: "https://status.oysterhr.com/api/v2/status.json", page_url: "https://status.oysterhr.com", type: "statuspage" },
    // EHR / practice management
    { id: "practicefusion", name: "Practice Fusion", tags: ["ehr", "healthcare", "practice-management", "saas"], status_url: "https://status.practicefusion.com/api/v2/status.json", page_url: "https://status.practicefusion.com", type: "statuspage" },
    // Payment processing
    { id: "stax_payments", name: "Stax Payments", tags: ["payments", "payment-processing", "fintech", "saas"], status_url: "https://status.staxpayments.com/api/v2/status.json", page_url: "https://status.staxpayments.com", type: "statuspage" },
    // Form builders
    { id: "cognito_forms", name: "Cognito Forms", tags: ["forms", "data-collection", "workflow", "saas"], status_url: "https://status.cognitoforms.com/api/v2/status.json", page_url: "https://status.cognitoforms.com", type: "statuspage" },
    { id: "wufoo", name: "Wufoo", tags: ["forms", "surveys", "data-collection", "saas"], status_url: "https://status.wufoo.com/api/v2/status.json", page_url: "https://status.wufoo.com", type: "statuspage" },
    // CRM
    { id: "pipelinecrm", name: "Pipeline CRM", tags: ["crm", "sales", "pipeline", "saas"], status_url: "https://status.pipelinecrm.com/api/v2/status.json", page_url: "https://status.pipelinecrm.com", type: "statuspage" },
    // Payment gateway
    { id: "authorizenet", name: "Authorize.Net", tags: ["payments", "payment-gateway", "fintech", "api"], status_url: "https://authorize.statuspage.io/api/v2/status.json", page_url: "https://authorize.statuspage.io", type: "statuspage" },
    // Review / reputation management
    { id: "reviewtrackers", name: "ReviewTrackers", tags: ["reviews", "reputation", "analytics", "saas"], status_url: "https://status.reviewtrackers.com/api/v2/status.json", page_url: "https://status.reviewtrackers.com", type: "statuspage" },
    // Marketing automation
    { id: "act_on", name: "Act-On", tags: ["marketing", "email", "automation", "saas"], status_url: "https://status.act-on.com/api/v2/status.json", page_url: "https://status.act-on.com", type: "statuspage" },
    { id: "sharpspring", name: "SharpSpring", tags: ["marketing", "crm", "automation", "saas"], status_url: "https://status.sharpspring.com/api/v2/status.json", page_url: "https://status.sharpspring.com", type: "statuspage" },
    // Time tracking / workforce management
    { id: "replicon", name: "Replicon", tags: ["time-tracking", "workforce", "hr", "saas"], status_url: "https://status.replicon.com/api/v2/status.json", page_url: "https://status.replicon.com", type: "statuspage" },
    // Cloud UC/CC
    { id: "avaya_cloud", name: "Avaya Cloud", tags: ["ucaas", "ccaas", "communications", "telephony"], status_url: "https://avayacloud.statuspage.io/api/v2/status.json", page_url: "https://avayacloud.statuspage.io", type: "statuspage" },
    // Link shortening / analytics
    { id: "bitly", name: "Bitly", tags: ["link-shortening", "analytics", "saas"], status_url: "https://status.bitly.com/api/v2/status.json", page_url: "https://status.bitly.com", type: "statuspage" },
    { id: "rebrandly", name: "Rebrandly", tags: ["link-shortening", "branding", "saas"], status_url: "https://status.rebrandly.com/api/v2/status.json", page_url: "https://status.rebrandly.com", type: "statuspage" },
    // SMS marketing
    { id: "simpletexting", name: "SimpleTexting", tags: ["sms", "marketing", "texting", "saas"], status_url: "https://status.simpletexting.com/api/v2/status.json", page_url: "https://status.simpletexting.com", type: "statuspage" },
    // Form builders
    { id: "formbuilder_123", name: "123FormBuilder", tags: ["forms", "surveys", "data-collection", "saas"], status_url: "https://status.123formbuilder.com/api/v2/status.json", page_url: "https://status.123formbuilder.com", type: "statuspage" },
    { id: "formassembly", name: "FormAssembly", tags: ["forms", "data-collection", "compliance", "saas"], status_url: "https://status.formassembly.com/api/v2/status.json", page_url: "https://status.formassembly.com", type: "statuspage" },
    // Telemedicine
    { id: "doxy_me", name: "Doxy.me", tags: ["telemedicine", "healthcare", "video", "saas"], status_url: "https://status.doxy.me/api/v2/status.json", page_url: "https://status.doxy.me", type: "statuspage" },
    // RMM / IT management
    { id: "pulseway", name: "Pulseway", tags: ["rmm", "it-management", "msp", "monitoring"], status_url: "https://status.pulseway.com/api/v2/status.json", page_url: "https://status.pulseway.com", type: "statuspage" },
    // B2B payment routing
    { id: "routable", name: "Routable", tags: ["payments", "b2b", "fintech", "api"], status_url: "https://status.routable.com/api/v2/status.json", page_url: "https://status.routable.com", type: "statuspage" },
    // Gaming payments
    { id: "xsolla", name: "Xsolla", tags: ["gaming", "payments", "fintech", "saas"], status_url: "https://status.xsolla.com/api/v2/status.json", page_url: "https://status.xsolla.com", type: "statuspage" },
    // Restaurant POS
    { id: "upserve", name: "Upserve", tags: ["pos", "restaurant", "hospitality", "payments"], status_url: "https://status.upserve.com/api/v2/status.json", page_url: "https://status.upserve.com", type: "statuspage" },
    { id: "spoton", name: "SpotOn", tags: ["pos", "restaurant", "retail", "payments"], status_url: "https://status.spoton.com/api/v2/status.json", page_url: "https://status.spoton.com", type: "statuspage" },
    // Fitness management
    { id: "wodify", name: "Wodify", tags: ["fitness", "gym-management", "crossfit", "saas"], status_url: "https://status.wodify.com/api/v2/status.json", page_url: "https://status.wodify.com", type: "statuspage" },
    // Customer data platforms
    { id: "blueconic", name: "BlueConic", tags: ["cdp", "customer-data", "marketing", "saas"], status_url: "https://status.blueconic.com/api/v2/status.json", page_url: "https://status.blueconic.com", type: "statuspage" },
    { id: "amperity", name: "Amperity", tags: ["cdp", "customer-data", "analytics", "saas"], status_url: "https://status.amperity.com/api/v2/status.json", page_url: "https://status.amperity.com", type: "statuspage" },
    // Session recording / analytics
    { id: "luckyorange", name: "Lucky Orange", tags: ["analytics", "session-recording", "heatmaps", "saas"], status_url: "https://status.luckyorange.com/api/v2/status.json", page_url: "https://status.luckyorange.com", type: "statuspage" },
    // Document AI / AP automation
    { id: "hypatos", name: "Hypatos", tags: ["document-ai", "ap-automation", "finance", "saas"], status_url: "https://status.hypatos.ai/api/v2/status.json", page_url: "https://status.hypatos.ai", type: "statuspage" },
    // Data security / DLP
    { id: "nightfall", name: "Nightfall AI", tags: ["security", "dlp", "data-protection", "saas"], status_url: "https://status.nightfall.ai/api/v2/status.json", page_url: "https://status.nightfall.ai", type: "statuspage" },
    // Event ticketing
    { id: "universe", name: "Universe", tags: ["events", "ticketing", "saas"], status_url: "https://status.universe.com/api/v2/status.json", page_url: "https://status.universe.com", type: "statuspage" },
    // Email marketing automation
    { id: "vero", name: "Vero", tags: ["email", "marketing", "automation", "saas"], status_url: "https://status.getvero.com/api/v2/status.json", page_url: "https://status.getvero.com", type: "statuspage" },
    // Gaming platform
    { id: "epicgames", name: "Epic Games", tags: ["gaming", "developer-tools", "saas"], status_url: "https://status.epicgames.com/api/v2/status.json", page_url: "https://status.epicgames.com", type: "statuspage" },
    // Crypto exchanges
    { id: "coinbase", name: "Coinbase", tags: ["crypto", "fintech", "payments", "saas"], status_url: "https://status.coinbase.com/api/v2/status.json", page_url: "https://status.coinbase.com", type: "statuspage" },
    { id: "kraken", name: "Kraken", tags: ["crypto", "fintech", "payments", "saas"], status_url: "https://status.kraken.com/api/v2/status.json", page_url: "https://status.kraken.com", type: "statuspage" },
    // Web3 / blockchain infrastructure
    { id: "alchemy", name: "Alchemy", tags: ["web3", "blockchain", "developer-tools", "api"], status_url: "https://status.alchemy.com/api/v2/status.json", page_url: "https://status.alchemy.com", type: "statuspage" },
    { id: "infura", name: "Infura", tags: ["web3", "blockchain", "developer-tools", "api"], status_url: "https://status.infura.io/api/v2/status.json", page_url: "https://status.infura.io", type: "statuspage" },
    { id: "quicknode", name: "QuickNode", tags: ["web3", "blockchain", "developer-tools", "api"], status_url: "https://status.quicknode.com/api/v2/status.json", page_url: "https://status.quicknode.com", type: "statuspage" },
    // Shipping / logistics
    { id: "shipstation", name: "ShipStation", tags: ["logistics", "shipping", "ecommerce", "saas"], status_url: "https://status.shipstation.com/api/v2/status.json", page_url: "https://status.shipstation.com", type: "statuspage" },
    // Construction & legal SaaS
    { id: "procore", name: "Procore", tags: ["construction", "project-management", "saas"], status_url: "https://status.procore.com/api/v2/status.json", page_url: "https://status.procore.com", type: "statuspage" },
    { id: "clio", name: "Clio", tags: ["legal", "law-practice", "saas"], status_url: "https://status.clio.com/api/v2/status.json", page_url: "https://status.clio.com", type: "statuspage" },
    // Mobile measurement / attribution
    { id: "appsflyer", name: "AppsFlyer", tags: ["mobile", "analytics", "attribution", "saas"], status_url: "https://status.appsflyer.com/api/v2/status.json", page_url: "https://status.appsflyer.com", type: "statuspage" },
    { id: "branch", name: "Branch", tags: ["mobile", "analytics", "attribution", "developer-tools"], status_url: "https://status.branch.io/api/v2/status.json", page_url: "https://status.branch.io", type: "statuspage" },
    { id: "adjust", name: "Adjust", tags: ["mobile", "analytics", "attribution", "saas"], status_url: "https://status.adjust.com/api/v2/status.json", page_url: "https://status.adjust.com", type: "statuspage" },
    // iPaaS / automation
    { id: "workato", name: "Workato", tags: ["automation", "integration", "ipaas", "saas"], status_url: "https://status.workato.com/api/v2/status.json", page_url: "https://status.workato.com", type: "statuspage" },
    // IoT platform
    { id: "particle", name: "Particle", tags: ["iot", "developer-tools", "hardware", "saas"], status_url: "https://status.particle.io/api/v2/status.json", page_url: "https://status.particle.io", type: "statuspage" },
    // Privacy / consent management
    { id: "onetrust", name: "OneTrust", tags: ["privacy", "compliance", "consent", "saas"], status_url: "https://onetrust.statuspage.io/api/v2/status.json", page_url: "https://onetrust.statuspage.io", type: "statuspage" },
    { id: "trustarc", name: "TrustArc", tags: ["privacy", "compliance", "consent", "saas"], status_url: "https://status.trustarc.com/api/v2/status.json", page_url: "https://status.trustarc.com", type: "statuspage" },
    // Ad verification
    { id: "doubleverify", name: "DoubleVerify", tags: ["adtech", "advertising", "brand-safety", "saas"], status_url: "https://status.doubleverify.com/api/v2/status.json", page_url: "https://status.doubleverify.com", type: "statuspage" },
    // SMS / messaging
    { id: "clicksend", name: "ClickSend", tags: ["sms", "messaging", "communications", "api"], status_url: "https://status.clicksend.com/api/v2/status.json", page_url: "https://status.clicksend.com", type: "statuspage" },
    // Email / lifecycle marketing
    { id: "customerio", name: "Customer.io", tags: ["email", "marketing", "automation", "saas"], status_url: "https://status.customerio.com/api/v2/status.json", page_url: "https://status.customerio.com", type: "statuspage" },
    // Cloud / IaaS
    { id: "linode", name: "Linode (Akamai)", tags: ["cloud", "iaas", "hosting", "infrastructure"], status_url: "https://status.linode.com/api/v2/status.json", page_url: "https://status.linode.com", type: "statuspage" },
    { id: "render", name: "Render", tags: ["cloud", "hosting", "paas", "developer-tools"], status_url: "https://status.render.com/api/v2/status.json", page_url: "https://status.render.com", type: "statuspage" },
    { id: "bunny", name: "Bunny.net", tags: ["cdn", "hosting", "edge", "infrastructure"], status_url: "https://status.bunny.net/api/v2/status.json", page_url: "https://status.bunny.net", type: "statuspage" },
    { id: "equinix_metal", name: "Equinix Metal", tags: ["cloud", "bare-metal", "infrastructure", "iaas"], status_url: "https://equinixmetal.statuspage.io/api/v2/status.json", page_url: "https://equinixmetal.statuspage.io", type: "statuspage" },
    // Vector databases
    { id: "pinecone", name: "Pinecone", tags: ["database", "vector-db", "ai", "developer-tools"], status_url: "https://status.pinecone.io/api/v2/status.json", page_url: "https://status.pinecone.io", type: "statuspage" },
    // AI / LLM services
    { id: "elevenlabs", name: "ElevenLabs", tags: ["ai", "voice", "text-to-speech", "api"], status_url: "https://status.elevenlabs.io/api/v2/status.json", page_url: "https://status.elevenlabs.io", type: "statuspage" },
    { id: "baseten", name: "Baseten", tags: ["ai", "ml", "deployment", "developer-tools"], status_url: "https://status.baseten.co/api/v2/status.json", page_url: "https://status.baseten.co", type: "statuspage" },
    { id: "clarifai", name: "Clarifai", tags: ["ai", "computer-vision", "ml", "api"], status_url: "https://status.clarifai.com/api/v2/status.json", page_url: "https://status.clarifai.com", type: "statuspage" },
    { id: "scale", name: "Scale AI", tags: ["ai", "data-labeling", "ml", "saas"], status_url: "https://status.scale.com/api/v2/status.json", page_url: "https://status.scale.com", type: "statuspage" },
    // Fleet management
    { id: "fleetio", name: "Fleetio", tags: ["fleet", "logistics", "saas"], status_url: "https://status.fleetio.com/api/v2/status.json", page_url: "https://status.fleetio.com", type: "statuspage" },
    { id: "sensepass", name: "SensePass", tags: ["payments", "saas", "retail"], status_url: "https://status.sensepass.com/api/v2/status.json", page_url: "https://status.sensepass.com", type: "statuspage" },
    // Survey / CX research platforms
    { id: "qualtrics", name: "Qualtrics", tags: ["surveys", "cx", "analytics", "enterprise"], status_url: "https://status.qualtrics.com/api/v2/status.json", page_url: "https://status.qualtrics.com", type: "statuspage" },
    { id: "surveymonkey", name: "SurveyMonkey", tags: ["surveys", "analytics", "saas"], status_url: "https://status.surveymonkey.com/api/v2/status.json", page_url: "https://status.surveymonkey.com", type: "statuspage" },
    // Reputation / review management
    { id: "birdeye", name: "Birdeye", tags: ["reputation", "reviews", "marketing", "saas"], status_url: "https://status.birdeye.com/api/v2/status.json", page_url: "https://status.birdeye.com", type: "statuspage" },
    { id: "yotpo", name: "Yotpo", tags: ["reviews", "ecommerce", "marketing", "saas"], status_url: "https://status.yotpo.com/api/v2/status.json", page_url: "https://status.yotpo.com", type: "statuspage" },
    { id: "trustpilot", name: "Trustpilot", tags: ["reviews", "reputation", "saas"], status_url: "https://status.trustpilot.com/api/v2/status.json", page_url: "https://status.trustpilot.com", type: "statuspage" },
    // Auth / identity
    { id: "clerk", name: "Clerk", tags: ["auth", "identity", "developer-tools", "saas"], status_url: "https://status.clerk.com/api/v2/status.json", page_url: "https://status.clerk.com", type: "statuspage" },
    { id: "frontegg", name: "Frontegg", tags: ["auth", "identity", "developer-tools", "saas"], status_url: "https://status.frontegg.com/api/v2/status.json", page_url: "https://status.frontegg.com", type: "statuspage" },
    { id: "workos", name: "WorkOS", tags: ["auth", "identity", "enterprise", "developer-tools"], status_url: "https://status.workos.com/api/v2/status.json", page_url: "https://status.workos.com", type: "statuspage" },
    { id: "magic", name: "Magic", tags: ["auth", "web3", "identity", "developer-tools"], status_url: "https://status.magic.link/api/v2/status.json", page_url: "https://status.magic.link", type: "statuspage" },
    // Databases
    { id: "tidbcloud", name: "TiDB Cloud", tags: ["database", "cloud", "mysql", "saas"], status_url: "https://status.tidbcloud.com/api/v2/status.json", page_url: "https://status.tidbcloud.com", type: "statuspage" },
    { id: "couchbase", name: "Couchbase", tags: ["database", "nosql", "cloud", "saas"], status_url: "https://status.couchbase.com/api/v2/status.json", page_url: "https://status.couchbase.com", type: "statuspage" },
    { id: "upstash", name: "Upstash", tags: ["database", "redis", "kafka", "developer-tools"], status_url: "https://status.upstash.com/api/v2/status.json", page_url: "https://status.upstash.com", type: "statuspage" },
    { id: "supabase", name: "Supabase", tags: ["database", "postgres", "backend", "developer-tools"], status_url: "https://status.supabase.com/api/v2/status.json", page_url: "https://status.supabase.com", type: "statuspage" },
    { id: "hygraph", name: "Hygraph", tags: ["cms", "graphql", "headless", "developer-tools"], status_url: "https://status.hygraph.com/api/v2/status.json", page_url: "https://status.hygraph.com", type: "statuspage" },
    // Fintech / trading infrastructure
    { id: "tradier", name: "Tradier", tags: ["fintech", "brokerage", "trading", "api"], status_url: "https://status.tradier.com/api/v2/status.json", page_url: "https://status.tradier.com", type: "statuspage" },
    { id: "cashapp", name: "Cash App", tags: ["fintech", "payments", "mobile", "banking"], status_url: "https://status.cash.app/api/v2/status.json", page_url: "https://status.cash.app", type: "statuspage" },
    // Marketing / CDP
    { id: "blueshift", name: "Blueshift", tags: ["marketing", "cdp", "ai", "email"], status_url: "https://status.blueshift.com/api/v2/status.json", page_url: "https://status.blueshift.com", type: "statuspage" },
    // AI / creative tools
    { id: "runway_ml", name: "Runway", tags: ["ai", "video", "creative", "generative"], status_url: "https://status.runwayml.com/api/v2/status.json", page_url: "https://status.runwayml.com", type: "statuspage" },
    { id: "lovable", name: "Lovable", tags: ["ai", "developer-tools", "no-code", "web"], status_url: "https://status.lovable.dev/api/v2/status.json", page_url: "https://status.lovable.dev", type: "statuspage" },
    { id: "bolt", name: "Bolt.new", tags: ["ai", "developer-tools", "no-code", "coding"], status_url: "https://status.bolt.new/api/v2/status.json", page_url: "https://status.bolt.new", type: "statuspage" },
    // AI meeting tools
    { id: "tactiq", name: "Tactiq", tags: ["ai", "meeting-transcription", "productivity", "collaboration"], status_url: "https://status.tactiq.io/api/v2/status.json", page_url: "https://status.tactiq.io", type: "statuspage" },
    // Email / messaging security
    { id: "vade", name: "Vade", tags: ["security", "email", "ai", "anti-phishing"], status_url: "https://status.vadesecure.com/api/v2/status.json", page_url: "https://status.vadesecure.com", type: "statuspage" },
    // Cyber threat intelligence
    { id: "recorded_future", name: "Recorded Future", tags: ["security", "threat-intelligence", "cyber", "saas"], status_url: "https://status.recordedfuture.com/api/v2/status.json", page_url: "https://status.recordedfuture.com", type: "statuspage" },
    { id: "greynoise", name: "GreyNoise", tags: ["security", "threat-intelligence", "network", "saas"], status_url: "https://status.greynoise.io/api/v2/status.json", page_url: "https://status.greynoise.io", type: "statuspage" },
    { id: "anomali", name: "Anomali", tags: ["security", "threat-intelligence", "siem", "saas"], status_url: "https://status.anomali.com/api/v2/status.json", page_url: "https://status.anomali.com", type: "statuspage" },
    // IoT connectivity
    { id: "emnify", name: "emnify", tags: ["iot", "connectivity", "sim", "infrastructure"], status_url: "https://status.emnify.com/api/v2/status.json", page_url: "https://status.emnify.com", type: "statuspage" },
    // Enterprise architecture / IT portfolio management
    { id: "ardoq", name: "Ardoq", tags: ["enterprise-architecture", "it-portfolio", "saas", "governance"], status_url: "https://status.ardoq.com/api/v2/status.json", page_url: "https://status.ardoq.com", type: "statuspage" },
    // Video interviewing / hiring platform
    { id: "spark_hire", name: "Spark Hire Recruit", tags: ["recruiting", "video-interview", "hr", "saas"], status_url: "https://status.comeet.com/api/v2/status.json", page_url: "https://status.comeet.com", type: "statuspage" },
    // Website builder
    { id: "ucraft", name: "Ucraft", tags: ["website-builder", "no-code", "saas", "ecommerce"], status_url: "https://status.ucraft.com/api/v2/status.json", page_url: "https://status.ucraft.com", type: "statuspage" },
    // CMS / digital experience platform
    { id: "sitefinity", name: "Sitefinity Insight", tags: ["cms", "digital-experience", "marketing", "saas"], status_url: "https://status.sitefinity.com/api/v2/status.json", page_url: "https://status.sitefinity.com", type: "statuspage" },
    // Payment processing
    { id: "paysafe", name: "Paysafe", tags: ["payments", "fintech", "processing", "api"], status_url: "https://status.paysafe.com/api/v2/status.json", page_url: "https://status.paysafe.com", type: "statuspage" },
    // Crowdfunding platform
    { id: "kickstarter", name: "Kickstarter", tags: ["crowdfunding", "marketplace", "creative", "saas"], status_url: "https://status.kickstarter.com/api/v2/status.json", page_url: "https://status.kickstarter.com", type: "statuspage" },
    // Crypto payment processing
    { id: "bitpay", name: "BitPay", tags: ["crypto", "payments", "bitcoin", "fintech"], status_url: "https://status.bitpay.com/api/v2/status.json", page_url: "https://status.bitpay.com", type: "statuspage" },
    // Crypto on-ramp
    { id: "moonpay", name: "MoonPay", tags: ["crypto", "on-ramp", "payments", "fintech"], status_url: "https://status.moonpay.com/api/v2/status.json", page_url: "https://status.moonpay.com", type: "statuspage" },
    // Fiat-to-crypto gateway
    { id: "onramper", name: "Onramper", tags: ["crypto", "on-ramp", "fintech", "api"], status_url: "https://status.onramper.com/api/v2/status.json", page_url: "https://status.onramper.com", type: "statuspage" },
    // IoT / LoRaWAN network
    { id: "the_things_network", name: "The Things Network", tags: ["iot", "lorawan", "connectivity", "open-source"], status_url: "https://status.thethings.network/api/v2/status.json", page_url: "https://status.thethings.network", type: "statuspage" },
    // IoT data platform
    { id: "ubidots", name: "Ubidots", tags: ["iot", "data-platform", "analytics", "saas"], status_url: "https://status.ubidots.com/api/v2/status.json", page_url: "https://status.ubidots.com", type: "statuspage" },
    // Lending / fintech software
    { id: "meridianlink", name: "MeridianLink", tags: ["fintech", "lending", "banking", "saas"], status_url: "https://status.meridianlink.com/api/v2/status.json", page_url: "https://status.meridianlink.com", type: "statuspage" },
    // Professional services automation / PSA
    { id: "kantata", name: "Kantata OX", tags: ["psa", "project-management", "resource-management", "saas"], status_url: "https://status.mavenlink.com/api/v2/status.json", page_url: "https://status.mavenlink.com", type: "statuspage" },
    // Community / customer engagement platform
    { id: "khoros", name: "Khoros", tags: ["community", "customer-engagement", "social", "saas"], status_url: "https://status.khoros.com/api/v2/status.json", page_url: "https://status.khoros.com", type: "statuspage" },
    // Online community platform
    { id: "hivebrite", name: "Hivebrite", tags: ["community", "membership", "network", "saas"], status_url: "https://status.hivebrite.com/api/v2/status.json", page_url: "https://status.hivebrite.com", type: "statuspage" },
    // No-code database / app builder
    { id: "knack", name: "Knack", tags: ["no-code", "database", "app-builder", "saas"], status_url: "https://status.knack.com/api/v2/status.json", page_url: "https://status.knack.com", type: "statuspage" },
    // Community / membership engagement platform
    { id: "bettermode", name: "Bettermode", tags: ["community", "membership", "engagement", "saas"], status_url: "https://status.bettermode.com/api/v2/status.json", page_url: "https://status.bettermode.com", type: "statuspage" },
    // Ecommerce analytics / attribution
    { id: "triple_whale", name: "Triple Whale", tags: ["ecommerce", "analytics", "attribution", "marketing"], status_url: "https://status.triplewhale.com/api/v2/status.json", page_url: "https://status.triplewhale.com", type: "statuspage" },
    // Browser-based QA test automation
    { id: "reflect", name: "Reflect", tags: ["testing", "qa", "automation", "devtools"], status_url: "https://reflect.status.smartbear.com/api/v2/status.json", page_url: "https://reflect.status.smartbear.com", type: "statuspage" },
    // Product experience / user analytics (Gainsight PX)
    { id: "gainsight_px", name: "Gainsight PX", tags: ["product-analytics", "user-experience", "onboarding", "saas"], status_url: "https://status.aptrinsic.com/api/v2/status.json", page_url: "https://status.aptrinsic.com", type: "statuspage" },
    // Data observability platform
    { id: "metaplane", name: "Metaplane", tags: ["data-observability", "data-quality", "analytics", "saas"], status_url: "https://status.metaplane.dev/api/v2/status.json", page_url: "https://status.metaplane.dev", type: "statuspage" },
    // NFT marketplace
    { id: "opensea", name: "OpenSea", tags: ["nft", "web3", "marketplace", "crypto"], status_url: "https://status.opensea.io/api/v2/status.json", page_url: "https://status.opensea.io", type: "statuspage" },
    // AI customer support / triage
    { id: "forethought", name: "Forethought AI", tags: ["ai", "customer-support", "helpdesk", "saas"], status_url: "https://status.forethought.ai/api/v2/status.json", page_url: "https://status.forethought.ai", type: "statuspage" },
    // DeFi protocol / crypto lending
    { id: "aave", name: "Aave", tags: ["defi", "web3", "crypto", "lending"], status_url: "https://status.aave.com/api/v2/status.json", page_url: "https://status.aave.com", type: "statuspage" },
    // NVIDIA GPU Cloud catalog / ML models
    { id: "nvidia_ngc", name: "NVIDIA NGC", tags: ["ai", "ml", "gpu", "cloud"], status_url: "https://status.ngc.nvidia.com/api/v2/status.json", page_url: "https://status.ngc.nvidia.com", type: "statuspage" },
    // 3D digital twin / virtual tours
    { id: "matterport", name: "Matterport", tags: ["3d", "digital-twin", "real-estate", "saas"], status_url: "https://status.matterport.com/api/v2/status.json", page_url: "https://status.matterport.com", type: "statuspage" },
    // Data catalog and collaboration
    { id: "data_world", name: "data.world", tags: ["data-catalog", "data-collaboration", "analytics", "saas"], status_url: "https://status.data.world/api/v2/status.json", page_url: "https://status.data.world", type: "statuspage" },
    // Documentation platform
    { id: "gitbook", name: "GitBook", tags: ["documentation", "developer-tools", "publishing", "saas"], status_url: "https://www.gitbookstatus.com/api/v2/status.json", page_url: "https://www.gitbookstatus.com", type: "statuspage" },
    // UCaaS / telephony (tick 152)
    { id: "mitel", name: "Mitel CloudLink", tags: ["voip", "ucaas", "telephony", "enterprise"], status_url: "https://status.mitel.io/api/v2/status.json", page_url: "https://status.mitel.io", type: "statuspage" },
    // Digital experience analytics
    { id: "siteimprove", name: "Siteimprove", tags: ["analytics", "seo", "accessibility", "digital-experience"], status_url: "https://status.siteimprove.com/api/v2/status.json", page_url: "https://status.siteimprove.com", type: "statuspage" },
    // LMS / eLearning
    { id: "learningpool", name: "Learning Pool", tags: ["lms", "elearning", "training", "saas"], status_url: "https://status.learningpool.com/api/v2/status.json", page_url: "https://status.learningpool.com", type: "statuspage" },
    { id: "bridge_lms", name: "Bridge", tags: ["lms", "elearning", "hr", "performance"], status_url: "https://status.bridgeapp.com/api/v2/status.json", page_url: "https://status.bridgeapp.com", type: "statuspage" },
    // Enterprise content management
    { id: "hyland", name: "Hyland", tags: ["ecm", "content-management", "enterprise", "saas"], status_url: "https://status.hylandcloud.com/api/v2/status.json", page_url: "https://status.hylandcloud.com", type: "statuspage" },
    // AI document processing / OCR
    { id: "abbyy", name: "ABBYY", tags: ["ocr", "document-ai", "automation", "enterprise"], status_url: "https://status.abbyy.com/api/v2/status.json", page_url: "https://status.abbyy.com", type: "statuspage" },
    // Customer support
    { id: "helpshift", name: "Helpshift", tags: ["customer-support", "mobile", "chat", "saas"], status_url: "https://status.helpshift.com/api/v2/status.json", page_url: "https://status.helpshift.com", type: "statuspage" },
    // CRM
    { id: "capsule_crm", name: "Capsule CRM", tags: ["crm", "sales", "smb", "saas"], status_url: "https://status.capsulecrm.com/api/v2/status.json", page_url: "https://status.capsulecrm.com", type: "statuspage" },
    { id: "close_crm", name: "Close CRM", tags: ["crm", "sales", "inside-sales", "saas"], status_url: "https://status.close.com/api/v2/status.json", page_url: "https://status.close.com", type: "statuspage" },
    // Fintech / banking
    { id: "belvo", name: "Belvo", tags: ["fintech", "banking", "open-finance", "latam"], status_url: "https://status.belvo.com/api/v2/status.json", page_url: "https://status.belvo.com", type: "statuspage" },
    { id: "tide", name: "Tide", tags: ["banking", "neobank", "business-banking", "uk"], status_url: "https://status.tide.co/api/v2/status.json", page_url: "https://status.tide.co", type: "statuspage" },
    // Fraud / trust & safety
    { id: "sift", name: "Sift", tags: ["fraud", "trust-safety", "risk", "payments"], status_url: "https://status.sift.com/api/v2/status.json", page_url: "https://status.sift.com", type: "statuspage" },
    // Speech-to-text / AI voice
    { id: "rev_ai", name: "Rev AI", tags: ["speech-to-text", "ai", "transcription", "api"], status_url: "https://status.rev.ai/api/v2/status.json", page_url: "https://status.rev.ai", type: "statuspage" },
    // No-code backend
    { id: "xano", name: "Xano", tags: ["no-code", "backend", "database", "api"], status_url: "https://status.xano.com/api/v2/status.json", page_url: "https://status.xano.com", type: "statuspage" },
    // Freight / logistics
    { id: "transfix", name: "Transfix", tags: ["logistics", "freight", "transportation", "saas"], status_url: "https://status.transfix.io/api/v2/status.json", page_url: "https://status.transfix.io", type: "statuspage" },
    // CPaaS / messaging
    { id: "8x8_cpaas", name: "8x8 CPaaS", tags: ["messaging", "sms", "cpaas", "communication"], status_url: "https://status.wavecell.com/api/v2/status.json", page_url: "https://status.wavecell.com", type: "statuspage" },
    // Developer tools
    { id: "aviator", name: "Aviator", tags: ["devtools", "merge-queue", "ci-cd", "git"], status_url: "https://status.aviator.co/api/v2/status.json", page_url: "https://status.aviator.co", type: "statuspage" },
    // In-app purchases / mobile subscriptions
    { id: "adapty", name: "Adapty", tags: ["in-app-purchases", "subscriptions", "mobile", "sdk"], status_url: "https://status.adapty.io/api/v2/status.json", page_url: "https://status.adapty.io", type: "statuspage" },
    { id: "qonversion", name: "Qonversion", tags: ["in-app-purchases", "subscriptions", "mobile", "analytics"], status_url: "https://status.qonversion.io/api/v2/status.json", page_url: "https://status.qonversion.io", type: "statuspage" },
    { id: "nami", name: "Nami", tags: ["in-app-purchases", "subscriptions", "mobile", "paywalls"], status_url: "https://status.namiml.com/api/v2/status.json", page_url: "https://status.namiml.com", type: "statuspage" },
    { id: "apphud", name: "Apphud", tags: ["in-app-purchases", "subscriptions", "mobile", "analytics"], status_url: "https://status.apphud.com/api/v2/status.json", page_url: "https://status.apphud.com", type: "statuspage" },
    // Security automation / SOAR
    { id: "torq", name: "Torq", tags: ["security", "soar", "automation", "no-code"], status_url: "https://status.torq.io/api/v2/status.json", page_url: "https://status.torq.io", type: "statuspage" },
    // Video API
    { id: "daily_co", name: "Daily.co", tags: ["video", "api", "webrtc", "real-time"], status_url: "https://status.daily.co/api/v2/status.json", page_url: "https://status.daily.co", type: "statuspage" },
    // SEO / web crawling
    { id: "lumar", name: "Lumar", tags: ["seo", "crawling", "analytics", "developer-tools"], status_url: "https://status.lumar.io/api/v2/status.json", page_url: "https://status.lumar.io", type: "statuspage" },
    // AI / ML platform
    { id: "lightning_ai", name: "Lightning AI", tags: ["ai", "ml", "training", "cloud"], status_url: "https://status.lightning.ai/api/v2/status.json", page_url: "https://status.lightning.ai", type: "statuspage" },
    // HR integrations API
    { id: "stackone", name: "StackOne", tags: ["hr", "integrations", "api", "saas"], status_url: "https://status.stackone.com/api/v2/status.json", page_url: "https://status.stackone.com", type: "statuspage" },
    // Authorization / SpiceDB
    { id: "authzed", name: "Authzed", tags: ["authorization", "permissions", "api", "security"], status_url: "https://status.authzed.com/api/v2/status.json", page_url: "https://status.authzed.com", type: "statuspage" },
    // Creator economy / digital products
    { id: "stan_store", name: "Stan", tags: ["creator-economy", "ecommerce", "digital-products", "saas"], status_url: "https://status.stan.store/api/v2/status.json", page_url: "https://status.stan.store", type: "statuspage" },
    // Conversational AI / enterprise chatbots
    { id: "cognigy", name: "Cognigy", tags: ["conversational-ai", "chatbot", "enterprise", "saas"], status_url: "https://status.cognigy.ai/api/v2/status.json", page_url: "https://status.cognigy.ai", type: "statuspage" },
    // Data lakehouse
    { id: "dremio", name: "Dremio Cloud", tags: ["data", "lakehouse", "analytics", "cloud"], status_url: "https://status.dremio.com/api/v2/status.json", page_url: "https://status.dremio.com", type: "statuspage" },
    // Data catalog
    { id: "alation", name: "Alation", tags: ["data-catalog", "governance", "analytics", "enterprise"], status_url: "https://status.alationcloud.com/api/v2/status.json", page_url: "https://status.alationcloud.com", type: "statuspage" },
    // Fraud prevention / e-commerce
    { id: "signifyd", name: "Signifyd", tags: ["fraud-prevention", "ecommerce", "payments", "security"], status_url: "https://status.signifyd.com/api/v2/status.json", page_url: "https://status.signifyd.com", type: "statuspage" },
    // Fraud prevention / chargeback protection
    { id: "riskified", name: "Riskified", tags: ["fraud-prevention", "ecommerce", "payments", "security"], status_url: "https://status.riskified.com/api/v2/status.json", page_url: "https://status.riskified.com", type: "statuspage" },
    // Fraud / compliance / KYC AI
    { id: "sardine_ai", name: "Sardine AI", tags: ["fraud-prevention", "compliance", "kyc", "fintech", "security"], status_url: "https://status.sardine.ai/api/v2/status.json", page_url: "https://status.sardine.ai", type: "statuspage" },
    // AI-powered email security
    { id: "abnormal_security", name: "Abnormal AI", tags: ["email-security", "ai", "security", "enterprise"], status_url: "https://status.abnormalsecurity.com/api/v2/status.json", page_url: "https://status.abnormalsecurity.com", type: "statuspage" },
    // Email security (anti-phishing / anti-spam)
    { id: "vadesecure", name: "Vade Secure", tags: ["email-security", "anti-phishing", "security"], status_url: "https://status.vadesecure.com/api/v2/status.json", page_url: "https://status.vadesecure.com", type: "statuspage" },
    // Website security / WAF / CDN
    { id: "sucuri", name: "Sucuri", tags: ["security", "waf", "cdn", "website-security"], status_url: "https://status.sucuri.net/api/v2/status.json", page_url: "https://status.sucuri.net", type: "statuspage" },
    // Managed WordPress / Magento hosting
    { id: "nexcess", name: "Nexcess", tags: ["hosting", "wordpress", "magento", "managed"], status_url: "https://status.nexcess.net/api/v2/status.json", page_url: "https://status.nexcess.net", type: "statuspage" },
    // Managed dedicated / cloud hosting
    { id: "liquidweb", name: "Liquid Web", tags: ["hosting", "managed", "dedicated", "cloud"], status_url: "https://status.liquidweb.com/api/v2/status.json", page_url: "https://status.liquidweb.com", type: "statuspage" },
    // Sales enablement / content platform
    { id: "bigtincan", name: "Bigtincan", tags: ["sales-enablement", "content", "saas", "enterprise"], status_url: "https://status.bigtincan.com/api/v2/status.json", page_url: "https://status.bigtincan.com", type: "statuspage" },
    // LMS / learning experience platform (Cornerstone)
    { id: "edcast", name: "EdCast by Cornerstone", tags: ["lms", "learning", "e-learning", "enterprise"], status_url: "https://status.edcast.com/api/v2/status.json", page_url: "https://status.edcast.com", type: "statuspage" },
    // Data observability
    { id: "bigeye", name: "Bigeye", tags: ["data-observability", "data-quality", "analytics", "saas"], status_url: "https://status.bigeye.com/api/v2/status.json", page_url: "https://status.bigeye.com", type: "statuspage" },
    // Visual content creation
    { id: "visme", name: "Visme", tags: ["visual-content", "design", "presentations", "infographics"], status_url: "https://status.visme.co/api/v2/status.json", page_url: "https://status.visme.co", type: "statuspage" },
    // Translation / CAT tool
    { id: "memoq", name: "memoQ", tags: ["translation", "localization", "cat-tool", "enterprise"], status_url: "https://status.memoq.com/api/v2/status.json", page_url: "https://status.memoq.com", type: "statuspage" },
    // Screen recording / EdTech
    { id: "screencastify", name: "Screencastify", tags: ["screen-recording", "edtech", "video", "education"], status_url: "https://status.screencastify.com/api/v2/status.json", page_url: "https://status.screencastify.com", type: "statuspage" },
    // Crypto / blockchain infrastructure
    { id: "paxos", name: "Paxos", tags: ["crypto", "blockchain", "fintech", "payments"], status_url: "https://status.paxos.com/api/v2/status.json", page_url: "https://status.paxos.com", type: "statuspage" },
    // IoT / cellular connectivity
    { id: "blues", name: "Blues (Notehub)", tags: ["iot", "cellular", "connectivity", "embedded"], status_url: "https://status.notehub.io/api/v2/status.json", page_url: "https://status.notehub.io", type: "statuspage" },
    // Message broker (RabbitMQ-as-a-service)
    { id: "cloudamqp", name: "CloudAMQP", tags: ["messaging", "rabbitmq", "amqp", "cloud"], status_url: "https://status.cloudamqp.com/api/v2/status.json", page_url: "https://status.cloudamqp.com", type: "statuspage" },
    // Fitness wearable / health platform
    { id: "whoop", name: "WHOOP", tags: ["fitness", "wearable", "health", "wellness"], status_url: "https://status.whoop.com/api/v2/status.json", page_url: "https://status.whoop.com", type: "statuspage" },
    // Smart ring / health platform
    { id: "oura", name: "Oura Ring", tags: ["fitness", "wearable", "health", "sleep"], status_url: "https://status.ouraring.com/api/v2/status.json", page_url: "https://status.ouraring.com", type: "statuspage" },
    // Software test management / QA
    { id: "tricentis", name: "Tricentis", tags: ["testing", "qa", "test-management", "enterprise"], status_url: "https://status.tricentis.com/api/v2/status.json", page_url: "https://status.tricentis.com", type: "statuspage" },
    // AI / LLM (China)
    { id: "moonshot_ai", name: "Moonshot AI", tags: ["ai", "llm", "api", "china"], status_url: "https://status.moonshot.cn/api/v2/status.json", page_url: "https://status.moonshot.cn", type: "statuspage" },
    // Cloud cost management / FinOps
    { id: "cloudability", name: "Cloudability", tags: ["cloud-cost", "finops", "cloud", "analytics"], status_url: "https://status.cloudability.com/api/v2/status.json", page_url: "https://status.cloudability.com", type: "statuspage" },
    // SaaS sales tax compliance
    { id: "anrok", name: "Anrok", tags: ["tax", "compliance", "saas", "fintech"], status_url: "https://anrok.statuspage.io/api/v2/status.json", page_url: "https://anrok-status.com", type: "statuspage" },
    // Build automation / CI
    { id: "gradle", name: "Gradle", tags: ["build", "ci", "devtools", "java"], status_url: "https://status.gradle.com/api/v2/status.json", page_url: "https://status.gradle.com", type: "statuspage" },
    // GitHub project management
    { id: "zenhub", name: "ZenHub", tags: ["project-management", "devtools", "agile", "github"], status_url: "https://status.zenhub.com/api/v2/status.json", page_url: "https://status.zenhub.com", type: "statuspage" },
    // Open source foundation infrastructure
    { id: "apache", name: "Apache Software Foundation", tags: ["open-source", "infrastructure", "hosting", "foundation"], status_url: "https://status.apache.org/api/v2/status.json", page_url: "https://status.apache.org", type: "statuspage" },
    // AI agent platform for teams
    { id: "dust", name: "Dust", tags: ["ai", "agents", "llm", "enterprise"], status_url: "https://status.dust.tt/api/v2/status.json", page_url: "https://status.dust.tt", type: "statuspage" },
    // Compliance automation / trust management
    { id: "trustcloud", name: "TrustCloud", tags: ["compliance", "security", "grc", "trust"], status_url: "https://status.trustcloud.ai/api/v2/status.json", page_url: "https://status.trustcloud.ai", type: "statuspage" },
    // B2B integration platform / embedded iPaaS
    { id: "cyclr", name: "Cyclr", tags: ["integration", "ipaas", "api", "automation"], status_url: "https://cyclr.statuspage.io/api/v2/status.json", page_url: "https://cyclr.statuspage.io", type: "statuspage" },
    // Terraform cloud enterprise / infrastructure management
    { id: "scalr", name: "Scalr", tags: ["terraform", "infrastructure", "devops", "cloud"], status_url: "https://status.scalr.io/api/v2/status.json", page_url: "https://status.scalr.io", type: "statuspage" },
    // Kubernetes management platform
    { id: "spectrocloud", name: "Spectro Cloud", tags: ["kubernetes", "cloud-native", "devops", "infrastructure"], status_url: "https://spectrocloud.statuspage.io/api/v2/status.json", page_url: "https://spectrocloud.statuspage.io", type: "statuspage" },
    // Cloud security / container monitoring
    { id: "sysdig", name: "Sysdig", tags: ["security", "cloud-native", "monitoring", "containers"], status_url: "https://sysdig.statuspage.io/api/v2/status.json", page_url: "https://status.sysdigcloud.com", type: "statuspage" },
    // UI/UX prototyping and design tool
    { id: "marvelapp", name: "Marvel App", tags: ["design", "prototyping", "ux", "collaboration"], status_url: "https://status.marvelapp.com/api/v2/status.json", page_url: "https://status.marvelapp.com", type: "statuspage" },
    // Incident management / alerting
    { id: "xmatters", name: "xMatters", tags: ["incident-management", "alerting", "devops", "on-call"], status_url: "https://status.xmatters.com/api/v2/status.json", page_url: "https://status.xmatters.com", type: "statuspage" },
    // Healthcare / EHR
    { id: "curemd", name: "CureMD", tags: ["healthcare", "ehr", "practice-management", "medical"], status_url: "https://status.curemd.com/api/v2/status.json", page_url: "https://status.curemd.com", type: "statuspage" },
    { id: "klara", name: "Klara", tags: ["healthcare", "patient-communication", "telehealth", "saas"], status_url: "https://status.klara.com/api/v2/status.json", page_url: "https://status.klara.com", type: "statuspage" },
    // Property management
    { id: "leadsimple", name: "LeadSimple", tags: ["property-management", "crm", "real-estate", "saas"], status_url: "https://status.leadsimple.com/api/v2/status.json", page_url: "https://status.leadsimple.com", type: "statuspage" },
    // Field service management
    { id: "fieldaware", name: "FieldAware", tags: ["field-service", "fsm", "workforce", "operations"], status_url: "https://status.fieldaware.com/api/v2/status.json", page_url: "https://status.fieldaware.com", type: "statuspage" },
    { id: "zuper", name: "Zuper", tags: ["field-service", "fsm", "workforce-management", "saas"], status_url: "https://status.zuper.co/api/v2/status.json", page_url: "https://status.zuper.co", type: "statuspage" },
    { id: "fieldpulse", name: "FieldPulse", tags: ["field-service", "fsm", "contractor", "saas"], status_url: "https://status.fieldpulse.com/api/v2/status.json", page_url: "https://status.fieldpulse.com", type: "statuspage" },
    // Insurance / Insurtech
    { id: "insurity", name: "Insurity", tags: ["insurance", "insurtech", "p-c", "enterprise"], status_url: "https://status.insurity.com/api/v2/status.json", page_url: "https://status.insurity.com", type: "statuspage" },
    { id: "bold_penguin", name: "Bold Penguin", tags: ["insurance", "insurtech", "commercial", "api"], status_url: "https://status.boldpenguin.com/api/v2/status.json", page_url: "https://status.boldpenguin.com", type: "statuspage" },
    // Identity verification
    { id: "intellicheck", name: "Intellicheck", tags: ["identity-verification", "kyc", "fraud", "security"], status_url: "https://status.intellicheck.com/api/v2/status.json", page_url: "https://status.intellicheck.com", type: "statuspage" },
    // Automotive SaaS
    { id: "dealersocket", name: "DealerSocket", tags: ["automotive", "crm", "dealership", "saas"], status_url: "https://status.dealersocket.com/api/v2/status.json", page_url: "https://status.dealersocket.com", type: "statuspage" },
    // Healthcare patient engagement
    { id: "phreesia", name: "Phreesia", tags: ["healthcare", "patient-intake", "practice-management", "saas"], status_url: "https://status.phreesia.net/api/v2/status.json", page_url: "https://status.phreesia.net", type: "statuspage" },
    // Healthcare workflow automation
    { id: "workpath", name: "Workpath", tags: ["healthcare", "workflow", "automation", "saas"], status_url: "https://status.workpath.com/api/v2/status.json", page_url: "https://status.workpath.com", type: "statuspage" },
    // Banking-as-a-Service
    { id: "unit_co", name: "Unit", tags: ["fintech", "banking-as-a-service", "api", "payments"], status_url: "https://status.unit.co/api/v2/status.json", page_url: "https://status.unit.co", type: "statuspage" },
    // Accounting data API (FIS Railz)
    { id: "railz", name: "Railz", tags: ["fintech", "accounting", "data", "api"], status_url: "https://status.railz.ai/api/v2/status.json", page_url: "https://status.railz.ai", type: "statuspage" },
    // Small business management
    { id: "thryv", name: "Thryv", tags: ["small-business", "crm", "marketing", "saas"], status_url: "https://status.thryv.com/api/v2/status.json", page_url: "https://status.thryv.com", type: "statuspage" },
    // Deskless workforce management
    { id: "skedulo", name: "Skedulo", tags: ["workforce-management", "field-service", "scheduling", "saas"], status_url: "https://status.skedulo.com/api/v2/status.json", page_url: "https://status.skedulo.com", type: "statuspage" },
    // Fleet & field operations
    { id: "intellishift", name: "IntelliShift", tags: ["fleet-management", "telematics", "field-operations", "saas"], status_url: "https://status.intellishift.com/api/v2/status.json", page_url: "https://status.intellishift.com", type: "statuspage" },
    // Route optimization
    { id: "routific", name: "Routific", tags: ["logistics", "route-optimization", "delivery", "saas"], status_url: "https://status.routific.com/api/v2/status.json", page_url: "https://status.routific.com", type: "statuspage" },
    // MSP IT visibility
    { id: "liongard", name: "Liongard", tags: ["msp", "it-management", "visibility", "saas"], status_url: "https://status.liongard.com/api/v2/status.json", page_url: "https://status.liongard.com", type: "statuspage" },
    // Restaurant workforce scheduling
    { id: "seven_shifts", name: "7shifts", tags: ["restaurant", "workforce-management", "scheduling", "saas"], status_url: "https://status.7shifts.com/api/v2/status.json", page_url: "https://status.7shifts.com", type: "statuspage" },
    { id: "mavenlink", name: "Mavenlink", tags: ["project-management", "resource-management", "professional-services", "saas"], status_url: "https://status.mavenlink.com/api/v2/status.json", page_url: "https://status.mavenlink.com", type: "statuspage" },
    { id: "liquidplanner", name: "LiquidPlanner", tags: ["project-management", "scheduling", "resource-planning", "saas"], status_url: "https://status.liquidplanner.com/api/v2/status.json", page_url: "https://status.liquidplanner.com", type: "statuspage" },
    { id: "mem_ai", name: "Mem", tags: ["notes", "ai", "knowledge-management", "productivity"], status_url: "https://status.mem.ai/api/v2/status.json", page_url: "https://status.mem.ai", type: "statuspage" },
    { id: "oneleet", name: "Oneleet", tags: ["security", "compliance", "penetration-testing", "saas"], status_url: "https://status.oneleet.com/api/v2/status.json", page_url: "https://status.oneleet.com", type: "statuspage" },
    { id: "immuta", name: "Immuta", tags: ["data-governance", "security", "access-control", "enterprise"], status_url: "https://status.immuta.com/api/v2/status.json", page_url: "https://status.immuta.com", type: "statuspage" },
    { id: "flexera", name: "Flexera", tags: ["software-management", "saas-management", "itam", "enterprise"], status_url: "https://status.flexera.com/api/v2/status.json", page_url: "https://status.flexera.com", type: "statuspage" },
    { id: "zylo", name: "Zylo", tags: ["saas-management", "software-spend", "itam", "saas"], status_url: "https://status.zylo.com/api/v2/status.json", page_url: "https://status.zylo.com", type: "statuspage" },
    { id: "productiv", name: "Productiv", tags: ["saas-management", "software-analytics", "it", "enterprise"], status_url: "https://status.productiv.com/api/v2/status.json", page_url: "https://status.productiv.com", type: "statuspage" },
    { id: "vena", name: "Vena", tags: ["fpa", "finance", "planning", "enterprise"], status_url: "https://status.vena.io/api/v2/status.json", page_url: "https://status.vena.io", type: "statuspage" },
    { id: "smartvault", name: "SmartVault", tags: ["document-management", "accounting", "file-sharing", "saas"], status_url: "https://status.smartvault.com/api/v2/status.json", page_url: "https://status.smartvault.com", type: "statuspage" },
    // Tick 161 additions
    { id: "retool", name: "Retool", tags: ["internal-tools", "no-code", "low-code", "saas"], status_url: "https://status.retool.com/api/v2/status.json", page_url: "https://status.retool.com", type: "statuspage" },
    { id: "webflow", name: "Webflow", tags: ["website-builder", "no-code", "cms", "hosting"], status_url: "https://status.webflow.com/api/v2/status.json", page_url: "https://status.webflow.com", type: "statuspage" },
    { id: "plaid", name: "Plaid", tags: ["fintech", "banking", "api", "payments"], status_url: "https://status.plaid.com/api/v2/status.json", page_url: "https://status.plaid.com", type: "statuspage" },
    { id: "temporal", name: "Temporal", tags: ["workflow", "orchestration", "developer-tools", "cloud"], status_url: "https://temporal.statuspage.io/api/v2/status.json", page_url: "https://temporal.statuspage.io", type: "statuspage" },
    { id: "fivetran", name: "Fivetran", tags: ["data-integration", "etl", "analytics", "saas"], status_url: "https://status.fivetran.com/api/v2/status.json", page_url: "https://status.fivetran.com", type: "statuspage" },
    { id: "clerk", name: "Clerk", tags: ["auth", "identity", "developer-tools", "saas"], status_url: "https://status.clerk.com/api/v2/status.json", page_url: "https://status.clerk.com", type: "statuspage" },
    { id: "upstash", name: "Upstash", tags: ["database", "redis", "serverless", "kafka"], status_url: "https://status.upstash.com/api/v2/status.json", page_url: "https://status.upstash.com", type: "statuspage" },
    { id: "convex", name: "Convex", tags: ["database", "backend", "serverless", "developer-tools"], status_url: "https://status.convex.dev/api/v2/status.json", page_url: "https://status.convex.dev", type: "statuspage" },
    { id: "ably", name: "Ably", tags: ["realtime", "messaging", "pubsub", "api"], status_url: "https://status.ably.com/api/v2/status.json", page_url: "https://status.ably.com", type: "statuspage" },
    { id: "pusher", name: "Pusher", tags: ["realtime", "messaging", "websockets", "api"], status_url: "https://status.pusher.com/api/v2/status.json", page_url: "https://status.pusher.com", type: "statuspage" },
    { id: "affinity", name: "Affinity", tags: ["crm", "relationships", "sales", "saas"], status_url: "https://status.affinity.co/api/v2/status.json", page_url: "https://status.affinity.co", type: "statuspage" },
    { id: "ashbyhq", name: "Ashby", tags: ["recruiting", "ats", "hr", "saas"], status_url: "https://status.ashbyhq.com/api/v2/status.json", page_url: "https://status.ashbyhq.com", type: "statuspage" },
    { id: "greenhouse", name: "Greenhouse", tags: ["recruiting", "ats", "hr", "saas"], status_url: "https://status.greenhouse.io/api/v2/status.json", page_url: "https://status.greenhouse.io", type: "statuspage" },
    { id: "lever", name: "Lever", tags: ["recruiting", "ats", "hr", "saas"], status_url: "https://status.lever.co/api/v2/status.json", page_url: "https://status.lever.co", type: "statuspage" },
    { id: "rippling", name: "Rippling", tags: ["hr", "payroll", "it", "saas"], status_url: "https://status.rippling.com/api/v2/status.json", page_url: "https://status.rippling.com", type: "statuspage" },
    { id: "gusto", name: "Gusto", tags: ["hr", "payroll", "benefits", "saas"], status_url: "https://status.gusto.com/api/v2/status.json", page_url: "https://status.gusto.com", type: "statuspage" },
    { id: "monday", name: "monday.com", tags: ["project-management", "work-os", "collaboration", "saas"], status_url: "https://status.monday.com/api/v2/status.json", page_url: "https://status.monday.com", type: "statuspage" },
    { id: "drata", name: "Drata", tags: ["compliance", "security", "soc2", "saas"], status_url: "https://status.drata.com/api/v2/status.json", page_url: "https://status.drata.com", type: "statuspage" },
    { id: "vanta", name: "Vanta", tags: ["compliance", "security", "soc2", "saas"], status_url: "https://status.vanta.com/api/v2/status.json", page_url: "https://status.vanta.com", type: "statuspage" },
    { id: "launchdarkly", name: "LaunchDarkly", tags: ["feature-flags", "developer-tools", "experimentation", "saas"], status_url: "https://status.launchdarkly.com/api/v2/status.json", page_url: "https://status.launchdarkly.com", type: "statuspage" },
    { id: "appsflyer", name: "AppsFlyer", tags: ["mobile-analytics", "attribution", "marketing", "saas"], status_url: "https://status.appsflyer.com/api/v2/status.json", page_url: "https://status.appsflyer.com", type: "statuspage" },
    { id: "attio", name: "Attio", tags: ["crm", "sales", "collaboration", "saas"], status_url: "https://status.attio.com/api/v2/status.json", page_url: "https://status.attio.com", type: "statuspage" },
    { id: "kustomer", name: "Kustomer", tags: ["customer-service", "crm", "helpdesk", "saas"], status_url: "https://status.kustomer.com/api/v2/status.json", page_url: "https://status.kustomer.com", type: "statuspage" },
    // Wellness / mental health
    { id: "calm", name: "Calm", tags: ["wellness", "meditation", "mindfulness", "mobile"], status_url: "https://status.calm.com/api/v2/status.json", page_url: "https://status.calm.com", type: "statuspage" },
    // Healthcare data / interoperability
    { id: "particle_health", name: "Particle Health", tags: ["healthcare", "health-data", "api", "interoperability"], status_url: "https://status.particlehealth.com/api/v2/status.json", page_url: "https://status.particlehealth.com", type: "statuspage" },
    // Gaming / Xbox
    { id: "xbox_live", name: "Xbox Live", tags: ["gaming", "microsoft", "console", "online"], status_url: "https://xboxlive.statuspage.io/api/v2/status.json", page_url: "https://xboxlive.statuspage.io", type: "statuspage" },
    // Music / live events
    { id: "bandsintown", name: "Bandsintown", tags: ["music", "events", "ticketing", "entertainment"], status_url: "https://status.bandsintown.com/api/v2/status.json", page_url: "https://status.bandsintown.com", type: "statuspage" },
    // Cloud infrastructure
    { id: "latitude_sh", name: "Latitude.sh", tags: ["cloud", "infrastructure", "bare-metal", "hosting"], status_url: "https://status.latitude.sh/api/v2/status.json", page_url: "https://status.latitude.sh", type: "statuspage" },
    // HR / payroll / workforce
    { id: "employment_hero", name: "Employment Hero", tags: ["hr", "payroll", "workforce", "saas"], status_url: "https://status.employmenthero.com/api/v2/status.json", page_url: "https://status.employmenthero.com", type: "statuspage" },
    { id: "tanda", name: "Tanda", tags: ["workforce", "scheduling", "hr", "time-tracking"], status_url: "https://status.tanda.co/api/v2/status.json", page_url: "https://status.tanda.co", type: "statuspage" },
    { id: "rotageek", name: "Rotageek", tags: ["workforce", "scheduling", "retail", "hr"], status_url: "https://status.rotageek.com/api/v2/status.json", page_url: "https://status.rotageek.com", type: "statuspage" },
    { id: "breathehr", name: "Breathe HR", tags: ["hr", "sme", "uk", "saas"], status_url: "https://status.breathehr.com/api/v2/status.json", page_url: "https://status.breathehr.com", type: "statuspage" },
    // Payments
    { id: "tyro", name: "Tyro", tags: ["payments", "fintech", "eftpos", "australia"], status_url: "https://status.tyro.com/api/v2/status.json", page_url: "https://status.tyro.com", type: "statuspage" },
    // No-code / workflow
    { id: "trackvia", name: "TrackVia", tags: ["no-code", "workflow", "database", "operations"], status_url: "https://status.trackvia.com/api/v2/status.json", page_url: "https://status.trackvia.com", type: "statuspage" },
    // E-commerce / supply chain
    { id: "logicbroker", name: "Logicbroker", tags: ["ecommerce", "supply-chain", "drop-shipping", "integration"], status_url: "https://status.logicbroker.com/api/v2/status.json", page_url: "https://status.logicbroker.com", type: "statuspage" },
    // Expense management
    { id: "emburse_professional", name: "Emburse Professional", tags: ["expense-management", "travel", "finance", "enterprise"], status_url: "https://status.certify.com/api/v2/status.json", page_url: "https://status.certify.com", type: "statuspage" },
    // API management / integration platform
    { id: "axway", name: "Axway", tags: ["api-management", "integration", "enterprise", "mft"], status_url: "https://status.axway.com/api/v2/status.json", page_url: "https://status.axway.com", type: "statuspage" },
    // Sales commissions / incentive compensation
    { id: "captivateiq", name: "CaptivateIQ", tags: ["sales", "commissions", "incentive-compensation", "saas"], status_url: "https://status.captivateiq.com/api/v2/status.json", page_url: "https://status.captivateiq.com", type: "statuspage" },
    // VoIP / telephony (Germany / Europe)
    { id: "sipgate", name: "sipgate", tags: ["voip", "telephony", "communication", "germany"], status_url: "https://status.sipgate.de/api/v2/status.json", page_url: "https://status.sipgate.de", type: "statuspage" },
    // EdTech — quiz / assessment
    { id: "socrative", name: "Socrative", tags: ["edtech", "quiz", "assessment", "education"], status_url: "https://status.socrative.com/api/v2/status.json", page_url: "https://status.socrative.com", type: "statuspage" },
    // Financial crime / risk management
    { id: "abrigo", name: "Abrigo", tags: ["fintech", "financial-crime", "risk-management", "banking"], status_url: "https://status.abrigo.com/api/v2/status.json", page_url: "https://status.abrigo.com", type: "statuspage" },
    // IT monitoring / observability
    { id: "logicmonitor", name: "LogicMonitor", tags: ["monitoring", "observability", "infrastructure", "it-ops"], status_url: "https://status.logicmonitor.com/api/v2/status.json", page_url: "https://status.logicmonitor.com", type: "statuspage" },
    // Video monetization / OTT
    { id: "uscreen", name: "Uscreen", tags: ["video", "ott", "monetization", "streaming"], status_url: "https://status.uscreen.tv/api/v2/status.json", page_url: "https://status.uscreen.tv", type: "statuspage" },
    // Religious / bible software
    { id: "faithlife", name: "Faithlife", tags: ["faith", "church", "bible", "software"], status_url: "https://status.faithlife.com/api/v2/status.json", page_url: "https://status.faithlife.com", type: "statuspage" },
    // Church tech / mobile apps
    { id: "subsplash", name: "Subsplash", tags: ["church", "faith", "mobile-apps", "giving"], status_url: "https://status.subsplash.com/api/v2/status.json", page_url: "https://status.subsplash.com", type: "statuspage" },
    // Automotive DMS / retail tech
    { id: "tekion", name: "Tekion", tags: ["automotive", "dms", "retail-tech", "cloud"], status_url: "https://status.tekion.com/api/v2/status.json", page_url: "https://status.tekion.com", type: "statuspage" },
    // Data management platform / DMP
    { id: "lotame", name: "Lotame", tags: ["data-management", "dmp", "advertising", "audience"], status_url: "https://status.lotame.com/api/v2/status.json", page_url: "https://status.lotame.com", type: "statuspage" },
    // Data connectivity / clean room
    { id: "liveramp", name: "LiveRamp", tags: ["data-connectivity", "clean-room", "identity", "advertising"], status_url: "https://status.liveramp.com/api/v2/status.json", page_url: "https://status.liveramp.com", type: "statuspage" },
    // CDP / customer data platform (EU)
    { id: "zeotap", name: "Zeotap", tags: ["cdp", "customer-data", "identity", "advertising"], status_url: "https://status.zeotap.com/api/v2/status.json", page_url: "https://status.zeotap.com", type: "statuspage" },
    // Buy now pay later (Italy / EU)
    { id: "scalapay", name: "Scalapay", tags: ["bnpl", "payments", "fintech", "europe"], status_url: "https://status.scalapay.com/api/v2/status.json", page_url: "https://status.scalapay.com", type: "statuspage" },
    // Video tech for publishers / ad monetization
    { id: "connatix", name: "Connatix", tags: ["video", "publishing", "advertising", "monetization"], status_url: "https://status.connatix.com/api/v2/status.json", page_url: "https://status.connatix.com", type: "statuspage" },
    // Professional services automation (PSA)
    { id: "accelo", name: "Accelo", tags: ["psa", "professional-services", "project-management", "saas"], status_url: "https://status.accelo.com/api/v2/status.json", page_url: "https://status.accelo.com", type: "statuspage" },
    // BPM / workflow automation
    { id: "processmaker", name: "ProcessMaker", tags: ["bpm", "workflow-automation", "process-management", "saas"], status_url: "https://status.processmaker.com/api/v2/status.json", page_url: "https://status.processmaker.com", type: "statuspage" },
    // File storage / cloud storage
    { id: "dropbox", name: "Dropbox", tags: ["storage", "file-sharing", "cloud", "saas"], status_url: "https://status.dropbox.com/api/v2/status.json", page_url: "https://status.dropbox.com", type: "statuspage" },
    { id: "box", name: "Box", tags: ["storage", "file-sharing", "cloud", "saas", "collaboration"], status_url: "https://status.box.com/api/v2/status.json", page_url: "https://status.box.com", type: "statuspage" },
    // Design / collaboration
    { id: "figma", name: "Figma", tags: ["design", "collaboration", "saas", "devtools"], status_url: "https://status.figma.com/api/v2/status.json", page_url: "https://status.figma.com", type: "statuspage" },
    // Product analytics / data
    { id: "amplitude", name: "Amplitude", tags: ["analytics", "product-analytics", "saas", "data"], status_url: "https://status.amplitude.com/api/v2/status.json", page_url: "https://status.amplitude.com", type: "statuspage" },
    { id: "segment", name: "Segment", tags: ["cdp", "analytics", "data", "saas"], status_url: "https://status.segment.com/api/v2/status.json", page_url: "https://status.segment.com", type: "statuspage" },
    // Error tracking / observability
    { id: "sentry", name: "Sentry", tags: ["error-tracking", "monitoring", "observability", "devtools"], status_url: "https://status.sentry.io/api/v2/status.json", page_url: "https://status.sentry.io", type: "statuspage" },
    // Email / SMS / marketing automation
    { id: "klaviyo", name: "Klaviyo", tags: ["email", "sms", "marketing-automation", "ecommerce"], status_url: "https://status.klaviyo.com/api/v2/status.json", page_url: "https://status.klaviyo.com", type: "statuspage" },
    { id: "activecampaign", name: "ActiveCampaign", tags: ["email", "marketing-automation", "crm", "saas"], status_url: "https://status.activecampaign.com/api/v2/status.json", page_url: "https://status.activecampaign.com", type: "statuspage" },
    // CRM / customer success
    { id: "hubspot", name: "HubSpot", tags: ["crm", "marketing-automation", "saas", "sales"], status_url: "https://status.hubspot.com/api/v2/status.json", page_url: "https://status.hubspot.com", type: "statuspage" },
    { id: "intercom", name: "Intercom", tags: ["crm", "customer-messaging", "support", "saas"], status_url: "https://www.intercomstatus.com/api/v2/status.json", page_url: "https://www.intercomstatus.com", type: "statuspage" },
    // Database / nocode
    { id: "airtable", name: "Airtable", tags: ["database", "nocode", "collaboration", "saas"], status_url: "https://status.airtable.com/api/v2/status.json", page_url: "https://status.airtable.com", type: "statuspage" },
    // Project management / issue tracking
    { id: "asana", name: "Asana", tags: ["project-management", "task-management", "collaboration", "saas"], status_url: "https://status.asana.com/api/v2/status.json", page_url: "https://status.asana.com", type: "statuspage" },
    { id: "linear", name: "Linear", tags: ["project-management", "issue-tracking", "devtools", "saas"], status_url: "https://linearstatus.com/api/v2/status.json", page_url: "https://linearstatus.com", type: "statuspage" },
    // Automation / integration
    { id: "zapier", name: "Zapier", tags: ["automation", "integration", "nocode", "saas"], status_url: "https://status.zapier.com/api/v2/status.json", page_url: "https://status.zapier.com", type: "statuspage" },
    { id: "make", name: "Make", tags: ["automation", "integration", "nocode", "saas"], status_url: "https://status.make.com/api/v2/status.json", page_url: "https://status.make.com", type: "statuspage" },
    // Forms / surveys
    { id: "typeform", name: "Typeform", tags: ["forms", "surveys", "saas", "data-collection"], status_url: "https://status.typeform.com/api/v2/status.json", page_url: "https://status.typeform.com", type: "statuspage" },
    // Hosting / PaaS / JAMstack
    { id: "fly", name: "Fly.io", tags: ["hosting", "paas", "containers", "cloud"], status_url: "https://status.flyio.net/api/v2/status.json", page_url: "https://status.flyio.net", type: "statuspage" },
    { id: "netlify", name: "Netlify", tags: ["hosting", "jamstack", "cdn", "saas"], status_url: "https://www.netlifystatus.com/api/v2/status.json", page_url: "https://www.netlifystatus.com", type: "statuspage" },
    { id: "vercel", name: "Vercel", tags: ["hosting", "jamstack", "cdn", "frontend"], status_url: "https://www.vercel-status.com/api/v2/status.json", page_url: "https://www.vercel-status.com", type: "statuspage" },
    // QA / testing tools
    { id: "testrail", name: "TestRail", tags: ["testing", "qa", "test-management", "devtools"], status_url: "https://status.testrail.com/api/v2/status.json", page_url: "https://status.testrail.com", type: "statuspage" },
    // Fitness / health consumer
    { id: "myfitnesspal", name: "MyFitnessPal", tags: ["fitness", "health", "wellness", "consumer"], status_url: "https://status.myfitnesspal.com/api/v2/status.json", page_url: "https://status.myfitnesspal.com", type: "statuspage" },
    // Workforce scheduling for hourly workers
    { id: "homebase", name: "Homebase", tags: ["workforce", "scheduling", "hr", "smb"], status_url: "https://status.joinhomebase.com/api/v2/status.json", page_url: "https://status.joinhomebase.com", type: "statuspage" },
    // B2B supply chain / invoicing network
    { id: "tradeshift", name: "Tradeshift", tags: ["supply-chain", "procurement", "invoicing", "b2b"], status_url: "https://status.tradeshift.com/api/v2/status.json", page_url: "https://status.tradeshift.com", type: "statuspage" },
    // Construction project management ERP
    { id: "viewpoint", name: "Viewpoint", tags: ["construction", "erp", "project-management", "enterprise"], status_url: "https://status.viewpoint.com/api/v2/status.json", page_url: "https://status.viewpoint.com", type: "statuspage" },
    // Cloud IaaS (Europe / global)
    { id: "cloudsigma", name: "CloudSigma", tags: ["cloud", "iaas", "hosting", "infrastructure"], status_url: "https://status.cloudsigma.com/api/v2/status.json", page_url: "https://status.cloudsigma.com", type: "statuspage" },
    // Telehealth / EHR platform
    { id: "healthie", name: "Healthie", tags: ["healthcare", "telehealth", "ehr", "wellness"], status_url: "https://status.gethealthie.com/api/v2/status.json", page_url: "https://status.gethealthie.com", type: "statuspage" },
    // Beauty & wellness appointment booking
    { id: "booksy", name: "Booksy", tags: ["booking", "beauty", "wellness", "appointments"], status_url: "https://status.booksy.com/api/v2/status.json", page_url: "https://status.booksy.com", type: "statuspage" },
    // Legal e-discovery / document review
    { id: "logikcull", name: "Logikcull", tags: ["legal", "ediscovery", "document-review", "saas"], status_url: "https://status.logikcull.com/api/v2/status.json", page_url: "https://status.logikcull.com", type: "statuspage" },
    { id: "everlaw", name: "Everlaw", tags: ["legal", "ediscovery", "litigation", "saas"], status_url: "https://status.everlaw.com/api/v2/status.json", page_url: "https://status.everlaw.com", type: "statuspage" },
    // Healthcare / dental office communications platform
    { id: "weave", name: "Weave", tags: ["healthcare", "dental", "patient-communications", "saas"], status_url: "https://status.getweave.com/api/v2/status.json", page_url: "https://status.getweave.com", type: "statuspage" },
    // Nonprofit fundraising platforms
    { id: "funraise", name: "Funraise", tags: ["nonprofit", "fundraising", "donations", "saas"], status_url: "https://status.funraise.org/api/v2/status.json", page_url: "https://status.funraise.org", type: "statuspage" },
    { id: "kindful", name: "Kindful", tags: ["nonprofit", "crm", "fundraising", "donor-management"], status_url: "https://status.kindful.com/api/v2/status.json", page_url: "https://status.kindful.com", type: "statuspage" },
    // Secrets management / zero-trust security
    { id: "akeyless", name: "Akeyless", tags: ["security", "secrets-management", "zero-trust", "devops"], status_url: "https://status.akeyless.io/api/v2/status.json", page_url: "https://status.akeyless.io", type: "statuspage" },
    // AI / LLM providers
    { id: "ai21", name: "AI21 Labs", tags: ["ai", "llm", "api"], status_url: "https://status.ai21.com/api/v2/status.json", page_url: "https://status.ai21.com", type: "statuspage" },
    { id: "stability", name: "Stability AI", tags: ["ai", "image-gen", "api"], status_url: "https://status.stability.ai/api/v2/status.json", page_url: "https://status.stability.ai", type: "statuspage" },
    { id: "runway", name: "RunwayML", tags: ["ai", "video-gen", "creative", "api"], status_url: "https://status.runwayml.com/api/v2/status.json", page_url: "https://status.runwayml.com", type: "statuspage" },
    { id: "elevenlabs", name: "ElevenLabs", tags: ["ai", "voice", "tts", "api"], status_url: "https://status.elevenlabs.io/api/v2/status.json", page_url: "https://status.elevenlabs.io", type: "statuspage" },
    { id: "assemblyai", name: "AssemblyAI", tags: ["ai", "speech-to-text", "transcription", "api"], status_url: "https://status.assemblyai.com/api/v2/status.json", page_url: "https://status.assemblyai.com", type: "statuspage" },
    { id: "deepgram", name: "Deepgram", tags: ["ai", "speech", "transcription", "api"], status_url: "https://status.deepgram.com/api/v2/status.json", page_url: "https://status.deepgram.com", type: "statuspage" },
    { id: "cartesia", name: "Cartesia", tags: ["ai", "tts", "voice", "api"], status_url: "https://status.cartesia.ai/api/v2/status.json", page_url: "https://status.cartesia.ai", type: "statuspage" },
    // AI dev tools
    { id: "tabnine", name: "Tabnine", tags: ["ai", "devtools", "code-completion", "ide"], status_url: "https://status.tabnine.com/api/v2/status.json", page_url: "https://status.tabnine.com", type: "statuspage" },
    { id: "cursor", name: "Cursor", tags: ["ai", "devtools", "ide", "code-editor"], status_url: "https://status.cursor.com/api/v2/status.json", page_url: "https://status.cursor.com", type: "statuspage" },
    { id: "langsmith", name: "LangSmith", tags: ["ai", "llm-ops", "devtools", "observability"], status_url: "https://status.smith.langchain.com/api/v2/status.json", page_url: "https://status.smith.langchain.com", type: "statuspage" },
    { id: "pinecone", name: "Pinecone", tags: ["ai", "vector-db", "database", "api"], status_url: "https://status.pinecone.io/api/v2/status.json", page_url: "https://status.pinecone.io", type: "statuspage" },
    // Security / password management
    { id: "onepassword", name: "1Password", tags: ["security", "password-manager", "identity"], status_url: "https://status.1password.com/api/v2/status.json", page_url: "https://status.1password.com", type: "statuspage" },
    { id: "nordpass", name: "NordPass", tags: ["security", "password-manager", "identity"], status_url: "https://status.nordpass.com/api/v2/status.json", page_url: "https://status.nordpass.com", type: "statuspage" },
    // Auth / identity
    { id: "clerk", name: "Clerk", tags: ["auth", "identity", "api", "devtools"], status_url: "https://status.clerk.com/api/v2/status.json", page_url: "https://status.clerk.com", type: "statuspage" },
    // Payments / fintech
    { id: "klarna", name: "Klarna", tags: ["payments", "fintech", "bnpl", "ecommerce"], status_url: "https://status.klarna.com/api/v2/status.json", page_url: "https://status.klarna.com", type: "statuspage" },
    { id: "afterpay", name: "Afterpay", tags: ["payments", "fintech", "bnpl", "ecommerce"], status_url: "https://status.afterpay.com/api/v2/status.json", page_url: "https://status.afterpay.com", type: "statuspage" },
    { id: "wise", name: "Wise", tags: ["fintech", "payments", "banking", "money-transfer"], status_url: "https://status.wise.com/api/v2/status.json", page_url: "https://status.wise.com", type: "statuspage" },
    // Cloud storage
    { id: "box", name: "Box", tags: ["storage", "cloud", "collaboration", "saas"], status_url: "https://status.box.com/api/v2/status.json", page_url: "https://status.box.com", type: "statuspage" },
    { id: "dropbox", name: "Dropbox", tags: ["storage", "cloud", "collaboration", "saas"], status_url: "https://status.dropbox.com/api/v2/status.json", page_url: "https://status.dropbox.com", type: "statuspage" },
    // CRM / marketing
    { id: "hubspot", name: "HubSpot", tags: ["crm", "marketing", "sales", "saas"], status_url: "https://status.hubspot.com/api/v2/status.json", page_url: "https://status.hubspot.com", type: "statuspage" },
    // Project management / collaboration
    { id: "airtable", name: "Airtable", tags: ["database", "collaboration", "project-management", "saas"], status_url: "https://status.airtable.com/api/v2/status.json", page_url: "https://status.airtable.com", type: "statuspage" },
    { id: "monday", name: "Monday.com", tags: ["project-management", "collaboration", "saas"], status_url: "https://status.monday.com/api/v2/status.json", page_url: "https://status.monday.com", type: "statuspage" },
    { id: "asana", name: "Asana", tags: ["project-management", "collaboration", "saas"], status_url: "https://status.asana.com/api/v2/status.json", page_url: "https://status.asana.com", type: "statuspage" },
    // Atlassian products
    { id: "jira", name: "Jira", tags: ["devtools", "project-management", "atlassian", "issue-tracking"], status_url: "https://jira-software.status.atlassian.com/api/v2/status.json", page_url: "https://jira-software.status.atlassian.com", type: "statuspage" },
    { id: "confluence", name: "Confluence", tags: ["collaboration", "wiki", "atlassian", "documentation"], status_url: "https://confluence.status.atlassian.com/api/v2/status.json", page_url: "https://confluence.status.atlassian.com", type: "statuspage" },
    // Customer support / communications
    { id: "intercom", name: "Intercom", tags: ["customer-support", "communication", "saas", "crm"], status_url: "https://www.intercomstatus.com/api/v2/status.json", page_url: "https://www.intercomstatus.com", type: "statuspage" },
    // AI / LLM providers
    { id: "deepseek", name: "DeepSeek", tags: ["ai", "llm", "api"], status_url: "https://deepseek.statuspage.io/api/v2/status.json", page_url: "https://status.deepseek.com", type: "statuspage" },
    // Social / professional networks
    { id: "linkedin_api", name: "LinkedIn API", tags: ["social", "professional", "api"], status_url: "https://linkedin.statuspage.io/api/v2/status.json", page_url: "https://www.linkedin-apistatus.com", type: "statuspage" },
    { id: "tumblr", name: "Tumblr", tags: ["social", "blogging", "consumer"], status_url: "https://tumblr.statuspage.io/api/v2/status.json", page_url: "https://tumblr.statuspage.io", type: "statuspage" },
    // Music / streaming
    { id: "spotify", name: "Spotify", tags: ["music", "streaming", "consumer"], status_url: "https://spotify.statuspage.io/api/v2/status.json", page_url: "https://spotify.statuspage.io", type: "statuspage" },
    // Ride-share / delivery
    { id: "uber", name: "Uber", tags: ["rideshare", "delivery", "consumer"], status_url: "https://uber.statuspage.io/api/v2/status.json", page_url: "https://uber.statuspage.io", type: "statuspage" },
    { id: "lyft", name: "Lyft", tags: ["rideshare", "consumer"], status_url: "https://lyft.statuspage.io/api/v2/status.json", page_url: "https://lyft.statuspage.io", type: "statuspage" },
    { id: "doordash", name: "DoorDash", tags: ["food-delivery", "consumer", "marketplace"], status_url: "https://doordash.statuspage.io/api/v2/status.json", page_url: "https://www.doordashstatus.com", type: "statuspage" },
    { id: "deliveroo", name: "Deliveroo", tags: ["food-delivery", "consumer", "marketplace"], status_url: "https://deliveroo.statuspage.io/api/v2/status.json", page_url: "https://status.deliveroo.com", type: "statuspage" },
    { id: "just_eat", name: "Just Eat", tags: ["food-delivery", "consumer", "marketplace"], status_url: "https://justeat.statuspage.io/api/v2/status.json", page_url: "https://justeat.statuspage.io", type: "statuspage" },
    // Payments / fintech
    { id: "mastercard", name: "Mastercard", tags: ["payments", "fintech", "banking"], status_url: "https://mastercard.statuspage.io/api/v2/status.json", page_url: "https://mastercard.statuspage.io", type: "statuspage" },
    { id: "mx_merchant", name: "MX Merchant", tags: ["payments", "fintech", "merchant"], status_url: "https://status.mxmerchant.com/api/v2/status.json", page_url: "https://status.mxmerchant.com", type: "statuspage" },
    // Retail / e-commerce
    { id: "walmart", name: "Walmart", tags: ["retail", "ecommerce", "consumer"], status_url: "https://walmart.statuspage.io/api/v2/status.json", page_url: "https://walmart.statuspage.io", type: "statuspage" },
    // Gaming
    { id: "steam_platform", name: "Steam", tags: ["gaming", "platform", "consumer"], status_url: "https://steam2.statuspage.io/api/v2/status.json", page_url: "https://steam2.statuspage.io", type: "statuspage" },
    // Weather / data
    { id: "accuweather", name: "AccuWeather", tags: ["weather", "data", "api"], status_url: "https://accuweather.statuspage.io/api/v2/status.json", page_url: "https://status.accuweather.com", type: "statuspage" },
    // Developer tools / web
    { id: "zyte", name: "Zyte", tags: ["scraping", "web", "data", "api"], status_url: "https://status.zyte.com/api/v2/status.json", page_url: "https://status.zyte.com", type: "statuspage" },
    { id: "kraken_io", name: "Kraken.io", tags: ["image-optimization", "cdn", "api"], status_url: "https://kraken.statuspage.io/api/v2/status.json", page_url: "https://status.kraken.io", type: "statuspage" },
    // Tick 168 additions
    // Gaming / consumer
    { id: "roblox", name: "Roblox", tags: ["gaming", "platform", "consumer"], status_url: "https://api.status.io/1.0/status/59db90dbcdeb2f04dadcf16d", page_url: "https://status.roblox.com", type: "statusio" },
    // WordPress managed hosting
    { id: "pagely", name: "Pagely", tags: ["hosting", "wordpress", "managed", "cloud"], status_url: "https://status.pagely.com/api/v2/status.json", page_url: "https://status.pagely.com", type: "statuspage" },
    { id: "wpcloud", name: "WordPress.com Cloud", tags: ["hosting", "wordpress", "cloud", "managed"], status_url: "https://wpcloud.statuspage.io/api/v2/status.json", page_url: "https://wpcloud.statuspage.io", type: "statuspage" },
    // CI/CD
    { id: "circleci", name: "CircleCI", tags: ["ci-cd", "devtools", "automation", "cloud"], status_url: "https://circleci.statuspage.io/api/v2/status.json", page_url: "https://circleci.statuspage.io", type: "statuspage" },
    { id: "bitbucket", name: "Bitbucket", tags: ["git", "devtools", "ci-cd", "atlassian"], status_url: "https://bitbucket.statuspage.io/api/v2/status.json", page_url: "https://bitbucket.statuspage.io", type: "statuspage" },
    { id: "nx_cloud", name: "Nx Cloud", tags: ["ci-cd", "devtools", "monorepo", "build-cache"], status_url: "https://status.nx.app/api/v2/status.json", page_url: "https://status.nx.app", type: "statuspage" },
    // Community / online courses
    { id: "mighty_networks", name: "Mighty Networks", tags: ["community", "courses", "membership", "saas"], status_url: "https://status.mightynetworks.com/api/v2/status.json", page_url: "https://status.mightynetworks.com", type: "statuspage" },
    // Email marketing
    { id: "constant_contact", name: "Constant Contact", tags: ["email", "marketing", "crm", "saas"], status_url: "https://status.constantcontact.com/api/v2/status.json", page_url: "https://status.constantcontact.com", type: "statuspage" },
    // DevOps / infrastructure configuration
    { id: "chef", name: "Chef", tags: ["devops", "infrastructure", "configuration-management", "automation"], status_url: "https://status.chef.io/api/v2/status.json", page_url: "https://status.chef.io", type: "statuspage" },
    { id: "puppet", name: "Puppet", tags: ["devops", "infrastructure", "configuration-management", "automation"], status_url: "https://puppet.statuspage.io/api/v2/status.json", page_url: "https://puppet.statuspage.io", type: "statuspage" },
    // Enterprise Linux / developer platform
    { id: "redhat", name: "Red Hat", tags: ["linux", "enterprise", "cloud", "developer-platform"], status_url: "https://status.redhat.com/api/v2/status.json", page_url: "https://status.redhat.com", type: "statuspage" },
    // Analytics / OLAP database
    { id: "firebolt", name: "Firebolt", tags: ["database", "analytics", "olap", "cloud"], status_url: "https://status.firebolt.io/api/v2/status.json", page_url: "https://status.firebolt.io", type: "statuspage" },
    // Tick 169 additions
    // Identity verification
    { id: "idnow", name: "IDnow", tags: ["identity", "kyc", "verification", "security"], status_url: "https://idnow.statuspage.io/api/v2/status.json", page_url: "https://idnow.statuspage.io", type: "statuspage" },
    { id: "jumio", name: "Jumio", tags: ["identity", "kyc", "verification", "security"], status_url: "https://jumio.statuspage.io/api/v2/status.json", page_url: "https://jumio.statuspage.io", type: "statuspage" },
    // Background screening
    { id: "sterling", name: "Sterling", tags: ["background-check", "hr", "compliance", "screening"], status_url: "https://sterling.statuspage.io/api/v2/status.json", page_url: "https://sterling.statuspage.io", type: "statuspage" },
    { id: "accurate", name: "Accurate Background", tags: ["background-check", "hr", "compliance", "screening"], status_url: "https://status.accurate.com/api/v2/status.json", page_url: "https://status.accurate.com", type: "statuspage" },
    { id: "cisive", name: "Cisive", tags: ["background-check", "hr", "compliance", "screening"], status_url: "https://status.cisive.com/api/v2/status.json", page_url: "https://status.cisive.com", type: "statuspage" },
    // Insurance tech
    { id: "hippo", name: "Hippo Insurance", tags: ["insurance", "insurtech", "consumer"], status_url: "https://hippo.statuspage.io/api/v2/status.json", page_url: "https://hippo.statuspage.io", type: "statuspage" },
    // Scheduling
    { id: "cal_com", name: "Cal.com", tags: ["scheduling", "calendar", "productivity", "open-source"], status_url: "https://cal.statuspage.io/api/v2/status.json", page_url: "https://cal.statuspage.io", type: "statuspage" },
    // Gaming platforms
    { id: "nexon", name: "Nexon", tags: ["gaming", "platform", "consumer"], status_url: "https://nexon.statuspage.io/api/v2/status.json", page_url: "https://nexon.statuspage.io", type: "statuspage" },
    { id: "garena", name: "Garena", tags: ["gaming", "platform", "consumer"], status_url: "https://garena.statuspage.io/api/v2/status.json", page_url: "https://garena.statuspage.io", type: "statuspage" },
    { id: "gearbox", name: "Gearbox SHiFT", tags: ["gaming", "platform", "consumer"], status_url: "https://status.gearbox.com/api/v2/status.json", page_url: "https://status.gearbox.com", type: "statuspage" },
    // Package registry
    { id: "gemfury", name: "Gemfury", tags: ["package-registry", "devtools", "hosting"], status_url: "https://status.gemfury.com/api/v2/status.json", page_url: "https://status.gemfury.com", type: "statuspage" },
    // Field service management
    { id: "jobber", name: "Jobber", tags: ["field-service", "smb", "crm", "saas"], status_url: "https://jobber.statuspage.io/api/v2/status.json", page_url: "https://jobber.statuspage.io", type: "statuspage" },
    // Construction management
    { id: "esub", name: "eSUB Construction Software", tags: ["construction", "project-management", "field-service", "saas"], status_url: "https://status.esub.com/api/v2/status.json", page_url: "https://status.esub.com", type: "statuspage" },
    // Property / rental tech
    { id: "rently", name: "Rently", tags: ["real-estate", "property-management", "saas"], status_url: "https://status.rently.com/api/v2/status.json", page_url: "https://status.rently.com", type: "statuspage" },
    // Telecom / identity verification
    { id: "telesign", name: "TeleSign", tags: ["communication", "sms", "verification", "cpaas", "api"], status_url: "https://status.telesign.com/api/v2/status.json", page_url: "https://status.telesign.com", type: "statuspage" },
    // Enterprise file sync
    { id: "syncplicity", name: "Syncplicity", tags: ["cloud-storage", "file-sync", "enterprise", "collaboration"], status_url: "https://status.syncplicity.com/api/v2/status.json", page_url: "https://status.syncplicity.com", type: "statuspage" },
    // Event management
    { id: "stova", name: "Stova", tags: ["events", "event-management", "saas"], status_url: "https://status.stova.io/api/v2/status.json", page_url: "https://status.stova.io", type: "statuspage" },
    // Network intelligence / observability
    { id: "thousandeyes", name: "ThousandEyes (Cisco)", tags: ["monitoring", "network", "observability", "cisco"], status_url: "https://status.thousandeyes.com/api/v2/status.json", page_url: "https://status.thousandeyes.com", type: "statuspage" },
    // Last-mile delivery
    { id: "lalamove", name: "Lalamove", tags: ["delivery", "logistics", "last-mile", "api"], status_url: "https://status.lalamove.com/api/v2/status.json", page_url: "https://status.lalamove.com", type: "statuspage" },
    // Time-series database cloud
    { id: "influxdb_cloud", name: "InfluxDB Cloud", tags: ["database", "time-series", "cloud", "monitoring", "observability"], status_url: "https://status.influxdata.com/api/v2/status.json", page_url: "https://status.influxdata.com", type: "statuspage" },
    // CDN / video delivery
    { id: "bunny_net", name: "bunny.net", tags: ["cdn", "infrastructure", "video", "hosting"], status_url: "https://status.bunny.net/api/v2/status.json", page_url: "https://status.bunny.net", type: "statuspage" },
    // Accessibility testing
    { id: "evinced", name: "Evinced", tags: ["accessibility", "testing", "devtools"], status_url: "https://status.evinced.com/api/v2/status.json", page_url: "https://status.evinced.com", type: "statuspage" },
    // Transactional email templates
    { id: "sendwithus", name: "Sendwithus", tags: ["email", "transactional", "templates", "api"], status_url: "https://status.sendwithus.com/api/v2/status.json", page_url: "https://status.sendwithus.com", type: "statuspage" },
    // Workflow automation
    { id: "pipefy", name: "Pipefy", tags: ["workflow", "automation", "no-code", "process-management", "saas"], status_url: "https://status.pipefy.com/api/v2/status.json", page_url: "https://status.pipefy.com", type: "statuspage" },
    // Scheduling
    { id: "doodle", name: "Doodle", tags: ["scheduling", "calendar", "productivity", "saas"], status_url: "https://doodle.statuspage.io/api/v2/status.json", page_url: "https://doodle.statuspage.io", type: "statuspage" },
    // File transfer
    { id: "wetransfer", name: "WeTransfer", tags: ["file-sharing", "cloud-storage", "collaboration"], status_url: "https://status.wetransfer.com/api/v2/status.json", page_url: "https://status.wetransfer.com", type: "statuspage" },
    // Package registries
    { id: "pypi", name: "PyPI", tags: ["package-registry", "python", "devtools", "open-source"], status_url: "https://status.python.org/api/v2/status.json", page_url: "https://status.python.org", type: "statuspage" },
    { id: "hex_pm", name: "Hex.pm", tags: ["package-registry", "elixir", "erlang", "devtools", "open-source"], status_url: "https://hex.statuspage.io/api/v2/status.json", page_url: "https://hex.statuspage.io", type: "statuspage" },
    { id: "cocoapods", name: "CocoaPods", tags: ["package-registry", "ios", "macos", "swift", "devtools", "open-source"], status_url: "https://cocoapods.statuspage.io/api/v2/status.json", page_url: "https://cocoapods.statuspage.io", type: "statuspage" },
    // Gaming
    { id: "geforce_now", name: "NVIDIA GeForce NOW", tags: ["gaming", "cloud-gaming", "streaming", "nvidia"], status_url: "https://status.geforcenow.com/api/v2/status.json", page_url: "https://status.geforcenow.com", type: "statuspage" },
    { id: "psn", name: "PlayStation Network", tags: ["gaming", "platform", "consumer", "sony"], status_url: "https://psn.statuspage.io/api/v2/status.json", page_url: "https://psn.statuspage.io", type: "statuspage" },
    // Web3 / blockchain infrastructure
    { id: "alchemy", name: "Alchemy", tags: ["web3", "blockchain", "api", "developer-tools", "ethereum"], status_url: "https://alchemyapi.statuspage.io/api/v2/status.json", page_url: "https://alchemyapi.statuspage.io", type: "statuspage" },
    // DNS
    { id: "dnssimple", name: "DNSimple", tags: ["dns", "domains", "infrastructure", "api"], status_url: "https://dnsimplestatus.com/api/v2/status.json", page_url: "https://dnsimplestatus.com", type: "statuspage" },
    // Payments
    { id: "authorizenet", name: "Authorize.Net", tags: ["payments", "payment-processing", "fintech", "api"], status_url: "https://status.authorize.net/api/v2/status.json", page_url: "https://status.authorize.net", type: "statuspage" },
    { id: "pay_com", name: "Pay.com", tags: ["payments", "payment-processing", "fintech", "api"], status_url: "https://status.pay.com/api/v2/status.json", page_url: "https://status.pay.com", type: "statuspage" },
    // AI/LLM platforms
    { id: "poe", name: "Poe", tags: ["ai", "llm", "chatbot", "platform"], status_url: "https://status.poe.com/api/v2/status.json", page_url: "https://status.poe.com", type: "statuspage" },
    // Hosting / server management
    { id: "cpanel", name: "cPanel", tags: ["hosting", "server", "control-panel", "infrastructure"], status_url: "https://cpanel.statuspage.io/api/v2/status.json", page_url: "https://status.cpanel.net", type: "statuspage" },
    // Gaming infrastructure
    { id: "photon_engine", name: "Photon Engine", tags: ["gaming", "multiplayer", "networking", "realtime"], status_url: "https://photon.statuspage.io/api/v2/status.json", page_url: "https://photon.statuspage.io", type: "statuspage" },
    // Manufacturing / industrial operations
    { id: "tulip", name: "Tulip Interfaces", tags: ["manufacturing", "operations", "no-code", "industrial", "iot"], status_url: "https://status.tulip.co/api/v2/status.json", page_url: "https://status.tulip.co", type: "statuspage" },
    // Spend management / AP automation
    { id: "teampay", name: "Teampay", tags: ["spend-management", "finance", "ap-automation", "saas"], status_url: "https://status.teampay.co/api/v2/status.json", page_url: "https://status.teampay.co", type: "statuspage" },
    { id: "expensya", name: "Expensya", tags: ["expense-management", "finance", "saas", "travel"], status_url: "https://status.expensya.com/api/v2/status.json", page_url: "https://status.expensya.com", type: "statuspage" },
    // Logistics / freight
    { id: "truckstop", name: "Truckstop", tags: ["logistics", "freight", "trucking", "marketplace"], status_url: "https://truckstop.statuspage.io/api/v2/status.json", page_url: "https://truckstop.statuspage.io", type: "statuspage" },
    // Events
    { id: "swoogo", name: "Swoogo", tags: ["events", "event-management", "conference", "saas"], status_url: "https://swoogo.statuspage.io/api/v2/status.json", page_url: "https://www.swoogostatus.com", type: "statuspage" },
    { id: "vfairs", name: "vFairs", tags: ["events", "virtual-events", "conference", "saas"], status_url: "https://status.vfairs.com/api/v2/status.json", page_url: "https://status.vfairs.com", type: "statuspage" },
    { id: "grip_events", name: "Grip", tags: ["events", "networking", "matchmaking", "conference"], status_url: "https://status.grip.events/api/v2/status.json", page_url: "https://status.grip.events", type: "statuspage" },
    // Sales outreach
    { id: "overloop", name: "Overloop", tags: ["sales", "outreach", "prospecting", "automation", "saas"], status_url: "https://overloop.statuspage.io/api/v2/status.json", page_url: "https://overloop.statuspage.io", type: "statuspage" },
];
// Statuspage indicator → normalized status
function normalizeStatuspageIndicator(indicator) {
    switch (indicator) {
        case "none":
            return "operational";
        case "minor":
            return "degraded";
        case "major":
            return "partial_outage";
        case "critical":
            return "major_outage";
        case "maintenance":
            return "maintenance";
        default:
            return "unknown";
    }
}
async function fetchStatuspageIncident(pageUrl) {
    try {
        const res = await fetch(`${pageUrl}/api/v2/incidents.json`, {
            signal: AbortSignal.timeout(6000),
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            return undefined;
        const data = (await res.json());
        const active = (data.incidents ?? []).filter((i) => i.status !== "resolved" && i.status !== "postmortem");
        if (active.length === 0)
            return undefined;
        const inc = active[0];
        const updates = inc.incident_updates ?? [];
        const latestUpdate = updates.length > 0 ? String(updates[0].body ?? "") : "";
        const components = (inc.components ?? [])
            .map((c) => String(c.name ?? ""))
            .filter(Boolean);
        return {
            name: String(inc.name ?? ""),
            impact: String(inc.impact ?? ""),
            status: String(inc.status ?? ""),
            started_at: String(inc.started_at ?? ""),
            latest_update: latestUpdate.slice(0, 500),
            affected_components: components,
        };
    }
    catch {
        return undefined;
    }
}
async function fetchStatuspageStatus(svc) {
    const now = new Date().toISOString();
    try {
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        // Standard Statuspage v2 shape
        const statusObj = data.status;
        const indicator = statusObj?.indicator ?? "unknown";
        const description = statusObj?.description ?? "Status unknown";
        const normalized = normalizeStatuspageIndicator(indicator);
        // Fetch incident details when non-operational
        const incident = normalized !== "operational"
            ? await fetchStatuspageIncident(svc.page_url)
            : undefined;
        return {
            id: svc.id,
            name: svc.name,
            status: normalized,
            description,
            last_checked: now,
            source_url: svc.page_url,
            ...(incident ? { incident } : {}),
        };
    }
    catch (err) {
        return {
            id: svc.id,
            name: svc.name,
            status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now,
            source_url: svc.page_url,
        };
    }
}
async function fetchSlackStatus(svc) {
    const now = new Date().toISOString();
    try {
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        // Slack API: { status: "active"|"ok", active_incidents: [...] }
        const activeIncidents = Array.isArray(data.active_incidents) ? data.active_incidents : [];
        const status = activeIncidents.length === 0 ? "operational" : "degraded";
        const description = activeIncidents.length === 0
            ? "All systems operational"
            : `${activeIncidents.length} active incident(s)`;
        return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchAzureStatus(svc) {
    const now = new Date().toISOString();
    try {
        // Azure exposes an RSS feed — 0 <item> elements = fully operational
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: "application/rss+xml, application/xml, text/xml" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const itemCount = (xml.match(/<item>/g) ?? []).length;
        if (itemCount === 0) {
            return { id: svc.id, name: svc.name, status: "operational", description: "No active incidents reported", last_checked: now, source_url: svc.page_url };
        }
        // Extract first incident title for description
        const titleMatch = xml.match(/<item>[\s\S]*?<title>([^<]+)<\/title>/);
        const firstTitle = titleMatch ? titleMatch[1].trim() : `${itemCount} active incident(s)`;
        const status = itemCount >= 3 ? "major_outage" : "partial_outage";
        return { id: svc.id, name: svc.name, status, description: firstTitle, last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchAWSStatus(svc) {
    const now = new Date().toISOString();
    try {
        // AWS Health Dashboard returns UTF-16BE JSON — must decode manually
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: "application/json", "Accept-Encoding": "identity" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let text;
        if (bytes[0] === 0xfe && bytes[1] === 0xff)
            text = new TextDecoder("utf-16be").decode(buf.slice(2));
        else if (bytes[0] === 0xff && bytes[1] === 0xfe)
            text = new TextDecoder("utf-16le").decode(buf.slice(2));
        else
            text = new TextDecoder("utf-8").decode(buf);
        const events = JSON.parse(text);
        const activeIncidents = Array.isArray(events) ? events : [];
        const status = activeIncidents.length === 0 ? "operational" : "partial_outage";
        const description = activeIncidents.length === 0
            ? "No active service events reported"
            : `${activeIncidents.length} active service event(s) — see dashboard for details`;
        return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchGCPStatus(svc) {
    const now = new Date().toISOString();
    try {
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const incidents = (await res.json());
        // Active incidents have no `end` field
        const active = Array.isArray(incidents)
            ? incidents.filter((i) => !i.end)
            : [];
        const status = active.length === 0 ? "operational" : "partial_outage";
        const description = active.length === 0
            ? "All services operating normally"
            : `${active.length} active incident(s): ${active[0]?.external_desc ?? "see status page"}`;
        return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchIncidentIOStatus(svc) {
    const now = new Date().toISOString();
    try {
        // incident.io pages embed live status text in their HTML — no public JSON API
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 StatusCraft/1.0" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (/fully operational/i.test(html) || /not aware of any issues/i.test(html) || /all systems operational/i.test(html)) {
            return { id: svc.id, name: svc.name, status: "operational", description: "All systems operational", last_checked: now, source_url: svc.page_url };
        }
        if (/currently undergoing maintenance/i.test(html)) {
            return { id: svc.id, name: svc.name, status: "maintenance", description: "Scheduled maintenance in progress", last_checked: now, source_url: svc.page_url };
        }
        if (/major outage/i.test(html)) {
            return { id: svc.id, name: svc.name, status: "major_outage", description: "Major outage reported", last_checked: now, source_url: svc.page_url };
        }
        if (/currently experiencing issues/i.test(html) || /partial outage/i.test(html) || /investigating/i.test(html)) {
            return { id: svc.id, name: svc.name, status: "partial_outage", description: "Service issues reported — check status page", last_checked: now, source_url: svc.page_url };
        }
        if (/degraded/i.test(html) || /monitoring/i.test(html)) {
            return { id: svc.id, name: svc.name, status: "degraded", description: "Degraded performance", last_checked: now, source_url: svc.page_url };
        }
        return { id: svc.id, name: svc.name, status: "unknown", description: "Page reachable but status unclear — check manually", last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchPagerDutyStatus(svc) {
    const now = new Date().toISOString();
    try {
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 StatusCraft/1.0" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const match = html.match(/<script id="data" type="application\/json">([\s\S]+?)<\/script>/);
        if (!match)
            throw new Error("No embedded data found");
        const data = JSON.parse(match[1]);
        const headline = data?.layout?.layout_settings?.statusPage?.globalStatusHeadline ?? "";
        const lc = headline.toLowerCase();
        let status = "operational";
        if (lc.includes("outage") || lc.includes("major"))
            status = "major_outage";
        else if (lc.includes("partial") || lc.includes("degraded") || lc.includes("incident"))
            status = "partial_outage";
        else if (lc.includes("maintenance"))
            status = "maintenance";
        else if (lc.includes("issue") || lc.includes("investigating"))
            status = "partial_outage";
        return { id: svc.id, name: svc.name, status, description: headline || "All Systems Operational", last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return { id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url };
    }
}
async function fetchHerokuStatus(svc) {
    const now = new Date().toISOString();
    try {
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        const systems = data.status ?? [];
        const incidents = data.incidents ?? [];
        const hasRed = systems.some((s) => s.status === "red");
        const hasYellow = systems.some((s) => s.status === "yellow");
        let status;
        if (hasRed)
            status = "major_outage";
        else if (hasYellow || incidents.length > 0)
            status = "degraded";
        else
            status = "operational";
        const description = status === "operational"
            ? "All systems operational"
            : `${incidents.length} active incident(s) — see status page`;
        return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchStatusIOStatus(svc) {
    const now = new Date().toISOString();
    try {
        const res = await fetch(svc.status_url, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        const code = data?.result?.status_overall?.status_code ?? 0;
        const statusText = data?.result?.status_overall?.status ?? "Unknown";
        let status;
        if (code === 100)
            status = "operational";
        else if (code === 200 || code === 300)
            status = "degraded";
        else if (code === 400)
            status = "partial_outage";
        else if (code >= 500)
            status = "major_outage";
        else
            status = "unknown";
        return { id: svc.id, name: svc.name, status, description: statusText, last_checked: now, source_url: svc.page_url };
    }
    catch (err) {
        return {
            id: svc.id, name: svc.name, status: "unknown",
            description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            last_checked: now, source_url: svc.page_url,
        };
    }
}
async function fetchFresh(svc) {
    if (svc.type === "gcp")
        return fetchGCPStatus(svc);
    if (svc.type === "slack")
        return fetchSlackStatus(svc);
    if (svc.type === "azure")
        return fetchAzureStatus(svc);
    if (svc.type === "aws")
        return fetchAWSStatus(svc);
    if (svc.type === "incidentio")
        return fetchIncidentIOStatus(svc);
    if (svc.type === "pagerduty")
        return fetchPagerDutyStatus(svc);
    if (svc.type === "heroku")
        return fetchHerokuStatus(svc);
    if (svc.type === "statusio")
        return fetchStatusIOStatus(svc);
    return fetchStatuspageStatus(svc);
}
async function getServiceStatus(svc) {
    const cached = getCached(svc.id);
    if (cached)
        return cached;
    const result = await fetchFresh(svc);
    setCache(result);
    return result;
}
function statusEmoji(s) {
    switch (s) {
        case "operational": return "✅";
        case "degraded": return "🟡";
        case "partial_outage": return "🟠";
        case "major_outage": return "🔴";
        case "maintenance": return "🔧";
        default: return "❓";
    }
}
function formatServiceStatus(s) {
    return (`${statusEmoji(s.status)} **${s.name}** (${s.id})\n` +
        `   Status: ${s.status.replace(/_/g, " ")}\n` +
        `   ${s.description}\n` +
        `   Checked: ${s.last_checked}\n` +
        `   Source: ${s.source_url}`);
}
const server = new Server({ name: "statuscraft", version: "2.47.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_status",
            description: "Check the live status of a specific service (e.g. 'github', 'openai', 'stripe'). Returns operational/degraded/partial_outage/major_outage/maintenance.",
            inputSchema: {
                type: "object",
                properties: {
                    service: {
                        type: "string",
                        description: "Service ID or name (e.g. 'github', 'openai', 'stripe', 'cloudflare'). Use list_services to see all available IDs.",
                    },
                },
                required: ["service"],
            },
        },
        {
            name: "get_all_status",
            description: "Check the live status of ALL tracked services at once. Returns a summary grouped by status — useful for a quick health check across the stack.",
            inputSchema: {
                type: "object",
                properties: {},
                required: [],
            },
        },
        {
            name: "list_services",
            description: "List all 1600 services tracked by StatusCraft, with their IDs and tags. Use this to discover service IDs for get_status.",
            inputSchema: {
                type: "object",
                properties: {
                    filter_tag: {
                        type: "string",
                        description: "Optional tag filter. E.g. 'ai', 'payments', 'hosting', 'monitoring', 'communication'. Returns only services matching this tag.",
                    },
                },
                required: [],
            },
        },
        {
            name: "check_multiple",
            description: "Check the live status of a specific list of services in parallel. Faster than calling get_status repeatedly.",
            inputSchema: {
                type: "object",
                properties: {
                    services: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of service IDs to check (e.g. ['github', 'stripe', 'openai']).",
                    },
                },
                required: ["services"],
            },
        },
        {
            name: "refresh_status",
            description: "Force a fresh live fetch for one or all services, bypassing the 60-second cache. Use this when you need the absolute latest status — e.g. during an active incident or immediately after a known outage ends.",
            inputSchema: {
                type: "object",
                properties: {
                    service: {
                        type: "string",
                        description: "Optional: service ID to refresh (e.g. 'github'). If omitted, refreshes all 1600 services.",
                    },
                },
                required: [],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "list_services") {
        const filterTag = args?.filter_tag ? String(args.filter_tag).toLowerCase() : null;
        const filtered = filterTag
            ? SERVICES.filter((s) => s.tags.includes(filterTag))
            : SERVICES;
        if (filtered.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No services found with tag "${filterTag}". Available tags: ai, payments, hosting, monitoring, communication, devtools, cdn, infrastructure, ops, api, fintech, email, paas, cloud.`,
                    },
                ],
            };
        }
        const lines = filtered.map((s) => `• **${s.name}** (id: \`${s.id}\`) — tags: ${s.tags.join(", ")}\n  Status page: ${s.page_url}`);
        const header = filterTag
            ? `Services tagged "${filterTag}" (${filtered.length}):`
            : `All tracked services (${filtered.length}):`;
        return {
            content: [{ type: "text", text: `${header}\n\n${lines.join("\n\n")}` }],
        };
    }
    if (name === "get_status") {
        const query = String(args.service).toLowerCase().trim();
        const svc = SERVICES.find((s) => s.id === query) ||
            SERVICES.find((s) => s.name.toLowerCase() === query) ||
            SERVICES.find((s) => s.name.toLowerCase().includes(query));
        if (!svc) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Unknown service: "${args.service}". Use list_services to see all available service IDs.`,
                    },
                ],
            };
        }
        const status = await getServiceStatus(svc);
        return {
            content: [{ type: "text", text: formatServiceStatus(status) }],
        };
    }
    if (name === "get_all_status") {
        const results = await Promise.all(SERVICES.map((s) => getServiceStatus(s)));
        const grouped = {
            major_outage: [],
            partial_outage: [],
            degraded: [],
            maintenance: [],
            unknown: [],
            operational: [],
        };
        for (const r of results)
            grouped[r.status].push(r);
        const sections = [];
        const issueStatuses = ["major_outage", "partial_outage", "degraded", "maintenance", "unknown"];
        const hasIssues = issueStatuses.some((k) => grouped[k].length > 0);
        if (hasIssues) {
            for (const key of issueStatuses) {
                if (grouped[key].length === 0)
                    continue;
                const label = key.replace(/_/g, " ").toUpperCase();
                sections.push(`### ${statusEmoji(key)} ${label}\n` +
                    grouped[key].map((s) => `• **${s.name}**: ${s.description}`).join("\n"));
            }
        }
        const opCount = grouped.operational.length;
        const total = results.length;
        const summary = hasIssues
            ? `**${opCount}/${total} services operational.** Issues detected — see above.`
            : `**All ${total} services operational.** ✅`;
        sections.unshift(summary);
        if (opCount > 0 && hasIssues) {
            sections.push(`### ✅ OPERATIONAL (${opCount})\n` +
                grouped.operational.map((s) => `• ${s.name}`).join(", "));
        }
        const checkedAt = results[0]?.last_checked ?? new Date().toISOString();
        sections.push(`_Checked at ${checkedAt}_`);
        return {
            content: [{ type: "text", text: sections.join("\n\n") }],
        };
    }
    if (name === "check_multiple") {
        const ids = args.services.map((s) => String(s).toLowerCase().trim());
        const resolved = ids.map((id) => {
            const svc = SERVICES.find((s) => s.id === id) ||
                SERVICES.find((s) => s.name.toLowerCase() === id) ||
                SERVICES.find((s) => s.name.toLowerCase().includes(id));
            return { id, svc };
        });
        const unknown = resolved.filter((r) => !r.svc).map((r) => r.id);
        const toFetch = resolved.filter((r) => r.svc);
        const results = await Promise.all(toFetch.map((r) => getServiceStatus(r.svc)));
        const lines = results.map(formatServiceStatus);
        if (unknown.length > 0) {
            lines.push(`\n⚠️ Unrecognized service ID(s): ${unknown.join(", ")}. Use list_services to see available IDs.`);
        }
        return {
            content: [{ type: "text", text: lines.join("\n\n") }],
        };
    }
    if (name === "refresh_status") {
        const serviceId = args?.service ? String(args.service).toLowerCase().trim() : null;
        if (serviceId) {
            const svc = SERVICES.find((s) => s.id === serviceId) ||
                SERVICES.find((s) => s.name.toLowerCase() === serviceId) ||
                SERVICES.find((s) => s.name.toLowerCase().includes(serviceId));
            if (!svc) {
                return {
                    content: [{ type: "text", text: `Unknown service: "${args.service}". Use list_services to see available IDs.` }],
                };
            }
            statusCache.delete(svc.id);
            const result = await getServiceStatus(svc);
            return {
                content: [{ type: "text", text: `Cache cleared and refreshed.\n\n${formatServiceStatus(result)}` }],
            };
        }
        // Refresh all
        statusCache.clear();
        const results = await Promise.all(SERVICES.map((s) => getServiceStatus(s)));
        const lines = results.map(formatServiceStatus);
        return {
            content: [{ type: "text", text: `All ${SERVICES.length} services refreshed from live sources.\n\n${lines.join("\n\n")}` }],
        };
    }
    throw new Error(`Unknown tool: ${name}`);
});
const transport = new StdioServerTransport();
await server.connect(transport);
