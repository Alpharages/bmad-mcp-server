# BMAD MCP Server — Claude Code Guide

## Project Overview

An MCP (Model Context Protocol) server that exposes the [BMAD-METHOD](https://github.com/Alpharages/BMAD-METHOD) to AI assistants. It surfaces 6 specialized agents and 36+ automated workflows as MCP tools, enabling Claude Desktop, VS Code Copilot, Cline, and other AI clients to access BMAD content universally across projects.

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

A single `bmad` MCP tool with five operations (`list`, `read`, `execute`, `search`, `resolve-doc-paths`) rather than one tool per agent. See `src/tools/bmad-unified.ts` and `src/tools/operations/`.

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

| Variable               | Purpose                                                   | Default                  |
| ---------------------- | --------------------------------------------------------- | ------------------------ |
| `BMAD_ROOT`            | Override BMAD installation root                           | Auto-discovered          |
| `BMAD_DEBUG`           | Enable verbose debug logging (`1` or `true`)              | `false`                  |
| `NODE_ENV`             | Environment (`test`, `development`, `production`)         | `development`            |
| `BMAD_GIT_AUTO_UPDATE` | Auto-update Git cache                                     | `true` (CI sets `false`) |
| `BMAD_REQUIRE_CLICKUP` | `1` or `true` → hard-fail at boot if ClickUp vars missing | `unset` (soft-disable)   |
| `CLICKUP_API_KEY`      | Per-user ClickUp personal token                           | `unset`                  |
| `CLICKUP_TEAM_ID`      | Workspace ID (7–10 digits)                                | `unset`                  |
| `CLICKUP_MCP_MODE`     | Tool surface: `read-minimal`, `read`, `write`             | `write`                  |
| `PORT`                 | HTTP port for `src/http-server.ts`                        | `3000`                   |
| `BMAD_API_KEY`         | API key for HTTP-transport authentication                 | `unset`                  |

---

## Doc-Path Cascade

BMAD custom skills (`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review`) need to read the project's PRD, architecture document, and epics directory on every invocation. Before EPIC-6, these paths were hardcoded to `planning-artifacts/`, which caused a hard prereq failure for projects with non-standard layouts. The doc-path cascade introduced in EPIC-6 resolves each path through a three-layer fallback (highest → lowest priority):

1. **`.bmadmcp/config.toml` `[docs]` table** — per-project escape hatch. Set `prd_path`, `architecture_path`, or `epics_path` to override that specific key.
2. **BMAD config chain** — reads `_bmad/config.toml` → `_bmad/config.user.toml` → `_bmad/custom/config.toml` → `_bmad/custom/config.user.toml` and uses `[bmm].planning_artifacts` as the base directory.
3. **Hardcoded default** — `{project-root}/planning-artifacts/` (preserves pre-EPIC-6 behavior).

The four per-key overrides available in `.bmadmcp/config.toml [docs]` are:

| Key                 | Resolves                                                                                                             | Default                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `prd_path`          | Absolute or project-root-relative path to PRD                                                                        | `planning-artifacts/PRD.md`          |
| `architecture_path` | Absolute or project-root-relative path to architecture doc                                                           | `planning-artifacts/architecture.md` |
| `epics_path`        | Path to epics file or directory (trailing `/` marks a directory)                                                     | `planning-artifacts/epics/`          |
| `planning_dir`      | Base directory for default filenames for any key not already set in `[docs]` (lower priority than per-key overrides) | `planning-artifacts/`                |

Resolution is **per-key**: overriding only `prd_path` leaves `architecture_path` and `epics_path` to be resolved by the BMAD config or default layers.

Worked example for a project whose docs live under `docs/`:

```toml
[docs]
prd_path          = "docs/specs/PRD.md"
architecture_path = "docs/architecture/overview.md"
epics_path        = "docs/epics/"
```

The cascade is invoked via `bmad({ operation: 'resolve-doc-paths' })` and is consumed by all three custom skills (`clickup-create-story`, `clickup-dev-implement`, `clickup-code-review`).

> **This project's override.** This repo's architecture document lives at `docs/architecture.md` (not `planning-artifacts/architecture.md`), so a project-local `.bmadmcp/config.toml` must set `architecture_path = "docs/architecture.md"`. **After cloning, create this file before running any custom skill** — without it the resolver falls back to `planning-artifacts/architecture.md`, which does not exist in this repo. The gitignored `.bmadmcp/config.toml` is the right place for this; `.bmadmcp/config.example.toml` (tracked) shows the full schema.

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

| Workflow              | Trigger           | Purpose                                       |
| --------------------- | ----------------- | --------------------------------------------- |
| `ci.yml`              | push/PR → main    | Lint → Unit tests → Integration tests → Build |
| `release-draft.yml`   | push → main       | Draft release notes                           |
| `release-publish.yml` | Release published | Publish to npm + git tag                      |
| `pr-title-check.yml`  | PR open/edit      | Validate PR title format                      |

Releases are fully automated via semantic-release. Do not manually bump versions in `package.json`.[claude_desktop_config.json](../../../../../../Users/khakanali/Library/Application%20Support/Claude/claude_desktop_config.json)

---

## Debugging Tips

- Set `BMAD_DEBUG=1` to enable verbose logging from `src/utils/logger.ts`.
- The MCP server communicates via stdin/stdout; run `npm start` and send JSON-RPC messages to test manually.
- Use `npm run cli:list-agents` / `npm run cli:list-workflows` to verify BMAD content is loaded correctly.
- Git source caching lives in `~/.bmad/cache/git/`; delete this directory to force a fresh clone.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **bmad-mcp-server** (1142 symbols, 2699 relationships, 79 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/bmad-mcp-server/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool             | When to use                   | Command                                                                 |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `query`          | Find code by concept          | `gitnexus_query({query: "auth validation"})`                            |
| `context`        | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})`                              |
| `impact`         | Blast radius before editing   | `gitnexus_impact({target: "X", direction: "upstream"})`                 |
| `detect_changes` | Pre-commit scope check        | `gitnexus_detect_changes({scope: "staged"})`                            |
| `rename`         | Safe multi-file rename        | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher`         | Custom graph queries          | `gitnexus_cypher({query: "MATCH ..."})`                                 |

## Impact Risk Levels

| Depth | Meaning                               | Action                |
| ----- | ------------------------------------- | --------------------- |
| d=1   | WILL BREAK — direct callers/importers | MUST update these     |
| d=2   | LIKELY AFFECTED — indirect deps       | Should test           |
| d=3   | MAY NEED TESTING — transitive         | Test if critical path |

## Resources

| Resource                                         | Use for                                  |
| ------------------------------------------------ | ---------------------------------------- |
| `gitnexus://repo/bmad-mcp-server/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/bmad-mcp-server/clusters`       | All functional areas                     |
| `gitnexus://repo/bmad-mcp-server/processes`      | All execution flows                      |
| `gitnexus://repo/bmad-mcp-server/process/{name}` | Step-by-step execution trace             |

## Self-Check Before Finishing

Before completing any code modification task, verify:

1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->
