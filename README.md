# API docs

Kill Bill API documentation.

The site is built using [Middleman](https://github.com/middleman/middleman). See also https://github.com/slatedocs/slate.

## Accessing Kill Bill Docs from AI Assistants (MCP)

Kill Bill provides a **Model Context Protocol (MCP) server** that allows AI assistants to retrieve accurate, up-to-date documentation directly from our official docs corpus.

Instead of relying on potentially outdated training data or web scraping, MCP enables assistants to search and fetch documentation through a deterministic API.

This results in:

- more accurate answers
- fewer hallucinations
- version-aware documentation retrieval
- better code generation and testing workflows

---

### Server Information

The Kill Bill MCP server is hosted privately and backed by the same artifacts used to generate this documentation site.

**Endpoint**

```

[https://apidocs-mcp.killbill.io](https://apidocs-mcp.killbill.io)

````

**Available tools**

| Tool | Description |
|--------|-------------|
| `searchDocs` | Finds relevant documentation sections |
| `fetchDoc` | Retrieves the full content of a section |

The server is read-only and optimized for fast retrieval.

---

### Example: Claude Desktop Configuration

Add the server to your Claude MCP configuration:

```json
{
  "mcpServers": {
    "killbill-docs": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://apidocs-mcp.killbill.io"
      ]
    }
  }
}
````

After restarting Claude, you can ask questions like:

> "How do I create a subscription in Kill Bill?"
> "Show me an example catalog."
> "Explain invoice generation flow."

Claude will automatically pull from the official docs.

## Edit and Syntax

The documentation is in the `source/includes` directory.

Markdown syntax: https://github.com/slatedocs/slate/wiki/Markdown-Syntax

## Development

To run the site locally:

```
middleman server
```

Prerequisites:

* Install Ruby (use [RVM](https://rvm.io/) or [RubyInstaller](https://rubyinstaller.org/))
* Run `bundle install`

## Deployment

To generate the files:

```
middleman build
```

Notes:

* The generated static pages under `build` are deployed by Cloudflare (https://apidocs.killbill.io/)
* The built pages are also pushed to the `gh-pages` branch for debugging (served by GitHub pages at https://killbill.github.io/slate/ for backward compatibility)
* Minification of assets is handled by Cloudflare (check-in the unminified version)

## LLM Artifacts

The build generates machine-consumable artifacts for LLM retrieval and MCP servers. These are produced automatically during the normal build process and deployed alongside the HTML site.

| File | Purpose | Format |
|------|---------|--------|
| [`docs.jsonl`](https://apidocs.killbill.io/docs.jsonl) | Retrieval corpus — chunked by heading | Newline-delimited JSON |
| [`docs-index.json`](https://apidocs.killbill.io/docs-index.json) | Lightweight search pre-filter | JSON array |
| [`llms.txt`](https://apidocs.killbill.io/llms.txt) | Machine-readable site descriptor | Plain text |

### Chunk Schema (`docs.jsonl`)

Each line is a JSON object representing one retrieval chunk:

```json
{
  "id": "catalog-upload-a-catalog-as-xml",
  "title": "Upload a catalog as XML",
  "url": "https://apidocs.killbill.io/catalog.html#upload-a-catalog-as-xml",
  "section": "Catalog",
  "version": "latest",
  "headings": ["Catalog", "Catalog", "Upload a catalog as XML"],
  "content": "...clean markdown...",
  "keywords": ["catalog", "upload", "xml"],
  "lastUpdated": "2026-02-12"
}
```

Chunks are split on H2/H3 boundaries, targeting 400–1200 tokens. Code blocks and tables are never split.

### Search Index Schema (`docs-index.json`)

```json
{
  "id": "...",
  "title": "...",
  "url": "...",
  "keywords": [],
  "summary": "1-2 sentence description",
  "headings": []
}
```

### Generating locally

```
bundle exec middleman build --clean
npm ci
node scripts/generate-llm-artifacts.js
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://apidocs.killbill.io` | Canonical site URL for absolute links |
| `VERSION` | `latest` | Version string embedded in every chunk |
