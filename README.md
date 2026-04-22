# BMAD MCP Server

<div align="center">

[![npm version](https://badge.fury.io/js/bmad-mcp-server.svg)](https://www.npmjs.com/package/bmad-mcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A Model Context Protocol server that brings the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) to AI assistants.

[Features](#features) • [Installation](#installation) • [Docker Deployment](#docker-deployment) • [ClickUp Integration](#clickup-integration) • [Usage](#usage) • [Documentation](#documentation)

</div>

---

## Overview

The BMAD MCP Server provides AI assistants with access to 11 specialized agents and 36+ automated workflows from the BMAD (Building Modern Apps Decisively) methodology. Configure once, use everywhere across all your projects.

**What is BMAD?**

BMAD is a comprehensive software development methodology with specialized AI agents for different roles (Business Analyst, Architect, Developer, UX Designer, etc.) and workflows for common tasks (PRD generation, architecture design, debugging, testing).

**Why MCP?**

Instead of copying BMAD files to every project, the MCP server provides universal access:

- ✅ Single installation serves all projects
- ✅ Consistent methodology everywhere
- ✅ No project clutter
- ✅ Easy updates

---

## Features

### Unified Tool Architecture

Single `bmad` tool with intelligent operations:

```typescript
// List available agents and workflows
{ operation: "list", query: "agents" }

// Read agent details (no execution)
{ operation: "read", type: "agent", agent: "analyst" }

// Execute agent with context
{ operation: "execute", agent: "analyst", message: "Help me..." }
```

### 11 Specialized Agents

| Agent      | Role             | Load with     |
| ---------- | ---------------- | ------------- |
| 📊 Mary    | Business Analyst | `analyst`     |
| 🏗️ Winston | System Architect | `architect`   |
| 💻 Amelia  | Developer        | `dev`         |
| 🎨 Sally   | UX Designer      | `ux-designer` |
| 🧪 Murat   | Test Architect   | `tea`         |
| 📋 John    | Product Manager  | `pm`          |
| 🔄 Bob     | Scrum Master     | `sm`          |
| 🐛 Diana   | Debug Specialist | `debug`       |
| ...        | [+3 more agents] |               |

### 36+ Automated Workflows

```bash
prd              # Product Requirements Document
architecture     # System architecture design
debug-inspect    # Comprehensive debugging
atdd             # Acceptance test generation
ux-design        # UX specifications
party-mode       # Multi-agent brainstorming
... and 30+ more
```

### MCP Capabilities

- **Tools** - Unified `bmad` tool for all operations
- **Resources** - Access BMAD files via `bmad://` URIs
- **Prompts** - Agents as native MCP prompts
- **Completions** - Smart autocomplete for arguments
- **Multi-source** - Project, user, and Git remote support

---

## Installation

### Prerequisites

- Node.js 18 or later
- An MCP-compatible client (Claude Desktop, VS Code with Copilot, Cline, etc.)

### Quick Start

**Option 1: npx (Recommended)**

Add to your MCP client configuration:

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

**Option 2: Global Installation**

```bash
npm install -g bmad-mcp-server
```

```json
{
  "mcpServers": {
    "bmad": {
      "command": "bmad-mcp-server"
    }
  }
}
```

**Option 3: Local Development**

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
```

```json
{
  "mcpServers": {
    "bmad": {
      "command": "node",
      "args": ["/absolute/path/to/bmad-mcp-server/build/index.js"]
    }
  }
}
```

### Client-Specific Setup

<details>
<summary><b>Claude Desktop</b></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop.

</details>

<details>
<summary><b>VS Code with GitHub Copilot</b></summary>

1. Install the latest GitHub Copilot extension
2. Open Settings (JSON)
3. Add to `github.copilot.chat.mcp.servers`:

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

4. Restart VS Code

</details>

<details>
<summary><b>Cline (VS Code Extension)</b></summary>

1. Open Cline settings
2. Add MCP server:

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

</details>

---

## Usage

### Natural Language Examples

Just ask your AI assistant naturally - it handles the MCP tool calls automatically:

**Agent Execution:**

```
You: "Ask Mary to analyze the market opportunity for a SaaS product"
→ AI executes: { operation: "execute", agent: "analyst", message: "..." }
→ Mary (Business Analyst) provides market analysis
```

**Workflow Execution:**

```
You: "Start a PRD workflow for a task management app"
→ AI executes: { operation: "execute", workflow: "prd", message: "..." }
→ John (Product Manager) guides you through PRD creation
```

**Debug Assistance:**

```
You: "Ask Diana to debug this script" (with code attached)
→ AI executes: { operation: "execute", agent: "debug", message: "..." }
→ Diana starts comprehensive debugging workflow
```

**Collaborative Problem Solving:**

```
You: "Start party-mode with the planning team to brainstorm features"
→ AI executes: { operation: "execute", workflow: "party-mode", message: "..." }
→ Multiple agents collaborate on brainstorming session
```

**Architecture Review:**

```
You: "Have Winston review this system design"
→ AI executes: { operation: "execute", agent: "architect", message: "..." }
→ Winston provides architectural guidance
```

### Direct MCP Tool Usage

You can also work with the tool directly (useful for development/testing):

**List available agents:**

```typescript
{
  "operation": "list",
  "query": "agents"
}
```

**Execute an agent:**

```typescript
{
  "operation": "execute",
  "agent": "analyst",
  "message": "Help me analyze the market for a SaaS product"
}
```

**Run a workflow:**

```typescript
{
  "operation": "execute",
  "workflow": "prd",
  "message": "Create PRD for task management app"
}
```

**Read agent details:**

```typescript
{
  "operation": "read",
  "type": "agent",
  "agent": "architect"
}
```

### Advanced Configuration

**Multi-source loading with Git remotes:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": [
        "-y",
        "bmad-mcp-server",
        "git+https://github.com/org/custom-bmad.git#main"
      ]
    }
  }
}
```

**Custom project root:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "BMAD_ROOT": "/custom/bmad/location"
      }
    }
  }
}
```

---

## Docker Deployment

Deploy the BMAD MCP Server as an HTTP service accessible over a domain — useful for teams sharing a single server instance.

### Quick Start

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
cp .env.example .env
```

