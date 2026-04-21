# BMAD MCP Server

<div align="center">

[![npm version](https://badge.fury.io/js/bmad-mcp-server.svg)](https://www.npmjs.com/package/bmad-mcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A Model Context Protocol server that brings the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) to AI assistants.

[Features](#features) • [Installation](#installation) • [Docker Deployment](#docker-deployment) • [Usage](#usage) • [Documentation](#documentation)

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

| Variable       | Default  | Description                                         |
| -------------- | -------- | --------------------------------------------------- |
| `PORT`         | `3000`   | HTTP port the server listens on                     |
| `BMAD_API_KEY` | _(none)_ | API key for authentication — set this in production |
| `BMAD_ROOT`    | _(auto)_ | Override project root for local BMAD content        |
| `BMAD_DEBUG`   | `false`  | Enable verbose debug logging                        |

### Pinning a BMAD Version

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
