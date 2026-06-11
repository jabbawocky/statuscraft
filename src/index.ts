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
}

interface ServiceConfig {
  id: string;
  name: string;
  tags: string[];
  status_url: string;
  page_url: string;
  type: "statuspage" | "gcp" | "aws_rss";
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
    type: "statuspage",
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

    return {
      id: svc.id,
      name: svc.name,
      status: normalizeStatuspageIndicator(indicator),
      description,
      last_checked: now,
      source_url: svc.page_url,
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

async function getServiceStatus(svc: ServiceConfig): Promise<ServiceStatus> {
  if (svc.type === "gcp") return fetchGCPStatus(svc);
  return fetchStatuspageStatus(svc);
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
  { name: "statuscraft", version: "1.0.0" },
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

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