Edit `.env` and set a strong API key:

```env
PORT=3000
BMAD_API_KEY=your-secret-key-here
BMAD_DEBUG=false
```

Then build and run:

```bash
docker compose up -d
```

The server starts on `http://localhost:3000`. BMAD content is automatically fetched from the official repository on first start and updated on each restart.

### Endpoints

| Endpoint      | Auth required | Description                                           |
| ------------- | ------------- | ----------------------------------------------------- |
| `GET /health` | No            | Health check — returns `{"status":"ok","sessions":N}` |
| `POST /mcp`   | Yes           | MCP Streamable HTTP transport                         |
| `GET /mcp`    | Yes           | SSE stream for server-to-client notifications         |
| `DELETE /mcp` | Yes           | Close MCP session                                     |

### Authentication

All `/mcp` requests require an API key via one of:

```
Authorization: Bearer your-secret-key-here
X-API-Key: your-secret-key-here
```

If `BMAD_API_KEY` is not set, the server runs in open mode (development only).

### Connecting AI Clients

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

Claude Desktop only supports stdio-based servers. Use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) as a local bridge.

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-domain.com/mcp",
        "--header",
        "Authorization: Bearer your-secret-key-here"
      ]
    }
  }
}
```

> **Note:** Replace `<you>` with your username and adjust the Node version to match what you have installed. Using `npx mcp-remote` or the `mcp-remote` bin directly will fail if Node 18 appears first in your PATH.

**Claude Code (CLI)**:

```bash
claude mcp add --transport http bmad https://your-domain.com/mcp \
  --header "Authorization: Bearer your-secret-key-here" \
  --scope user
