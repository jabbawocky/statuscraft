#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

type StatusIndicator =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

interface ServiceStatus {
  id: string;
  name: string;
  status: StatusIndicator;
  description: string;
  last_checked: string;
  source_url: string;
  incident?: {
    name: string;
    impact: string;
    status: string;
    started_at: string;
    latest_update: string;
    affected_components: string[];
  };
}

interface ServiceConfig {
  id: string;
  name: string;
  tags: string[];
  status_url: string;
  page_url: string;
  type: "statuspage" | "gcp" | "slack" | "azure" | "aws" | "incidentio" | "pagerduty";
}

const CACHE_TTL_MS = 60_000; // 60-second TTL

interface CacheEntry {
  result: ServiceStatus;
  expiresAt: number;
}

const statusCache = new Map<string, CacheEntry>();

function getCached(id: string): ServiceStatus | null {
  const entry = statusCache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    statusCache.delete(id);
    return null;
  }
  return entry.result;
}

function setCache(result: ServiceStatus): void {
  statusCache.set(result.id, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

const SERVICES: ServiceConfig[] = [
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
    id: "cloudflare",
    name: "Cloudflare",
    tags: ["cdn", "dns", "security", "infrastructure"],
    status_url: "https://www.cloudflarestatus.com/api/v2/status.json",
    page_url: "https://www.cloudflarestatus.com",
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
    id: "netlify",
    name: "Netlify",
    tags: ["hosting", "cdn", "deployment", "jamstack"],
    status_url: "https://www.netlifystatus.com/api/v2/status.json",
    page_url: "https://www.netlifystatus.com",
    type: "statuspage",
  },
  {
    id: "vercel",
    name: "Vercel",
    tags: ["hosting", "deployment", "jamstack", "frontend"],
    status_url: "https://www.vercel-status.com/api/v2/status.json",
    page_url: "https://www.vercel-status.com",
    type: "statuspage",
  },
  {
    id: "linear",
    name: "Linear",
    tags: ["project-management", "devtools"],
    status_url: "https://linearstatus.com/api/v2/status.json",
    page_url: "https://linearstatus.com",
    type: "statuspage",
  },
  {
    id: "notion",
    name: "Notion",
    tags: ["productivity", "docs"],
    status_url: "https://www.notionstatuspage.com/api/v2/status.json",
    page_url: "https://www.notionstatuspage.com",
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
    type: "statuspage",
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
    status_url: "https://status.fly.io/api/v2/status.json",
    page_url: "https://status.fly.io",
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
    status_url: "https://neonstatus.com/api/v2/status.json",
    page_url: "https://neonstatus.com",
    type: "statuspage",
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
    id: "resend",
    name: "Resend",
    tags: ["email", "api", "developer-tools"],
    status_url: "https://status.resend.com",
    page_url: "https://status.resend.com",
    type: "incidentio",
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
    id: "clerk",
    name: "Clerk",
    tags: ["auth", "identity", "developer-tools"],
    status_url: "https://status.clerk.com/api/v2/status.json",
    page_url: "https://status.clerk.com",
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
    id: "planetscale",
    name: "PlanetScale",
    tags: ["database", "mysql", "serverless"],
    status_url: "https://www.planetscalestatus.com/api/v2/status.json",
    page_url: "https://www.planetscalestatus.com",
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
    id: "launchdarkly",
    name: "LaunchDarkly",
    tags: ["feature-flags", "devtools", "developer-tools"],
    status_url: "https://status.launchdarkly.com/api/v2/status.json",
    page_url: "https://status.launchdarkly.com",
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
  {
    id: "courier",
    name: "Courier",
    tags: ["notifications", "messaging", "communication"],
    status_url: "https://status.courier.com/api/v2/status.json",
    page_url: "https://status.courier.com",
    type: "statuspage",
  },
  {
    id: "inngest",
    name: "Inngest",
    tags: ["devtools", "background-jobs", "automation"],
    status_url: "https://status.inngest.com/api/v2/status.json",
    page_url: "https://status.inngest.com",
    type: "statuspage",
  },
  // Tick 14 additions
  {
    id: "temporal",
    name: "Temporal Cloud",
    tags: ["devtools", "workflow", "background-jobs"],
    status_url: "https://status.temporal.io/api/v2/status.json",
    page_url: "https://status.temporal.io",
    type: "statuspage",
  },
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
];

// Statuspage indicator → normalized status
function normalizeStatuspageIndicator(indicator: string): StatusIndicator {
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

async function fetchStatuspageIncident(pageUrl: string): Promise<ServiceStatus["incident"] | undefined> {
  try {
    const res = await fetch(`${pageUrl}/api/v2/incidents.json`, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { incidents?: Record<string, unknown>[] };
    const active = (data.incidents ?? []).filter(
      (i) => i.status !== "resolved" && i.status !== "postmortem"
    );
    if (active.length === 0) return undefined;
    const inc = active[0];
    const updates = (inc.incident_updates as Record<string, unknown>[] | undefined) ?? [];
    const latestUpdate = updates.length > 0 ? String((updates[0] as Record<string, unknown>).body ?? "") : "";
    const components = ((inc.components as Record<string, unknown>[] | undefined) ?? [])
      .map((c) => String((c as Record<string, unknown>).name ?? ""))
      .filter(Boolean);
    return {
      name: String(inc.name ?? ""),
      impact: String(inc.impact ?? ""),
      status: String(inc.status ?? ""),
      started_at: String(inc.started_at ?? ""),
      latest_update: latestUpdate.slice(0, 500),
      affected_components: components,
    };
  } catch {
    return undefined;
  }
}

async function fetchStatuspageStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;

    // Standard Statuspage v2 shape
    const statusObj = data.status as Record<string, string> | undefined;
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
  } catch (err) {
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

async function fetchSlackStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    // Slack API: { status: "active"|"ok", active_incidents: [...] }
    const activeIncidents = Array.isArray(data.active_incidents) ? data.active_incidents : [];
    const status: StatusIndicator = activeIncidents.length === 0 ? "operational" : "degraded";
    const description =
      activeIncidents.length === 0
        ? "All systems operational"
        : `${activeIncidents.length} active incident(s)`;
    return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
  } catch (err) {
    return {
      id: svc.id, name: svc.name, status: "unknown",
      description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      last_checked: now, source_url: svc.page_url,
    };
  }
}

async function fetchAzureStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    // Azure exposes an RSS feed — 0 <item> elements = fully operational
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const itemCount = (xml.match(/<item>/g) ?? []).length;
    if (itemCount === 0) {
      return { id: svc.id, name: svc.name, status: "operational", description: "No active incidents reported", last_checked: now, source_url: svc.page_url };
    }
    // Extract first incident title for description
    const titleMatch = xml.match(/<item>[\s\S]*?<title>([^<]+)<\/title>/);
    const firstTitle = titleMatch ? titleMatch[1].trim() : `${itemCount} active incident(s)`;
    const status: StatusIndicator = itemCount >= 3 ? "major_outage" : "partial_outage";
    return { id: svc.id, name: svc.name, status, description: firstTitle, last_checked: now, source_url: svc.page_url };
  } catch (err) {
    return {
      id: svc.id, name: svc.name, status: "unknown",
      description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      last_checked: now, source_url: svc.page_url,
    };
  }
}

