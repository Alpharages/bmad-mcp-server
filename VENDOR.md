# Vendored Third-Party Sources

This file tracks upstream sources vendored into this repository. Vendored trees
are read-only to us: no edits to vendored files without a corresponding upstream
change. Customization layers live elsewhere (see PRD §Customization boundary).

## clickup-mcp

- **Upstream repo:** https://github.com/hauptsacheNet/clickup-mcp
- **Pinned SHA:** `c79b21e3f77190a924ef8e2c9ba3dd8088369e17`
- **Upstream branch:** `main`
- **Date vendored:** 2026-04-21
- **License:** MIT (see `src/tools/clickup/LICENSE`)
- **Vendor location:** `src/tools/clickup/`

### What was vendored

- `src/` → `src/tools/clickup/src/` (upstream source tree, verbatim)
- `LICENSE` → `src/tools/clickup/LICENSE` (MIT attribution)
- `README.md` → `src/tools/clickup/README.md` (attribution + tool-surface inventory)

### What was deliberately excluded (and why)

| Path / category                                       | Why excluded                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `.github/`                                            | GitHub Actions picks up any `.github/workflows/*.yml` under the repo root — would trigger phantom CI jobs.         |
| `package.json`, `package-lock.json`, `yarn.lock`      | Node's nearest-ancestor `package.json` lookup would resolve our server code against upstream's fields silently.    |
| `tsconfig.json`                                       | Would collide with ours via nearest-config discovery.                                                              |
| `.eslintrc*`, `.prettierrc*`                          | Same nearest-config collision hazard.                                                                              |
| `scripts/`, `dist/`, `build/`, `node_modules/`, `.git/` | Build output, deps, and VCS history are not source — no attribution value and would bloat the tree.              |
| `.mcpbignore`, `.npmignore`, `.gitignore`             | Upstream packaging/VCS metadata — not source, not relevant to our build.                                           |
| `manifest.json`, `icon-72x72.png`, `CHANGELOG.md`, `CLAUDE.md` | Upstream packaging / repo metadata — not required for the register-tools surface we consume.               |

### Upstream runtime dependencies

Copied verbatim from upstream `package.json` (SHA `c79b21e3`). Story 1.3
reconciles these against our root `package.json`:

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "1.15.1",
  "fuse.js": "^7.1.0",
  "remark-gfm": "^4.0.1",
  "remark-parse": "^11.0.0",
  "unified": "^11.0.5",
  "zod": "^3.24.2"
}
```

### Upgrade procedure

1. Capture the new SHA:

   ```bash
   SHA=$(git ls-remote https://github.com/hauptsacheNet/clickup-mcp.git HEAD | cut -f1)
   ```

2. Re-run the vendor steps from Story 1.1 (shallow clone at `$SHA`, copy `src/`,
   `LICENSE`, `README.md`, remove scratch).
3. Update this file: new SHA, new date, refreshed runtime-deps block.
4. Re-run `npm run build` / `npm run lint` / `npm run format` / `npm test` to
   confirm nothing regressed. If tsc now errors inside the vendored tree, the
   exclude in `tsconfig.json` already shields it; if the register-tools surface
   changed, reconcile the adapter in `src/server.ts` (Story 1.3's territory).
5. Commit with `ALLOW_VENDOR_EDIT=1` to bypass the pre-commit guard that
   normally blocks edits under `src/tools/clickup/`:

   ```bash
   ALLOW_VENDOR_EDIT=1 git commit -m "chore(clickup): bump vendored SHA → <new-short-sha>"
   ```
