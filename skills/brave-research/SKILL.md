---
name: brave-research
description: Run deep research passes using the Brave Search API (sidecar helper that can run alongside built-in web search).
homepage: https://search.brave.com/
metadata:
  {
    "openclaw":
      {
        "emoji": "🦁",
        "requires": { "bins": ["node"], "env": ["BRAVE_API_KEY"] },
        "primaryEnv": "BRAVE_API_KEY",
      },
  }
---

# Brave Research (sidecar)

Multi-pass research helper that talks directly to the Brave Search API. It runs as a sidecar script so you can keep using the built-in `web_search` tool while also firing targeted follow-up searches for deeper dives.

## Setup

```bash
export BRAVE_API_KEY="your-key"
# Optional: persist for OpenClaw skills
openclaw config set skills."brave-research".env.BRAVE_API_KEY "$BRAVE_API_KEY"
```

## Quick Start

```bash
# Single query
node {baseDir}/brave-research.js --query "synthetic data compliance requirements" --count 8

# Multi-pass: seed + follow-ups
node {baseDir}/brave-research.js \
  --query "how searxng handles brave api" \
  --follow "brave search rate limits self-hosted" \
  --follow "brave search usage for research agents" \
  --freshness pd \
  --count 6

# JSON output for downstream processing
node {baseDir}/brave-research.js -q "open-source searxng frontends" --json
```

Flags

- `--query`, `-q` (required): primary research prompt
- `--follow`, `-f` (repeatable): follow-up sub-questions
- `--count`, `-c` (1-10, default 6): results per query
- `--freshness`: `pd`, `pw`, `pm`, `py`, or `YYYY-MM-DDtoYYYY-MM-DD`
- `--country` (default `US`): country code
- `--lang`: search language hint (e.g., `en`)
- `--json`: emit structured JSON instead of Markdown

## Conversation Flow (suggested)

1. Start broad: run the primary query to map the space.
2. Draft 2-3 follow-ups targeting gaps (recent news, implementation details, constraints).
3. Run follow-ups with `--freshness` when recency matters.
4. Present findings with titles + URLs; include short takeaways per query.
5. Keep citations: each bullet already links to the source.

## Notes

- Uses the same Brave API key as the core `tools.web.search`; sidecar keeps the core tool untouched.
- No extra dependencies—Node 18+ with built-in `fetch` is enough (Node 22 recommended).
- To combine with summarization, feed `--json` output into your preferred LLM/tooling.