async function fetchAWSStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    // AWS Health Dashboard returns UTF-16BE JSON — must decode manually
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json", "Accept-Encoding": "identity" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let text: string;
    if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder("utf-16be").decode(buf.slice(2));
    else if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder("utf-16le").decode(buf.slice(2));
    else text = new TextDecoder("utf-8").decode(buf);
    const events = JSON.parse(text) as Array<{ service?: string; summary?: string; region_name?: string }>;
    const activeIncidents = Array.isArray(events) ? events : [];
    const status: StatusIndicator = activeIncidents.length === 0 ? "operational" : "partial_outage";
    const description =
      activeIncidents.length === 0
        ? "No active service events reported"
        : `${activeIncidents.length} active service event(s) — see dashboard for details`;
    return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
  } catch (err) {
    return {
      id: svc.id, name: svc.name, status: "unknown",
      description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      last_checked: now, source_url: svc.page_url,
    };
  }
}

async function fetchGCPStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const incidents = (await res.json()) as Array<Record<string, unknown>>;
    // Active incidents have no `end` field
    const active = Array.isArray(incidents)
      ? incidents.filter((i) => !i.end)
      : [];
    const status: StatusIndicator =
      active.length === 0 ? "operational" : "partial_outage";
    const description =
      active.length === 0
        ? "All services operating normally"
        : `${active.length} active incident(s): ${(active[0]?.external_desc as string) ?? "see status page"}`;
    return { id: svc.id, name: svc.name, status, description, last_checked: now, source_url: svc.page_url };
  } catch (err) {
    return {
      id: svc.id, name: svc.name, status: "unknown",
      description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      last_checked: now, source_url: svc.page_url,
    };
  }
}

