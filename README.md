# StatusCraft — MCP Service Status Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

> **MCP server that checks the live status of major software services in real time.** Ask your AI agent "is GitHub down?" or "check all my stack services" — and get a live answer pulled directly from official status pages.

**Install:** `npx -y github:jabbawocky/statuscraft` (no API key needed)  
**Works with:** Claude Desktop, Claude Code, Cursor, Windsurf, any MCP-compatible client

---

## What it does

StatusCraft gives your AI client 4 tools that fetch live status from 19 major services:

| Tool | What it does |
|---|---|
| `get_status` | Check one service by name or ID — returns operational/degraded/partial_outage/major_outage/maintenance |
| `get_all_status` | Check all 27 services at once, grouped by status — instant full-stack health check (cached for 60s) |
| `list_services` | List all tracked services with IDs and tags — filter by category (ai, payments, hosting…) |
| `check_multiple` | Check a specific list of services in parallel |
| `refresh_status` | Force a live fetch bypassing the cache — useful during active incidents |

---

## Services tracked (19)

| ID | Service | Tags |
|---|---|---|
| `anthropic` | Anthropic | ai, llm, api |
| `openai` | OpenAI | ai, llm, api |
| `github` | GitHub | devtools, git, hosting |
| `stripe` | Stripe | payments, fintech, api |
| `cloudflare` | Cloudflare | cdn, dns, security, infrastructure |
| `discord` | Discord | communication, chat |
| `netlify` | Netlify | hosting, cdn, deployment, jamstack |
| `vercel` | Vercel | hosting, deployment, jamstack, frontend |
| `linear` | Linear | project-management, devtools |
| `notion` | Notion | productivity, docs |
| `slack` | Slack | communication, chat |
| `pagerduty` | PagerDuty | monitoring, ops, alerting |
| `datadog` | Datadog | monitoring, observability, ops |
| `twilio` | Twilio | communications, api, sms |
| `sendgrid` | SendGrid | email, api |
| `heroku` | Heroku | hosting, paas, deployment |
| `render` | Render | hosting, paas, deployment |
| `fly` | Fly.io | hosting, paas, deployment |
| `google_cloud` | Google Cloud | cloud, infrastructure, hosting |

All Statuspage-based services pull from the official `/api/v2/status.json` endpoint. Google Cloud uses the incidents JSON feed. Results are cached in-memory for 60 seconds — use `refresh_status` to force a live fetch.

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
- *"Are Stripe and SendGrid both operational?"*
- *"Which AI services are having issues?"*
- *"Show me all monitoring services"*
- *"Check openai, anthropic, and github status"*

---

## Status values

| Value | Meaning |
|---|---|
| `operational` | All systems normal |
| `degraded` | Performance issues, minor disruption |
| `partial_outage` | Some features or regions affected |
| `major_outage` | Widespread outage |
| `maintenance` | Scheduled maintenance in progress |
| `unknown` | Could not reach status page |

---

## Adding new services

StatusCraft uses a simple service registry in `src/index.ts`. Most services that run Statuspage expose a standard `/api/v2/status.json` endpoint — adding a new service is a 6-line entry:

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

PRs welcome.

---

## Requirements

- Node.js 18+
- Claude Desktop or any MCP-compatible client

---

## License

MIT
