# Story 1.2: Wire vendored ClickUp `register*Tools` functions into `src/server.ts`

Status: ready-for-dev

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Second story in EPIC-1. Story 1.1 vendored the upstream source (read-only) and excluded it from tsc / lint / prettier / dep-audit so the build stayed green. This story makes that dormant code actually runnable and reachable through the same MCP server that currently exposes the unified `bmad` tool — without breaking BMAD-only usage when ClickUp env vars are absent.

## Story

As the **bmad-mcp-server platform maintainer**,
I want the ClickUp tool registration functions vendored in `src/tools/clickup/src/**` (`registerTaskToolsRead`, `registerTaskToolsWrite`, `registerSearchTools`, `registerSpaceTools`, `registerListToolsRead`, `registerListToolsWrite`, `registerTimeToolsRead`, `registerTimeToolsWrite`, `registerDocumentToolsRead`, `registerDocumentToolsWrite`, and the `registerSpaceResources` resource template) wired into our `BMADServerLiteMultiToolGit` bootstrap through a thin adapter at `src/tools/clickup-adapter.ts`,
so that story 1.3 can add real `CLICKUP_API_KEY` / `CLICKUP_TEAM_ID` validation on top of a fully-wired surface, stories 1.4–1.7 can smoke-test the now-reachable tools against a real ClickUp workspace, and EPIC-2's story-creation skill (story 2.6) can call `createTask` without re-scaffolding wiring — all while keeping the vendored source byte-identical to upstream at SHA `c79b21e3f77190a924ef8e2c9ba3dd8088369e17` and preserving BMAD-only usage when ClickUp env vars are absent.

## Acceptance Criteria

1. The vendored register functions are reachable from our server at runtime. With `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` set to any non-empty values (even invalid ones — real API validation is out of scope here), starting `node build/index.js` and sending an MCP `tools/list` request returns the existing `bmad` tool **plus** the ClickUp tool set corresponding to `CLICKUP_MCP_MODE`. The exact tool names and mode mapping are upstream's contract (see upstream `README.md` §MCP Modes):
   - `CLICKUP_MCP_MODE=read-minimal` → `getTaskById`, `searchTasks`
   - `CLICKUP_MCP_MODE=read` → read-minimal + `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument`, `searchDocuments`
   - `CLICKUP_MCP_MODE=write` (default, or missing/invalid value) → read + `addComment`, `updateTask`, `createTask`, `updateListInfo`, `createTimeEntry`, `updateDocumentPage`, `createDocumentOrPage`
