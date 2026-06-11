# StatusCraft — MCP Service Status Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

> **MCP server that checks the live status of major software services in real time.** Ask your AI agent "is GitHub down?" or "what's wrong with Sentry?" — and get a live answer pulled directly from official status pages, including full incident detail when something is broken.

**Install:** `npx -y github:jabbawocky/statuscraft` (no API key needed)  
**Works with:** Claude Desktop, Claude Code, Cursor, Windsurf, any MCP-compatible client

---

## What it does

StatusCraft gives your AI client 5 tools that fetch live status from **53 major services**:

| Tool | What it does |
|---|---|
| `get_status` | Check one service — returns normalized status + incident detail when non-operational |
| `get_all_status` | Check all 53 services at once, grouped by status (cached 60s) |
| `list_services` | List all tracked services with IDs and tags — filter by category |
| `check_multiple` | Check a specific list of services in parallel |
| `refresh_status` | Force a live re-fetch, bypassing the 60s cache — useful during active incidents |

### Incident detail

When a service is non-operational, StatusCraft automatically fetches the incidents API and returns structured detail alongside the status:

```json
{
  "id": "sentry",
  "name": "Sentry",
  "status": "degraded",
  "description": "Partially Degraded Service",
  "incident": {
    "name": "Notification delivery",
    "impact": "minor",
    "status": "monitoring",
    "started_at": "2026-06-11T09:50:38.604Z",
    "latest_update": "Notifications delivery is now close to fully functional. Root cause identified as a cloud provider issue — monitoring closely.",
    "affected_components": ["Notifications"]
  },
  "last_checked": "2026-06-11T13:20:00.000Z",
  "source_url": "https://status.sentry.io"
}
```

No extra latency when everything is green — the incident fetch only fires for non-operational services.

---

## Services tracked (53)

### AI & LLMs
| ID | Service |
|---|---|
| `anthropic` | Anthropic |
| `openai` | OpenAI |
| `google_ai` | Google AI |
| `cohere` | Cohere |
| `replicate` | Replicate |

### Cloud & Infrastructure
| ID | Service |
|---|---|
| `aws` | AWS |
| `azure` | Azure |
| `google_cloud` | Google Cloud |
| `digitalocean` | DigitalOcean |

### Hosting & Deployment
| ID | Service |
|---|---|
| `vercel` | Vercel |
| `netlify` | Netlify |
| `render` | Render |
| `fly` | Fly.io |
| `heroku` | Heroku |
| `railway` | Railway |

### Developer Tools & APIs
| ID | Service |
|---|---|
| `github` | GitHub |
| `postman` | Postman |
| `clerk` | Clerk |
| `launchdarkly` | LaunchDarkly |
| `linear` | Linear |
| `atlassian` | Atlassian |

### Databases
| ID | Service |
|---|---|
| `supabase` | Supabase |
| `neon` | Neon |
| `mongodb_atlas` | MongoDB Atlas |
| `planetscale` | PlanetScale |

### Payments & Fintech
| ID | Service |
|---|---|
| `stripe` | Stripe |
| `brex` | Brex |

### Communication & Messaging
| ID | Service |
|---|---|
| `slack` | Slack |
| `discord` | Discord |
| `twilio` | Twilio |
| `sendgrid` | SendGrid |
| `resend` | Resend |

### Observability & Monitoring
| ID | Service |
|---|---|
| `datadog` | Datadog |
| `sentry` | Sentry |
| `new_relic` | New Relic |
| `grafana_cloud` | Grafana Cloud |
| `pagerduty` | PagerDuty |

### Analytics & Data
| ID | Service |
|---|---|
| `segment` | Segment |
| `amplitude` | Amplitude |
| `mixpanel` | Mixpanel |

### CDN & Networking
| ID | Service |
|---|---|
| `cloudflare` | Cloudflare |
| `cloudinary` | Cloudinary |

### Productivity & Workspace
| ID | Service |
|---|---|
| `notion` | Notion |
| `airtable` | Airtable |
| `zapier` | Zapier |
| `hubspot` | HubSpot |
| `intercom` | Intercom |
| `shopify` | Shopify |

---

## Install

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "statuscraft": {
      "command": "npx",
      "args": ["-y", "github:jabbawocky/statuscraft"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add statuscraft npx -- -y github:jabbawocky/statuscraft
```

No API key required.

---

## Example prompts

- *"Is GitHub down right now?"*
- *"Check the status of all my services"*
- *"What's wrong with Sentry?"*
- *"Are Stripe and SendGrid both operational?"*
- *"Which AI services are having issues?"*
- *"Show me all observability services"*
- *"Check openai, anthropic, and github"*
- *"Is Grafana Cloud having a major outage?"*

---

## Status values

| Value | Meaning |
|---|---|
| `operational` | All systems normal |
| `degraded` | Performance issues or minor disruption |
| `partial_outage` | Some features or regions affected |
| `major_outage` | Widespread outage |
| `maintenance` | Scheduled maintenance in progress |
| `unknown` | Could not reach status page |

---

## Adding new services

Most services that run Statuspage expose a standard `/api/v2/status.json` endpoint — adding a new service is a 6-line entry in `src/index.ts`:

```typescript
{
  id: "myservice",
  name: "My Service",
  tags: ["hosting", "api"],
  status_url: "https://status.myservice.com/api/v2/status.json",
  page_url: "https://status.myservice.com",
  type: "statuspage",
}
```

Services using non-standard status pages (Azure RSS, AWS JSON, Slack, incident.io) use custom handler types already implemented in the codebase.

PRs welcome.

---

## Requirements

- Node.js 18+
- Claude Desktop or any MCP-compatible client

---

## License

MIT
