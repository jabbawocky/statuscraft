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
  type: "statuspage" | "gcp" | "slack" | "azure" | "aws" | "incidentio";
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
    status_url: "https://www.anthropicstatus.com/api/v2/status.json",
    page_url: "https://www.anthropicstatus.com",
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
    status_url: "https://status.stripe.com/api/v2/status.json",
    page_url: "https://status.stripe.com",
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
    status_url: "https://status.pagerduty.com/api/v2/status.json",
    page_url: "https://status.pagerduty.com",
    type: "statuspage",
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
    name: "Google AI",
    tags: ["ai", "llm", "api"],
    status_url: "https://status.ai.google/api/v2/status.json",
    page_url: "https://status.ai.google",
    type: "statuspage",
  },
  {
    id: "aws",
    name: "AWS",
    tags: ["cloud", "infrastructure", "hosting"],
    status_url: "https://status.aws.amazon.com/data.json",
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
    status_url: "https://status.railway.app/api/v2/status.json",
    page_url: "https://status.railway.app",
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
    id: "render",
    name: "Render",
    tags: ["hosting", "infrastructure", "devtools"],
    status_url: "https://status.render.com/api/v2/status.json",
    page_url: "https://status.render.com",
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
    // AWS Service Health Dashboard public JSON (no auth required)
    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { current?: unknown[]; archive?: unknown[] };
    const activeIncidents = Array.isArray(data.current) ? data.current : [];
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

async function fetchFresh(svc: ServiceConfig): Promise<ServiceStatus> {
  if (svc.type === "gcp") return fetchGCPStatus(svc);
  if (svc.type === "slack") return fetchSlackStatus(svc);
  if (svc.type === "azure") return fetchAzureStatus(svc);
  if (svc.type === "aws") return fetchAWSStatus(svc);
  if (svc.type === "incidentio") return fetchIncidentIOStatus(svc);
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
  { name: "statuscraft", version: "1.4.0" },
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
            description: "Optional: service ID to refresh (e.g. 'github'). If omitted, refreshes all 27 services.",
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