```

Use `--scope project` instead to share with your team via `.mcp.json`.

**VS Code / Cline** (supports HTTP natively):

```json
{
  "mcpServers": {
    "bmad": {
      "url": "https://your-domain.com/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-key-here"
      }
    }
  }
}
```

### Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

> **Note:** `proxy_buffering off` is required for SSE streams to work correctly.

### Environment Variables

ClickUp env vars are optional by default — missing ClickUp vars soft-disable only the ClickUp tool surface. Set `BMAD_REQUIRE_CLICKUP=1` for deployments where ClickUp must be configured at boot. See `.env.example` for the canonical list of supported vars.

| Variable               | Default   | Description                                                                                                                            |
| ---------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                 | `3000`    | HTTP port the server listens on                                                                                                        |
| `BMAD_API_KEY`         | _(none)_  | API key for authentication — set this in production                                                                                    |
| `BMAD_ROOT`            | _(auto)_  | Override project root for local BMAD content                                                                                           |
| `BMAD_DEBUG`           | `false`   | Enable verbose debug logging                                                                                                           |
| `BMAD_REQUIRE_CLICKUP` | _(unset)_ | `1` or `true` → hard-fail at boot if ClickUp env vars missing. Default soft-disables ClickUp tools and keeps BMAD tools available.     |
| `CLICKUP_API_KEY`      | _(unset)_ | Per-user ClickUp personal token. Usually starts with `pk_`. See `.env.example`.                                                        |
| `CLICKUP_TEAM_ID`      | _(unset)_ | Workspace ID — 7–10 digit number. See `.env.example`.                                                                                  |
| `CLICKUP_MCP_MODE`     | `write`   | One of `read-minimal`, `read`, `write`. Controls which ClickUp tools are exposed (see upstream docs in `src/tools/clickup/README.md`). |

### Running the ClickUp Smoke Tests

A standalone smoke harness validates the full ClickUp CRUD round-trip (create task → comment → status update → read-back → cleanup) against a live workspace. It is **not** part of `npm test` or CI — it requires real ClickUp credentials and is gated behind explicit npm script entries.

**Prerequisites**

- A pre-created list in the target ClickUp workspace with at least two distinct statuses. Capture the list ID (last segment of the ClickUp list URL, or from the `getListInfo` tool output).
- A valid `CLICKUP_API_KEY` with permissions to create tasks, comment, update status, and DELETE tasks in that list.
- Run `npm run build` before the first smoke invocation — the harness spawns `build/index.js` and `build/index-http.js` as child processes.

**Commands**

```bash
# stdio transport
CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup

# HTTP transport (uses CLICKUP_SMOKE_PORT or defaults to 3456)
CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup:http
```

Run both commands to cover both transports.

**What it verifies**

The harness drives: `initialize` → `tools/list` → `getListInfo` → `createTask` → `getTaskById` → `addComment` → `updateTask(status)` → `getTaskById` → direct-API `DELETE` cleanup. This proves the ClickUp tool surface is correctly registered and functional end-to-end over the chosen transport.

**Expected output**

A single `SMOKE PASS transport=<t> task_id=<id> ...` line on stderr with exit code 0. A failing run prints `SMOKE FAIL transport=<t> step=<letter> reason="..."`.

**Cleanup**

On PASS the harness DELETEs the smoke task (unless `--keep-task` is passed). On FAIL between steps e and j the task may be left behind — search ClickUp for `[bmad-smoke]` to audit and hand-delete.

**Why it's not in CI**

The smoke test is intentionally excluded from CI because it requires live credentials, is subject to ClickUp rate limits, and depends on external infrastructure state. See the story's Dev Notes for the full rationale.

### Running the ClickUp cross-list subtask smoke test

One-paragraph explanation: this harness verifies [PRD §Risks R1](PRD.md#R1) — whether ClickUp accepts a story as a subtask of an epic when the two tasks live in different lists (story in sprint list, parent in backlog list per [PRD §ClickUp-layout](PRD.md#ClickUp-layout)). A PASS greenlights the EPIC-2 sprint-layout design; a FAIL means the layout needs redesign before Dev-agent story-creation plumbing depends on it.

**Prerequisites**

- Two pre-created lists in the target ClickUp workspace: one backlog list, one sprint list. Each MUST have at least one status. Lists MAY live in the same space or different spaces — the harness is agnostic.
- A valid `CLICKUP_API_KEY` with permissions to create tasks, set `parent_task_id`, and DELETE tasks in both lists.
- Run `npm run build` before the first smoke invocation — the harness spawns `build/index.js` as a child process.

**Command**

```bash
CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_BACKLOG_LIST_ID=... CLICKUP_SMOKE_SPRINT_LIST_ID=... npm run smoke:clickup:cross-list
```

**What it verifies**

- Epic created in backlog list
- Story created in sprint list with `parent_task_id=<epic-id>`
- `getTaskById(story)` reports `list.id == SPRINT_LIST_ID` AND `parent_task_id == EPIC_ID`
- `getTaskById(epic)` reports `storyId` in `child_task_ids`
- DELETE cleanup (child first, then parent)

**Expected output**

A single `SMOKE PASS cross-list epic_id=<id> story_id=<id> ...` line on stderr with exit code 0. A failing run prints `SMOKE FAIL cross-list step=<letter> reason="..."` + the failing request/response pair.

**Cleanup**

On PASS the harness DELETEs both tasks (unless `--keep-tasks`). On FAIL between steps f and j, one or both tasks may be left behind — search ClickUp for `[bmad-smoke-x]` to audit and hand-delete. Note the prefix differs from story 1.5's `[bmad-smoke]` for exactly this audit purpose.

**Why it's not in CI**

Excluded for the same reasons as the basic ClickUp smoke test — see [Why it's not in CI](#why-its-not-in-ci). Live credentials, rate limits, and external infrastructure non-determinism apply unchanged.

By default the server always pulls the latest BMAD content. To pin a specific version, override the `CMD` in `docker-compose.yml`:

```yaml
command:
  [
    'node',
    'build/index-http.js',
    'git+https://github.com/Alpharages/BMAD-METHOD.git#v6.0.0',
  ]