async function fetchIncidentIOStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    // incident.io pages embed live status text in their HTML — no public JSON API
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 StatusCraft/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  } catch (err) {
    return {
      id: svc.id, name: svc.name, status: "unknown",
      description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      last_checked: now, source_url: svc.page_url,
    };
  }
}

async function fetchPagerDutyStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 StatusCraft/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/<script id="data" type="application\/json">([\s\S]+?)<\/script>/);
    if (!match) throw new Error("No embedded data found");
    const data = JSON.parse(match[1]) as { layout?: { layout_settings?: { statusPage?: { globalStatusHeadline?: string } } } };
    const headline = data?.layout?.layout_settings?.statusPage?.globalStatusHeadline ?? "";
    const lc = headline.toLowerCase();
    let status: StatusIndicator = "operational";
    if (lc.includes("outage") || lc.includes("major")) status = "major_outage";
    else if (lc.includes("partial") || lc.includes("degraded") || lc.includes("incident")) status = "partial_outage";
    else if (lc.includes("maintenance")) status = "maintenance";
    else if (lc.includes("issue") || lc.includes("investigating")) status = "partial_outage";
    return { id: svc.id, name: svc.name, status, description: headline || "All Systems Operational", last_checked: now, source_url: svc.page_url };
  } catch (err) {
    return { id: svc.id, name: svc.name, status: "unknown",
      description: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      last_checked: now, source_url: svc.page_url };
  }
}

async function fetchFresh(svc: ServiceConfig): Promise<ServiceStatus> {
  if (svc.type === "gcp") return fetchGCPStatus(svc);
  if (svc.type === "slack") return fetchSlackStatus(svc);
  if (svc.type === "azure") return fetchAzureStatus(svc);
  if (svc.type === "aws") return fetchAWSStatus(svc);
  if (svc.type === "incidentio") return fetchIncidentIOStatus(svc);
  if (svc.type === "pagerduty") return fetchPagerDutyStatus(svc);
  return fetchStatuspageStatus(svc);
}

async function getServiceStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  const cached = getCached(svc.id);
  if (cached) return cached;
  const result = await fetchFresh(svc);
  setCache(result);
  return result;
}

function statusEmoji(s: StatusIndicator): string {
  switch (s) {
    case "operational": return "✅";
    case "degraded": return "🟡";
    case "partial_outage": return "🟠";
    case "major_outage": return "🔴";
    case "maintenance": return "🔧";
    default: return "❓";
  }
}

function formatServiceStatus(s: ServiceStatus): string {
  return (
    `${statusEmoji(s.status)} **${s.name}** (${s.id})\n` +
    `   Status: ${s.status.replace(/_/g, " ")}\n` +
    `   ${s.description}\n` +
    `   Checked: ${s.last_checked}\n` +
    `   Source: ${s.source_url}`
  );
}

