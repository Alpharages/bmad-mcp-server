# Story 1.5: Smoke-test ClickUp CRUD round-trip (create task → comment → status update)

Status: ready-for-dev

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Fifth story in EPIC-1. Stories 1.1–1.4 vendored upstream's ClickUp tool tree, wired the register functions, added env-var validation with a `BMAD_REQUIRE_CLICKUP` hard-fail posture, and delivered the session-scoped space picker. This story finally validates the outcome promised in EPIC-1 §Outcomes bullet 4 — "create task, add comment, update status ... round-trip successfully against a real ClickUp workspace" — by authoring a repeatable, opt-in smoke harness at `scripts/smoke-clickup-crud.mjs` that drives the full `initialize → tools/list → getListInfo → createTask → getTaskById → addComment → updateTask(status) → getTaskById → DELETE cleanup` sequence over both stdio and HTTP transports. As a load-bearing prerequisite, this story also **closes the HTTP-mode tool-registration gap** that stories 1.2/1.3/1.4 inherited and forward-pointed here (stories 1.3 AC #7, 1.4 AC #15): today `registerClickUpTools` is invoked only from `BMADServerLiteMultiToolGit.start()` (stdio-only), so a live HTTP session at `src/http-server.ts:74` exposes zero ClickUp tools. Without closing that gap the HTTP smoke path cannot exist, and EPIC-1's exit-criteria ("smoke tests pass against a real ClickUp workspace") fails on the PRD's primary deployment shape.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a repeatable smoke-test harness at `scripts/smoke-clickup-crud.mjs` that drives a live ClickUp CRUD round-trip (initialize → tools/list → getListInfo → createTask → getTaskById → addComment → updateTask(status) → getTaskById → direct-`fetch` DELETE cleanup) across both stdio (`node build/index.js` as child process) and HTTP (`node build/index-http.js` + `POST /mcp`) transports — gated on `CLICKUP_API_KEY` / `CLICKUP_TEAM_ID` / `CLICKUP_SMOKE_LIST_ID` env vars, opt-in via `npm run smoke:clickup` (explicitly NOT part of `npm test` or CI), creating a uniquely-named `[bmad-smoke] CRUD roundtrip <timestamp>-<random>` task per run for re-run safety, self-cleaning unless `--keep-task` is passed — AND I want `src/server.ts` refactored so that a single private `ensureInitialized()` path runs `this.initialize()` + `registerClickUpTools(this.server, this.clickUpSession)` idempotently, called from BOTH `start()` (stdio) and `connect()` (HTTP) **before** `this.server.connect(transport)` returns, so that (a) the 1.2/1.3/1.4-inherited HTTP tool-registration gap is closed and each per-session `BMADServerLiteMultiToolGit` (HTTP, `src/http-server.ts:74`) exposes the same ClickUp tool surface as stdio, (b) the race between transport-accepted `tools/list` requests and async `registerClickUpTools` is eliminated by ordering init-before-connect, (c) the smoke harness can prove both transports round-trip against a real workspace with a single `npm run smoke:clickup && npm run smoke:clickup:http` invocation, and (d) EPIC-1 §Exit-criteria's "all smoke tests pass against a real ClickUp workspace" is verifiable end-to-end — all without editing the vendored tree (`src/tools/clickup/**` stays read-only per story 1.1 AC #2), without adding runtime or dev dependencies (harness uses only Node built-ins: `node:child_process`, `node:readline`, `globalThis.fetch`, `node:crypto`), without touching `src/tools/bmad-unified.ts` / `src/tools/operations/**` / `src/core/**` / `src/cli.ts` (BMAD engine + unified-tool surface invariant from stories 1.2–1.4), and without wiring the smoke path into any GitHub Actions workflow (credential leak + rate-limit + non-determinism hazards — smoke stays developer-gated).

## Acceptance Criteria

1. A new standalone script `scripts/smoke-clickup-crud.mjs` exists. Shape:
   - Node ES-module script (`.mjs` extension; top-of-file is plain JS, no TypeScript).
   - NOT imported by any `src/` file. NOT a vitest test. NOT discovered by `vitest run tests/unit tests/integration`.
   - CLI signature: `node scripts/smoke-clickup-crud.mjs <transport> [--keep-task]` where `<transport>` ∈ `{stdio, http}`. Missing or invalid `<transport>` prints a usage block to stderr and exits with code 1.
   - `--keep-task` skips the final DELETE cleanup so an operator can inspect the created task in the ClickUp UI. Default is cleanup-enabled.
   - The script is executable (`chmod +x` via a `build` step or by declaring `#!/usr/bin/env node` at the top and committing with executable bit). Do NOT add a build step to `package.json`'s `build` script for this file — keep it separate so it doesn't accumulate into `build/`.

2. Environment contract — the script validates these at startup and exits with code 2 + a structured stderr diagnostic if any required var is missing or whitespace-only:
   - `CLICKUP_API_KEY` (required) — per-user ClickUp personal token (same semantics as story 1.3 AC #1).
   - `CLICKUP_TEAM_ID` (required) — workspace ID.
   - `CLICKUP_SMOKE_LIST_ID` (required) — the list the smoke harness creates its task in. The operator MUST pre-create this list in the target workspace; the harness does NOT create lists, spaces, or folders. This keeps the smoke side-effect surface to exactly one task per run.
   - `CLICKUP_SMOKE_PORT` (optional, default `3456`) — port used for the HTTP transport mode only. Intentionally NOT `3000` to avoid collision with the operator's running dev server.
   - `BMAD_API_KEY` (optional) — if set, the HTTP-mode harness sends `x-api-key: <value>` on every `/mcp` request per `src/http-server.ts:20`'s auth check.
   - `BMAD_REQUIRE_CLICKUP` is NOT consumed by the harness (the harness asserts ClickUp is enabled via `tools/list` rather than by checking env posture — see AC #5).

3. Unique task name per run. Format: `[bmad-smoke] CRUD roundtrip <ISO-UTC-timestamp>-<random-suffix>` where `<random-suffix>` is 6 base36 chars from `node:crypto.randomBytes(4).toString('base64url').slice(0, 6)` (or equivalent). Examples:
   - `[bmad-smoke] CRUD roundtrip 2026-04-21T18:32:11Z-ez81xk`
     The `[bmad-smoke]` prefix is load-bearing — operators rely on searching it in the ClickUp UI to verify cleanup worked and to bulk-delete stragglers after a failed run. Do NOT parametrize the prefix via env var (scope creep; no user story demands it).

4. Operation sequence. Both transports run the same ten-step flow (nine operations + one cleanup step); only the transport wiring differs:
   a. **Boot server.** Stdio: spawn `node build/index.js` as a child process with `stdio: ['pipe', 'pipe', 'inherit']`; parent writes JSON-RPC requests to stdin (line-delimited), reads responses from stdout via `node:readline`. HTTP: spawn `node build/index-http.js` as a child process (inherits stderr, discards stdout); wait for the `HTTP Server listening` banner OR up to 10 s; then `POST http://127.0.0.1:${CLICKUP_SMOKE_PORT}/mcp` with the JSON-RPC payloads.
   b. **`initialize`.** Assert JSON-RPC `result.capabilities.tools` is present. Capture `Mcp-Session-Id` from HTTP response headers for subsequent HTTP calls.
   c. **`tools/list`.** Assert the response contains at minimum: `bmad`, `createTask`, `addComment`, `updateTask`, `getTaskById`, `getListInfo`. If `pickSpace` is present (post story-1.4), also assert it and include in the log summary. If `bmad` is the ONLY tool returned, the script fails with `step=c reason="ClickUp tools not registered — verify CLICKUP_API_KEY / CLICKUP_TEAM_ID"` and exits 1 (covers the case where env vars are present in the parent shell but the child process somehow didn't inherit them, or where the HTTP-mode registration gap from 1.2/1.3/1.4 was not closed per AC #7).
   d. **`tools/call getListInfo {list_id: $CLICKUP_SMOKE_LIST_ID}`.** Parse the response text (upstream returns a human-readable format, see `src/tools/clickup/src/tools/list-tools.ts:77-83`) to extract the `statuses` list. Capture `statusFrom` (the first status — typically `to do` / `backlog` / `open` depending on the list) and `statusTo` (a different status present in the same list — prefer `in progress` if available, else the second status in the list). If fewer than two distinct statuses are returned, fail with `step=d reason="list has <2 statuses — cannot validate status transition"`.
   e. **`tools/call createTask {list_id: $CLICKUP_SMOKE_LIST_ID, name: <smokeName>, description: "smoke-roundtrip probe from bmad-mcp-server story 1-5", status: <statusFrom>}`.** Parse `task_id` from the response text (upstream emits `id: <task_id>` per `src/tools/clickup/src/tools/task-write-tools.ts`'s `formatTaskResponse`). Capture it for use in steps f–i and the cleanup step.
   f. **`tools/call getTaskById {task_id}`.** Assert the returned task `name` matches `<smokeName>` byte-for-byte and the status is `statusFrom` (case-insensitive compare — upstream normalizes status display differently on create vs read).
   g. **`tools/call addComment {task_id, comment: "smoke-roundtrip probe @ <ISO-UTC>"}`.** Assert the response text contains `Comment added successfully` (upstream's literal success string per `src/tools/clickup/src/tools/task-write-tools.ts:77`). Capture `comment_id` from the `comment_id: <id>` line.
   h. **`tools/call updateTask {task_id, status: <statusTo>}`.** Assert the response text does NOT contain `Error updating task:`.
   i. **`tools/call getTaskById {task_id}`.** Assert the status is now `statusTo` (case-insensitive). This is the round-trip proof: the CRUD path wrote, then a fresh read sees the write.
   j. **Cleanup** (unless `--keep-task` is set): direct `fetch('DELETE', \`https://api.clickup.com/api/v2/task/${task_id}\`, { headers: { Authorization: $CLICKUP_API_KEY } })`. This bypasses MCP because upstream exposes no `deleteTask` tool. On non-2xx, log the response body and set the process exit code to 3 (AC #6) but preserve the PASS line from step i.

5. Per-step logging to stderr only. Stdout is reserved for JSON-RPC traffic to the stdio subprocess and MUST stay clean. Every step logs exactly one line of the form `[smoke][<transport>][<step-letter>] <message>` on success — e.g. `[smoke][stdio][c] tools/list returned 15 tools including createTask, addComment, updateTask, getTaskById, getListInfo, pickSpace`. The final summary line (on both PASS and FAIL) is a single line with machine-parseable fields:
   - PASS: `SMOKE PASS transport=<stdio|http> task_id=<id> comment_id=<id> status_from="<name>" status_to="<name>" elapsed_ms=<n>`
   - FAIL: `SMOKE FAIL transport=<t> step=<letter> reason="<message>" elapsed_ms=<n>`
     On FAIL, the failing step's full JSON-RPC request AND response are dumped to stderr (pretty-printed with `JSON.stringify(..., null, 2)`) immediately before the summary line, so an operator can diagnose without re-running. Successful steps stay one-line to keep signal-to-noise high.

6. Exit codes:
   - `0` — all assertions passed; cleanup succeeded (or was intentionally skipped via `--keep-task`).
   - `1` — assertion failure, JSON-RPC protocol error, MCP server crash, or process-spawn failure.
   - `2` — missing or malformed env config (from AC #2).
   - `3` — CRUD round-trip passed but cleanup DELETE failed. Operator must hand-delete the task; task ID is included in the PASS summary so it's still recoverable. Rationale: a cleanup failure does NOT invalidate the round-trip — the workflow itself worked.

7. Close the HTTP-mode tool-registration gap in `src/server.ts`:
   - Extract a private `ensureInitialized(): Promise<void>` method on `BMADServerLiteMultiToolGit`.
   - It runs, in order: (1) `await this.initialize()` (the existing `BMADEngine.initialize()` path), (2) the existing banner logs (`Loaded N agents, ...`), (3) `await registerClickUpTools(this.server, this.clickUpSession)` (or `registerClickUpTools(this.server)` if story 1.4's signature extension has not yet landed on main — thread whichever signature is current; do NOT modify the adapter signature in this story), (4) the existing one-liner ClickUp banner log from `start()`'s current `.then()` block.
   - `start()` calls `ensureInitialized()` BEFORE `this.server.connect(stdioTransport)` returns (NOT inside a `.then()` chain post-connect like today). Ordering matters: `McpServer.tool()` registrations must be present before the transport starts accepting `tools/list` requests, otherwise an early client request races the async ClickUp registration path. This changes stdio's startup flow cosmetically (banner appears before `BMAD MCP Server started` line; acceptable).
   - `connect(transport)` calls `ensureInitialized()` BEFORE `this.server.connect(transport)`. This is the load-bearing HTTP fix — per-session `new BMADServerLiteMultiToolGit(...)` at `src/http-server.ts:74-76` now transparently registers ClickUp tools inside `await bmadServer.connect(transport)` before `transport.handleRequest(req, res, body)` is invoked on line 76.
   - Keep the `.catch((err) => console.error('BMAD init error:', err))` behavior from the current `.then()` block: an init failure in stdio mode logs-and-continues (so a BMAD-only server still boots even if ClickUp validation fails in soft-disable mode; story 1.3's hard-fail path under `BMAD_REQUIRE_CLICKUP=1` still exits via the adapter's disabled branch — that semantics is story 1.3's, not this story's). In HTTP mode, init failure propagates out of `connect()` and is caught by `handleMcp`'s existing `try/catch` at `src/http-server.ts:100-123`, which returns HTTP 500 to the client. That is an acceptable regression for an operator who intentionally misconfigures — they get a clear 500 instead of a silently-empty tool surface.

8. `ensureInitialized()` is idempotent and concurrency-safe via a single `initPromise` field:
   - Add `private initPromise: Promise<void> | null = null;` alongside `private initialized = false;` on `BMADServerLiteMultiToolGit`.
   - On first call, `ensureInitialized()` sets `this.initPromise = this.doInitialize()` and returns that promise.
   - On subsequent calls (e.g. a paranoid caller or future transport that calls it twice), it returns the existing `initPromise` — no duplicate `registerClickUpTools` call.
   - If `doInitialize()` rejects, `ensureInitialized()` sets `this.initPromise = null` before rethrowing so the next call retries. Do NOT cache a failure forever — a transient network hiccup during first-run ClickUp `getCurrentUser()` would otherwise permanently break the server instance.
   - `this.initialized` boolean stays as-is (still flipped true inside `initialize()`) so existing `await this.initialize()` calls inside the `setupHandlers()` request handlers continue to short-circuit correctly.

9. Per-session isolation in HTTP mode is preserved:
   - Each HTTP session's `new BMADServerLiteMultiToolGit(...)` at `src/http-server.ts:74` gets its own `initPromise` field, its own `clickUpSession` (story 1.4 AC #2), and its own ClickUp tool registrations on its own `McpServer` instance. No cross-session bleed is possible.
   - The `ensureInitialized()` refactor does NOT introduce any module-level state. `initPromise` is instance-scoped.
   - Verified structurally by AC #24's unit test (two instances → two independent init paths).

10. A new unit test file `tests/unit/server-init.test.ts` exercises `ensureInitialized()`:
    - Construct `BMADServerLiteMultiToolGit` and spy on `this['initialize']` + the `registerClickUpTools` import (use `vi.mock('../../src/tools/clickup-adapter.js', ...)` to inject a spy). Call `connect` with a mock transport twice → assert `initialize` and `registerClickUpTools` were each called exactly once.
    - Mock `registerClickUpTools` to reject on the first call (synthetic `Error('boom')`), resolve on the second. Call `connect` → first call rejects with the boom; call `connect` again on the SAME instance → second call succeeds (verifies `initPromise = null` on failure per AC #8).
    - Construct two separate instances, connect each to its own mock transport → each instance's `registerClickUpTools` spy is called exactly once (verifies AC #9 per-instance isolation).
    - Mock transport: a minimal fake satisfying the `Transport` interface from `@modelcontextprotocol/sdk/shared/transport.js` — `start`, `close`, `send` no-ops, plus the required event handlers set by the SDK. Grep for `class InMemoryTransport` in `node_modules/@modelcontextprotocol/sdk` before authoring to see if a test-friendly transport already exists; if so, use it; else inline a ~20-LOC no-op transport as a fixture at the top of the test file. Document the choice in a comment.
    - The test file does NOT import from `src/tools/clickup/src/**` (vendored tree must not evaluate in unit tests — its `shared/config.ts:70-72` throws on empty env per story 1.2 AC #4's rationale).

11. No new runtime or dev dependencies. The smoke script uses only:
    - Node built-ins: `node:child_process` (spawn), `node:readline` (line-delimited JSON-RPC read from stdio subprocess), `node:crypto` (random suffix), `node:http` (POST to `/mcp`), `node:url`, `node:process`, `globalThis.fetch` (available in Node 18+ per `.nvmrc` pinning 22.14.0).
    - NO axios, NO undici, NO chalk, NO dotenv (env is expected from the parent shell, same as the rest of the server's runtime contract per story 1.3 Dev Notes §"No dotenv auto-load").
    - NO dev deps either. The test from AC #10 uses vitest (already in tree) + the SDK's transport types (already imported elsewhere in `src/`).

12. `tests/unit/dependency-audit.test.ts` requires no changes. Rationale: the audit walks `src/` only (per `findTsFiles(SRC_ROOT)` at the top of that test), and `scripts/smoke-clickup-crud.mjs` is outside that tree. The new test file `tests/unit/server-init.test.ts` imports only already-declared packages (`@modelcontextprotocol/sdk`, `vitest`) plus `../../src/server.js`. The `SCAN_EXCLUDED_PATHS` three-entry list from story 1.2 AC #11 stays untouched. If a future story extends the audit to scan `scripts/`, that story owns the decision — not this one.

13. `package.json` gains two new script entries in the `scripts` block, placed after the existing `cli:list-workflows` entry and before the `"files"` key:

    ```json
    "smoke:clickup": "node scripts/smoke-clickup-crud.mjs stdio",
    "smoke:clickup:http": "node scripts/smoke-clickup-crud.mjs http",
    ```

    The entries do NOT depend on `npm run build` — the harness script assumes the operator has already built (`build/index.js` + `build/index-http.js` must exist for the spawn targets). Document this prerequisite in README per AC #14.

14. `README.md` gains a new subsection §"Running the ClickUp smoke tests" under the existing environment/ClickUp area (add it after the env-var table introduced by story 1.3 AC #10). Content (approximate — exact wording at author's discretion):
    - **Prerequisites.** A pre-created list in the target ClickUp workspace with at least two distinct statuses. The list's ID (last segment of the ClickUp list URL, or from the `getListInfo` tool output during a dev session). A valid `CLICKUP_API_KEY` with permissions to create tasks, comment, update status, and DELETE tasks in that list.
    - **Build prerequisite.** Run `npm run build` before the first smoke invocation — the harness spawns `build/index.js` / `build/index-http.js` as child processes.
    - **Command.** `CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup` (stdio) or `... npm run smoke:clickup:http` (HTTP, uses `CLICKUP_SMOKE_PORT` or default 3456). Run both to cover both transports.
    - **What it verifies** (one paragraph): initialize → tool list → getListInfo → createTask → getTaskById → addComment → updateTask(status) → getTaskById → DELETE cleanup. See PRD §Success-criteria and EPIC-1 §Outcomes.
    - **Expected output.** A single `SMOKE PASS transport=<t> task_id=<id> ...` line on stderr with exit code 0. A failing run prints `SMOKE FAIL transport=<t> step=<letter> reason="..."` + the failing request/response pair.
    - **Cleanup.** On PASS the harness DELETEs the smoke task (unless `--keep-task`). On FAIL between steps e and j the task may be left behind — search ClickUp for `[bmad-smoke]` to audit and hand-delete.
    - **Why it's not in CI.** Brief note pointing at Dev Notes §"Why a script not a vitest test, why not in CI" for the full rationale. Don't duplicate the rationale in README.

15. The smoke harness is NOT added to `.github/workflows/ci.yml`, `release-draft.yml`, `release-publish.yml`, or `pr-title-check.yml`. CI remains lint → unit → integration → build only. A single `grep -n 'smoke' .github/workflows/*.yml` post-commit MUST return zero matches from lines this story introduces. Rationale in Dev Notes.

16. The harness invokes MCP tools EXCLUSIVELY via JSON-RPC over the chosen transport. It MUST NOT:
    - Import anything from `src/` (treats the server as a black box).
    - Reach into the vendored tree directly (`src/tools/clickup/**`).
    - Call `registerClickUpTools` or `BMADServerLiteMultiToolGit` in-process.
    - Use any MCP SDK helper for HTTP (`Client.connect`, etc.) — keep it dependency-free; a hand-rolled `fetch`-based JSON-RPC client is ~40 LOC and has zero surprise.
      Rationale: a black-box smoke proves the real transport + real serialization + real schema validation works end-to-end, which is exactly the failure mode unit tests can't catch.

17. Idempotency of the harness itself: re-running `npm run smoke:clickup` N times creates N distinct tasks (one per run, per AC #3's uniqueness). Cleanup-on-pass ensures the workspace accumulates zero artifacts across a series of green runs. A series that includes red runs may accumulate orphaned tasks — the `[bmad-smoke]` prefix makes these discoverable.

18. The harness is re-entrant-safe across transports: running `npm run smoke:clickup` and `npm run smoke:clickup:http` back-to-back on the same workspace MUST succeed — the two runs use distinct task names (timestamp differs by at least the HTTP child-process boot time, and the random suffix decouples name collision further).

19. Concurrent invocations of the HTTP smoke against the default port MAY collide (EADDRINUSE on the second spawn). The harness logs a clear error on `listen` failure (`SMOKE FAIL step=a reason="port 3456 already in use — set CLICKUP_SMOKE_PORT"`). Do NOT implement port auto-selection — explicit env-var-driven port keeps debugging simple.

20. `npm run build` passes cleanly. The `src/server.ts` refactor is strict-TypeScript-compatible: `ensureInitialized` and `initPromise` are strongly typed (`Promise<void> | null`), the helper `doInitialize` returns `Promise<void>`, and no new `any` is introduced.

21. `npm run lint` produces the same lint baseline story 1.4 lands with on `main`. No new findings introduced by `src/server.ts` edits, `tests/unit/server-init.test.ts`, or `scripts/smoke-clickup-crud.mjs`. The `.mjs` script is picked up by the ESLint flat config per `package.json`'s `lint` script (`--ext .ts,.js,.mjs`) — so the harness must be eslint-clean too. Use `const` / `let` consistently, no `var`, no unused imports, no `console.log` (use `console.error` for stderr logging).

22. `npm run format` produces no churn. Run before commit. The harness script is prettier-clean under the existing config (single quotes, 2-space indent, 80-char width).

23. `npm test` passes. Expected delta vs story 1.4's green baseline: `+ ~3 tests` from `tests/unit/server-init.test.ts` (AC #10) `+ 0 failures`. Do NOT hard-code an absolute test count — story 1.4's tests may still be in flight at the time this story is picked up.

24. `tests/unit/server-init.test.ts` authored per AC #10 covers: (i) `ensureInitialized` runs its body exactly once across N `connect` calls on the same instance; (ii) a failed init clears `initPromise` so a retry succeeds; (iii) two instances have independent init state. These three cases bound the concurrency contract of the refactor.

25. No edits to vendored tree. `git diff --stat -- src/tools/clickup/src/` prints nothing. Same invariant as stories 1.1–1.4.

26. No edits to `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts`, or `src/index.ts` / `src/index-http.ts`. `git diff --stat` on those paths prints nothing. Same invariant as story 1.4 AC #19.

27. No edits to `src/http-server.ts` beyond what AC #7 demands as a consequence of `connect()`'s new semantics. Specifically: no new imports, no new session-store fields, no auth changes. The `ensureInitialized`-inside-`connect()` call is transparent to `handleMcp`. If `git diff --stat -- src/http-server.ts` shows lines added in this story, those lines are scope creep — revert and re-scope.

28. No edits to `src/tools/clickup-adapter.ts`. Story 1.5 is not the place to change the adapter's signature, the dynamic-import dispatch, or the env-validator integration. Those are stories 1.3 / 1.4's scope. `git diff --stat -- src/tools/clickup-adapter.ts` prints nothing from this story's changes.

29. The commit message follows conventional-commits and is scoped `clickup`: `feat(clickup): smoke-test CRUD round-trip and close HTTP tool-registration gap`. The commit body captures (a) the new smoke harness + its stdio/http modes, (b) the `ensureInitialized` refactor closing the 1.2/1.3/1.4-inherited HTTP gap, (c) the two new npm script entries, (d) the README section added, (e) the explicit decision to keep smoke out of CI with a one-sentence rationale (credentials + rate limits), (f) link back to story key `1-5-smoke-test-crud` and to EPIC-1 §Outcomes bullet 4.

## Out of Scope (explicitly deferred to later stories)

- **Automated live-API smoke in CI.** Forbidden in this story per AC #15. If a future story wants CI coverage, it'll need: secure secret injection (GitHub Actions encrypted secrets), a dedicated CI workspace in ClickUp (to isolate from team work), rate-limit budgeting, and a retry/backoff policy for flake tolerance. All four are substantial design decisions — not smoke-story scope.
- **Cross-list parent/subtask smoke** — **story 1.6**. This story's CRUD happens in a single list; no parent linkage. Story 1.6 validates the PRD §ClickUp-layout bullet "Stories → subtasks of an epic (parent = epic task), living in the active Sprint list" by creating an epic in one list, a story as subtask of that epic in a DIFFERENT list, and asserting ClickUp accepts the cross-list parent relationship (R1 in PRD §Risks).
- **Dev-agent story-creation end-to-end** — EPIC-2 scope. The Dev story-creation flow composes `pickSpace` → `getListInfo` (epic list) → `searchTasks` (pick epic) → `getListInfo` (sprint list) → `createTask` (with `parent_task_id`). Story 1.5's harness is the unit-level proof that each individual tool works; EPIC-2 proves they compose.
- **Dev-agent comment/status flow** — EPIC-3 scope. Dev's progress comments (`addComment`) and status transitions (`updateTask`) on consumed tasks follow the same primitive operations as this smoke test, just driven by a different agent prompt. The primitives are proven here; the agent orchestration is proven in EPIC-3.
- **Deleting tasks via an MCP tool.** Upstream exposes no `deleteTask` tool, by design (`task-write-tools.ts:15-420` lists `addComment`, `updateTask`, `createTask` only). Story 1.5's cleanup uses a direct `fetch` DELETE to `https://api.clickup.com/api/v2/task/{id}` — fine for a smoke harness because the harness is not an MCP consumer, it's a test driver. Do NOT add a `deleteTask` MCP tool in this story. If a future team wants one (e.g. for automated test-workspace maintenance), it belongs in a dedicated story that considers the safety surface (accidental delete from an LLM is far worse than a failed create).
- **Smoke for `pickSpace` / `getCurrentSpace` / `clearCurrentSpace`** beyond their presence in `tools/list`. Story 1.4's unit tests (AC #13) cover the picker handlers directly. The CRUD round-trip does not exercise the picker because `createTask` takes a `list_id` directly (space-agnostic). If a future story wants an end-to-end picker smoke (pick → set → confirm via a second tool that consumes the session), that's a separate harness.
- **Error-path smoke.** The harness asserts the happy path. It does NOT drive the "invalid list_id", "task_id from another workspace", "malformed status name", "API key revoked mid-flight" scenarios. Those are valuable but are their own test-design problem; adding them here triples the harness size. Happy-path first.
- **Retry / flake tolerance.** ClickUp's API is eventually consistent on some paths (rare; most endpoints are read-your-writes). Step i's `getTaskById` after step h's `updateTask` might race if ClickUp's internal cache lags by >1s. For story 1.5, accept that a single `getTaskById` call after `updateTask` is the contract; if flake proves real, add a retry-with-backoff in a follow-up story, NOT here. The harness keeps zero implicit timing dependencies.
- **Performance assertions.** No latency budgets, no p99 tracking, no throughput sampling. Smoke is correctness-only.
- **Docker-compose smoke.** The PRD's hosted deployment uses the Docker image (see `Dockerfile`, `docker-compose.yml`). Exercising the smoke against `docker compose up` + HTTP-mode is a natural extension but adds: Docker install dependency, container boot time waiting, port-forwarding quirks, and log-capture semantics. Out of scope here; add as a `npm run smoke:clickup:docker` variant in a later story (candidate fold-in: story 1.7's documentation work once the tool surface is stable).
- **README narrative rewrite around the ClickUp integration.** Story 1.7 owns the end-to-end "ClickUp tools are available" narrative + tool-list inventory. This story only adds the §"Running the ClickUp smoke tests" subsection — it does not rewrite the surrounding text or reorganize headings.
- **Hard-coding specific status names** (e.g. `to do` → `in progress`). Workspaces differ; some use custom statuses. The harness discovers available statuses via `getListInfo` (step d) and picks the first two it finds. This decouples the smoke from any specific team's naming convention.
- **Mutating the vendored tree.** Forbidden. Same invariant as stories 1.1–1.4 AC "no vendored-tree edits". The smoke harness uses the published MCP tool surface; it never reaches into `src/tools/clickup/**`.

## Tasks / Subtasks

- [ ] **Task 1 — Refactor `src/server.ts` to add `ensureInitialized` (AC: #7, #8, #9, #20)**
  - [ ] Add private field `initPromise: Promise<void> | null = null;` alongside the existing `initialized = false`.
  - [ ] Extract a private async `doInitialize()` method containing the body of the current `.then()` chain at `src/server.ts:438-457`: call `await this.initialize()`, log the agent/workflow/resource counts + git paths to `console.error`, then `await registerClickUpTools(this.server, this.clickUpSession)` (or `this.server` alone if story 1.4 hasn't landed), then log the ClickUp banner one-liner.
  - [ ] Add private async `ensureInitialized()` method:
    ```typescript
    private async ensureInitialized(): Promise<void> {
      if (this.initPromise) return this.initPromise;
      this.initPromise = this.doInitialize().catch((err) => {
        this.initPromise = null;
        throw err;
      });
      return this.initPromise;
    }
    ```
  - [ ] Update `start()`: remove the `.then(...).catch(...)` block; replace with a leading `await this.ensureInitialized().catch((err) => console.error('BMAD init error:', err));` BEFORE `await this.server.connect(transport)`. Keep the `console.error('BMAD MCP Server started')` line after the connect (unchanged messaging, just different ordering).
  - [ ] Update `connect(transport)`: insert `await this.ensureInitialized();` (without the .catch — HTTP mode wants failures to surface to the caller per AC #7) BEFORE `await this.server.connect(transport)`.
  - [ ] Verify the existing `await this.initialize()` calls inside `setupHandlers()`' request handlers still work (they check `this.initialized`, which is flipped by `initialize()` — unchanged).
  - [ ] NO other edits to `src/server.ts`. Specifically: `setupHandlers()`, `getMimeType()`, the constructor, and the `private server: McpServer` field all stay as they are.

- [ ] **Task 2 — Author `tests/unit/server-init.test.ts` (AC: #10, #24)**
  - [ ] Grep for `class InMemoryTransport` under `node_modules/@modelcontextprotocol/sdk`. If present, import it (its path varies by SDK version; current `1.29.0` exposes it at `@modelcontextprotocol/sdk/shared/inMemoryTransport.js`). If absent, define a ~20-LOC no-op mock transport inline at the top of the test file:
    ```typescript
    class NoopTransport implements Transport {
      onclose?: () => void;
      onerror?: (err: Error) => void;
      onmessage?: (msg: unknown) => void;
      async start(): Promise<void> {}
      async send(_msg: unknown): Promise<void> {}
      async close(): Promise<void> {}
    }
    ```
  - [ ] Use `vi.mock('../../src/tools/clickup-adapter.js', () => ({ registerClickUpTools: vi.fn() }))` to inject a spy. Reset the mock between tests with `vi.resetAllMocks()` in a `beforeEach`.
  - [ ] Test 1 — idempotency: construct one instance, call `.connect(new NoopTransport())` twice in sequence, assert the `registerClickUpTools` spy was called exactly once. (Use `.mock.calls.length` for the assertion.)
  - [ ] Test 2 — retry-on-failure: configure the spy to reject on first call (`mockRejectedValueOnce(new Error('boom'))`), resolve on the second. Call `.connect` → expect the rejection. Call `.connect` again on the SAME instance → expect success. Assert the spy was called exactly twice. Key assertion: the second call actually happens (doesn't short-circuit from a cached rejected `initPromise`).
  - [ ] Test 3 — per-instance isolation: construct two separate instances; connect each to its own `NoopTransport`. Assert each instance's `registerClickUpTools` spy-call count is 1 and that the two instances' `initPromise` fields are distinct.
  - [ ] Do NOT import from `src/tools/clickup/src/**` in this test file. Do NOT set `CLICKUP_API_KEY` or other ClickUp env vars in the test — the mock bypasses real env validation.

- [ ] **Task 3 — Implement `scripts/smoke-clickup-crud.mjs` (AC: #1–#6, #11, #16–#19, #21, #22)**
  - [ ] Create the file with a shebang `#!/usr/bin/env node`. Commit executable. Top of file documents the script's purpose, supported transports, env contract, and exit codes in a header comment block.
  - [ ] Parse CLI args: first positional ∈ `{stdio, http}`; `--keep-task` flag. Invalid or missing args → usage to stderr + exit 1. Usage block shows example env var set.
  - [ ] Validate env (AC #2): check `CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_SMOKE_LIST_ID` are non-empty after `.trim()`. Missing → structured stderr message listing each missing var + exit 2.
  - [ ] Generate `smokeName`: `` `[bmad-smoke] CRUD roundtrip ${new Date().toISOString()}-${randomBytes(4).toString('base64url').slice(0,6)}` ``.
  - [ ] Factor a `callTool(name, args): Promise<{text: string}>` helper that:
    - Stdio: writes `{ jsonrpc: '2.0', id: <counter>, method: 'tools/call', params: { name, arguments: args } }` newline-delimited to child stdin, reads one newline-delimited response from child stdout, parses, extracts `result.content[0].text`. Throws on protocol error or non-2xx equivalent.
    - HTTP: POSTs the same JSON-RPC payload to `http://127.0.0.1:${port}/mcp` with `Mcp-Session-Id` header + optional `x-api-key` header; reads the response body, parses, extracts text. The `Mcp-Session-Id` is captured from the `initialize` response's response header and reused for every subsequent call.
  - [ ] Implement the ten-step operation sequence per AC #4. Each step logs exactly one `[smoke][<transport>][<letter>] <msg>` stderr line on success. On assertion failure, dump the step's request + response as pretty-printed JSON then print the `SMOKE FAIL ...` summary + exit 1.
  - [ ] Cleanup (step j): `await fetch(\`https://api.clickup.com/api/v2/task/${taskId}\`, { method: 'DELETE', headers: { Authorization: process.env.CLICKUP_API_KEY } })`. Check `response.ok`; on failure, log body + set exit code to 3 (but still print `SMOKE PASS`with a trailing`(cleanup failed — task still present)` note so the operator sees the partial success).
  - [ ] Measure `elapsed_ms` via `process.hrtime.bigint()` captured at start + end of the flow. Include in the final summary line.
  - [ ] Ensure child process lifecycle: on exit (pass or fail), send SIGTERM to the child (stdio or http child), await its 'exit' event with a 3-second timeout, then force-kill if still alive. Don't leak child processes.
  - [ ] Harness style: ESLint flat-config clean (`--ext .mjs` picks this up). Prettier clean. No `var`, no `console.log`, no eslint-disable comments.

- [ ] **Task 4 — Wire npm scripts (AC: #13)**
  - [ ] Edit `package.json`'s `scripts` block. Add:
    ```json
    "smoke:clickup": "node scripts/smoke-clickup-crud.mjs stdio",
    "smoke:clickup:http": "node scripts/smoke-clickup-crud.mjs http",
    ```
    between the existing `cli:list-workflows` entry and the JSON object's close (before the `"files"` key).
  - [ ] Do NOT touch any other script. Do NOT add the smoke to `test:all` — it is intentionally not part of the standard test pipeline.

- [ ] **Task 5 — Document in README.md (AC: #14)**
  - [ ] Locate the ClickUp-related documentation area in `README.md` (grep for `CLICKUP_API_KEY` to find the env-var table from story 1.3 AC #10). Insert the §"Running the ClickUp smoke tests" subsection immediately after the env-var table's closing paragraph.
  - [ ] Content per AC #14's six bullets. Keep the section tight — ~30 lines of markdown. Link to `.env.example` for variable semantics (from story 1.3 AC #9). Do NOT restate the env-var definitions.
  - [ ] Proofread the section — an operator following it verbatim should produce a green `SMOKE PASS` line on their first attempt given valid credentials + a pre-existing list.

- [ ] **Task 6 — Smoke-verify locally (AC: #4, #6, #17, #18, #19, all build/test/lint hygiene)**
  - [ ] `npm run build` — clean.
  - [ ] `npm run lint` — same baseline as story 1.4's merge state; no new findings.
  - [ ] `npm run format` — no churn.
  - [ ] `npm test` — passes (existing unit tests + 3 new `server-init.test.ts` cases).
  - [ ] Stdio smoke with real credentials (author-only; requires a sandbox workspace):
    ```bash
    CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup
    ```
    Expected: `SMOKE PASS transport=stdio task_id=... comment_id=... status_from="..." status_to="..." elapsed_ms=...`; exit 0. After-run check: search ClickUp for `[bmad-smoke]` → no matches (cleanup worked).
  - [ ] HTTP smoke with real credentials:
    ```bash
    CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_LIST_ID=... npm run smoke:clickup:http
    ```
    Expected: same PASS shape, `transport=http`. Exit 0. Cleanup verified the same way.
  - [ ] `--keep-task` smoke: `npm run smoke:clickup -- --keep-task` → PASS with exit 0; task remains in ClickUp; operator verifies by hand in the UI then deletes manually.
  - [ ] Negative smoke — missing env: `CLICKUP_API_KEY= npm run smoke:clickup` → exit 2 with a structured diagnostic listing `CLICKUP_API_KEY` as missing. No task created.
  - [ ] Negative smoke — wrong list ID: `CLICKUP_SMOKE_LIST_ID=999999999 npm run smoke:clickup` → exit 1 with `SMOKE FAIL step=d reason="..."` — step d's `getListInfo` fails (ClickUp returns 404 or equivalent), harness prints the request/response pair + summary.
  - [ ] Negative smoke — HTTP port collision: start a dummy server on 3456, then `CLICKUP_SMOKE_PORT=3456 npm run smoke:clickup:http` → exit 1 with `SMOKE FAIL step=a reason="port 3456 already in use..."`. (Optional — document in the commit body if performed.)
  - [ ] Cleanup-fail smoke: temporarily revoke DELETE permission on the smoke list (ClickUp workspace setting), rerun the harness → steps a–i pass; step j fails; harness prints `SMOKE PASS ... (cleanup failed — task still present)` with exit 3. Restore permission + hand-delete.
  - [ ] Document in the commit body which of these smokes were actually exercised vs skipped (e.g. "stdio + http + --keep-task + missing-env executed; port-collision + cleanup-fail skipped — covered by unit-level negative paths in AC #6"). Transparency beats inflated confidence.

- [ ] **Task 7 — Commit (AC: #29)**
  - [ ] Stage in this order: `src/server.ts`, `tests/unit/server-init.test.ts`, `scripts/smoke-clickup-crud.mjs`, `package.json`, `README.md`. (Source + test first, then harness, then docs — keeps lint-staged tidy if it re-runs mid-stage.)
  - [ ] Commit message: `feat(clickup): smoke-test CRUD round-trip and close HTTP tool-registration gap`.
  - [ ] Commit body per AC #29: six bullets (harness, `ensureInitialized` refactor, npm scripts, README section, CI exclusion rationale, forward link).

## Dev Notes

### Smoke-test flow at a glance

| Step | Tool / Action                                                            | Assertion                                                                                                                       |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| a    | Spawn `node build/index.js` (stdio) or `node build/index-http.js` (http) | Child process alive; HTTP banner `listening on port <N>` seen within 10 s                                                       |
| b    | JSON-RPC `initialize`                                                    | `result.capabilities.tools` present; HTTP: `Mcp-Session-Id` captured                                                            |
| c    | JSON-RPC `tools/list`                                                    | Contains at minimum `bmad`, `createTask`, `addComment`, `updateTask`, `getTaskById`, `getListInfo`; (`pickSpace` if 1.4 landed) |
| d    | `getListInfo(list_id=$CLICKUP_SMOKE_LIST_ID)`                            | Response parses; ≥2 distinct statuses; capture `statusFrom`, `statusTo`                                                         |
| e    | `createTask(list_id, name=smokeName, status=statusFrom)`                 | Response contains task ID; capture it                                                                                           |
| f    | `getTaskById(task_id)`                                                   | `name == smokeName`, `status ~= statusFrom` (case-insensitive)                                                                  |
| g    | `addComment(task_id, comment)`                                           | Response contains `Comment added successfully`; capture `comment_id`                                                            |
| h    | `updateTask(task_id, status=statusTo)`                                   | Response does not contain `Error updating task:`                                                                                |
| i    | `getTaskById(task_id)`                                                   | `status ~= statusTo` (case-insensitive) — the round-trip proof                                                                  |
| j    | `fetch DELETE /api/v2/task/{task_id}` (skip if `--keep-task`)            | HTTP 2xx                                                                                                                        |

Ten steps total — nine operations (a–i) plus one cleanup (j). The five tools exercised (`getListInfo`, `createTask`, `addComment`, `updateTask`, `getTaskById`) are exactly the subset needed for the story-creation → implementation loop in EPIC-2 + EPIC-3. Everything else on the tool surface is validated by story 1.6 (cross-list parent/subtask) + upstream's own tests.

### Why a script, not a vitest test, not in CI

Three escalating concerns:

1. **Credentials.** Vitest is the canonical test runner; a test under `tests/unit/` or `tests/integration/` is picked up by default `npm test`. A contributor running `npm test` pre-commit should not need `CLICKUP_API_KEY` in their env — that's a friction tax, and on CI it means passing secrets into untrusted PR forks (or guarding with `if: github.repository == ...` which is fragile and easily forgotten). A standalone `.mjs` script with explicit gating (`npm run smoke:clickup`) removes the ambient coupling.
2. **Rate limits.** ClickUp's `/api/v2/*` endpoints are rate-limited per-token (100 req/min typical, varies by plan). A parallel vitest run — vitest's default is to run test files in parallel — could issue enough concurrent requests to trip the limit, flaking the suite non-deterministically. A single-entry script has at most one concurrent flow per invocation.
3. **Non-determinism.** Real-API tests depend on external infrastructure state (workspace exists, token valid, list present, statuses available). When they fail, the failure is ambiguous — harness bug, config bug, network blip, ClickUp outage. Keeping them outside the default suite preserves `npm test`'s signal.

These three concerns compound: fixing any one of them (e.g. only guarding CI but leaving the test in the suite) still leaves the others. The cleanest answer is a separate entry point with explicit human gating.

If a future team _does_ want CI coverage, the right pattern is a scheduled GitHub Actions workflow (`schedule: cron: '0 6 * * 1'` — weekly Monday mornings) that runs against a dedicated sandbox workspace with a CI-only API token. That is its own story (candidate: EPIC-5's pilot-iterate scope or a standalone ops story), not this one.

### Why close the HTTP-mode gap in _this_ story

The 1.2/1.3/1.4 forward-pointer ("story 1.5's HTTP smoke test, or a dedicated 1.4.5-style story") gave two options. Reasons to fold the fix into 1.5 rather than spawn 1.4.5:

1. **The smoke harness can't validate HTTP without the fix.** EPIC-1 §Outcomes bullet 4 explicitly requires smoke against "a real ClickUp workspace" — and per PRD §Architecture the hosted server is HTTP. Smoke-story scope and gap-fix scope are logically coupled; splitting them would leave 1.5 unable to prove its own acceptance criteria until 1.4.5 lands, or force a mock-mode fallback which defeats the point.
2. **The fix is small.** Extracting `ensureInitialized` is ~25 lines net. It's not a refactor that deserves its own story per EPIC-1's granularity — the epic is made up of 7-story-sized units of work, and a 25-LOC refactor is sub-story scale.
3. **No prior-art conflicts.** Stories 1.2/1.3/1.4 each added infrastructure (adapter, validator, session). None of them touched `start()`'s `.then()` chain. Claiming that chain's refactor as 1.5's scope doesn't conflict with any work already merged or in-flight.

The downside: 1.5's commit diff is larger than the "smoke test only" framing suggests. Mitigation: the commit message + story title + change-log entry explicitly name both the smoke and the gap-closure so reviewers can split review attention cleanly.

### The ordering of `ensureInitialized` and `server.connect(transport)`

AC #7 specifies `ensureInitialized()` BEFORE `server.connect(transport)` in both `start()` and `connect()`. The alternative (today's stdio behavior: connect-then-init in a `.then()`) has a race:

1. `await this.server.connect(transport)` — the transport opens, stdio starts reading stdin / HTTP starts accepting POSTs.
2. `.then(async () => { await registerClickUpTools(...); })` fires — BUT this is async and can be pre-empted by an incoming request.
3. A client that sends `tools/list` in the window between step 1 returning and step 2 completing gets a tool surface WITHOUT the ClickUp tools.

In stdio mode this window is normally invisible because stdio doesn't receive a message until the user/client writes to stdin — giving `registerClickUpTools` (~100–500ms for first-call, see Dev Notes §"Upstream's `getSpaceSearchIndex`" in story 1.4) time to complete. In HTTP mode, the calling client initiates the `initialize` + `tools/list` immediately after transport accepts — the race is live.

`ensureInitialized` before `connect` eliminates the race structurally. The first request that arrives after `connect()` returns can rely on the full tool surface being registered.

Cost: stdio's startup latency is a few hundred ms longer before "BMAD MCP Server started" appears. Indistinguishable to a human operator; irrelevant to automation.

### Why `initPromise` instead of `initialized` boolean

The existing `initialized: boolean` field works for synchronous "already-ran?" checks in `setupHandlers()`' request handlers. It does NOT work for concurrency safety: if two callers hit `ensureInitialized()` in the same tick, the naive `if (this.initialized) return; await doInit(); this.initialized = true;` pattern runs `doInit` twice (both callers see `initialized = false`, both start their own copy).

`initPromise: Promise<void> | null` is the canonical "lazy async singleton" pattern: first caller creates the promise and stores it; subsequent callers `await` the same promise. Node's event loop guarantees the assignment is race-free (single-threaded). Clearing on failure (`this.initPromise = null`) prevents a transient error from poisoning the instance forever.

Do NOT use an alternative like a shared semaphore or `Promise.all` collector — they add dependency surface with no benefit. The 6-line `initPromise` pattern is enough.

### Why `fetch` DELETE and not an MCP tool

Three reasons the cleanup step bypasses MCP:

1. **No upstream `deleteTask` tool.** Upstream's `registerTaskToolsWrite` exposes exactly three tools (`addComment`, `updateTask`, `createTask`). Adding `deleteTask` requires editing the vendored tree — forbidden per story 1.1 AC #2. An upstream PR is possible but out of scope for a smoke story.
2. **Tool asymmetry is a feature.** Upstream's deliberate omission of `deleteTask` reflects a safety posture: an LLM should not be able to delete tasks accidentally. The smoke harness is a test driver, not an LLM consumer, so direct-API DELETE is fine. Keeping the asymmetry intact preserves the safety property.
3. **The harness already has credentials.** `fetch` to `https://api.clickup.com` with `Authorization: $CLICKUP_API_KEY` is a one-line call with zero new deps. Wrapping it in an MCP tool would be ceremony for one cleanup path.

If a future story wants programmatic workspace cleanup (e.g. an ops script to bulk-delete stale smoke tasks weekly), either add a standalone `scripts/clickup-cleanup.mjs` with the same pattern OR contribute `deleteTask` upstream with a `confirmPhrase` safety argument à la `rm -rf` guards.

### JSON-RPC over stdio: the minimal client

The stdio-mode smoke's JSON-RPC client is ~40 LOC. Minimal shape:

```javascript
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const child = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'], // stderr inherits so server logs surface
});

const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
const pending = new Map(); // id → { resolve, reject }
let nextId = 0;

rl.on('line', (line) => {
  if (!line.trim()) return;
  const msg = JSON.parse(line);
  const cb = pending.get(msg.id);
  if (!cb) return;
  pending.delete(msg.id);
  if (msg.error) cb.reject(new Error(msg.error.message));
  else cb.resolve(msg.result);
});

async function rpc(method, params) {
  const id = ++nextId;
  child.stdin.write(
    JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n',
  );
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
```

That's the whole client. No SDK, no dependency, no framework. `rpc('tools/call', { name: 'createTask', arguments: { ... } })` and the response comes back via the readline handler.

HTTP is even simpler — `fetch` with JSON body + headers, parse JSON response.

### Why `CLICKUP_SMOKE_PORT` and not a random port

Three options for the HTTP smoke's port:

1. **Hard-code 3000** — same as the default HTTP server port. Collides with any running dev server. Rejected.
2. **Random available port at runtime** — harness listens on `127.0.0.1:0`, reads the assigned port, tells the child to use it. Requires passing the port to the child via `PORT` env or a CLI arg. Fine but adds a few LOC of plumbing.
3. **Env-configurable with a non-default fallback (3456)** — operator can override if needed; the default avoids the common-dev-port collision. Simpler than option 2, more predictable for debugging (logs reference a known port).

Picked option 3. `3456` is an arbitrary unused port in the ephemeral range that's not on IANA's standard-service list.

### Artifact lifecycle: what the smoke leaves behind

| Outcome                                  | Artifacts in workspace                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `SMOKE PASS` (default, no `--keep-task`) | Zero. Task deleted by step j.                                                     |
| `SMOKE PASS` (with `--keep-task`)        | One task (the smoke task), inspectable in UI.                                     |
| `SMOKE PASS` (exit 3, cleanup failed)    | One task. Operator hand-deletes.                                                  |
| `SMOKE FAIL` between steps a–d           | Zero (no task was created yet).                                                   |
| `SMOKE FAIL` between steps e–i           | One task in indeterminate state. Operator hand-deletes via `[bmad-smoke]` search. |

Zero scenarios leave more than one task per run. The `[bmad-smoke]` prefix ensures discoverability. For operators who want a cleanup pass after a burst of failed runs, a one-liner works: `getTaskById` + `searchTasks` via the MCP tools + a manual delete — or the same `fetch DELETE` pattern the harness uses.

### Upstream's `getListInfo` response parsing

Step d's parsing relies on upstream's output format at `src/tools/clickup/src/tools/list-tools.ts:69-83`. Current format:

```
List: <name>
...
Available statuses (N total):
  - <status-1>
  - <status-2>
  ...
Valid status names for createTask/updateTask: <status-1>, <status-2>, ...
```

The harness parses the `Valid status names for createTask/updateTask:` line because it's the most machine-friendly (single line, comma-separated). Fallback: parse the `  - <status>` bullet list.

Format drift risk: if upstream changes this wording, the harness breaks. Mitigation: the step-d failure message is explicit (`reason="could not parse status list from getListInfo output"`) so an operator can quickly diagnose. No need for a schema version check — the harness is a smoke test, not a stable API consumer.

If the format drifts every few upstream versions, add a `scripts/smoke-clickup-crud-format-contract.md` one-pager pinning the expected shape so upstream bumps are caught. Out of scope for story 1.5.

### Testing standards

- New test file `tests/unit/server-init.test.ts` is a sibling of `tests/unit/lite-resource-loader.test.ts` and `tests/unit/dependency-audit.test.ts`. Same flat-under-unit convention.
- The smoke harness is NOT tested by vitest. It IS exercised in Task 6 by a human operator with real credentials. This is the right level for a smoke test — testing a smoke harness with another test suite is infinite regress.
- Don't mock `McpServer`'s internals in `server-init.test.ts` beyond what AC #10 needs. The test is about `ensureInitialized`'s concurrency contract, not about MCP's behavior.
- If vitest starts picking up `scripts/*.mjs` (would require a config change — currently it doesn't), revisit AC #1's "NOT a vitest test" assertion.

### Interaction with stories 1.3 + 1.4

Both 1.3 and 1.4 are `ready-for-dev` but not yet merged at story-creation time. Implications for 1.5:

- **If 1.3 hasn't landed when 1.5 is picked up**: the adapter's env-check is still the bare story-1.2 presence shim. The `ensureInitialized` refactor still works — it just wraps whatever the current adapter returns. The smoke harness's AC #2 env contract is unaffected (harness validates env itself; it doesn't depend on the adapter's validator message). Rebase 1.5 onto 1.3 when both are merging to avoid a merge conflict on `clickup-adapter.ts`.
- **If 1.4 hasn't landed when 1.5 is picked up**: the adapter signature is still `registerClickUpTools(server)` without the `session` parameter. The `ensureInitialized` refactor threads whichever signature is current: `await registerClickUpTools(this.server)` pre-1.4, `await registerClickUpTools(this.server, this.clickUpSession)` post-1.4. The smoke harness's AC #4 step c tolerates `pickSpace` being absent — it only asserts the five CRUD-relevant tools.
- **Recommended merge order**: 1.2 → 1.3 → 1.4 → 1.5. If 1.5 is picked up in parallel with 1.4, coordinate rebases so both land cleanly.

### Project structure notes

- `scripts/smoke-clickup-crud.mjs` — new sibling of the existing `scripts/bmad-cli.mjs` / `scripts/build-clickup.mjs` / `scripts/show-list-agents.mjs`. Same flat-under-scripts convention. Executable.
- `tests/unit/server-init.test.ts` — new sibling of `tests/unit/lite-resource-loader.test.ts`.
- `src/server.ts` — modified (AC #7, #8). No new files under `src/`.
- No new directories, no new config files, no vendored-tree changes.

### CI exclusion — the concrete workflow files

Three workflows are explicitly not touched:

| File                                    | Why this story doesn't touch it                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml`              | Lint + unit + integration + build. Smoke is manually gated; adding it here would require `CLICKUP_API_KEY` as a repo secret + rate-limit budgeting + PR-fork leak prevention — not this story's scope. |
| `.github/workflows/release-draft.yml`   | Drafts release notes from commits. Smoke isn't a release gate.                                                                                                                                         |
| `.github/workflows/release-publish.yml` | Publishes to npm on GitHub release. Smoke isn't a publish gate either — publish reflects `main`'s passing test suite, which is intentionally smoke-free.                                               |
| `.github/workflows/pr-title-check.yml`  | Validates PR title format. Orthogonal.                                                                                                                                                                 |

If a future workflow adds a scheduled smoke run (see Dev Notes §"Why a script, not a vitest test" — the "future team" paragraph), it lives in a new file like `.github/workflows/smoke-scheduled.yml`, not by augmenting `ci.yml`.

### SDK + package.json interaction

This story does not touch `package.json` dependencies, only `scripts`. No new runtime or dev deps. `@modelcontextprotocol/sdk` stays at `^1.29.0`. `fuse.js`, `zod`, `js-yaml`, etc. — all unchanged.

The smoke harness's use of `globalThis.fetch` requires Node 18+. `.nvmrc` pins 22.14.0 (per CLAUDE.md §Tech-stack), so this is safe. The harness does NOT add an explicit engines check — `package.json`'s existing (if any) `engines` declaration is authoritative.

### References

- [EPIC-1 §Outcomes bullet 4](../epics/EPIC-1-clickup-mcp-integration.md) — "Smoke-test: create task, add comment, update status, list folders/lists, cross-list parent/subtask — all round-trip successfully against a real ClickUp workspace." Story 1.5 delivers the first three (create + comment + status); story 1.6 delivers the last two (list + cross-list parent/subtask).
- [EPIC-1 §Stories bullet 6](../epics/EPIC-1-clickup-mcp-integration.md) — "Smoke-test create-task + comment + status round-trip" — scope-exact.
- [EPIC-1 §Exit criteria bullet 1](../epics/EPIC-1-clickup-mcp-integration.md) — "All smoke tests pass against a real ClickUp workspace." This story is the primary contributor.
- [PRD §Success criteria](../PRD.md) — "End-to-end: PM writes PRD → team lead creates epic → team lead invokes Dev agent in story-creation mode → rich story appears in ClickUp → dev invokes Dev agent in implementation mode with 'work on CU-X' → code lands with a PR linked back in a ClickUp comment and status set to In Review." The smoke harness validates the raw primitives (create + comment + status) that compose into this end-to-end path.
- [PRD §Architecture](../PRD.md) — "Hosted `bmad-mcp-server` = BMAD runtime + vendored ClickUp tools (one MCP server)." The HTTP transport is the hosted deployment shape; closing the HTTP-mode tool-registration gap is a prerequisite to any live smoke against hosted.
- [Story 1.2 §AC #3](./1-2-wire-register-functions.md) — dispatch-by-mode shape.
- [Story 1.3 §AC #7](./1-3-env-var-wiring.md) — original forward-pointer: "the adapter is never actually called regardless of env vars ... tracked as a new story 1.4.5 / 1.7-adjacent fixup." Story 1.5 folds this fixup in per the story-header rationale.
- [Story 1.3 §Out-of-Scope bullet 3](./1-3-env-var-wiring.md) — "Smoke-test `createTask` + `addComment` + status round-trip → **story 1.5** (depends on this story + story 1.4)." Direct deferral.
- [Story 1.4 §AC #15](./1-4-space-picker.md) — restates the HTTP-mode gap forward-pointer and explicitly names story 1.5 as one candidate fixup location.
- [Story 1.4 §Out-of-Scope bullet 3](./1-4-space-picker.md) — "**Closing the HTTP-mode tool-registration gap** (story 1.2/1.3 carry-over) — out of scope. Same forward-pointer as story 1.3 AC #7: a dedicated 1.4.5-style fixup or folded into story 1.5 once HTTP smoke tests surface it." Authorizes this story to close the gap.
- Upstream `src/tools/clickup/src/tools/task-write-tools.ts:15-420` — `addComment`, `updateTask`, `createTask` definitions. No `deleteTask` here; cleanup uses direct `fetch` (Dev Notes §"Why `fetch` DELETE").
- Upstream `src/tools/clickup/src/tools/list-tools.ts:69-83` — `getListInfo` response format the harness parses in step d (Dev Notes §"Upstream's `getListInfo` response parsing").
- Current `src/server.ts:432-460` — existing `start()` + `connect()` bodies. The `ensureInitialized` refactor reshapes these specifically.
- Current `src/http-server.ts:67-95` — `handleMcp` flow where per-session `BMADServerLiteMultiToolGit` is constructed and `connect` is awaited. Closing the gap is invisible to this file.
- Current `src/index.ts:83-86` / `src/index-http.ts` — entry points, unchanged by this story.
- `CLAUDE.md` §"Common commands" — `npm run build` prerequisite for smoke (no `predev` hook populates `build/`).
- `.env.example` (post story 1.3) — canonical env-var documentation; smoke README references it for variable definitions.
- `commitlint.config.cjs` — no `scope-enum` rule; `feat(clickup)` accepted per stories 1.1–1.4.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `scripts/smoke-clickup-crud.mjs` — standalone Node smoke harness, stdio + http transports, self-cleaning (AC #1–#6, #11, #16–#19)
- `tests/unit/server-init.test.ts` — Vitest unit tests for `ensureInitialized` idempotency + retry + per-instance isolation (AC #10, #24)

**Modified**

- `src/server.ts` — extract `ensureInitialized` + `doInitialize`; thread through `start()` and `connect()` before `server.connect(transport)` (AC #7, #8, #9, #20)
- `package.json` — two new `scripts` entries: `smoke:clickup` and `smoke:clickup:http` (AC #13)
- `README.md` — new §"Running the ClickUp smoke tests" subsection (AC #14)

**Untouched (explicitly)**

- `src/tools/clickup/**` (vendored tree — read-only per story 1.1; harness consumes the published MCP tool surface, never imports upstream source)
- `BMAD-METHOD/**` (upstream BMAD — read-only)
- `src/tools/clickup-adapter.ts` (story 1.3 / 1.4 scope — AC #28)
- `src/tools/clickup-session.ts`, `src/tools/clickup-space-picker.ts` (story 1.4 scope — untouched here)
- `src/utils/clickup-env.ts` (story 1.3 scope — untouched here)
- `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts`, `src/index.ts`, `src/index-http.ts` (BMAD engine + unified-tool surface + entry points; AC #26)
- `src/http-server.ts` (per AC #27 — no lines this story introduces; the HTTP-mode fix is entirely inside `src/server.ts`'s `connect()` method)
- `.env.example` (story 1.3 scope — already documents `CLICKUP_*` vars; smoke-specific `CLICKUP_SMOKE_LIST_ID` / `CLICKUP_SMOKE_PORT` are documented only in README to keep `.env.example` focused on runtime — not test-harness — config)
- `package.json` dependencies (no new runtime or dev deps — AC #11)
- `tests/unit/dependency-audit.test.ts` (no changes — AC #12)
- `.github/workflows/*.yml` (no smoke in CI — AC #15)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Story drafted from EPIC-1 bullet 6 + 1.2/1.3/1.4 forward-pointers via `bmad-create-story`. Status → ready-for-dev. Folds the HTTP-mode tool-registration gap-closure (inherited from stories 1.2/1.3/1.4) into this story per the story-1.4 AC #15 authorization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-21 | Validation pass: fixed step-count inconsistency (AC #4 intro, Task 3 bullet, and Dev Notes §"Smoke-test flow at a glance" summary line now agree on ten steps a–j = nine operations + one cleanup — earlier drafts said "nine-step flow" while listing ten items). Verified (a) sprint-status.yaml's renamed "Dev agent story-creation mode" / "Dev agent implementation mode" labels are consistent with this story's Out-of-Scope EPIC-2 / EPIC-3 references (already draft-correct), (b) all `src/**` file-path + line-number citations are live against the current branch, (c) all cross-references to stories 1.2 / 1.3 / 1.4 (AC #, Out-of-Scope bullet #) resolve, (d) EPIC-1 §Outcomes bullet 4 + §Stories bullet 6 mapping is correct given story 1-1 absorbs bullets 1+2 per sprint-status comment, (e) File List matches AC coverage, (f) Task-to-AC index is complete for all 29 ACs. |
