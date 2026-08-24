# BMAD MCP Server

<div align="center">

Bring the [BMAD Method](https://github.com/Alpharages/BMAD-METHOD) to any
[Model Context Protocol](https://modelcontextprotocol.io/) client.

[![npm](https://img.shields.io/npm/v/bmad-mcp-server?logo=npm)](https://www.npmjs.com/package/bmad-mcp-server)
[![CI](https://github.com/Alpharages/bmad-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Alpharages/bmad-mcp-server/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](./.nvmrc)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)

[Getting started](#getting-started) · [Usage](#usage) ·
[ClickUp](#optional-clickup-integration) · [Self-hosting](#self-hosting) ·
[Contributing](#contributing)

</div>

BMAD MCP Server is an open-source TypeScript server that gives AI coding
clients one consistent interface to BMAD agents, workflows, and resources. It
works over local stdio or Streamable HTTP, automatically loads BMAD content,
and optionally adds ClickUp-backed delivery workflows.

## Why use it?

- **One installation, every project.** Keep BMAD outside individual
  repositories and update it centrally.
- **One MCP tool.** Discover, inspect, and execute the complete BMAD catalog
  through the unified `bmad` tool.
- **No manual BMAD setup.** The maintained BMAD fork is fetched and cached
  automatically on first run.
- **Extensible content.** Layer project, user, or Git-hosted BMAD content over
  the defaults.
- **Two transports.** Use stdio for local clients or Streamable HTTP for shared
  deployments.
- **Optional ClickUp delivery loop.** Create tickets, implement work, review
  code, and run QA while keeping ClickUp as the system of record.

<a id="quick-start"></a>
<a id="installation"></a>

## Getting started

### Prerequisites

- Node.js 22 (`22.14.0` is pinned in [`.nvmrc`](./.nvmrc))
- Git
- An MCP-compatible client

### Configure your MCP client

Add the following server definition to your client's MCP configuration:

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

Restart the client, then ask it to list the available BMAD agents or
workflows. On first use, the server downloads the maintained Alpharages BMAD
fork and caches it under `~/.bmad/cache/git/`.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add bmad npx -- -y bmad-mcp-server --scope user
```

Use `--scope project` to create a project-level configuration.

</details>

<details>
<summary><strong>Install globally</strong></summary>

```bash
npm install --global bmad-mcp-server
```

Then use `bmad-mcp-server` as the MCP server command.

</details>

<details>
<summary><strong>Run from source</strong></summary>

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
node build/index.js
```

</details>

## Usage

Use natural language; the MCP client chooses the appropriate operation:

```text
List the available BMAD agents.
Ask the analyst to assess the market for a task-management SaaS.
Start the PRD workflow for an inventory application.
Use the architect to review this system design.
```

The MCP server exposes one `bmad` tool with four operations:

| Operation | Purpose |
| --- | --- |
| `list` | Discover agents, workflows, modules, and resources |
| `read` | Load an agent, workflow, or resource definition |
| `execute` | Prepare an agent or workflow for execution with user context |
| `resolve-doc-paths` | Resolve planning-document paths for integrated workflows |

Example tool calls:

```jsonc
{ "operation": "list", "query": "agents" }
{ "operation": "read", "type": "agent", "agent": "architect" }
{ "operation": "execute", "workflow": "prd", "message": "Create a PRD for an inventory app" }
```

The catalog is loaded at runtime. Use `list` rather than relying on a fixed
agent or workflow count.

### Content sources

BMAD content is resolved in this order, with the first match winning:

1. Project-local `./bmad/`
2. User-global `~/.bmad/`
3. Git remotes passed to the server
4. The [`Alpharages/BMAD-METHOD`](https://github.com/Alpharages/BMAD-METHOD)
   fork

Add a custom Git source by appending it to the server arguments:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "bmad-mcp-server",
    "git+https://github.com/your-org/custom-bmad.git#main"
  ]
}
```

Set `BMAD_ROOT` when you need to override content discovery completely.

<a id="clickup-integration"></a>

## Optional ClickUp integration

ClickUp support is additive: without ClickUp credentials, the server continues
to provide the complete BMAD tool in BMAD-only mode.

For a local stdio client, add the credentials to its server configuration:

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

| Mode | Access |
| --- | --- |
| `read-minimal` | Task lookup and search |
| `read` | Read-only tasks, spaces, lists, time entries, and documents |
| `write` | Full read/write tool surface; required by custom skills |

The integration includes six BMAD 6.11 skills:

| Skill | Purpose |
| --- | --- |
| `bmad-clickup-create-epic` | Publish a planned epic to ClickUp |
| `bmad-clickup-create-story` | Create a planned or ad hoc story |
| `bmad-clickup-create-bug` | Turn a bug report into a structured ticket |
| `bmad-clickup-dev-implement` | Implement a ClickUp task and move it to review |
| `bmad-clickup-code-review` | Review an implementation and report the result |
| `bmad-clickup-qa` | Run existing tests and visual QA for a ticket |

See the [ClickUp quickstart](./docs/clickup-quickstart.md) for workspace setup,
skill triggers, safety behavior, and troubleshooting. The custom skill source
is documented in [`src/custom-skills`](./src/custom-skills/README.md).

> Never commit ClickUp tokens or other credentials. For shared HTTP
> deployments, credentials are supplied per session through request headers.

## Self-hosting

The HTTP transport is intended for shared deployments and should be placed
behind HTTPS in production.

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
cp .env.example .env
# Set a strong BMAD_API_KEY in .env
docker compose up --detach --build
```

The default endpoint is `http://localhost:3000/mcp`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Unauthenticated health check |
| `POST /mcp` | MCP Streamable HTTP requests |
| `GET /mcp` | Server-to-client event stream |
| `DELETE /mcp` | Close an MCP session |

Authenticate with `Authorization: Bearer <key>` or `X-API-Key: <key>`. If
`BMAD_API_KEY` is unset, HTTP mode is open to anyone who can reach it; only use
that configuration in a trusted development environment.

```bash
claude mcp add --transport http bmad https://your-domain.example/mcp \
  --header "Authorization: Bearer YOUR_KEY" --scope user
```

<a id="environment-variables"></a>

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `BMAD_ROOT` | Automatic discovery | Override the BMAD content root |
| `BMAD_DEBUG` | `false` | Enable verbose server logging |
| `BMAD_GIT_AUTO_UPDATE` | `true` | Refresh cached Git content automatically |
| `BMAD_API_KEY` | Unset | Protect the HTTP transport |
| `BMAD_REQUIRE_CLICKUP` | Unset | Fail startup when ClickUp credentials are missing |
| `CLICKUP_API_KEY` | Unset | ClickUp personal API token |
| `CLICKUP_TEAM_ID` | Unset | ClickUp workspace/team ID |
| `CLICKUP_MCP_MODE` | `write` | ClickUp tool scope: `read-minimal`, `read`, or `write` |
| `PORT` | `3000` | HTTP server port |

See [`.env.example`](./.env.example) for the complete list and supported
values. Project-specific ClickUp and planning-path defaults can be stored in
`.bmadmcp/config.toml`; start from
[`.bmadmcp/config.example.toml`](./.bmadmcp/config.example.toml).

## CLI

The package also installs a `bmad` command for terminal use:

```bash
bmad list agents
bmad list workflows --json
bmad search architecture
bmad read agent analyst
bmad execute workflow prd --message "Inventory application"
```

Run `bmad` without arguments for the interactive interface.

## Architecture

```text
MCP client
    │
    ├── stdio ─────────────┐
    └── Streamable HTTP ───┤
                           ▼
                    MCP server layer
                           │
                           ▼
                       BMADEngine
                           │
                           ▼
                     Resource loader
                           │
          project → user → Git → Alpharages BMAD fork
```

The transport-agnostic `BMADEngine` powers the MCP server, CLI, and tests.
Read the [architecture guide](./docs/architecture.md) for component and data
flow details.

## Development

```bash
git clone https://github.com/Alpharages/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
npm test
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the stdio server from TypeScript |
| `npm run dev:http` | Run the HTTP server from TypeScript |
| `npm test` | Run unit and integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Check code quality |
| `npm run format` | Format supported files |
| `npm run build` | Create the production build |

See the [development guide](./docs/development-guide.md) for repository
conventions, testing strategy, and release details.

## Contributing

Contributions are welcome. Bug reports, feature proposals, documentation
improvements, and pull requests all help the project.

1. Check existing [issues](https://github.com/Alpharages/bmad-mcp-server/issues)
   before starting substantial work.
2. Fork the repository and create a focused branch from `main`.
3. Add or update tests when behavior changes.
4. Run `npm test`, `npm run lint`, and `npm run build`.
5. Open a pull request with a clear description and a
   [Conventional Commit](https://www.conventionalcommits.org/) title.

Please keep changes focused and never include API keys, access tokens, or
customer data in issues, logs, fixtures, or pull requests.

## Documentation

- [Documentation index](./docs/index.md)
- [Architecture](./docs/architecture.md)
- [API contracts](./docs/api-contracts.md)
- [Development guide](./docs/development-guide.md)
- [ClickUp quickstart](./docs/clickup-quickstart.md)
- [Changelog](./CHANGELOG.md)

## Credits

This project is a fork of
[`mkellerman/bmad-mcp-server`](https://github.com/mkellerman/bmad-mcp-server),
originally created by [@mkellerman](https://github.com/mkellerman). Full credit
for the original implementation, architecture, and foundation belongs to the
original author and contributors.

The [Alpharages](https://github.com/Alpharages) community maintains this fork
and develops its additional features, including the current unified tool,
HTTP transport, Git-backed content loading, and ClickUp integration.

The BMAD content source used by this server,
[`Alpharages/BMAD-METHOD`](https://github.com/Alpharages/BMAD-METHOD), is a
fork of the official
[`bmad-code-org/bmad-method`](https://github.com/bmad-code-org/bmad-method)
project. The original BMAD methodology, agents, workflows, and foundation are
credited to the upstream BMAD maintainers and contributors; Alpharages
maintains its fork and the features added there.

## License

BMAD MCP Server is open-source software licensed under the
[ISC License](./LICENSE). © 2026 Alpharages and contributors.