const server = new Server(
  { name: "statuscraft", version: "1.7.3" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_status",
      description:
        "Check the live status of a specific service (e.g. 'github', 'openai', 'stripe'). Returns operational/degraded/partial_outage/major_outage/maintenance.",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description:
              "Service ID or name (e.g. 'github', 'openai', 'stripe', 'cloudflare'). Use list_services to see all available IDs.",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "get_all_status",
      description:
        "Check the live status of ALL tracked services at once. Returns a summary grouped by status — useful for a quick health check across the stack.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "list_services",
      description:
        "List all services tracked by StatusCraft, with their IDs and tags. Use this to discover service IDs for get_status.",
      inputSchema: {
        type: "object",
        properties: {
          filter_tag: {
            type: "string",
            description:
              "Optional tag filter. E.g. 'ai', 'payments', 'hosting', 'monitoring', 'communication'. Returns only services matching this tag.",
          },
        },
        required: [],
      },
    },
    {
      name: "check_multiple",
      description:
        "Check the live status of a specific list of services in parallel. Faster than calling get_status repeatedly.",
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
      description:
        "Force a fresh live fetch for one or all services, bypassing the 60-second cache. Use this when you need the absolute latest status — e.g. during an active incident or immediately after a known outage ends.",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Optional: service ID to refresh (e.g. 'github'). If omitted, refreshes all 300 services.",
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

    const lines = filtered.map(
      (s) => `• **${s.name}** (id: \`${s.id}\`) — tags: ${s.tags.join(", ")}\n  Status page: ${s.page_url}`
    );
    const header = filterTag
      ? `Services tagged "${filterTag}" (${filtered.length}):`
      : `All tracked services (${filtered.length}):`;

    return {
      content: [{ type: "text", text: `${header}\n\n${lines.join("\n\n")}` }],
    };
  }

  if (name === "get_status") {
    const query = String(args!.service).toLowerCase().trim();
    const svc =
      SERVICES.find((s) => s.id === query) ||
      SERVICES.find((s) => s.name.toLowerCase() === query) ||
      SERVICES.find((s) => s.name.toLowerCase().includes(query));

    if (!svc) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown service: "${args!.service}". Use list_services to see all available service IDs.`,
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

    const grouped: Record<StatusIndicator, ServiceStatus[]> = {
      major_outage: [],
      partial_outage: [],
      degraded: [],
      maintenance: [],
      unknown: [],
      operational: [],
    };
    for (const r of results) grouped[r.status].push(r);

    const sections: string[] = [];

    const issueStatuses: StatusIndicator[] = ["major_outage", "partial_outage", "degraded", "maintenance", "unknown"];
    const hasIssues = issueStatuses.some((k) => grouped[k].length > 0);

    if (hasIssues) {
      for (const key of issueStatuses) {
        if (grouped[key].length === 0) continue;
        const label = key.replace(/_/g, " ").toUpperCase();
        sections.push(
          `### ${statusEmoji(key)} ${label}\n` +
          grouped[key].map((s) => `• **${s.name}**: ${s.description}`).join("\n")
        );
      }
    }

    const opCount = grouped.operational.length;
    const total = results.length;
    const summary = hasIssues
      ? `**${opCount}/${total} services operational.** Issues detected — see above.`
      : `**All ${total} services operational.** ✅`;

    sections.unshift(summary);

    if (opCount > 0 && hasIssues) {
      sections.push(
        `### ✅ OPERATIONAL (${opCount})\n` +
        grouped.operational.map((s) => `• ${s.name}`).join(", ")
      );
    }

    const checkedAt = results[0]?.last_checked ?? new Date().toISOString();
    sections.push(`_Checked at ${checkedAt}_`);

    return {
      content: [{ type: "text", text: sections.join("\n\n") }],
    };
  }

  if (name === "check_multiple") {
    const ids = (args!.services as string[]).map((s) => String(s).toLowerCase().trim());
    const resolved = ids.map((id) => {
      const svc =
        SERVICES.find((s) => s.id === id) ||
        SERVICES.find((s) => s.name.toLowerCase() === id) ||
        SERVICES.find((s) => s.name.toLowerCase().includes(id));
      return { id, svc };
    });

    const unknown = resolved.filter((r) => !r.svc).map((r) => r.id);
    const toFetch = resolved.filter((r) => r.svc) as { id: string; svc: ServiceConfig }[];

    const results = await Promise.all(toFetch.map((r) => getServiceStatus(r.svc)));
    const lines = results.map(formatServiceStatus);

    if (unknown.length > 0) {
      lines.push(
        `\n⚠️ Unrecognized service ID(s): ${unknown.join(", ")}. Use list_services to see available IDs.`
      );
    }

    return {
      content: [{ type: "text", text: lines.join("\n\n") }],
    };
  }

  if (name === "refresh_status") {
    const serviceId = args?.service ? String(args.service).toLowerCase().trim() : null;

    if (serviceId) {
      const svc =
        SERVICES.find((s) => s.id === serviceId) ||
        SERVICES.find((s) => s.name.toLowerCase() === serviceId) ||
        SERVICES.find((s) => s.name.toLowerCase().includes(serviceId));
      if (!svc) {
        return {
          content: [{ type: "text", text: `Unknown service: "${args!.service}". Use list_services to see available IDs.` }],
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
