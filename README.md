# BMAD MCP Server

<div align="center">

[![npm version](https://badge.fury.io/js/bmad-mcp-server.svg)](https://www.npmjs.com/package/bmad-mcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes the [BMAD Method](https://github.com/Alpharages/BMAD-METHOD) to any MCP-capable AI client.

[Quick start](#quick-start) · [Usage](#usage) · [ClickUp](#clickup-integration) · [Custom skills](#custom-skills) · [Self-hosting](#self-hosting-http) · [Configuration](#configuration) · [Documentation](#documentation)

</div>

---

## Overview

BMAD MCP Server gives MCP clients — Claude Desktop, Claude Code, VS Code Copilot, Cline, and others — universal access to the BMAD methodology through a single unified `bmad` tool: **6 specialized agents** and **29 automated workflows**. Configure it once and use it across every project, with no per-project file copying.

- **BMAD** is a software-development methodology built around role-specialized AI agents (Analyst, Architect, Developer, UX Designer, PM, Tech Writer) and pre-built workflows for common tasks (PRD, architecture, debugging, ATDD, and more).
- **Why MCP?** One installation serves every project, the methodology stays consistent, nothing clutters your repos, and updates are centralized.

An optional **ClickUp integration** turns BMAD into an end-to-end delivery loop — creating epics and stories, implementing them, and running code review and QA against live ClickUp tasks.

---

## Quick start

**Prerequisites:** Node.js 18+ (22.14.0 recommended — see `.nvmrc`) and an MCP-capable client.

Add this to your client's MCP configuration:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

On first run the server fetches BMAD content from the official [`Alpharages/BMAD-METHOD`](https://github.com/Alpharages/BMAD-METHOD) repository and caches it under `~/.bmad/cache/git/`. No separate install step is needed.

### Client setup

<details>
<summary><b>Claude Desktop</b></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows), add the snippet above, and restart Claude Desktop.

</details>

<details>
<summary><b>Claude Code (CLI)</b></summary>

```bash
claude mcp add bmad npx -- -y bmad-mcp-server --scope user
```

Use `--scope project` to share with your team via `.mcp.json`.

</details>

<details>
<summary><b>VS Code + GitHub Copilot</b></summary>

```json
{
  "github.copilot.chat.mcp.servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

Restart VS Code.

</details>

<details>
<summary><b>Cline</b></summary>

Open Cline's MCP settings and add the same `mcpServers` block shown in [Quick start](#quick-start).

</details>

### Alternate installs

```bash
# Global install
npm install -g bmad-mcp-server   # command: "bmad-mcp-server"

# From source
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server && npm install && npm run build
# command: "node", args: ["/abs/path/to/build/index.js"]
```

---

## Usage

Describe what you want in natural language and the model picks the right tool call:

```
"Have Mary analyze the market for a task-management SaaS."
"Start a PRD workflow for an inventory app."
"Get Winston to review this system design."
"Start party-mode with the planning team to brainstorm features."
```

The server exposes a single `bmad` tool with five operations:

| Operation           | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `list`              | Enumerate available agents and workflows                          |
| `read`              | Inspect an agent or workflow definition                           |
| `execute`           | Run an agent or workflow with context                             |
| `search`            | Search BMAD content                                               |
| `resolve-doc-paths` | Resolve PRD / architecture / epics paths via the doc-path cascade |

Direct tool calls (useful for scripts and testing):

```jsonc
{ "operation": "list",    "query": "agents" }
{ "operation": "read",    "type": "agent", "agent": "architect" }
{ "operation": "execute", "agent": "analyst",  "message": "..." }
{ "operation": "execute", "workflow": "prd",   "message": "..." }
```

### Agents

| Agent   | Role             | Load with     |
| ------- | ---------------- | ------------- |
| Mary    | Business Analyst | `analyst`     |
| Winston | System Architect | `architect`   |
| Amelia  | Developer        | `dev`         |
| Sally   | UX Designer      | `ux-designer` |
| John    | Product Manager  | `pm`          |
| —       | Tech Writer      | `tech-writer` |

Run `npm run cli:list-agents` for the live list.

### Workflows

29 workflows, including `prd`, `architecture`, `debug-inspect`, `atdd`, `ux-design`, and `party-mode`. Run `npm run cli:list-workflows` for the full list.

### Content resolution

BMAD content is loaded from the first source that matches, highest priority first:

1. `./bmad/` — project-local
2. `~/.bmad/` — user-global defaults
3. Git remotes passed as CLI args (cached under `~/.bmad/cache/git/`)
4. Official `Alpharages/BMAD-METHOD` repo (auto-fetched on first run)

To layer your own BMAD content over the defaults, append a Git URL to the args:

```json
"args": ["-y", "bmad-mcp-server", "git+https://github.com/your-org/custom-bmad.git#main"]
```

Set `BMAD_ROOT` to override the discovery root entirely.

---

## ClickUp integration

ClickUp tools are **additive** — the `bmad` tool works with or without them. The ClickUp surface is enabled when both an API key and team ID are supplied; otherwise the server runs in BMAD-only mode.

Credentials are supplied per transport:

| Transport             | How credentials are supplied                                            |
| --------------------- | ----------------------------------------------------------------------- |
| **stdio** (local/npx) | `env` block in the MCP client config, injected at process startup       |
| **HTTP** (shared)     | `X-ClickUp-*` request headers, read per-session and held in memory only |

A shared HTTP server therefore needs **no ClickUp credentials of its own** — each user brings their own key via headers.

**stdio example:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "CLICKUP_API_KEY": "pk_...",
        "CLICKUP_TEAM_ID": "12345678",
        "CLICKUP_MCP_MODE": "write"
      }
    }
  }
}
```

### Environment variables / headers

| Variable           | Header              | Purpose                                                            |
| ------------------ | ------------------- | ------------------------------------------------------------------ |
| `CLICKUP_API_KEY`  | `X-ClickUp-Api-Key` | Personal token from ClickUp → Settings → Apps (starts with `pk_`)  |
| `CLICKUP_TEAM_ID`  | `X-ClickUp-Team-Id` | Workspace/team ID (7–10 digits, visible in any settings URL)       |
| `CLICKUP_MCP_MODE` | `X-ClickUp-Mode`    | Tool surface: `read-minimal`, `read`, or `write` (default `write`) |

### Mode → tool surface

| Mode              | Tools registered                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `read-minimal`    | `getTaskById`, `searchTasks`                                                                                                        |
| `read`            | above + `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument`                                                             |
| `write` (default) | above + `addComment`, `updateTask`, `createTask`, `updateListInfo`, `createTimeEntry`, `updateDocumentPage`, `createDocumentOrPage` |

The session-scoped space picker (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace`) is available in all modes. The custom skills below require `write` mode.

> See [`docs/clickup-quickstart.md`](./docs/clickup-quickstart.md) for the full setup runbook — workspace layout, first-run walkthrough, and troubleshooting.

---

## Custom skills

Custom skills are ClickUp-integrated workflows layered on top of the BMAD agent/workflow engine. Unlike BMAD's built-in file-system workflows, they treat **ClickUp as the source of truth** — their output is ClickUp tasks, comments, and status transitions rather than local files. All require `CLICKUP_MCP_MODE=write`.

| Skill                        | Purpose                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `bmad-clickup-create-epic`   | Create a root-level epic in the Backlog list from your local epics file.                              |
| `bmad-clickup-create-story`  | Create a story (under an epic, or standalone) with BDD criteria composed by `bmad-create-story`.      |
| `bmad-clickup-create-bug`    | Create a structured bug ticket (repro / expected / actual / impact) from a free-form report.          |
| `bmad-clickup-dev-implement` | Implement a story from its task ID via `bmad-dev-story`, open a PR, and move the task to review.      |
| `bmad-clickup-code-review`   | Run an adversarial review of an implementation via `bmad-code-review` and transition the task status. |
| `bmad-clickup-qa`            | Run end-to-end QA (code-access + visual passes), post a QA report, and transition the task status.    |

Skills that read planning artifacts resolve the PRD, architecture, and epics paths through the **doc-path cascade** (per-project `.bmadmcp/config.toml` → BMAD config chain → `planning-artifacts/` default). Project-local pinning of ClickUp space/list IDs lives in `.bmadmcp/config.toml`; see [`.bmadmcp/config.example.toml`](./.bmadmcp/config.example.toml) for the schema, and [`CLAUDE.md`](./CLAUDE.md#doc-path-cascade) for the cascade details.

Skill source lives in `src/custom-skills/` — see [`src/custom-skills/README.md`](./src/custom-skills/README.md).

---

## Self-hosting (HTTP)

For shared team deployments, run the HTTP transport behind a reverse proxy.

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
cp .env.example .env   # set BMAD_API_KEY — no ClickUp vars needed here
docker compose up -d
```

The server starts on `http://localhost:3000`. ClickUp credentials are per-user (passed as `X-ClickUp-*` headers), so the server `.env` only needs `PORT`, `BMAD_API_KEY`, and optionally `BMAD_DEBUG`.

### Endpoints

| Endpoint      | Auth | Purpose                                       |
| ------------- | ---- | --------------------------------------------- |
| `GET /health` | No   | Health check                                  |
| `POST /mcp`   | Yes  | MCP Streamable HTTP transport                 |
| `GET /mcp`    | Yes  | SSE stream for server-to-client notifications |
| `DELETE /mcp` | Yes  | Close MCP session                             |

Authenticate with `Authorization: Bearer <key>` or `X-API-Key: <key>`. If `BMAD_API_KEY` is unset, the server runs in open mode (development only). SSE requires `proxy_buffering off` on your reverse proxy.

**Connect from Claude Code:**

```bash
claude mcp add --transport http bmad https://your-domain.com/mcp \
  --header "Authorization: Bearer YOUR_KEY" --scope user
```

Claude Desktop is stdio-only; bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote). Full reverse-proxy and version-pinning notes are in [`docs/clickup-quickstart.md`](./docs/clickup-quickstart.md).

---

## Configuration

| Variable               | Default       | Purpose                                                |
| ---------------------- | ------------- | ------------------------------------------------------ |
| `BMAD_ROOT`            | auto          | Override BMAD installation root                        |
| `BMAD_DEBUG`           | `false`       | Verbose logging via `src/utils/logger.ts`              |
| `BMAD_GIT_AUTO_UPDATE` | `true`        | Auto-refresh Git-cached BMAD content (CI sets `false`) |
| `BMAD_REQUIRE_CLICKUP` | unset         | `1`/`true` → hard-fail at boot if ClickUp vars missing |
| `BMAD_API_KEY`         | unset         | API key for the HTTP transport                         |
| `PORT`                 | `3000`        | HTTP port                                              |
| `NODE_ENV`             | `development` | `test` / `development` / `production`                  |

ClickUp variables are listed in [ClickUp integration](#clickup-integration). The canonical list lives in [`.env.example`](./.env.example).

---

## Architecture

```
AI client → MCP transport → Server → BMADEngine → ResourceLoader → BMAD content
```

`BMADEngine` (`src/core/bmad-engine.ts`) is **transport-agnostic** — it returns plain TypeScript objects rather than MCP types, so the same engine powers the MCP server, the CLI, and the tests.

```
src/
├── index.ts            # MCP (stdio) entry point
├── index-http.ts       # MCP (HTTP) entry point
├── cli.ts              # CLI entry point
├── server.ts           # MCP server class
├── core/
│   ├── bmad-engine.ts      # Transport-agnostic business logic
│   └── resource-loader.ts  # Multi-source content loader
├── tools/
│   ├── bmad-unified.ts     # Unified `bmad` tool
│   └── operations/         # list / read / execute / search handlers
└── utils/                  # logger, git-source-resolver
```

Full design details: [`docs/architecture.md`](./docs/architecture.md).

---

## Development

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
npm test
```

Common scripts:

```bash
npm run dev              # stdio mode, watch
npm run dev:http         # HTTP mode, watch
npm test                 # unit + integration
npm run test:coverage    # with coverage
npm run test:e2e         # end-to-end
npm run lint             # ESLint
npm run format           # Prettier
npm run cli:list-agents  # verify loaded agents
```

**Conventions:** [Conventional Commits](https://www.conventionalcommits.org/) (semantic-release derives version bumps automatically — do not bump `package.json` by hand); never call `console.*` directly (use `src/utils/logger.ts`); use `.js` extensions in TypeScript imports; mirror `src/` under `tests/unit/`.

Live-credential ClickUp smoke tests (`npm run smoke:clickup`, `smoke:clickup:http`, `smoke:clickup:cross-list`) are excluded from CI; see [`docs/development-guide.md`](./docs/development-guide.md).

---

## Contributing

1. Fork and branch off `main` (`feature/your-thing`).
2. Make your changes with tests.
3. Run `npm test && npm run lint`.
4. Commit using Conventional Commits.
5. Open a PR — the title is validated against the Conventional Commits format.

See [`docs/development-guide.md`](./docs/development-guide.md) for the full contributor flow.

---

## Documentation

- [Architecture](./docs/architecture.md)
- [API contracts](./docs/api-contracts.md)
- [Development guide](./docs/development-guide.md)
- [BMAD + ClickUp quickstart](./docs/clickup-quickstart.md)
- [Release process](./.github/RELEASE_PROCESS.md)

---

## Credits

This server was originally created by **[@mkellerman](https://github.com/mkellerman)** at [mkellerman/bmad-mcp-server](https://github.com/mkellerman/bmad-mcp-server) and is now maintained under the [Alpharages](https://github.com/Alpharages) organization. All credit for the original implementation, design, and architecture belongs to the original author.

It builds on the [BMAD Method](https://github.com/Alpharages/BMAD-METHOD) — all methodology, agents, and workflows are credited to that project.

## License

[ISC](LICENSE) © Alpharages and contributors.
</content>
</invoke>
