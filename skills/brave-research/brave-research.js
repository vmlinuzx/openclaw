#!/usr/bin/env node

/**
 * Brave Research helper
 * Lightweight sidecar script for multi-pass Brave Search queries.
 * Usage: node brave-research.js --query "topic" [--follow "sub-question"] [--count 6]
 */

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const MAX_COUNT = 10;

function showHelp() {
  console.log(`Brave research helper\n\n` +
    `Required env: BRAVE_API_KEY\n\n` +
    `Flags:\n` +
    `  -q, --query <text>      Primary query (required)\n` +
    `  -f, --follow <text>     Follow-up query (repeatable)\n` +
    `  -c, --count <1-10>      Results per query (default 6)\n` +
    `      --freshness <pd|pw|pm|py|YYYY-MM-DDtoYYYY-MM-DD>\n` +
    `      --country <code>    Country code (default US)\n` +
    `      --lang <code>       Search language hint (e.g., en)\n` +
    `      --json              JSON output instead of Markdown\n` +
    `  -h, --help              Show this help\n`);
}

function parseArgs(argv) {
  const opts = {
    query: "",
    followups: [],
    count: 6,
    country: "US",
    lang: undefined,
    freshness: undefined,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-q":
      case "--query":
        opts.query = argv[++i] ?? "";
        break;
      case "-f":
      case "--follow":
        opts.followups.push(argv[++i] ?? "");
        break;
      case "-c":
      case "--count": {
        const val = Number(argv[++i]);
        if (!Number.isNaN(val) && val >= 1 && val <= MAX_COUNT) {
          opts.count = val;
        }
        break;
      }
      case "--country":
        opts.country = (argv[++i] ?? "US").toUpperCase();
        break;
      case "--lang":
        opts.lang = argv[++i] ?? undefined;
        break;
      case "--freshness":
        opts.freshness = argv[++i] ?? undefined;
        break;
      case "--json":
        opts.json = true;
        break;
      case "-h":
      case "--help":
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown flag: ${arg}`);
        showHelp();
        process.exit(1);
    }
  }

  if (!opts.query) {
    showHelp();
    process.exit(1);
  }

  return opts;
}

async function braveSearch({ query, count, country, lang, freshness, apiKey }) {
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(1, count), MAX_COUNT)),
    country,
  });

  if (lang) {
    params.set("search_lang", lang);
  }

  if (freshness) {
    params.set("freshness", freshness);
  }

  const resp = await fetch(`${BRAVE_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Brave API ${resp.status}: ${text || resp.statusText}`);
  }

  const data = await resp.json();
  const results = data?.web?.results ?? [];
  return results
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      title: item.title ?? item.url ?? "(untitled)",
      url: item.url ?? "",
      description: item.description ?? item.snippet ?? "",
      age: item.age ?? "",
    }));
}

function formatMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    lines.push(`## ${block.query}`);
    if (block.results.length === 0) {
      lines.push("No results.\n");
      continue;
    }
    block.results.forEach((res, idx) => {
      const age = res.age ? ` • ${res.age}` : "";
      lines.push(`${idx + 1}. [${res.title}](${res.url})${age}`);
      if (res.description) {
        lines.push(`   - ${res.description}`);
      }
    });
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = (process.env.BRAVE_API_KEY || "").trim();
  if (!apiKey) {
    console.error("Missing BRAVE_API_KEY env var");
    process.exit(1);
  }

  const queries = [opts.query, ...opts.followups.filter(Boolean)];
  const blocks = [];

  for (const query of queries) {
    const results = await braveSearch({
      query,
      count: opts.count,
      country: opts.country,
      lang: opts.lang,
      freshness: opts.freshness,
      apiKey,
    });
    blocks.push({ query, results });
  }

  if (opts.json) {
    console.log(JSON.stringify({ queries: blocks }, null, 2));
    return;
  }

  console.log(formatMarkdown(blocks));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

