# BMAD MCP Server — Claude Code Guide

## Project Overview

An MCP (Model Context Protocol) server that exposes the [BMAD-METHOD](https://github.com/Alpharages/BMAD-METHOD) to AI assistants. It surfaces 11 specialized agents and 36+ automated workflows as MCP tools, enabling Claude Desktop, VS Code Copilot, Cline, and other AI clients to access BMAD content universally across projects.

**npm package:** `bmad-mcp-server`  
**Node.js:** 22.14.0 (see `.nvmrc`)

---

## Tech Stack

- **Language:** TypeScript 5.7.2 (strict, ES2022, ES modules)
- **Runtime:** Node.js 18+
- **Protocol:** `@modelcontextprotocol/sdk` v1.0.4
- **Testing:** Vitest 4.x with v8 coverage
- **Linting/Formatting:** ESLint 9 + Prettier 3 (single quotes, 2-space indent, 80-char width)
- **Releases:** Semantic Release + Conventional Commits

---

## Common Commands

```bash
# Development
npm run dev              # Watch mode with tsx (auto-restart)
npm run build            # Compile TypeScript → build/
npm start                # Run compiled server (stdin/stdout MCP)

# Testing
npm test                 # Unit + integration tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage    # Generate coverage report
npm run test:all         # All suites sequentially

# Linting & formatting
npm run lint             # ESLint check
npm run lint:fix         # ESLint + Prettier auto-fix
npm run format           # Prettier only

# CLI helpers
npm run cli              # CLI interface for agents/workflows
npm run cli:list-agents  # List available agents
npm run cli:list-workflows # List available workflows
npm run cli:list-tools   # List MCP tools
```

---

## Architecture

```
AI Client → MCP Transport → Server Layer → BMADEngine → ResourceLoader → BMAD Content
```

**Key principle:** `BMADEngine` (`src/core/bmad-engine.ts`) is transport-agnostic — it returns plain TypeScript objects, not MCP types. This enables reuse across MCP server, CLI, and tests.

### Source priority (highest → lowest)
1. Project-local: `./bmad/`
2. User-global: `~/.bmad/`
3. Git remotes passed as CLI args: `~/.bmad/cache/git/`
4. Official `Alpharages/BMAD-METHOD` repo — auto-fetched and cached on first use (no separate install needed)

### Unified Tool Design
A single `bmad` MCP tool with four operations (`list`, `read`, `execute`, `search`) rather than one tool per agent. See `src/tools/bmad-unified.ts` and `src/tools/operations/`.

---

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── cli.ts                # CLI entry point
├── server.ts             # BMADServerLiteMultiToolGit — MCP server class
├── config.ts             # Feature flags, instructions, templates
├── core/
│   ├── bmad-engine.ts    # Business logic (transport-agnostic)
│   └── resource-loader.ts # Multi-source content loader
├── tools/
│   ├── bmad-unified.ts   # Unified 'bmad' tool definition
│   └── operations/       # list / read / execute / search handlers
├── types/                # Shared TypeScript interfaces
└── utils/
    ├── logger.ts          # Debug logging
    └── git-source-resolver.ts # Git URL parsing + caching

tests/
├── unit/                 # Fast isolated tests
├── integration/          # Cross-component tests
├── e2e/                  # End-to-end scenarios
├── fixtures/             # Static test data
└── helpers/              # Shared test utilities
```

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `BMAD_ROOT` | Override BMAD installation root | Auto-discovered |
| `BMAD_DEBUG` | Enable verbose debug logging (`1` or `true`) | `false` |
| `NODE_ENV` | Environment (`test`, `development`, `production`) | `development` |
| `BMAD_GIT_AUTO_UPDATE` | Auto-update Git cache | `true` (CI sets `false`) |

---

## Conventions

- **Commits:** Conventional Commits required (`feat:`, `fix:`, `docs:`, etc.). Commitlint runs on PRs; semantic-release derives version bumps from these.
- **No `console.*`:** Use `src/utils/logger.ts` for all logging. ESLint warns on direct `console` usage.
- **Imports:** Use `.js` extensions in TypeScript imports (ES module resolution).
- **Tests:** Mirror `src/` structure under `tests/unit/`. Integration tests may spin up the full server.
- **Branching:** Feature branches off `main`; PR titles must follow Conventional Commits format (validated by `pr-title-check.yml`).

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | push/PR → main | Lint → Unit tests → Integration tests → Build |
| `release-draft.yml` | push → main | Draft release notes |
| `release-publish.yml` | Release published | Publish to npm + git tag |
| `pr-title-check.yml` | PR open/edit | Validate PR title format |

Releases are fully automated via semantic-release. Do not manually bump versions in `package.json`.[claude_desktop_config.json](../../../../../../Users/khakanali/Library/Application%20Support/Claude/claude_desktop_config.json)

---

## Debugging Tips

- Set `BMAD_DEBUG=1` to enable verbose logging from `src/utils/logger.ts`.
- The MCP server communicates via stdin/stdout; run `npm start` and send JSON-RPC messages to test manually.
- Use `npm run cli:list-agents` / `npm run cli:list-workflows` to verify BMAD content is loaded correctly.
- Git source caching lives in `~/.bmad/cache/git/`; delete this directory to force a fresh clone.