```

---

### Resource Discovery Priority

The server searches for BMAD content in this order:

1. **Project-local**: `./bmad/` (highest priority - project customizations)
2. **User-global**: `~/.bmad/` (personal defaults)
3. **Git remotes**: Cloned to `~/.bmad/cache/git/` (shared/team content)
4. **Package defaults**: Built-in BMAD files (always available)

---

## ClickUp Integration

ClickUp tools are additive — the unified `bmad` tool continues to work as before. The ClickUp surface is enabled when both `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` are set. Tool visibility depends on `CLICKUP_MCP_MODE`. When either env var is missing, the server logs `ClickUp tools disabled: ...` and keeps running in BMAD-only mode.

### Environment Variables

| Variable                   | Required | Purpose                                                                                                  | Default  |
| -------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | -------- |
| `CLICKUP_API_KEY`          | Yes      | Personal token from [ClickUp Settings → Apps](https://app.clickup.com/settings/apps) (starts with `pk_`) | _(none)_ |
| `CLICKUP_TEAM_ID`          | Yes      | Workspace / team ID (7–10 digits)                                                                        | _(none)_ |
| `CLICKUP_MCP_MODE`         | No       | Tool surface scope: `read-minimal`, `read`, or `write`                                                   | `write`  |
| `CLICKUP_PRIMARY_LANGUAGE` | No       | Tool description language: `de`, `en`, `fr`, `es`, `it`. Falls back to `$LANG`                           | `en`     |
| `MAX_IMAGES`               | No       | Max inline images per tool response                                                                      | `4`      |
| `MAX_RESPONSE_SIZE_MB`     | No       | Max response payload in MB                                                                               | `1`      |

`CLICKUP_PRIMARY_LANGUAGE` defaults to the first two characters of `$LANG` (e.g., `de_DE.UTF-8` → German tool descriptions). If `$LANG` is unset or unsupported, English is used.

### Mode → Tool Matrix

| Mode              | Tools registered                                                                                                                       | Resource template           | Notes                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------- |
| `read-minimal`    | `getTaskById`, `searchTasks`                                                                                                           | _(none)_                    | `registerSpaceResources` not called       |
| `read`            | above plus `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument`                                                             | `clickup://space/{spaceId}` | 6 tools total; `searchDocuments` pending† |
| `write` (default) | above plus `addComment`, `updateTask`, `createTask`, `updateListInfo`, `createTimeEntry`, `updateDocumentPage`, `createDocumentOrPage` | `clickup://space/{spaceId}` | 13 tools total                            |

† `searchDocuments` is not registered at vendored SHA `c79b21e3` (upstream placeholder — will activate automatically on re-vendor when upstream ships it).

`.trim().toLowerCase()` normalization accepts `"  Read  "` as `read`; unknown values fall through to `write` with a `stderr` warning.

