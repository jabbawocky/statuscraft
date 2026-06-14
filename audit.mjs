// Quick audit script - tests all service fetchers and reports broken ones
// Import the compiled module by intercepting — just parse service configs from dist/index.js
import { readFileSync } from 'fs';

const src = readFileSync('./dist/index.js', 'utf-8');

// Find start line of SERVICES array
const startIdx = src.indexOf('const SERVICES = [');
const arrStart = src.indexOf('[', startIdx);

// Find the closing ]; by counting brackets
let depth = 0;
let arrEnd = -1;
for (let i = arrStart; i < src.length; i++) {
  if (src[i] === '[') depth++;
  else if (src[i] === ']') {
    depth--;
    if (depth === 0) { arrEnd = i; break; }
  }
}
const arrSrc = src.slice(arrStart, arrEnd + 1);

// Eval within a safe module context
const SERVICES = (0, eval)(arrSrc);
console.log(`Loaded ${SERVICES.length} services`);

async function testService(svc) {
  const start = Date.now();
  try {
    const headers = { "User-Agent": "Mozilla/5.0 StatusCraft/1.0" };
    if (svc.type === "azure") {
      headers.Accept = "application/rss+xml, application/xml, text/xml";
    } else if (svc.type === "pagerduty" || svc.type === "incidentio") {
      headers.Accept = "text/html";
    } else {
      headers.Accept = "application/json";
    }

    const res = await fetch(svc.status_url, {
      signal: AbortSignal.timeout(8000),
      headers,
    });
    const elapsed = Date.now() - start;

    if (!res.ok) {
      return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `HTTP ${res.status}`, elapsed };
    }

    if (svc.type === "statuspage") {
      const text = await res.text();
      if (text.trim().startsWith('<')) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: "Got HTML instead of JSON", elapsed };
      }
      let data;
      try { data = JSON.parse(text); } catch(e) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `JSON parse: ${e.message}`, elapsed };
      }
      if (!data.status?.indicator) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `Missing status.indicator, keys: ${Object.keys(data).join(',')}`, elapsed };
      }
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, indicator: data.status.indicator, elapsed };
    }

    if (svc.type === "slack") {
      let data;
      try { data = await res.json(); } catch(e) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `JSON: ${e.message}`, elapsed };
      }
      if (typeof data.active_incidents === "undefined") {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `Missing active_incidents`, elapsed };
      }
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    if (svc.type === "heroku") {
      let data;
      try { data = await res.json(); } catch(e) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `JSON: ${e.message}`, elapsed };
      }
      if (!Array.isArray(data.status)) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `Missing .status array`, elapsed };
      }
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    if (svc.type === "statusio") {
      let data;
      try { data = await res.json(); } catch(e) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `JSON: ${e.message}`, elapsed };
      }
      if (!data.result?.status_overall) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `Missing result.status_overall`, elapsed };
      }
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    if (svc.type === "gcp") {
      let data;
      try { data = await res.json(); } catch(e) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `JSON: ${e.message}`, elapsed };
      }
      if (!Array.isArray(data)) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `Expected array got ${typeof data}`, elapsed };
      }
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    if (svc.type === "aws") {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let text;
      if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder("utf-16be").decode(buf.slice(2));
      else if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder("utf-16le").decode(buf.slice(2));
      else text = new TextDecoder("utf-8").decode(buf);
      try {
        JSON.parse(text);
        return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
      } catch(e) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: `AWS parse: ${e.message}`, elapsed };
      }
    }

    if (svc.type === "azure") {
      const xml = await res.text();
      const ok = xml.includes('<rss') || xml.includes('<feed') || xml.includes('<?xml') || xml.includes('<channel');
      if (!ok) return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: "Not XML", elapsed };
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    if (svc.type === "pagerduty") {
      const html = await res.text();
      if (!html.includes('<script id="data"')) {
        return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: "No embedded data script", elapsed };
      }
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    if (svc.type === "incidentio") {
      const html = await res.text();
      const ok = /fully operational|all systems|experiencing|investigating|outage|degraded|not aware/i.test(html);
      if (!ok) return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: "Status text not in HTML", elapsed };
      return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
    }

    return { id: svc.id, name: svc.name, type: svc.type, ok: true, elapsed };
  } catch(e) {
    const elapsed = Date.now() - start;
    return { id: svc.id, name: svc.name, type: svc.type, url: svc.status_url, ok: false, reason: e.message, elapsed };
  }
}

// Run in batches of 40 concurrent requests
const BATCH = 40;
const results = [];
for (let i = 0; i < SERVICES.length; i += BATCH) {
  const batch = SERVICES.slice(i, i + BATCH);
  const batchResults = await Promise.all(batch.map(testService));
  results.push(...batchResults);
  process.stdout.write(`\rProgress: ${Math.min(i + BATCH, SERVICES.length)}/${SERVICES.length}    `);
}
console.log("\n");

const broken = results.filter(r => !r.ok);
const working = results.filter(r => r.ok);

console.log(`=== AUDIT RESULTS ===`);
console.log(`Total: ${results.length} | Working: ${working.length} | Broken: ${broken.length}`);

if (broken.length > 0) {
  console.log(`\n=== BROKEN FETCHERS (${broken.length}) ===`);
  for (const r of broken.sort((a,b) => a.reason.localeCompare(b.reason))) {
    console.log(`  ${r.id} (${r.name}) [${r.type}]`);
    console.log(`    Reason: ${r.reason}`);
    console.log(`    URL: ${r.url}`);
  }
}
