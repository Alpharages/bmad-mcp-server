#!/usr/bin/env node
/**
 * BMAD MCP Server - Entry Point
 *
 * Tool-per-agent architecture with Git remote support.
 *
 * This is the main entry point for the BMAD MCP Server. It creates and starts
 * a BMADServerLiteMultiToolGit instance that exposes BMAD agents and workflows
 * as MCP tools to AI assistants.
 *
 * No separate BMAD installation is required — the server automatically fetches
 * and caches BMAD content from the official Alpharages/BMAD-METHOD repository
 * on first use, falling back gracefully to any locally installed BMAD.
 *
 * @remarks
 * The server supports multiple BMAD content sources in priority order:
 * 1. Project-local: `./bmad/` directory (highest priority)
 * 2. User-global: `~/.bmad/` directory
 * 3. Git remotes: URLs passed as CLI arguments
 * 4. Official Alpharages/BMAD-METHOD repo (auto-fetched, always present)
 *
 * @example
 * ```bash
 * # Basic usage (project + user directories only)
 * node build/index.js
 * # or
 * bmad-mcp-server
 *
 * # With Git remote sources
 * node build/index.js git+https://github.com/company/bmad-extensions.git
 *
 * # Multiple Git remotes
 * node build/index.js \
 *   git+https://github.com/company/bmad-core.git#main \
 *   git+https://github.com/company/bmad-custom.git#v2.0.0
 *
 * # Git remote with subpath (monorepo support)
 * node build/index.js git+https://github.com/org/repo.git#main:/bmad/core
 * ```
 *
 * @example
 * ```bash
 * # SSH URLs (for private repositories)
 * node build/index.js git+ssh://git@github.com/company/private-bmad.git
 * ```
 */

import { BMADServerLiteMultiToolGit } from './server.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the server's own package root (build/../ = project root).
// This is used as the default projectRoot so the server always finds its
// own src/custom-skills/ regardless of what process.cwd() is at startup.
const _serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Main entry point function
 *
 * Parses command line arguments and starts the MCP server.
 * All arguments starting with 'git+' are treated as Git remote URLs.
 *
 * @remarks
 * The function filters command line arguments to extract Git URLs and passes
 * them to the server constructor. Non-Git arguments are ignored for forward
 * compatibility.
 */
async function main() {
  // Parse Git URLs from command line arguments
  const gitRemotes = process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('git+'));

  // BMAD_ROOT overrides the default; default is the server's own package root
  // so src/custom-skills/ is always found regardless of process.cwd().
  const projectRoot = process.env.BMAD_ROOT ?? _serverRoot;

  console.error('BMAD MCP Server (Tool-per-Agent + Git Support)');
  if (gitRemotes.length > 0) {
    console.error(`Git remotes: ${gitRemotes.join(', ')}`);
  }
  console.error(`Project root: ${projectRoot}`);

  const server = new BMADServerLiteMultiToolGit(projectRoot, gitRemotes);
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