2. The vendored resource template `clickup://space/{spaceId}` (registered by upstream's `registerSpaceResources`) is present in the `resources/templates/list` MCP response alongside our existing `bmad://...` templates, when `CLICKUP_MCP_MODE` is `read` or `write`. When `read-minimal`, `registerSpaceResources` is NOT called and the template is absent (mirrors upstream's behavior in `src/tools/clickup/src/index.ts` lines 101–128).
3. When `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` is absent (or empty), the server MUST still start cleanly, the `bmad` tool MUST still be listed, and a single `stderr` line of the form `ClickUp tools disabled: CLICKUP_API_KEY and CLICKUP_TEAM_ID required` MUST be emitted at startup. No exception propagates; no attempt is made to fetch `/api/v2/user`. Story 1.3 replaces this warn with proper validation — do NOT implement validation beyond presence here.
4. ClickUp-tool-registration is gated behind a **dynamic `import()`** of `src/tools/clickup-adapter.js`. The adapter module is only loaded when both env vars are present. This is load-bearing because upstream's `src/tools/clickup/src/shared/config.ts` lines 70–72 throws `new Error("Missing Clickup API key or team ID")` at module evaluation time — any static import chain through it would crash BMAD-only usage. Do NOT edit upstream's `shared/config.ts` to remove the throw (vendored source is read-only per `VENDOR.md` and story 1.1 AC #2).
5. `src/tools/clickup-adapter.ts` is a new file we own (NOT under the vendored tree). Its sole responsibility is:
   - Fetch `getCurrentUser()` and `getSpaceSearchIndex()` from the vendored `shared/utils` (both are required by upstream's register functions for tool-description enrichment — see `src/tools/clickup/src/index.ts` lines 26–30).
   - Call the appropriate subset of register functions on the passed `McpServer` per `CLICKUP_MCP_MODE`, matching upstream's mode dispatch exactly.
   - Register the upstream `my-todos` prompt (optional, but keep parity with upstream behavior — see `src/tools/clickup/src/index.ts` lines 56–99).
   - Return a `{ disabled?: true; reason?: string } | { disabled?: false; toolsRegistered: string[]; mode: McpMode }` summary for logging only.
   - Export a single named function `registerClickUpTools(server: McpServer): Promise<...>`.
   - Do NOT contain any ClickUp business logic. It is a dispatch shim only. Behavior belongs in the vendored tree.
6. `BMADServerLiteMultiToolGit` is migrated from the low-level `Server` (from `@modelcontextprotocol/sdk/server/index.js`) to the high-level `McpServer` (from `@modelcontextprotocol/sdk/server/mcp.js`). This is required because upstream's register functions call `server.tool(name, desc, schema, opts, handler)` and `server.registerResource(...)` / `server.registerPrompt(...)` — all methods on `McpServer`, not `Server`. All four existing MCP surfaces of our server MUST continue to work byte-identically:
   - The unified `bmad` tool (`tools/list` still returns it; `tools/call` still dispatches to `handleBMADTool`).
   - The `bmad://` resource templates listed at `resources/templates/list` (7 templates per `src/server.ts` lines 73–118).
   - The BMAD agent/workflow prompts returned by `prompts/list` and dispatched via `prompts/get`.
   - The completion hooks for `ref/prompt` and `ref/resource` in `completion/complete`.
     `McpServer` exposes `.server` for direct `setRequestHandler` access when a low-level hook is needed; use that escape hatch for any MCP verb `McpServer` doesn't surface natively (most notably `CompleteRequestSchema`).
7. The six upstream runtime dependencies from `VENDOR.md` §"Upstream runtime dependencies" are reconciled against our root `package.json`:
   - `@modelcontextprotocol/sdk` — bump from `^1.0.4` → `^1.15.1` (upstream pins `1.15.1`; allow patch + minor updates via caret). This is a **floor bump only**: the current `package-lock.json` already resolves `^1.0.4` to `1.21.0` at install time, so the runtime surface does not change for existing installs. The bump prevents a fresh `npm install` from picking a pre-1.10.0 SDK (the version that introduced `StreamableHTTPServerTransport`, which `src/http-server.ts` currently requires). See Dev Notes §"SDK 1.0.4 → 1.15.1 — what you actually need to know" for the concrete breaking-change survey — spoiler, there is nothing to port.
   - `fuse.js` `^7.1.0` (new) — used by `src/tools/clickup/src/shared/utils.ts` for fuzzy search indexes.
   - `remark-gfm` `^4.0.1` (new) — used by `src/tools/clickup/src/clickup-text.ts` for markdown→ClickUp-text conversion.
   - `remark-parse` `^11.0.0` (new) — same.
   - `unified` `^11.0.5` (new) — same.
   - `zod` `^3.24.2` (new) — used by every upstream `register*Tools.ts` for tool input schemas.
     Plus one type dependency: `@types/mdast` (new `devDependency`) — `src/tools/clickup/src/clickup-text.ts` line 8 imports types from `mdast`; without this, tsc fails once the vendored tree is part of the compile.
8. The vendored tree is now compiled to runnable JavaScript under `build/tools/clickup/**`. Two choices are acceptable; **prefer Option B** (see Dev Notes §"Two paths for compiling the vendored tree"):
   - **Option A (preferred fallback)**: Bundle the vendored tree into a single ESM file at `build/tools/clickup/index.js` via `esbuild` — add `esbuild` as a `devDependency` and a script `build:clickup` in `package.json`; wire `build:clickup` into the main `build` script.
   - **Option B (preferred primary)**: Compile via a secondary `tsconfig.clickup.json` that inherits the root tsconfig with `strict: false`, `noImplicitAny: false`, and `include: ["src/tools/clickup/**"]`; then run a post-compile codemod `scripts/fix-esm-imports.mjs` that walks `build/tools/clickup/**/*.js`, parses each relative-import / relative-`export ... from` / relative dynamic-`import()` specifier, resolves the target on disk (preferring `foo/index.js` if `foo` is a directory), and rewrites bare specifiers to add `.js`. The codemod MUST be idempotent (re-running does not corrupt already-fixed files) and MUST skip absolute specifiers, bare package specifiers, `node:*` builtins, and specifiers that already end in `.js`/`.mjs`/`.cjs`/`.json`.
     Whichever option is chosen, the root `package.json` `build` script MUST produce a working `build/` in one invocation of `npm run build`, and `node build/index.js` with env vars set MUST load `build/tools/clickup-adapter.js` → `build/tools/clickup/**` without an `ERR_MODULE_NOT_FOUND`.
9. The root `tsconfig.json` `exclude` entry `"src/tools/clickup/**"` remains (root tsc does NOT compile the vendored tree directly — that's the secondary tsconfig's job in Option B, or the bundler's job in Option A). The root tsc stays strict. Our adapter at `src/tools/clickup-adapter.ts` uses dynamic `import('./clickup/src/index.js')`-style specifiers that resolve to the compiled output at runtime; TypeScript type-checks the adapter against `any`-typed imports — this is acceptable because the adapter is a dispatch shim, not a consumer of upstream's type surface.
10. Lint, format, and dep-audit ignores for the vendored tree remain intact and byte-unchanged from story 1.1: `.gitignore` negation `!src/tools/clickup/**`, `.eslintignore` entry, `.prettierignore` entry, `eslint.config.mjs` `ignores` array, `vitest.config.ts` `test.exclude` + `coverage.exclude`. Do NOT touch these. The only planned modification to `tests/unit/dependency-audit.test.ts` is described in AC #11.
11. `tests/unit/dependency-audit.test.ts` is updated: the **broad** `VENDORED_PATHS` guard from story 1.1 (which skipped the entire `src/tools/clickup/` subtree) is **replaced** by a narrow `SCAN_EXCLUDED_PATHS` covering only the upstream test-plumbing and CLI paths that we deliberately do NOT ship: `src/tools/clickup/src/tests/`, `src/tools/clickup/src/test-utils.ts`, and `src/tools/clickup/src/cli.ts`. These paths are already excluded from our build (see Task 2 Option B tsconfig excludes / Option A esbuild entry) and are never runtime-loaded by our adapter, so their imports (`undici`, `dotenv/config`, `node:test`, `node:assert/strict`) do not need to be declared deps. The rest of the vendored tree (`src/tools/clickup/src/**` minus those three paths) IS scanned — it is what our adapter dynamic-imports at runtime. Adding `fuse.js`, `remark-gfm`, `remark-parse`, `unified`, `zod`, `@types/mdast` to root `package.json` MUST be sufficient to make this test pass against the unmodified in-scope vendored code. Built-in modules used by the in-scope vendored tree (`buffer`, `node:buffer`) are added to the test's `builtinModules` set if not already present. If the test still reports violations after all of the above, the gap is a real undeclared import in upstream runtime code — stop and investigate rather than widening `SCAN_EXCLUDED_PATHS` beyond the three paths listed.
12. `npm run build` passes cleanly — both the root tsc pass and the vendored-tree pass (Option B secondary tsc + codemod, or Option A esbuild). The three `chmod +x` lines in the existing `build` script continue to work for `build/index.js`, `build/index-http.js`, `build/cli.js`.
13. `npm run lint` produces the same 2 errors + 7 warnings baseline as story 1.1 (`src/http-server.ts` + `tests/support/litellm-helper.mjs`, pre-existing). No new lint findings from `src/tools/clickup-adapter.ts`, `src/server.ts`, or the dep-audit test.
14. `npm run format` does not touch the vendored tree (`.prettierignore` covers it). Our new `src/tools/clickup-adapter.ts` is prettier-clean (run `npm run format` before commit so the pre-commit hook does not rewrite it).
15. `npm test` passes with the previously pre-existing `node:http` failure from dep-audit now **resolved** (AC #11 adds `node:http` / `http` to the builtin list alongside `node:buffer` / `buffer` — 195/195 passing). If that failure is still present, the test-update in AC #11 is incomplete — this is the single acceptable test-count delta from the story 1.1 baseline, and it is in the green direction. No new tests are added (wiring is exercised by smoke tests in stories 1.5–1.6, not by unit tests here).
16. `git diff --stat -- BMAD-METHOD/` prints nothing. `git diff --stat -- src/tools/clickup/src/` prints nothing. `git diff --stat -- src/tools/clickup/LICENSE src/tools/clickup/README.md` prints nothing. (The vendored tree source is read-only to this story.)
17. `git diff --stat -- src/tools/bmad-unified.ts src/tools/operations/ src/core/bmad-engine.ts src/core/resource-loader.ts src/cli.ts` prints nothing. (BMAD engine + unified-tool surface are out of scope for this story — the `Server` → `McpServer` migration must not require changes here because `handleBMADTool` already operates on plain TypeScript objects per CLAUDE.md §Architecture.)
18. The commit message follows conventional-commits and is scoped `clickup`: `feat(clickup): wire register-tools into server bootstrap`. No scope restriction in `commitlint.config.cjs`, confirmed by story 1.1.

## Out of Scope (explicitly deferred to later stories)

- Real validation / friendliness for missing env vars (beyond the single stderr line). Story 1.3 replaces the guard with a proper startup-time validation step that lists which vars are missing, what they should contain, and where to obtain them. It also decides whether to hard-fail (no ClickUp use case in this project) or soft-disable (BMAD-only use case).
- Interactive space picker with session caching → **story 1.4**.
- Smoke-test `createTask` + `addComment` + status round-trip → **story 1.5**.
- Smoke-test cross-list parent/subtask (story in sprint list, parent in backlog list) → **story 1.6**.
- README / CHANGELOG entries announcing the ClickUp tool surface → **story 1.7**.
- Any edits to the vendored tree itself. Upstream adaptation (e.g. adding `.js` to their bare imports) is handled by the build-time codemod / bundler, NOT by editing `src/tools/clickup/src/**`.
- Touching the `bmad` tool surface, `BMADEngine`, or unified-tool operations. AC #17 guards this.
- Replacing the existing heartbeat progress-notification loop in `src/server.ts` lines 236–252 — port it through the `McpServer` migration as-is. Any improvement belongs in a follow-up refactor.

## Tasks / Subtasks

- [ ] **Task 1 — Reconcile root `package.json` dependencies (AC: #7)**
  - [ ] Bump `@modelcontextprotocol/sdk` to `^1.15.1`.
  - [ ] Add to `dependencies`: `fuse.js@^7.1.0`, `remark-gfm@^4.0.1`, `remark-parse@^11.0.0`, `unified@^11.0.5`, `zod@^3.24.2`.
  - [ ] Add to `devDependencies`: `@types/mdast` (latest compatible with `remark-parse@11`; pin by range not by `*`).
  - [ ] If Option A (esbuild bundling) is chosen for AC #8, also add `esbuild` to `devDependencies`.
  - [ ] Run `npm install`. Commit `package.json` + `package-lock.json` atomically.

- [ ] **Task 2 — Decide and implement the vendored-tree compile path (AC: #8, #9)**
  - [ ] Read Dev Notes §"Two paths for compiling the vendored tree" before choosing. Default recommendation: Option B (secondary tsconfig + codemod). Option A is acceptable if the codemod turns out to be fiddly in ways not anticipated here.
  - [ ] **If Option B**:
    - [ ] Create `tsconfig.clickup.json` at repo root. Fields:
      ```json
      {
        "extends": "./tsconfig.json",
        "compilerOptions": {
          "strict": false,
          "noImplicitAny": false,
          "outDir": "./build",
          "rootDir": "./src"
        },
        "include": ["src/tools/clickup/**"],
        "exclude": [
          "node_modules",
          "build",
          "tests",
          "src/tools/clickup/src/tests/**",
          "src/tools/clickup/src/test-utils.ts",
          "src/tools/clickup/src/cli.ts",
          "src/tools/clickup/src/index.ts"
        ]
      }
      ```
      Rationale for the additional excludes: upstream's test files use `node:test` + `undici`, neither desirable in our build artifact; `test-utils.ts` is upstream test plumbing; `cli.ts` is upstream's own entry point (we do not expose it); `index.ts` is upstream's own `initializeServer()` / `new McpServer(...)` bootstrap which we deliberately bypass (see Dev Notes §"Upstream CommonJS-ism in `src/tools/clickup/src/index.ts:50`"). Our adapter dynamic-imports the individual `tools/*.ts` and `resources/*.ts` register functions directly — not upstream's `index.ts` barrel — so excluding it here costs nothing and avoids a latent `require()` bomb.
    - [ ] Create `scripts/fix-esm-imports.mjs` that walks `build/tools/clickup/**/*.js` and rewrites relative imports / re-exports / dynamic imports to include `.js` extensions. Rules:
      - Skip specifiers that already end in `.js`, `.mjs`, `.cjs`, `.json`.
      - Skip absolute paths (starting with `/`) and bare package specifiers (not starting with `./` or `../`).
      - Skip `node:*` specifiers.
      - For each remaining specifier, resolve against the current file's directory: if `{specifier}.js` exists → rewrite to `{specifier}.js`; else if `{specifier}/index.js` exists → rewrite to `{specifier}/index.js`; else warn and leave unchanged (these should not occur in a correctly vendored tree — investigate).
      - Use a regex that catches `import .* from '...'`, `export .* from '...'`, and `import('...')`. Multi-line imports are OK; the specifier is always a single-line string literal.
    - [ ] Update `package.json` `build` script to: `tsc && tsc -p tsconfig.clickup.json && node scripts/fix-esm-imports.mjs build/tools/clickup && chmod +x build/index.js build/index-http.js build/cli.js`. (Keep the existing chmod trio untouched.)
  - [ ] **If Option A**:
    - [ ] Create `scripts/build-clickup.mjs` that runs `esbuild` in bundle mode. Do NOT use `src/tools/clickup/src/index.ts` as the entry — it contains the CommonJS `require('../package.json')` call flagged in Dev Notes §"Upstream CommonJS-ism" which is dead code for us. Instead, use **multiple entries**: one per upstream register-function file we actually call — `src/tools/clickup/src/tools/task-tools.ts`, `src/tools/clickup/src/tools/task-write-tools.ts`, `src/tools/clickup/src/tools/search-tools.ts`, `src/tools/clickup/src/tools/space-tools.ts`, `src/tools/clickup/src/tools/list-tools.ts`, `src/tools/clickup/src/tools/time-tools.ts`, `src/tools/clickup/src/tools/doc-tools.ts`, `src/tools/clickup/src/resources/space-resources.ts`. Output structure mirrors input under `build/tools/clickup/src/`. Format `esm`, platform `node`, target `node22`, external to all root-declared deps (`@modelcontextprotocol/sdk`, `fuse.js`, `remark-gfm`, `remark-parse`, `unified`, `zod`), `bundle: true`, `sourcemap: true`.
    - [ ] Update `package.json` `build` to run the esbuild step between the root `tsc` and the `chmod` trio.
  - [ ] Verify `build/tools/clickup/index.js` exists and is syntactically valid Node ESM (`node --check build/tools/clickup/index.js` succeeds in Option A; at least `build/tools/clickup/src/index.js` for Option B).

- [ ] **Task 3 — Author `src/tools/clickup-adapter.ts` (AC: #4, #5)**
  - [ ] Create the file with this shape (exact implementation is the dev's, but the interface MUST match):

    ```typescript
    import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

    type ClickUpMode = 'read-minimal' | 'read' | 'write';

    export type RegisterResult =
      | { disabled: true; reason: string }
      | {
          disabled: false;
          mode: ClickUpMode;
          toolsRegistered: readonly string[];
        };

    export async function registerClickUpTools(
      server: McpServer,
    ): Promise<RegisterResult> {
      /* dynamic-import + dispatch */
    }
    ```

  - [ ] Early-return `{ disabled: true, reason: 'CLICKUP_API_KEY and CLICKUP_TEAM_ID required' }` if either env var is empty (AC #3, #4).
  - [ ] Dynamic-import the upstream register functions by their compiled paths. For Option B, that's `./clickup/src/tools/task-tools.js`, `./clickup/src/tools/search-tools.js`, etc. For Option A, a single `./clickup/index.js` barrel. Keep the import list in a single `Promise.all` so startup stays snappy.
  - [ ] Fetch `getCurrentUser()` and `getSpaceSearchIndex()` in parallel via `Promise.all` (same as upstream's `src/tools/clickup/src/index.ts` lines 26–30). Do NOT reformat the returned `userData` — upstream register functions consume it as `any`.
  - [ ] Dispatch by reading `process.env.CLICKUP_MCP_MODE` (lowercase, defaulting to `write`, treating any unknown value as `write` with a stderr warning — mirrors upstream's `src/tools/clickup/src/shared/config.ts` lines 52–59 exactly).
  - [ ] Register upstream's `my-todos` prompt via `server.registerPrompt('my-todos', ...)` with the language-sensitive body from `src/tools/clickup/src/index.ts` lines 56–99. Reuse upstream's prompt text verbatim by extracting it into a shared helper in the adapter, or inline it.
  - [ ] Return `{ disabled: false, mode, toolsRegistered: [...] }` listing tool names in the order they were registered (for the stderr log line).

- [ ] **Task 4 — Migrate `src/server.ts` from `Server` to `McpServer` (AC: #6, #17)**
  - [ ] Swap the import `import { Server } from '@modelcontextprotocol/sdk/server/index.js';` for `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';`.
  - [ ] Replace `new Server({...}, {capabilities: {...}})` with `new McpServer({...}, {capabilities: {...}})`. `McpServer` accepts the same shape; verify by reading its type declaration in `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` after `npm install`.
  - [ ] Re-wire the existing handlers. `McpServer` provides:
    - `.registerResource(name, uriTemplate, metadata, readHandler)` — can cover our seven `bmad://` templates. But we currently build them via `ListResourceTemplatesRequestSchema`; it is acceptable to KEEP the low-level `setRequestHandler` style via `server.server.setRequestHandler(...)` if that's less churn. Choose whichever keeps AC #6 satisfied without touching `bmad-engine.ts`.
    - `.registerPrompt(name, metadata, handler)` — our dynamic agent-prompt listing is data-driven (we enumerate `engine.getAgentMetadata()` at runtime). Keeping the existing `ListPromptsRequestSchema` / `GetPromptRequestSchema` `setRequestHandler` blocks via `server.server.setRequestHandler(...)` is simpler than registering prompts one-at-a-time after `initialize()`. Do whichever preserves existing behavior.
    - `.tool(name, ...)` — NOT used for our `bmad` tool. Keep the existing `setRequestHandler(CallToolRequestSchema, ...)` + `setRequestHandler(ListToolsRequestSchema, ...)` via `server.server.setRequestHandler(...)` so `handleBMADTool` is unchanged.
  - [ ] `CompleteRequestSchema` — no high-level wrapper exists on `McpServer`; use `server.server.setRequestHandler(CompleteRequestSchema, ...)`. Same logic as today.
  - [ ] The heartbeat progress-notification loop (current `src/server.ts` lines 238–252) uses `this.server.notification(...)` — on `McpServer`, the equivalent is `this.server.server.notification(...)`. Update.
  - [ ] In `start()` (post-`initialize()`), await `registerClickUpTools(this.server)` and `console.error` a one-line summary: either `ClickUp tools disabled: <reason>` or `ClickUp tools registered (mode=<mode>, count=<n>)`. Only one line either way — do not dump `toolsRegistered` at default log level; keep that for `BMAD_DEBUG=1` if you want (use `src/utils/logger.ts`, not `console.*` per CLAUDE.md §Conventions).
  - [ ] `connect(transport)` and `start()` signatures stay the same. `http-server.ts` still calls `new BMADServerLiteMultiToolGit(...)` and `.connect(transport)` — that code path MUST continue to work without changes to `http-server.ts`.

- [ ] **Task 5 — Update `tests/unit/dependency-audit.test.ts` (AC: #11, #15)**
  - [ ] Rename the `VENDORED_PATHS` constant (lines 14–21) to `SCAN_EXCLUDED_PATHS` and replace its single entry `['src/tools/clickup']` with a narrow three-entry list of upstream test/CLI plumbing that we do NOT ship: `['src/tools/clickup/src/tests', 'src/tools/clickup/src/test-utils.ts', 'src/tools/clickup/src/cli.ts']`. Rename `isVendored` → `isExcluded` for consistency with the new name. Update both call sites in the two `findTsFiles` helpers accordingly. The rest of the upstream tree is now scanned; its imports MUST all resolve to declared deps once AC #7's six deps are added.
  - [ ] Add `'node:http'`, `'http'`, `'node:buffer'`, `'buffer'`, `'node:test'`, `'node:assert/strict'`, `'node:timers/promises'` to `builtinModules` if not already there. (Rationale: `node:http` fixes the pre-existing 1/195 failure from story 1.1 baseline; `node:buffer`/`buffer` covers upstream's `src/tools/clickup/src/clickup-text.ts` line 2 and `src/tools/clickup/src/shared/image-processing.ts` line 4; the `node:test`/`node:assert` entries are belt-and-braces in case `SCAN_EXCLUDED_PATHS` is ever loosened.)
  - [ ] Keep the second `it('should use js-yaml consistently (not yaml package)', ...)` block; apply the same `SCAN_EXCLUDED_PATHS` / `isExcluded` rename inside its `findTsFiles` helper. Upstream does not import `yaml`, so this test remains trivially green.
  - [ ] **Extract** the duplicated `findTsFiles` + `isExcluded` helpers to a single module-level pair above the `describe` block. Both `it()` blocks now call the same function. This closes story 1.1 Review Finding "Extract findTsFiles/isVendored out of the two it() blocks" — low-cost since we are already editing the file. Keep the diff surgical: do not rename `findTsFiles`, do not change the recursion strategy, do not add new guards beyond what AC #11 requires.
  - [ ] Harden `isExcluded`'s path handling (per story 1.1 Review Finding): resolve `rootDir` from `__dirname` via `fileURLToPath(import.meta.url)` rather than `process.cwd()`, and replace `.split(sep).join('/')` with `.replace(/\\/g, '/')`. Both are robustness wins flagged but deferred in story 1.1; folding them in here avoids a separate follow-up PR.
  - [ ] Run `npm test`. Expect 195/195 passing. If `dependency-audit.test.ts` reports undeclared imports after all the above, the gap is a real one — add the missing dep to `package.json` (or the missing builtin to the builtin set if it really is a Node built-in) rather than widening `SCAN_EXCLUDED_PATHS` beyond the three paths in AC #11.

- [ ] **Task 6 — Smoke-verify locally (AC: #1, #2, #3, #12, #15)**
  - [ ] Without env vars: `CLICKUP_API_KEY= CLICKUP_TEAM_ID= node build/index.js` → should print the BMAD startup banner + one stderr line `ClickUp tools disabled: CLICKUP_API_KEY and CLICKUP_TEAM_ID required`. Send a `tools/list` JSON-RPC request over stdin; response includes `bmad` but no ClickUp tools. No exception.
  - [ ] With stub env vars: `CLICKUP_API_KEY=stub CLICKUP_TEAM_ID=stub CLICKUP_MCP_MODE=read-minimal node build/index.js` → `tools/list` returns `bmad`, `getTaskById`, `searchTasks`. `getCurrentUser()` will fail against ClickUp's real API with the stub key, but the upstream register functions cache the promise rejection — tool registration itself still succeeds; only _invoking_ a tool would hit the auth error. That is fine for this story; real auth is story 1.3/1.5's territory.
  - [ ] Same with `CLICKUP_MCP_MODE=read` → expect the `read-minimal` tools + `searchSpaces`, `getListInfo`, `getTimeEntries`, `readDocument`, `searchDocuments`. `resources/templates/list` now includes `clickup://space/{spaceId}` alongside our seven `bmad://` templates.
  - [ ] Same with `CLICKUP_MCP_MODE=write` (or unset) → expect the full 13-tool upstream surface.
  - [ ] Capture the three `tools/list` responses into the commit body (brief list is enough — full JSON is not necessary) so the reviewer does not have to re-run manually.
  - [ ] `npm run build && npm run lint && npm run format && npm test` all green vs. the baselines in AC #12–#15.

- [ ] **Task 7 — Update `VENDOR.md` (AC: #18)**
  - [ ] Add a new row to the existing upgrade-procedure section: "After re-vendoring (step 2), re-run `npm run build` to confirm the codemod / bundler still accepts the new upstream tree. If the upstream adds a new register function, wire it into `src/tools/clickup-adapter.ts` per the existing pattern."
  - [ ] Do NOT revise the pinned SHA / date / branch — those stay at `c79b21e3` / `main` / `2026-04-21` because this story does not re-vendor.

- [ ] **Task 8 — Commit (AC: all)**
  - [ ] Stage in this order: `package.json`, `package-lock.json`, `tsconfig.clickup.json` (Option B) or `scripts/build-clickup.mjs` (Option A), `scripts/fix-esm-imports.mjs` (Option B), `src/tools/clickup-adapter.ts`, `src/server.ts`, `tests/unit/dependency-audit.test.ts`, `VENDOR.md`. (Putting `package.json` first keeps pre-commit's lint-staged-triggered dep-audit test happy if the hook re-runs it on a partial stage.)
  - [ ] Commit message: `feat(clickup): wire register-tools into server bootstrap` (follows story 1.1's `feat(clickup): vendor ...` precedent; `clickup` scope accepted by commitlint).
  - [ ] Commit body: summary, mode → tool-count matrix captured from Task 6 smoke tests, Option A vs B choice and one-sentence reason, reference to story key `1-2-wire-register-functions`.

## Dev Notes

### Learnings from story 1.1 that matter here

- **ESLint 9 flat-config only honors `eslint.config.mjs` `ignores`, not `.eslintignore`.** Story 1.1 added BOTH for defense-in-depth. Keep the pattern — this story does not need to touch either (vendored tree is still out of our lint scope), but if a future dev is tempted to "clean up the duplication", the `.eslintignore` is a documentary breadcrumb, not a live rule.
- **Prettier reformats repo-wide.** Story 1.1's Adaptation #3 reverted seven unrelated files prettier wanted to touch. Run `npm run format` once before committing, then inspect `git status`; revert unrelated reformats with `git checkout --` surgically. The ACs in this story restrict the expected diff set (see AC #17).
- **The `src/**/\*.js`rule in`.gitignore`line 18 is still a trap.** Our`src/tools/clickup-adapter.ts`is a`.ts`file, so it does not hit this rule. But if you add any`.js`/`.mjs`helper under`src/`, remember the negation `!src/tools/clickup/\*\*`only covers the vendored tree. Put scripts under`scripts/`, not `src/`.
- **Dep-audit test walks `src/**/\*.ts`recursively.** Story 1.1's`VENDORED_PATHS`was a workaround because we could not declare upstream deps yet. This story removes that workaround (AC #11). If`npm test`fails after your changes with "undeclared dependency imports", trust the test — the fix is in`package.json`, not in re-adding the exclusion.

### Upstream's MCP server shape (source of truth for AC #1, #2, #5)

Upstream's `src/tools/clickup/src/index.ts` (read this end-to-end before writing Task 3 — it is ~150 lines and it IS the spec for our adapter):

- Lines 7–16: static imports from `./tools/*` and `./resources/space-resources`. We replace this with dynamic imports in our adapter.
- Lines 23–30: `initializeServer()` pre-fetches `getCurrentUser()` and `getSpaceSearchIndex()` in parallel, logs `Connected as: ${user}`, and pre-computes the `formattedSpaces` string. Our adapter MUST do the first two (the register functions need `userData` to enrich tool descriptions). The pre-computed `formattedSpaces` is passed into server `instructions` — we are deliberately NOT exposing upstream's instructions string (our server's surface is BMAD + ClickUp unified; the `bmad` tool's own description carries BMAD-specific guidance, and ClickUp tool descriptions carry their own). If you disagree with dropping the instructions string, flag it in the commit body; don't silently include it.
- Lines 48–53: `new McpServer({name: "Clickup MCP", version: ...}, {instructions})`. We already have `new McpServer({name: SERVER_CONFIG.name, ...})` in our post-migration server.ts. Do not create a second `McpServer` instance — reuse ours.
- Lines 56–99: `server.registerPrompt("my-todos", ...)` with de/en language switch. Port as-is. The language switch reads `CONFIG.primaryLanguageHint === 'de'`; `CONFIG` is upstream's export from `src/tools/clickup/src/shared/config.ts` line 61. Our adapter imports `CONFIG` dynamically (see AC #4 rationale — the throw at line 70 triggers only if env vars are missing, and by this point in the adapter we have already guaranteed they are present).
- Lines 101–128: mode dispatch. This is the table we mirror in AC #1. Copy the exact list of register calls per mode.
- Lines 135–149: upstream's direct-stdio-start path and `isCliMode` heuristic. We do NOT port this — our transport is owned by `src/index.ts` / `src/index-http.ts` / `start()` in `server.ts`. The adapter is invoked from `start()` post-`initialize()`.

### Why `McpServer`, not `Server`

Upstream's register functions all use `server.tool(name, desc, schema, opts, handler)` — that API exists only on `McpServer`. Two alternatives were considered and rejected:

1. **Rewrite upstream's register functions to use the low-level `setRequestHandler(CallToolRequestSchema)`.** Rejected: this is exactly the "edit the vendored tree" pattern the read-only posture forbids. Upstream updates would mean re-applying the rewrite every re-vendor.
2. **Write a shim `ServerShim` class with the method signatures of `McpServer` but delegating to our `Server` instance.** Rejected: `McpServer`'s API surface is larger than `{tool, registerPrompt, registerResource}` (handlers for notifications, completions, lifecycle, etc.), and maintaining a shim is more work than migrating to `McpServer` outright. Also, `McpServer.server` is public for exactly this use case — high-level wrapper with an escape hatch to the low-level API.

One gotcha: `McpServer.server.setRequestHandler(...)` still works, so all our existing handlers can move verbatim. The migration is largely `this.server.xxx` → `this.server.server.xxx` for low-level calls, plus replacing the constructor line.

### Two paths for compiling the vendored tree

**Option B (preferred — secondary tsconfig + post-emit codemod)**

Pros:

- No new build tool. `tsc` already knows how to emit ESM. We own the codemod.
- Source maps from tsc map directly to the vendored `.ts` files — debugger experience is preserved.
- Incremental build works naturally — `tsc -p tsconfig.clickup.json` skips unchanged files.
- The only new artifact is a ~50-line codemod, which is reviewable and testable.

Cons:

- Requires the codemod to be correct. Edge cases: multi-line imports, bare imports that resolve through `index.js`, dynamic `import()`s with template strings (none in upstream at SHA `c79b21e3`, confirmed by grep), and re-exports `export { x } from './y'`. Handle all three in the codemod.
- The secondary tsconfig must loosen strict mode. Upstream code relies on implicit `any` in several places (e.g. `userData: any` in register function signatures, `(s: any)` in array filters). We accept looser type-checking on the vendored tree because it is upstream's responsibility, not ours.

**Option A (fallback — esbuild single-bundle)**

Pros:

- Single binary — `build/tools/clickup/index.js` — with all upstream code plus whatever tsconfig quirks are in scope. No import-extension problem because esbuild bundles.
- Tree-shakes unused code. For `read-minimal` mode, the `write`-only tools would not be in the bundle if we emitted per-mode bundles (but the register functions are barrel-imported, so this benefit is marginal).

Cons:

- `esbuild` is a new devDependency. Small (~10 MB) but non-trivial.
- Bundling hides upstream's file boundaries — debug stack traces point into the bundle, not into `src/tools/clickup/src/tools/task-tools.ts`. Source maps help but are an extra step.
- Any change to upstream's internal module graph requires a full rebuild; tsc's incremental build wins here.

**Recommendation**: Start with Option B. If the codemod turns into a rabbit hole (more than ~100 LOC or more than two edge cases beyond the three listed), switch to Option A and document the switch in the commit body.

### Why dynamic import (AC #4)

`src/tools/clickup/src/shared/config.ts` line 70 executes `throw new Error("Missing Clickup API key or team ID")` at module-evaluation time when `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` is empty. Every vendored register function transitively imports `CONFIG` from this file. A static import of `src/tools/clickup-adapter` from `src/server.ts` would therefore:

1. Import `clickup-adapter` at module evaluation.
2. Even if `clickup-adapter` has internal conditional logic, a static `import { register... } from './clickup/src/tools/task-tools.js'` at the top of `clickup-adapter` would evaluate `shared/config.ts`.
3. `shared/config.ts` would throw.
4. `server.ts` module evaluation would fail. BMAD-only usage would crash at startup.

Dynamic `await import('./clickup/src/tools/task-tools.js')` inside a function body that is only called when env vars are present avoids this. Do NOT be tempted to "fix" the issue by editing `shared/config.ts` — it is vendored, and story 1.3 handles the validation question properly.

### SDK 1.0.4 → 1.15.1 — what you actually need to know

Concrete, not hypothetical. Research digest so you don't have to chase releases yourself:

- **Installed version right now is `1.21.0`**, not 1.0.4. The `^1.0.4` range in `package.json` already lets npm resolve the latest 1.x on install. Verify locally: `cat node_modules/@modelcontextprotocol/sdk/package.json | grep version`. The story's bump to `^1.15.1` is a **floor bump** that protects against a hypothetical fresh install that resolves to <1.10.0 (which would break `src/http-server.ts`'s `StreamableHTTPServerTransport` import). The runtime behavior of the existing installed tree does not change.
- **`StreamableHTTPServerTransport` was introduced in SDK `1.10.0` (released April 17, 2025)** via PR #266 (see `modelcontextprotocol/typescript-sdk#266`). Before 1.10.0 the class did not exist; our `src/http-server.ts` line 3 import would fail. This is the real reason for the floor bump.
- **`onsessionclosed` hook on `StreamableHTTPServerTransport` was added in `1.15.1`.** Our `src/http-server.ts` line 71 uses it (`onsessionclosed: (id) => { sessions.delete(id); }`). If someone installs against a `<1.15.1` SDK they get a silent no-op (the option would be ignored before the hook existed). Pinning the floor to `^1.15.1` makes this load-bearing, not advisory.
- **`McpServer`'s `.tool()`, `.registerTool()`, `.registerPrompt()`, `.registerResource()` signatures are unchanged across the 1.0.4–1.15.1 window for our usage.** Upstream's `src/tools/clickup/src/tools/*.ts` calls `server.tool(name, desc, schema, opts, handler)` — that signature is stable throughout the 1.x line. No shim needed.
- **`Server` (low-level) → `McpServer` (high-level)** migration: both classes coexist in 1.x; `McpServer.server` is the public escape hatch to the low-level API. No deprecation in 1.x.
- **Forward warning (not actionable here):** `2.0.0-alpha.1` (released April 2026) **removes** the `.tool()`, `.prompt()`, `.resource()` method signatures in favor of `registerTool()` / `registerPrompt()` / `registerResource()` only. This story is on 1.x so `.tool()` keeps working. When a future story bumps to 2.x, the adapter's registration dispatch will need to map upstream's `.tool(...)` calls to `.registerTool(...)` — which means editing the vendored tree or wrapping `McpServer` in a shim. Flag for EPIC-1 story 1.7 (documentation) or a later maintenance story.

**What actually changes in this story's code because of the SDK floor bump:** nothing beyond the version range string in `package.json`. Verify by running `node --check build/index.js && node --check build/http-server.js` after `npm install` (re-lockfile is a no-op if you were already on 1.21.0).

### Integration-test interaction (AC #15)

`tests/integration/` on disk currently contains only `README.md` (the spec files the README advertises have not been written yet). Integration-level MCP fixtures live elsewhere:

- `tests/support/mcp-client-fixture.ts` — uses `Client` from `@modelcontextprotocol/sdk/client/index.js` + `StdioClientTransport` from `.../client/stdio.js`. Spawns our built `build/index.js` as a subprocess and speaks MCP over stdio.
- `tests/framework/helpers/mcp-helper.ts` — same client-side surface, richer helper (`listTools`, `callTool`, `getPrompt`, interaction recording).

Both are **client-side** — they do NOT import `Server`, `McpServer`, or `BMADServerLiteMultiToolGit` directly. The `Server → McpServer` migration in AC #6 changes server-side construction only; the client-facing protocol stays byte-identical (MCP is a protocol, not an API surface). Result: no fixture edits are required for this story. Run `npm test` after your changes and trust the green/red signal — no test-file prep work is owed.

`grep -r "setRequestHandler\|new Server(\|BMADServerLiteMultiToolGit" tests/` returns zero hits as of story-creation time. If that changes mid-implementation (e.g. someone adds a spec that pokes at low-level handlers), the AC #15 contract says the test must still pass — port the assertion to `McpServer` shape.

### Upstream CommonJS-ism in `src/tools/clickup/src/index.ts:50`

Upstream writes `version: require('../package.json').version` inside an ESM file — a CommonJS `require()` call that would throw `ReferenceError: require is not defined` under Node ESM at runtime. Two reasons this does not bite us:

1. Our adapter does NOT instantiate a new `McpServer` — we pass our existing server into upstream's register functions. The offending line (upstream's `new McpServer(...)` constructor argument) is therefore never evaluated.
2. The tsconfig.clickup.json exclude list (Task 2 Option B) OR the esbuild entry (Option A) can optionally skip `src/tools/clickup/src/index.ts` entirely — our adapter imports the individual `tools/*.ts` and `resources/*.ts` register functions directly, not upstream's `index.ts` barrel. Under Option B, add `src/tools/clickup/src/index.ts` to the tsconfig.clickup.json `exclude` array alongside `tests/**`, `test-utils.ts`, `cli.ts`. Under Option A, simply don't make it the bundler entry.

Flagging this in Dev Notes (not ACs) because the fix is a one-line config exclude, not a behavior requirement. If the dev forgets and includes `index.ts`, tsc will emit the `require()` call into `build/tools/clickup/src/index.js` where Node ESM will blow up at any import time — but nothing imports that file, so the bomb sits unarmed. Still cleaner to exclude it.

### `@types/mdast` — why it is needed

`src/tools/clickup/src/clickup-text.ts` line 8:

```typescript
import type {
  Root,
  PhrasingContent,
  Link,
  Text,
  Content,
  Heading,
  Paragraph,
  Blockquote,
  List,
  ListItem,
  Code,
} from 'mdast';
```

The `mdast` package is a pure-types package on npm; the actual types live in `@types/mdast`. Without the `@types/mdast` devDependency, tsc emits `Cannot find module 'mdast'` under Option B (type-only imports are erased at emit, but tsc still checks them). Under Option A with esbuild, type-only imports are erased before type-checking happens, so esbuild would not complain — but we still want tsc to type-check our adapter, which imports from the vendored tree; broken types there would surface eventually.

### `node:http` + `node:buffer` in dep-audit test

Story 1.1 Completion Notes flagged a pre-existing test failure: `src/http-server.ts imports 'node:http' which is not in package.json`. This is in our OWN code (`src/http-server.ts` line 1), not upstream's. The dep-audit test's `builtinModules` set omits several Node built-ins — `node:http`, `node:buffer`, `node:crypto` (actually present), etc. AC #11 closes this gap. After this story, the dep-audit test's `builtinModules` set should be a superset of every builtin actually used in `src/**/*.ts`, upstream or ours.

### `http-server.ts` interaction

`src/http-server.ts` line 3 imports `StreamableHTTPServerTransport` from the same SDK. Bumping `@modelcontextprotocol/sdk` to `^1.15.1` (AC #7) might change this transport's API. Check the SDK changelog for `StreamableHTTPServerTransport` between 1.0.4 and 1.15.1. Expect breaking changes in the `onsessioninitialized` / `onsessionclosed` hooks or the constructor options. If so, port `http-server.ts` to the new shape — this is in-scope for AC #6 ("four existing MCP surfaces of our server MUST continue to work byte-identically"). AC #17 excludes `bmad-engine`, `bmad-unified`, `resource-loader` from the diff — it does NOT exclude `http-server.ts`.

### `cli.ts` interaction

`src/cli.ts` (our CLI, not upstream's) imports from `./server.js` too. The migration from `Server` → `McpServer` should not affect CLI — CLI bypasses MCP transport entirely. But verify `npm run cli:list-agents` still returns the agent count after your changes.

### Testing standards

- No new unit tests in this story. Wiring correctness is exercised by smoke tests against a real ClickUp workspace (stories 1.5, 1.6). Adding unit tests here would require mocking `McpServer` registrations and `fetch()` calls — high-noise, low-signal given the smoke tests coming next.
- `npm test` (= `vitest run tests/unit tests/integration`) must hit 195/195 passing. Story 1.1 left it at 194/195 with the pre-existing `node:http` failure; AC #11 closes that.
- If `npm test` regresses to 194/195 because of an import-chain change in the SDK bump or the `Server → McpServer` migration, that is a real regression — do NOT paper over with a new exclusion.

### Project structure notes

- `src/tools/clickup-adapter.ts` is a new file at the same level as `src/tools/bmad-unified.ts`. The flat-by-concern tools layout is the established pattern.
- `scripts/fix-esm-imports.mjs` (Option B) lives under `scripts/`, next to `scripts/bmad-cli.mjs`, `scripts/show-list-agents.mjs`, etc. Same convention.
- `tsconfig.clickup.json` (Option B) lives at repo root alongside `tsconfig.json` and `tsconfig.test.json`. Same convention.

### References

- [EPIC-1 §Outcomes bullet 2](../epics/EPIC-1-clickup-mcp-integration.md) — "`register*Tools` functions wired into the existing MCP bootstrap."
- [EPIC-1 §Exit criteria](../epics/EPIC-1-clickup-mcp-integration.md) — "All smoke tests pass against a real ClickUp workspace" (stories 1.5–1.6 depend on this story's wiring). "No edits to BMAD-METHOD source" (still in force; vendored tree is read-only per story 1.1).
- [PRD §Functional requirement #1](../PRD.md) — "`bmad-mcp-server` exposes ClickUp tools... alongside BMAD agent/workflow tools, as one MCP server." This story is where "one MCP server" becomes literal.
- [PRD §Customization boundary](../PRD.md) — `bmad-mcp-server/src/custom-skills/` is the customization layer; this story adds a pure-dispatch layer at `src/tools/clickup-adapter.ts`, which is NOT custom-skills. The two are orthogonal: custom-skills overrides BMAD behavior via `customize.toml`, the adapter plumbs ClickUp's upstream surface into our MCP server. Do not conflate.
- [Story 1.1 §Review Findings](./1-1-vendor-clickup-mcp-source.md) — deferred items that this story picks up:
  - "Dep-audit no longer enforces vendored import versions against root `package.json`" → resolved by AC #11.
  - "Add `'**/src/tools/clickup/**'` to `vitest.config.ts#test.exclude` / `coverage.exclude`" → already resolved in `vitest.config.ts` (lines 15, 39); no action needed here.
  - "Extract `findTsFiles`/`isVendored` out of the two `it()` blocks" → opportunistic pickup in Task 5 if low-cost.
- [Story 1.1 §Out of Scope bullet 1](./1-1-vendor-clickup-mcp-source.md) — "Fixing any TypeScript / ESM import-extension mismatches in vendored code... This is story 1.3's problem" — the story 1.1 numbering used "1.3" before the final sprint-status renumbering; this story (1.2 in the final numbering) owns that work.
- [VENDOR.md §Upstream runtime dependencies](../../VENDOR.md) — authoritative list of six deps to add in AC #7.
- [VENDOR.md §Upgrade procedure](../../VENDOR.md) — Task 7 adds the "re-run `npm run build`" note.
- [CLAUDE.md §Architecture](../../CLAUDE.md) — "BMADEngine is transport-agnostic — it returns plain TypeScript objects, not MCP types." This invariant is why AC #17 excludes `bmad-engine` from the expected diff. The migration to `McpServer` happens strictly at the server layer.
- [CLAUDE.md §Conventions](../../CLAUDE.md) — "No console.\*: Use src/utils/logger.ts." The one allowed exception today is `src/server.ts`'s existing `console.error` calls at startup. If you add a new startup log line in Task 4, prefer `logger`; if you add it in `src/server.ts` adjacent to existing `console.error`s, matching the local style is fine.
- Upstream wiring reference: `src/tools/clickup/src/index.ts` lines 22–132 (the `initializeServer()` body). This is the single most important file to read before Task 3.
- Upstream register-function signatures: every file in `src/tools/clickup/src/tools/*.ts` exports one or two `register*` functions with the signature `(server: McpServer, userData?: any) => void`. The `userData` parameter is pre-fetched by the adapter.
- MCP SDK `McpServer`: defined in `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` after the SDK bump. Read the class definition and its `.server` getter before Task 4.
- `commitlint.config.cjs` — no `scope-enum` rule, confirmed by story 1.1; `feat(clickup)` is accepted.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/tools/clickup-adapter.ts` — dispatch shim that dynamic-imports the vendored tree and calls the correct `register*Tools` subset per `CLICKUP_MCP_MODE` (AC #4, #5)
- `tsconfig.clickup.json` — secondary tsconfig compiling the vendored tree with loosened strict mode (Option B) — OR —
- `scripts/build-clickup.mjs` — esbuild bundler script (Option A)
- `scripts/fix-esm-imports.mjs` — post-emit codemod adding `.js` to bare relative imports (Option B only)

**Modified**

- `package.json` — dependency reconciliation per AC #7; `build` script now includes the vendored-tree compile step
- `package-lock.json` — regenerated by `npm install` after the dep changes
- `src/server.ts` — migrated from `Server` to `McpServer`; calls `registerClickUpTools` in `start()` after `initialize()` (AC #6)
- `tests/unit/dependency-audit.test.ts` — `VENDORED_PATHS` guard removed; builtin set expanded (AC #11)
- `VENDOR.md` — upgrade procedure gains a one-line note about re-running `npm run build` to exercise the codemod / bundler (AC #18)

**Untouched (explicitly)**

- `src/tools/clickup/**` (vendored tree — read-only per story 1.1 and PRD §Customization boundary)
- `BMAD-METHOD/**` (upstream BMAD — read-only per EPIC-1 Exit criteria)
- `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts` (BMAD engine + unified-tool surface; AC #17)
- `src/http-server.ts` — MAY be modified if and only if the SDK bump introduces a breaking change in `StreamableHTTPServerTransport`. If so, note the change in commit body.
- `.gitignore`, `.eslintignore`, `.prettierignore`, `eslint.config.mjs`, `vitest.config.ts` (vendored-tree ignore configuration from story 1.1; AC #10)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Story drafted from EPIC-1 bullets 3+7 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-21 | Validation pass (checklist): narrowed AC #11 to scan-exclude only upstream test/CLI plumbing (dodges `undici`/`dotenv` false positives); added Dev Notes §"SDK 1.0.4 → 1.15.1" with concrete migration findings (installed is 1.21.0; floor bump only); added Dev Notes §"Integration-test interaction" + §"Upstream CommonJS-ism" to surface dead-code traps in `src/tools/clickup/src/index.ts:50`; sharpened Task 5 helper extraction + `isExcluded` hardening to close 2 deferred story-1.1 review items; excluded `index.ts` from Option B tsconfig + restructured Option A esbuild to per-register-fn entries. |