### Example Client Config

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "CLICKUP_API_KEY": "pk_...",
        "CLICKUP_TEAM_ID": "12345678",
        "CLICKUP_MCP_MODE": "read"
      }
    }
  }
}
```

`CLICKUP_MCP_MODE=read` is shown as the default in the example — safer than `write` for first-run exploration.

### Docker Env-Var Pass-Through

When running via Docker (see [Docker Deployment](#docker-deployment) above), append the ClickUp keys to `docker-compose.yml`'s `environment:` map:

```yaml
environment:
  - BMAD_API_KEY=${BMAD_API_KEY}
  - CLICKUP_API_KEY=${CLICKUP_API_KEY}
  - CLICKUP_TEAM_ID=${CLICKUP_TEAM_ID}
  - CLICKUP_MCP_MODE=${CLICKUP_MCP_MODE:-read}
```

### Space Selection

The adapter registers three session-scoped picker tools (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace`) in all modes. The first interaction per session caches the chosen space; subsequent space-scoped calls honor that choice. The cache resets on process restart. Call `pickSpace` with no arguments to list all non-archived spaces, with `query` for fuzzy search, or with `spaceId` for an exact match.

### Cross-List Parent/Subtask

Stories live in the active Sprint list while their parent epic lives in the Backlog list. This cross-list `parent_task_id` relationship is verified by `npm run smoke:clickup:cross-list` (see below).

### `my-todos` Prompt

ClickUp adds an MCP prompt for triaging assigned tasks. The prompt text is German or English — `CLICKUP_PRIMARY_LANGUAGE=de` (or `$LANG=de_*`) selects German; all other values use English. Tool descriptions (not the prompt) honor all five language codes.

### Not Supported (This Phase)

- Jira/Linear integration — out of scope per [PRD §Non-goals](PRD.md)
- ClickUp custom fields — deferred to EPIC-5
- Bidirectional sync (two-way update with external systems) — out of scope
- Historical migration of existing tasks into BMAD — out of scope

---

## Documentation

- **[Architecture](./docs/architecture.md)** - System design and components
- **[API Contracts](./docs/api-contracts.md)** - MCP tools and TypeScript APIs
- **[Development Guide](./docs/development-guide.md)** - Contributing and testing
- **[Release Process](./.github/RELEASE_PROCESS.md)** - Release workflow for maintainers

---

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── cli.ts                # CLI entry point
├── server.ts             # MCP server implementation
├── core/
│   ├── bmad-engine.ts    # Core business logic
│   └── resource-loader.ts # Multi-source content loading
├── tools/
│   ├── bmad-unified.ts   # Unified tool implementation
│   └── operations/       # Operation handlers
├── types/                # TypeScript types
└── utils/                # Utilities
```

### npm Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # stdio mode with auto-restart
npm run dev:http       # HTTP mode with auto-restart
npm start              # Run compiled server (stdio/MCP)
npm run start:http     # Run compiled server (HTTP)
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:coverage  # Coverage report
npm run lint           # Check linting
npm run format         # Format code
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

---

## Architecture

### High-Level Overview

```
AI Assistant (Claude, Copilot, etc.)
         ↓ MCP Protocol
    MCP Server Layer
         ↓
    BMAD Engine (transport-agnostic)
         ↓
  Resource Loader (multi-source)
         ↓
   BMAD Content (agents, workflows)
```

### Key Components

- **Server**: MCP protocol implementation (tools, resources, prompts)
- **Engine**: Transport-agnostic business logic
- **Loader**: Multi-source content discovery and loading
- **Tools**: Unified `bmad` tool with modular operations

See [Architecture Documentation](./docs/architecture.md) for details.

---

## Contributing

We welcome contributions! Please see our [Development Guide](./docs/development-guide.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

ISC © [mkellerman](https://github.com/mkellerman)

---

## Credits

This MCP server is built on the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD). All methodology, agents, workflows, and best practices are credited to the original BMAD Method project.

---

## Links

- **Repository**: https://github.com/mkellerman/bmad-mcp-server
- **Issues**: https://github.com/mkellerman/bmad-mcp-server/issues
- **npm Package**: https://www.npmjs.com/package/bmad-mcp-server
- **BMAD Method**: https://github.com/bmad-code-org/BMAD-METHOD
- **MCP Specification**: https://modelcontextprotocol.io/
