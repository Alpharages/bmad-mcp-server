# Story 1.6: Smoke-test ClickUp cross-list parent/subtask (epic in backlog list, story-subtask in sprint list)

Status: ready-for-dev

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Sixth story in EPIC-1. Stories 1.1–1.4 vendored upstream's ClickUp tool tree, wired the register functions, added env-var validation with a `BMAD_REQUIRE_CLICKUP` hard-fail posture, and delivered the session-scoped space picker. Story 1.5 authored the single-list CRUD smoke harness at `scripts/smoke-clickup-crud.mjs` and closed the HTTP-mode tool-registration gap in `src/server.ts` via `ensureInitialized()`. This story finally closes EPIC-1 §Outcomes bullet 4's last unmet clause — "cross-list parent/subtask" — and delivers the PRD §Risks R1 mitigation ("ClickUp may not support cross-list subtasks (story in sprint list, parent in backlog list) without quirks. _Mitigation:_ Phase 1 smoke test gates Phase 2"). Concretely, this story adds a second opt-in harness at `scripts/smoke-clickup-cross-list.mjs` that (a) creates a mock "epic" task in a BACKLOG list, (b) creates a mock "story" task as a subtask of that epic BUT in a DIFFERENT SPRINT list via `createTask(list_id=SPRINT, parent_task_id=EPIC_ID)`, (c) round-trips `getTaskById` on the child to verify ClickUp preserves both the cross-list placement (`list.id == SPRINT_LIST_ID`) and the parent linkage (`parent_task_id == EPIC_ID`), (d) round-trips `getTaskById` on the parent to verify ClickUp reports the child in `child_task_ids`, and (e) cleans both tasks up via direct `fetch` DELETE (child-first, then parent) on PASS. The outcome is a go/no-go signal for the PRD §ClickUp-layout design ("Stories → subtasks of an epic (parent = epic task), living in the active Sprint list") — if this harness fails consistently, EPIC-2's sprint-layout assumption is wrong and needs redesign before any Dev-agent story-creation work lands.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a repeatable smoke harness at `scripts/smoke-clickup-cross-list.mjs` that drives a live ClickUp cross-list parent/subtask round-trip (initialize → tools/list → getListInfo × 2 → createTask(epic in backlog list) → createTask(story as subtask in sprint list) → getTaskById(story) → getTaskById(epic) → direct-`fetch` DELETE cleanup child-then-parent) over the stdio transport only — gated on `CLICKUP_API_KEY` / `CLICKUP_TEAM_ID` / `CLICKUP_SMOKE_BACKLOG_LIST_ID` / `CLICKUP_SMOKE_SPRINT_LIST_ID` env vars, opt-in via `npm run smoke:clickup:cross-list` (explicitly NOT part of `npm test` or CI), creating uniquely-named `[bmad-smoke-x] epic <timestamp>-<random>` + `[bmad-smoke-x] story <timestamp>-<random>` tasks per run for re-run safety, self-cleaning unless `--keep-tasks` is passed — so that (a) the PRD §Risks R1 mitigation is discharged with a binary PASS/FAIL signal against a real workspace, (b) EPIC-1 §Outcomes bullet 4's last unmet clause ("cross-list parent/subtask — all round-trip successfully") is verifiable, (c) EPIC-1 §Exit-criteria's "all smoke tests pass against a real ClickUp workspace" is fully satisfiable when this harness joins 1.5's `smoke:clickup` + `smoke:clickup:http` in a standard pre-pilot validation run, and (d) EPIC-2's "stories as subtasks of an epic, living in the active Sprint list" layout is green-lit (or caught as infeasible before any dev-agent plumbing depends on it) — all without editing the vendored tree (`src/tools/clickup/**` stays read-only per story 1.1 AC #2), without adding runtime or dev dependencies (harness uses only Node built-ins: `node:child_process`, `node:readline`, `globalThis.fetch`, `node:crypto`), without touching `src/server.ts` / `src/http-server.ts` / `src/tools/bmad-unified.ts` / `src/tools/operations/**` / `src/core/**` / `src/cli.ts` / `src/tools/clickup-adapter.ts` (the story-1.5 `ensureInitialized` refactor and the 1.3/1.4 adapter/session work stay invariant), without wiring the harness into any GitHub Actions workflow (same credential-leak + rate-limit + non-determinism rationale as story 1.5 Dev Notes §"Why a script, not a vitest test, not in CI"), and without a second HTTP-transport variant (the capability under test is a ClickUp API property, not a transport property — stdio alone is sufficient proof per Dev Notes §"Why stdio only, not both transports").

## Acceptance Criteria

1. A new standalone script `scripts/smoke-clickup-cross-list.mjs` exists. Shape:
   - Node ES-module script (`.mjs` extension; top-of-file is plain JS, no TypeScript).
   - NOT imported by any `src/` file. NOT a vitest test. NOT discovered by `vitest run tests/unit tests/integration`.
   - CLI signature: `node scripts/smoke-clickup-cross-list.mjs [--keep-tasks]`. The harness is stdio-only — no `<transport>` positional arg (rationale: Dev Notes §"Why stdio only, not both transports"). Unknown args print a usage block to stderr and exit with code 1.
   - `--keep-tasks` skips the final DELETE cleanup so an operator can inspect the created epic + story pair in the ClickUp UI. Default is cleanup-enabled.
   - The script is executable (`#!/usr/bin/env node` shebang at top and committed with the executable bit set). NOT added to `package.json`'s `build` script.

2. Environment contract — the script validates these at startup and exits with code 2 + a structured stderr diagnostic if any required var is missing, whitespace-only, or if the two list IDs are equal:
   - `CLICKUP_API_KEY` (required) — per-user ClickUp personal token (same semantics as story 1.3 AC #1 / story 1.5 AC #2).
   - `CLICKUP_TEAM_ID` (required) — workspace ID.
   - `CLICKUP_SMOKE_BACKLOG_LIST_ID` (required) — the list the parent epic task is created in. Per PRD §ClickUp-layout, this models the "Backlog list per space → humans create epics here as tasks" role. The operator MUST pre-create this list; the harness does NOT create lists, spaces, or folders.
   - `CLICKUP_SMOKE_SPRINT_LIST_ID` (required) — the list the child story task is created in (MUST be a different list ID than `CLICKUP_SMOKE_BACKLOG_LIST_ID`). Per PRD §ClickUp-layout, this models the "active Sprint list" role. The two lists MAY live in different spaces OR the same space; the harness is agnostic and asserts only that ClickUp accepts the cross-list `parent_task_id` relationship.
   - Distinctness assertion: if `CLICKUP_SMOKE_BACKLOG_LIST_ID === CLICKUP_SMOKE_SPRINT_LIST_ID`, fail at startup with `reason="backlog and sprint list IDs must differ — same-list subtask is story 1.5's CRUD scope, not cross-list"` and exit 2. This is load-bearing: the whole point of this harness is cross-list, and a silent fallback to same-list would produce a false PASS.
   - `BMAD_REQUIRE_CLICKUP` is NOT consumed by the harness (same rationale as story 1.5 AC #2).

3. Unique task names per run. Formats:
   - Epic: `` `[bmad-smoke-x] epic ${ISO-UTC}-${random-suffix}` ``
   - Story: `` `[bmad-smoke-x] story ${ISO-UTC}-${random-suffix}` ``
   - `<random-suffix>` is 6 base64url chars from `node:crypto.randomBytes(4).toString('base64url').slice(0, 6)` — SAME suffix used for both names so an operator inspecting the UI can correlate the pair. The `[bmad-smoke-x]` prefix (note the `-x` suffix, distinct from story 1.5's `[bmad-smoke]`) is load-bearing — it lets operators bulk-search for stragglers from this harness specifically without colliding with story 1.5's CRUD smoke artifacts.

4. Operation sequence. Stdio-only; ten steps (a–j) — step a boots the server, steps b–i are eight JSON-RPC tool calls, step j performs two DELETE cleanups:
   a. **Boot server.** Spawn `node build/index.js` as a child process with `stdio: ['pipe', 'pipe', 'inherit']`; parent writes JSON-RPC requests to stdin (line-delimited), reads responses from stdout via `node:readline`. Same pattern as story 1.5 AC #4a's stdio path — if story 1.5's harness already exists on `main` when this story is picked up, lift the ~40 LOC JSON-RPC client factor into a shared module is OUT OF SCOPE (see AC #13 and the Dev Notes §"Deliberate duplication vs sharing with 1.5's harness"); just inline the minimal client here.
   b. **`initialize`.** Assert JSON-RPC `result.capabilities.tools` is present.
   c. **`tools/list`.** Assert the response contains at minimum: `bmad`, `createTask`, `getTaskById`, `getListInfo`. If `bmad` is the ONLY tool returned, fail with `step=c reason="ClickUp tools not registered — verify CLICKUP_API_KEY / CLICKUP_TEAM_ID and that story 1.5's ensureInitialized fix is on main"` and exit 1.
   d. **`tools/call getListInfo {list_id: $CLICKUP_SMOKE_BACKLOG_LIST_ID}`.** Parse the response text for the status list (same parsing approach as story 1.5 AC #4d, per upstream's format at `src/tools/clickup/src/tools/list-tools.ts:69-83`). Capture `backlogStatus` = first status returned. If zero statuses are parsed, fail with `step=d reason="backlog list returned no statuses — verify list ID"`.
   e. **`tools/call getListInfo {list_id: $CLICKUP_SMOKE_SPRINT_LIST_ID}`.** Same parsing; capture `sprintStatus` = first status returned. If zero, fail with `step=e reason="sprint list returned no statuses — verify list ID"`. The two statuses MAY be the same string (e.g. both lists use `to do`) — the harness does NOT compare them.
   f. **`tools/call createTask {list_id: $CLICKUP_SMOKE_BACKLOG_LIST_ID, name: <epicName>, description: "smoke-cross-list epic (parent) from bmad-mcp-server story 1-6", status: <backlogStatus>}`.** Parse the first `/^task_id:\s*(\S+)\s*$/m` match from the response text. Upstream's `formatTaskResponse` at `src/tools/clickup/src/tools/task-write-tools.ts:647-659` emits this line identically for create and read paths (the line immediately after the summary `Task created successfully!` line). Capture as `epicId`. This is the PARENT task.
   g. **`tools/call createTask {list_id: $CLICKUP_SMOKE_SPRINT_LIST_ID, parent_task_id: <epicId>, name: <storyName>, description: "smoke-cross-list story (subtask) from bmad-mcp-server story 1-6", status: <sprintStatus>}`.** Capture `storyId` from the response (same parsing as step f). This is the CHILD task; note the list_id differs from the parent's list_id — this is the cross-list assertion surface. If the response contains the string `Error creating task:` (per `src/tools/clickup/src/tools/task-write-tools.ts:413-414`), fail with `step=g reason="<full-error-line>"` — this is the R1 materialization signal: ClickUp rejected the cross-list parent relationship at the API layer.
   h. **`tools/call getTaskById {task_id: <storyId>}`.** Parse the response text for three fields:
   - `list: <name> (<id>)` — per upstream `src/tools/clickup/src/tools/task-tools.ts:304`. Capture `<id>` as `reportedStoryListId`. ASSERT `reportedStoryListId === CLICKUP_SMOKE_SPRINT_LIST_ID` (byte-for-byte). This is the KEY R1 verification: did ClickUp honor the requested `list_id`, or did it silently relocate the subtask to the parent's list? A mismatch is a HARD FAIL with `step=h reason="cross-list placement not honored — child is in list <reportedStoryListId>, expected <SPRINT_LIST_ID>"` even if the parent linkage itself works. The PRD §ClickUp-layout design depends on BOTH properties simultaneously.
   - `parent_task_id: <id>` — per upstream `src/tools/clickup/src/tools/task-tools.ts:351-353`. ASSERT `<id> === epicId` byte-for-byte. Missing line or mismatch → FAIL with `step=h reason="parent linkage not preserved — expected parent_task_id <epicId>, got <observed-or-missing>"`.
   - `name: <smokeStoryName>` (byte-for-byte sanity check — same as story 1.5 AC #4f). Mismatch → FAIL.
     i. **`tools/call getTaskById {task_id: <epicId>}`.** Parse the response for `child_task_ids: <id1>, <id2>, ...` (per upstream `src/tools/clickup/src/tools/task-tools.ts:356-358`). ASSERT `storyId` is in the comma-separated list. Missing line or `storyId` absent → FAIL with `step=i reason="parent does not report child — expected storyId <storyId> in child_task_ids, got <observed-or-missing>"`. This is the bidirectional-linkage proof: the relationship is visible from BOTH directions, not just one. ClickUp's API has historically had edge cases where unilateral reads return stale views (per https://clickup.com/api — eventual-consistency notes); if this assertion flakes in real runs, bubble it up to a retry-with-backoff story rather than silently masking it here.
     j. **Cleanup** (unless `--keep-tasks` is set): direct `fetch` DELETE in order:
   - First DELETE the child: `fetch('DELETE', \`https://api.clickup.com/api/v2/task/${storyId}\`, { headers: { Authorization: $CLICKUP_API_KEY } })`. On non-2xx, log the response body + set `cleanupChildFailed = true`.
   - Then DELETE the parent: `fetch('DELETE', \`https://api.clickup.com/api/v2/task/${epicId}\`, ...)`. On non-2xx, log + set `cleanupParentFailed = true`.
   - Order matters: per ClickUp API behavior observed in production, deleting a parent with live subtasks may orphan the subtasks rather than cascade-delete them. Child-first prevents that ambiguity and keeps the cleanup deterministic.
   - If either cleanup DELETE fails, the process exit code becomes 3 (AC #6). The PASS line from step i is still printed (round-trip correctness is independent of cleanup success — same rationale as story 1.5 AC #6).

5. Per-step logging to stderr only. Stdout is reserved for JSON-RPC traffic to the stdio subprocess. Every step logs exactly one line of the form `[smoke-x][<step-letter>] <message>` on success — e.g. `[smoke-x][h] story in sprint list (id=<sprint-id>), parent_task_id=<epic-id>, name matches`. The final summary line (on both PASS and FAIL) is a single machine-parseable line:
   - PASS: `SMOKE PASS cross-list epic_id=<id> story_id=<id> backlog_list=<id> sprint_list=<id> elapsed_ms=<n>`
   - FAIL: `SMOKE FAIL cross-list step=<letter> reason="<message>" elapsed_ms=<n>`
     On FAIL, the failing step's full JSON-RPC request AND response are dumped to stderr (pretty-printed with `JSON.stringify(..., null, 2)`) immediately before the summary line.

6. Exit codes (same shape as story 1.5 AC #6 for operator muscle-memory):
   - `0` — all assertions passed; cleanup succeeded (or was intentionally skipped via `--keep-tasks`).
   - `1` — assertion failure, JSON-RPC protocol error, MCP server crash, process-spawn failure, OR the R1 materialization signal (cross-list create rejected at step g, cross-list placement dropped at step h, or parent linkage missing). These three R1 signals MUST exit 1 (not a distinct code) because from the harness's perspective they are all "smoke did not pass" — the distinction is in the `reason="..."` string, which is what the operator reads.
   - `2` — missing/malformed env config (from AC #2), INCLUDING the same-list equality check.
   - `3` — round-trip passed but cleanup DELETE failed on child OR parent. Operator must hand-delete using the `[bmad-smoke-x]` prefix search.

7. No edits to `src/server.ts`. The `ensureInitialized` refactor story 1.5 authors stays invariant. If `git diff --stat -- src/server.ts` shows any lines added by this story, that is scope creep — revert and re-scope. Rationale: this harness exercises the same transport plumbing story 1.5 already validates (stdio happy path); the cross-list question is a ClickUp-API question, not a server-wiring question.

8. No edits to `src/http-server.ts`. Same invariant as story 1.5 AC #27. This harness is stdio-only (AC #1) — it does not need HTTP.

9. No edits to `src/tools/clickup-adapter.ts`, `src/tools/clickup-session.ts` (if present post-1.4), `src/utils/clickup-env.ts` (if present post-1.3). Same invariant as story 1.5 AC #28 — those belong to stories 1.3 / 1.4.

10. No edits to the vendored tree. `git diff --stat -- src/tools/clickup/src/` prints nothing. Same invariant as stories 1.1–1.5.

11. No edits to `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts`, `src/index.ts`, `src/index-http.ts`, or anywhere in `tests/`. `git diff --stat` on those paths prints nothing. This is a script-only + package.json + README story.

12. No new runtime or dev dependencies. The harness uses only:

- Node built-ins: `node:child_process` (spawn), `node:readline` (line-delimited JSON-RPC read from stdio subprocess), `node:crypto` (random suffix), `node:process`, `globalThis.fetch` (available in Node 18+ per `.nvmrc` pinning 22.14.0).
- NO axios, NO undici, NO chalk, NO dotenv.

13. Deliberate duplication with story 1.5's harness. The JSON-RPC stdio client in this script is a near-copy of the one inside `scripts/smoke-clickup-crud.mjs` (post-1.5). This is intentional — do NOT extract a shared `scripts/lib/mcp-stdio-client.mjs` module as part of this story. Rationale in Dev Notes §"Deliberate duplication vs sharing with 1.5's harness". If a third harness ever materializes (e.g. a hypothetical story 1.8 sprint-transition smoke), that is the right moment to factor — not now, at N=2.

14. `package.json` gains one new script entry in the `scripts` block, placed adjacent to the existing `smoke:clickup` / `smoke:clickup:http` entries story 1.5 adds (AC #13 of 1.5). Entry:

```json
"smoke:clickup:cross-list": "node scripts/smoke-clickup-cross-list.mjs",
```

Placement: immediately after `smoke:clickup:http` so the three smoke commands cluster visually. Does NOT depend on `npm run build` — same prereq as story 1.5's harness (operator builds first).

15. `README.md` gains a new subsection §"Running the ClickUp cross-list subtask smoke test" under the existing ClickUp smoke-test area (add it immediately after the §"Running the ClickUp smoke tests" subsection story 1.5 adds via its AC #14). Content (approximate — exact wording at author's discretion):

- **Purpose.** One-paragraph explanation: this harness verifies PRD §Risks R1 — whether ClickUp accepts a story as a subtask of an epic when the two tasks live in different lists (story in sprint list, parent in backlog list per PRD §ClickUp-layout). A PASS greenlights the EPIC-2 sprint-layout design; a FAIL means the layout needs redesign before Dev-agent story-creation plumbing depends on it.
- **Prerequisites.** Two pre-created lists in the target ClickUp workspace: one backlog list, one sprint list. Each MUST have at least one status. Lists MAY live in the same space or different spaces — the harness is agnostic. A valid `CLICKUP_API_KEY` with permissions to create tasks, set `parent_task_id`, and DELETE tasks in both lists.
- **Build prerequisite.** Run `npm run build` first — the harness spawns `build/index.js` as a child process.
- **Command.** `CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... CLICKUP_SMOKE_BACKLOG_LIST_ID=... CLICKUP_SMOKE_SPRINT_LIST_ID=... npm run smoke:clickup:cross-list`.
- **What it verifies** (bullet list): epic created in backlog list → story created in sprint list with `parent_task_id=<epic-id>` → `getTaskById(story)` reports `list.id == SPRINT_LIST_ID` AND `parent_task_id == EPIC_ID` → `getTaskById(epic)` reports `storyId` in `child_task_ids` → DELETE cleanup (child first, then parent).
- **Expected output.** A single `SMOKE PASS cross-list epic_id=<id> story_id=<id> ...` line on stderr with exit code 0. A failing run prints `SMOKE FAIL cross-list step=<letter> reason="..."` + the failing request/response pair.
- **Cleanup.** On PASS the harness DELETEs both tasks (unless `--keep-tasks`). On FAIL between steps f and j, one or both tasks may be left behind — search ClickUp for `[bmad-smoke-x]` to audit and hand-delete. Note the prefix differs from story 1.5's `[bmad-smoke]` for exactly this audit purpose.
- **Why it's not in CI.** Brief note pointing at story 1.5's README section's "Why it's not in CI" subsection — same three reasons (credentials, rate limits, non-determinism) apply unchanged. Do not duplicate the rationale.

16. The harness is NOT added to `.github/workflows/ci.yml`, `release-draft.yml`, `release-publish.yml`, or `pr-title-check.yml`. Same invariant as story 1.5 AC #15. A single `grep -n 'smoke' .github/workflows/*.yml` post-commit MUST return zero matches introduced by this story.

17. The harness invokes MCP tools EXCLUSIVELY via JSON-RPC over stdio. Same black-box invariant as story 1.5 AC #16. It MUST NOT:

- Import anything from `src/`.
- Reach into the vendored tree directly.
- Call `registerClickUpTools` or `BMADServerLiteMultiToolGit` in-process.
- Use any MCP SDK helper (`Client.connect`, etc.).

18. Idempotency of the harness itself: re-running creates two NEW tasks per run (one epic + one story, both uniquely named per AC #3). Cleanup-on-pass ensures zero accumulation across green runs. Red runs MAY leave orphaned tasks — `[bmad-smoke-x]` prefix makes them discoverable.

19. Lifecycle safety: on exit (PASS or FAIL), send SIGTERM to the child process, await its `exit` event with a 3-second timeout, then force-kill if still alive. Do NOT leak child processes. Same pattern as story 1.5 AC #3's lifecycle clause.

20. `npm run build` passes cleanly — no-op for this story since no TypeScript is edited.

21. `npm run lint` produces no new findings. The `.mjs` script is picked up by the ESLint flat config per `package.json`'s `lint` script (`--ext .ts,.js,.mjs` — same as story 1.5 AC #21). Use `const` / `let` consistently, no `var`, no unused imports, no `console.log` (use `console.error` for stderr logging).

22. `npm run format` produces no churn. Prettier-clean under the existing config (single quotes, 2-space indent, 80-char width).

23. `npm test` passes unchanged — this story adds no vitest tests. Expected delta vs story 1.5's green baseline: `+ 0 tests, + 0 failures`. Rationale: the cross-list capability is inherently a live-API property; no amount of unit-testing the harness itself adds coverage of the property it is designed to prove. The harness IS the test.

24. `tests/unit/dependency-audit.test.ts` requires no changes. Rationale: same as story 1.5 AC #12 — the audit walks `src/` only, and `scripts/smoke-clickup-cross-list.mjs` is outside that tree.

25. The commit message follows conventional-commits and is scoped `clickup`: `feat(clickup): smoke-test cross-list parent/subtask (PRD R1 mitigation)`. The commit body captures (a) the new harness + its single-transport stdio mode, (b) the one new npm script entry, (c) the README section added, (d) the explicit decision to keep smoke out of CI (reference 1.5's Dev Notes), (e) the explicit decision to duplicate the JSON-RPC client rather than extract a shared module (reference AC #13 / Dev Notes §"Deliberate duplication"), (f) link back to story key `1-6-smoke-test-cross-list-subtask` and to EPIC-1 §Outcomes bullet 4 and PRD §Risks R1.

## Out of Scope (explicitly deferred to later stories)

- **HTTP-transport variant.** Story 1.5 already proves the HTTP transport round-trips CRUD primitives against a real workspace. The cross-list question is a ClickUp-API capability question, not a transport capability question — exercising it twice (once per transport) doubles the run cost with zero additional coverage. If a future regression surfaces in HTTP's `createTask` payload serialization under a `parent_task_id` argument, that is a story 1.5 harness extension (add cross-list cases to the HTTP path), not a new harness.
- **Multi-space cross-list.** The harness is agnostic to whether the backlog and sprint lists live in the same space or different spaces (AC #2 explicitly notes this). Testing the "definitely different spaces" matrix deliberately is out of scope — if ClickUp's cross-list semantics differ based on space-level boundaries, that discovery belongs in a follow-up story with a dedicated multi-space fixture (spaces are harder to create/tear down than lists).
- **Epic-to-epic parent relationships.** The PRD §ClickUp-layout only uses parent_task_id for the story→epic edge. Testing epic→portfolio-epic or story→story nesting is out of scope — the PRD does not demand it, and upstream's `parent_task_id` field is symmetric enough that the story→epic proof is sufficient for the layout design.
- **Cross-list MOVE after create.** Per upstream `src/tools/clickup/src/tools/task-write-tools.ts:347`: "ClickUp API does not support moving tasks between lists after creation." This is an API limitation, not a harness gap. No test can validate a prohibited operation. Out of scope structurally.
- **Parent re-parenting via `updateTask(parent_task_id=...)`.** Upstream exposes this (per `src/tools/clickup/src/tools/task-write-tools.ts:134`), but it's orthogonal to the R1 mitigation — the PRD cares about the initial cross-list subtask creation, not later edits. If the Dev agent ever needs to re-parent a task, that's its own story.
- **Bidirectional eventual-consistency retry.** Step i's `getTaskById(epicId)` asserts `storyId` appears in `child_task_ids`. ClickUp's internal denormalization may lag by a sub-second to a few seconds — if this assertion flakes in real runs, implement a retry-with-backoff (cap at ~5 s total) in a follow-up story. Per AC #4i, the contract for 1.6 is a single call; a flake surfaces as a legit FAIL that prompts the follow-up, not as silently-masked noise.
- **Performance assertions.** No latency budgets. Smoke is correctness-only. Same rationale as story 1.5.
- **Cleanup cascading / orphan reconciliation.** AC #4j deletes child-then-parent deterministically. It does NOT test "what if I delete the parent first — are subtasks orphaned or cascade-deleted by ClickUp?" That is a ClickUp API-behavior question unrelated to the R1 mitigation; if a team wants a definitive answer, add a separate `scripts/smoke-clickup-cascade-behavior.mjs` with explicit ordering inversion.
- **Negative error-path smoke.** AC #4 asserts the happy path + the key R1-failure signals. It does NOT drive "what if the parent is archived mid-flight", "what if the API token is revoked between steps g and h", "what if the backlog list is deleted while the epic task exists". Same deferral rationale as story 1.5.
- **Dev-agent story-creation end-to-end** — EPIC-2 scope. The Dev story-creation flow composes `pickSpace` → `getListInfo` (backlog) → `searchTasks` (pick epic) → `getListInfo` (sprint) → `createTask` (with `parent_task_id`). Story 1.6's harness is the primitive-level proof that `createTask` with a cross-list `parent_task_id` works; EPIC-2 proves the Dev agent's composition of those primitives.
- **CI coverage via a scheduled workflow.** Forbidden per AC #16. If a future team wants weekly go/no-go runs against a sandbox workspace, add `.github/workflows/smoke-scheduled.yml` in a dedicated ops story with secret injection + rate-limit budgeting — not here.
- **Sharing the JSON-RPC client with story 1.5's harness.** Forbidden per AC #13. Factor at N=3, not N=2. Dev Notes §"Deliberate duplication" has the full rationale.
- **Space/list/folder creation by the harness.** The operator pre-creates the two lists. The harness is a driver, not an installer. Creating lists programmatically requires additional permissions + a separate cleanup path for the lists themselves — all out of scope for an R1-mitigation smoke.
- **Emitting structured JSON output.** AC #5's PASS/FAIL lines are grep-friendly but not strictly JSON. Operator runs are human-interactive; machine consumption (e.g. a dashboard ingesting PASS/FAIL history) is an EPIC-5 pilot-iterate concern, not here.
- **`.env.example` additions.** The two new smoke env vars (`CLICKUP_SMOKE_BACKLOG_LIST_ID`, `CLICKUP_SMOKE_SPRINT_LIST_ID`) are documented in README only, not in `.env.example`. Same rationale as story 1.5's File List note on `.env.example` — `.env.example` stays focused on runtime config, not test-harness config.
- **Mutating the vendored tree.** Forbidden. Same invariant as stories 1.1–1.5.

## Tasks / Subtasks

- [ ] **Task 1 — Implement `scripts/smoke-clickup-cross-list.mjs` (AC: #1–#6, #12, #17–#19, #21, #22)**
  - [ ] Create the file with a shebang `#!/usr/bin/env node`. Commit with executable bit. Top-of-file header comment documents purpose (PRD R1 mitigation), supported transport (stdio only, with brief rationale), env contract (four vars), and exit codes (0/1/2/3).
  - [ ] Parse CLI args: only `--keep-tasks` is recognized; anything else → usage to stderr + exit 1. Usage block shows example env var set.
  - [ ] Validate env (AC #2): check all four vars non-empty after `.trim()`. Missing → structured stderr listing each missing var + exit 2. Then check `CLICKUP_SMOKE_BACKLOG_LIST_ID !== CLICKUP_SMOKE_SPRINT_LIST_ID`; equality → exit 2 with the distinctness message.
  - [ ] Generate `suffix` once (per-run): `randomBytes(4).toString('base64url').slice(0,6)`. Build `epicName` and `storyName` using the same suffix + same ISO timestamp. Emit both names to stderr up front (so an operator inspecting a failed run knows what to search for in the ClickUp UI).
  - [ ] Inline a ~40-LOC JSON-RPC stdio client — spawn child, readline on stdout, write JSON-RPC requests newline-delimited to stdin, `Map<id, {resolve, reject}>` for pending responses, `rpc(method, params)` helper. Same shape as story 1.5 Dev Notes §"JSON-RPC over stdio: the minimal client" — treat 1.5's inlined client as a reference implementation but do NOT `import` from it (AC #13).
  - [ ] Factor a `callTool(name, args): Promise<{text: string}>` helper that wraps `rpc('tools/call', { name, arguments: args })` and extracts `result.content[0].text`. Throws on protocol error. Reused across steps d–i.
  - [ ] Implement steps a–j per AC #4. Each step logs one `[smoke-x][<letter>] <msg>` stderr line on success. On assertion failure, dump the step's request + response as pretty-printed JSON then print the `SMOKE FAIL cross-list ...` summary + exit 1.
  - [ ] Cleanup (step j): child-first DELETE, then parent DELETE. Track `cleanupChildFailed` and `cleanupParentFailed` separately; on either failure, set process exit code to 3 AFTER printing the PASS summary (with a trailing `(cleanup failed: child=<y|n> parent=<y|n>)` annotation so the operator sees which DELETE broke).
  - [ ] Measure `elapsed_ms` via `process.hrtime.bigint()` at start + end. Include in the final summary line.
  - [ ] Child-process lifecycle: register an exit handler that sends SIGTERM to the child (if still alive), awaits `exit` event with a 3-s timeout, force-kills on timeout. Covers both PASS and FAIL paths.
  - [ ] Harness style: ESLint flat-config clean (`--ext .mjs` picks this up). Prettier clean. No `var`, no `console.log`, no eslint-disable comments.

- [ ] **Task 2 — Wire npm script (AC: #14)**
  - [ ] Edit `package.json`'s `scripts` block. Add:
    ```json
    "smoke:clickup:cross-list": "node scripts/smoke-clickup-cross-list.mjs",
    ```
    immediately after the `smoke:clickup:http` entry story 1.5 adds. Do NOT touch any other script; do NOT add this to `test:all`.
  - [ ] If story 1.5 has NOT yet landed on `main` when this story is picked up: the `smoke:clickup:http` anchor doesn't exist yet. In that case, place this entry adjacent to the existing `cli:list-workflows` entry (same anchor story 1.5 AC #13 uses), and note in the commit body that a rebase onto post-1.5 `main` will re-cluster the three smoke entries together.

- [ ] **Task 3 — Document in README.md (AC: #15)**
  - [ ] Locate the §"Running the ClickUp smoke tests" subsection story 1.5 adds (grep for `smoke:clickup` or `SMOKE PASS` in README). Insert the new §"Running the ClickUp cross-list subtask smoke test" subsection immediately after it.
  - [ ] Content per AC #15's seven bullets. Keep the section tight — ~35 lines of markdown. Cross-reference story 1.5's section for "Why it's not in CI" (don't duplicate the rationale).
  - [ ] If story 1.5 has NOT yet landed: add this subsection adjacent to the existing ClickUp env-var table instead, and include a note in the commit body that README ordering will need a rebase-time touch-up once 1.5 lands.
  - [ ] Proofread: an operator following the section verbatim, given two pre-created lists and a valid token, should produce a green `SMOKE PASS cross-list ...` line on their first attempt.

- [ ] **Task 4 — Smoke-verify locally (AC: #4, #6, #18, all build/test/lint hygiene)**
  - [ ] `npm run build` — clean (no-op for this story).
  - [ ] `npm run lint` — same baseline as story 1.5's merge state; no new findings.
  - [ ] `npm run format` — no churn.
  - [ ] `npm test` — passes (no new tests; no delta).
  - [ ] Happy-path smoke with real credentials (author-only; requires a sandbox workspace with two pre-created lists):
    ```bash
    CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... \
    CLICKUP_SMOKE_BACKLOG_LIST_ID=... CLICKUP_SMOKE_SPRINT_LIST_ID=... \
    npm run smoke:clickup:cross-list
    ```
    Expected: `SMOKE PASS cross-list epic_id=... story_id=... backlog_list=... sprint_list=... elapsed_ms=...`; exit 0. After-run check: search ClickUp for `[bmad-smoke-x]` → no matches (cleanup worked).
  - [ ] `--keep-tasks` smoke: append `-- --keep-tasks` → PASS with exit 0; both tasks remain; operator verifies parent→child relationship in UI, then hand-deletes both (child first).
  - [ ] Negative smoke — missing env: `CLICKUP_SMOKE_SPRINT_LIST_ID= npm run smoke:clickup:cross-list` → exit 2 with a structured diagnostic listing `CLICKUP_SMOKE_SPRINT_LIST_ID` as missing.
  - [ ] Negative smoke — same list ID: `CLICKUP_SMOKE_SPRINT_LIST_ID=$CLICKUP_SMOKE_BACKLOG_LIST_ID npm run smoke:clickup:cross-list` → exit 2 with the distinctness message.
  - [ ] Negative smoke — invalid backlog list: `CLICKUP_SMOKE_BACKLOG_LIST_ID=999999999 npm run smoke:clickup:cross-list` → exit 1 with `SMOKE FAIL cross-list step=d reason="..."`.
  - [ ] R1 materialization capture: if the happy-path run FAILS at step g, h, or i, the failure message IS the R1 signal — copy the `SMOKE FAIL ...` line + the dumped request/response into the story's Completion Notes. Do NOT "fix" the harness to mask the failure — the failure is the product. If the author encounters this in practice, escalate to the team before landing: PRD §Risks R1 materializing changes EPIC-2's design.
  - [ ] Cleanup-fail smoke (optional): temporarily revoke DELETE permission on one of the two lists → steps a–i pass; step j partially fails; harness prints `SMOKE PASS ... (cleanup failed: child=<y|n> parent=<y|n>)` with exit 3. Restore permission + hand-delete. Document in commit body if performed.
  - [ ] Document in the commit body which of these smokes were exercised vs skipped — transparency beats inflated confidence. Same convention as story 1.5 Task 6.

- [ ] **Task 5 — Commit (AC: #7–#11, #16, #25)**
  - [ ] Verify no-edit invariants BEFORE staging: run `git diff --stat -- src/ tests/ .github/ src/tools/clickup-adapter.ts src/tools/clickup/` → MUST print zero lines. If any line appears, revert the stray edits and re-scope (per ACs #7–#11 and #16). This is load-bearing: the story's entire correctness story depends on the harness being a black-box script-only delivery.
  - [ ] Stage in this order: `scripts/smoke-clickup-cross-list.mjs`, `package.json`, `README.md`. Do NOT use `git add -A` / `git add .` — those pick up stray edits that bypass the invariant check above.
  - [ ] Commit message: `feat(clickup): smoke-test cross-list parent/subtask (PRD R1 mitigation)`.
  - [ ] Commit body per AC #25: six bullets (harness, npm script, README section, CI exclusion rationale, deliberate-duplication rationale, forward link).

## Dev Notes

### Smoke-test flow at a glance

| Step | Tool / Action                                                                            | Assertion                                                                          |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| a    | Spawn `node build/index.js` (stdio)                                                      | Child process alive                                                                |
| b    | JSON-RPC `initialize`                                                                    | `result.capabilities.tools` present                                                |
| c    | JSON-RPC `tools/list`                                                                    | Contains at minimum `bmad`, `createTask`, `getTaskById`, `getListInfo`             |
| d    | `getListInfo(list_id=$CLICKUP_SMOKE_BACKLOG_LIST_ID)`                                    | ≥1 status parsed; capture `backlogStatus`                                          |
| e    | `getListInfo(list_id=$CLICKUP_SMOKE_SPRINT_LIST_ID)`                                     | ≥1 status parsed; capture `sprintStatus`                                           |
| f    | `createTask(list_id=backlog, name=epicName, status=backlogStatus)`                       | Response contains task ID; capture `epicId`                                        |
| g    | `createTask(list_id=sprint, parent_task_id=epicId, name=storyName, status=sprintStatus)` | Response does NOT contain `Error creating task:`; capture `storyId`                |
| h    | `getTaskById(task_id=storyId)`                                                           | `list.id == SPRINT_LIST_ID` AND `parent_task_id == epicId` AND `name == storyName` |
| i    | `getTaskById(task_id=epicId)`                                                            | `child_task_ids` contains `storyId`                                                |
| j    | `fetch DELETE` child, then parent (skip if `--keep-tasks`)                               | Both 2xx                                                                           |

Ten steps (a–j) — step a boots the server, steps b–i are eight JSON-RPC tool calls, step j performs two DELETE cleanups. The three tools exercised (`getListInfo`, `createTask`, `getTaskById`) are a subset of story 1.5's five — deliberately. This harness is narrow; it proves exactly one ClickUp-API property (cross-list parent_task_id acceptance) and nothing else.

### Why this matters — PRD §Risks R1 is the design-gating risk for EPIC-2

PRD §Risks R1 verbatim:

> **R1:** ClickUp may not support cross-list subtasks (story in sprint list, parent in backlog list) without quirks. _Mitigation:_ Phase 1 smoke test gates Phase 2.

EPIC-2's Dev-agent story-creation mode is Phase 2. Its happy path composes `pickSpace` → `getListInfo(backlog)` → `searchTasks` (epic picker) → `getListInfo(sprint)` → `createTask(list_id=sprint, parent_task_id=epic)`. The last step is EXACTLY the primitive this harness proves. If it fails:

1. **Cross-list create rejected outright** (step g returns `Error creating task:`) — ClickUp's API will not accept the relationship. EPIC-2's sprint-layout design is dead-on-arrival. The team needs to either (a) relocate stories to live in the SAME list as the epic (backlog-centric layout; loses the Sprint-list-as-active-work semantic), or (b) use a linked-task relationship instead of parent_task_id (loses the native subtask UI affordance).
2. **Cross-list create accepted but child silently relocated** (step g passes but step h fails the `list.id == SPRINT_LIST_ID` check) — ClickUp accepts the API call but drags the subtask into the parent's list, defeating the point. Same downstream consequences as (1).
3. **Cross-list create accepted, child stays in sprint list, but parent read is stale** (step g and step h pass but step i fails the `child_task_ids` contains assertion) — the relationship exists from the child's side but not from the parent's side. This is an eventual-consistency bug, not a design-killer — EPIC-2 can proceed but the Dev agent's epic-inspection flow needs a retry-with-backoff. File a follow-up story; do NOT redesign the layout.

Distinguishing these three failure modes is why the harness's failure `reason="..."` strings are verbose. An operator facing a FAIL must be able to route the problem correctly without a debugger session.

### Why stdio only, not both transports

Story 1.5's harness covers BOTH transports (stdio + http) because 1.5 is dual-mission: it proves CRUD primitives AND closes the HTTP-tool-registration gap (`ensureInitialized` in `src/server.ts`). Running 1.5 on both transports lets the HTTP mode's registration fix be verified end-to-end.

Story 1.6 has no such dual mission. The question it answers is purely a ClickUp-API capability question — does ClickUp accept `createTask(list_id=A, parent_task_id=<task-in-B>)`? That question's answer does not depend on how the MCP request arrived at the server. If the answer is "yes" over stdio, it is also "yes" over HTTP (both transports end up calling the same upstream code path that issues `fetch('https://api.clickup.com/api/v2/list/A/task', {body: {parent: <task-id>}})`). Doubling the run doubles the workspace side-effects (four tasks per cycle instead of two), doubles the wall-clock time, doubles the rate-limit pressure — all for zero new information. Stdio alone is sufficient proof.

Corollary: if a future regression surfaces in HTTP's `createTask` payload serialization specifically under a `parent_task_id` argument, that belongs in story 1.5's HTTP path (extend its CRUD harness to include a parent_task_id case) — not in a second cross-list harness.

### Deliberate duplication vs sharing with 1.5's harness

Story 1.5's harness will land with a ~40-LOC inline JSON-RPC stdio client. This story's harness needs the same ~40 LOC. Obvious instinct: extract `scripts/lib/mcp-stdio-client.mjs` and have both harnesses import it. Rejected. Reasons:

1. **N=2 is below the extract threshold.** The canonical rule — extract on the third use, not the second — applies with extra force here because the harnesses are test drivers, not production code. A shared module introduces a coupling point where a bug in the shared client breaks both harnesses simultaneously; the isolation-benefit of independent copies outweighs the ~40-LOC duplication.
2. **The two harnesses' usage diverges meaningfully.** 1.5's client needs to multiplex HTTP and stdio within the same file (via a transport switch); 1.6's only needs stdio. A shared module would either pull the HTTP paths into 1.6 (unused dependency surface) OR be stdio-only (forcing 1.5 to duplicate the HTTP paths anyway — defeating the point).
3. **The scripts directory's existing convention is flat + duplicative.** `scripts/build-clickup.mjs`, `scripts/bmad-cli.mjs`, `scripts/show-*.mjs` — none share utilities; each is self-contained. Introducing a `scripts/lib/` subdirectory is a convention change; worth doing at N=3, premature at N=2.
4. **Dev-notes reviewability.** A reviewer reading `smoke-clickup-cross-list.mjs` should be able to see the entire harness end-to-end in one file. A shared client adds a navigation hop.

When a third harness materializes (e.g. a hypothetical sprint-transition smoke, a docker-compose smoke, a CI-scheduled sandbox smoke), factor at that point. The first ~40 LOC of `scripts/lib/mcp-stdio-client.mjs` is already written three times over.

### Parsing task IDs from upstream responses

Upstream's `createTask` response format (per `src/tools/clickup/src/tools/task-write-tools.ts:647-699` — the `formatTaskResponse` helper called by `createTask` at line 395):

```
Task created successfully!
task_id: 86tx8zy92
name: [bmad-smoke-x] epic 2026-04-21T19:12:33Z-abc123
url: https://app.clickup.com/t/86tx8zy92
status: to do
assignees: ...
list_id: 901234567              ← WARNING: echoes params.list_id (what we requested), NOT task.list.id (what ClickUp stored)
parent_task_id: 86tx0abcde      ← only present if params.parent_task_id was passed
```

The `formatTaskResponse` helper emits `Task created successfully!` as the array's first entry (line 648) and `task_id: ${task.id}` as the second entry (line 649). Parse the first `/^task_id:\s*(\S+)\s*$/m` match for the task ID — the summary line has no colon-prefix field, so the regex skips it cleanly.

For step f (creating the parent epic, no parent_task_id passed), the response has NO `parent_task_id:` line — don't assert its absence, just ignore.

For step g (creating the child story WITH `parent_task_id`), the response DOES have `parent_task_id: <epicId>` per line 683-685. Asserting this line is a belt-and-suspenders check — step h re-asserts the same property via `getTaskById`, which is the authoritative verification.

**⚠️ CRITICAL: the create-path's `list_id: <id>` line is NOT R1-authoritative.** Per `formatTaskResponse` line 654, that line emits `params.list_id` — i.e. what the client ASKED FOR, not what ClickUp actually stored. A naive harness that parses `list_id:` from the create-response and asserts it equals `CLICKUP_SMOKE_SPRINT_LIST_ID` will always PASS that check (it's comparing a value to itself, modulo serialization) — a FALSE PASS on the R1 question. The only authoritative read of the persisted list is `getTaskById`'s `list: <name> (<id>)` line (per `task-tools.ts:304`, which reads `task.list.id` — ClickUp's denormalized view of where the task actually lives). **Do NOT shortcut step h by parsing the create-path's `list_id:` field — it will silently pass and defeat the entire point of this story.**

`getTaskById` response format (per `src/tools/clickup/src/tools/task-tools.ts:295-360`):

```
task_id: 86tx8zz12
task_url: https://app.clickup.com/t/...
name: [bmad-smoke-x] story ...
status: to do
date_created: 2026-04-21T19:12:45+00:00
date_updated: ...
creator: ...
assignee: ...
list: Sprint 47 (901234568)            ← step h parses <id> from the parens
space: ...
parent_task_id: 86tx8zy92              ← step h asserts this byte-for-byte
...
child_task_ids: 86tx8zz12              ← step i parses comma-separated, asserts storyId in list
```

The `list:` line format is `list: <name> (<id>)` — regex: `/^list:\s*.+?\s*\((\S+)\)\s*$/m`. Capture group 1 is the list ID.

The `parent_task_id:` line is absent if the task has no parent. Step h fails-with-reason if absent.

The `child_task_ids:` line is absent if the task has no subtasks. Step i fails-with-reason if absent.

Format drift risk: if upstream renames any of these keys, the harness breaks with a clear `reason="could not parse <field> from <tool> response"` message. No schema-version check — same posture as story 1.5 Dev Notes §"Upstream's `getListInfo` response parsing".

### Cleanup order: child-first, then parent

Two observed ClickUp API behaviors inform this decision:

1. **Parent delete with live subtasks is undefined.** The public docs don't specify whether deleting a parent cascades, orphans, or rejects. In practice observed: the parent is deleted and the subtasks are ALSO deleted (cascade). But that behavior may change, and relying on it means the harness can't cleanly separate "parent deleted OK" from "subtasks went along for the ride". Child-first delete makes each DELETE's outcome directly attributable to its own target.
2. **DELETE-then-DELETE of an orphan is idempotent-ish.** If the parent cascade-deletes the child anyway, the subsequent child-DELETE returns a 404, which the harness treats as non-2xx → `cleanupChildFailed = true` → exit 3. That's correct behavior (the operator should notice cascade weirdness), not a harness bug.

If cascade-on-parent-delete is ever desirable (e.g. a bulk-cleanup script wants ONE DELETE to clean both), that's a separate `scripts/clickup-bulk-cleanup.mjs`, not this harness's concern.

### Artifact lifecycle: what the smoke leaves behind

| Outcome                                      | Artifacts in workspace                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMOKE PASS` (default, no `--keep-tasks`)    | Zero. Both tasks deleted by step j.                                                                                                                                                                                                                                                                                    |
| `SMOKE PASS` (with `--keep-tasks`)           | Two tasks (the epic + the story, linked via parent_task_id), inspectable in UI.                                                                                                                                                                                                                                        |
| `SMOKE PASS` (exit 3, child cleanup failed)  | One task (the child). Operator hand-deletes via `[bmad-smoke-x] story` search. Parent was deleted OK (child-first ordering; but wait — this state is unreachable because if child DELETE returned non-2xx we STILL try parent DELETE, which succeeds — leaving the orphan child. Yes, exactly the "one task" outcome.) |
| `SMOKE PASS` (exit 3, parent cleanup failed) | One task (the parent). Operator hand-deletes via `[bmad-smoke-x] epic` search. Child was deleted OK.                                                                                                                                                                                                                   |
| `SMOKE PASS` (exit 3, both cleanups failed)  | Two tasks. Operator hand-deletes both via `[bmad-smoke-x]` search.                                                                                                                                                                                                                                                     |
| `SMOKE FAIL` between steps a–e               | Zero (no task was created yet).                                                                                                                                                                                                                                                                                        |
| `SMOKE FAIL` at step f                       | Zero (the epic creation itself failed).                                                                                                                                                                                                                                                                                |
| `SMOKE FAIL` at step g                       | One task (the epic). Operator hand-deletes via `[bmad-smoke-x] epic` search.                                                                                                                                                                                                                                           |
| `SMOKE FAIL` between steps h–i               | Two tasks (both created, linked). Operator hand-deletes via `[bmad-smoke-x]` search.                                                                                                                                                                                                                                   |

Worst case: two orphaned tasks per failed run. The `[bmad-smoke-x]` prefix + the shared random suffix make them discoverable and correlate-able.

### Why a separate prefix `[bmad-smoke-x]` instead of `[bmad-smoke]`

Story 1.5 uses `[bmad-smoke] CRUD roundtrip <ts>-<suffix>`. A naive extension would be `[bmad-smoke] cross-list <ts>-<suffix>`. Rejected for two reasons:

1. **Prefix-based audit clarity.** An operator bulk-searching `[bmad-smoke]` in ClickUp sees an amalgam of CRUD + cross-list stragglers and has to read each name to route. `[bmad-smoke-x]` lets them search only cross-list-specific stragglers (e.g. "is this harness leaking tasks more than 1.5's?"). The three extra characters per task name are a cheap price for an operational affordance.
2. **Accidental cross-contamination protection.** If a future bulk-delete script is written that searches `[bmad-smoke]` literally (no wildcard), it correctly skips `[bmad-smoke-x]` tasks — or vice versa. Distinct prefixes prevent one cleanup script from nuking another harness's keep-tasks inspection set.

Trade-off: prefix discipline needs to be maintained as more harnesses are added. Proposed convention going forward (not binding in this story; document in a future ops story): `[bmad-smoke-<shortname>]` — e.g. `[bmad-smoke-crud]`, `[bmad-smoke-x]` (this story), `[bmad-smoke-sprint]` (future), etc. Story 1.5's historical `[bmad-smoke]` stays as-is (don't rewrite landed history); new harnesses pick a short, unique suffix.

### Interaction with stories 1.3 / 1.4 / 1.5

- **If 1.5 has NOT landed when 1.6 is picked up**: the HTTP-mode tool-registration gap is still open. 1.6 is stdio-only (AC #1), so the gap does not affect this harness — stdio registers ClickUp tools eagerly per the current `start()` body at `src/server.ts:438-458` (pre-1.5). No rebase hazard; this harness runs green on the pre-1.5 tree as long as 1.3/1.4's env/session semantics are stable enough for a valid ClickUp token to register the tool surface.
- **If 1.5 has landed when 1.6 is picked up**: rebase package.json's new script entry to cluster adjacent to the two 1.5 scripts; rebase README's new subsection to sit adjacent to 1.5's new subsection. Trivial rebase.
- **If 1.4 has NOT landed**: the adapter signature is still `registerClickUpTools(server)` without `session`. AC #7 explicitly forbids editing `src/server.ts` or the adapter, so this harness is unaffected — it consumes whatever tool surface the current `registerClickUpTools` emits.
- **If 1.3 has NOT landed**: `BMAD_REQUIRE_CLICKUP` enforcement may not exist yet. The harness does not consume this env var (AC #2), so unaffected.
- **Recommended merge order**: 1.2 → 1.3 → 1.4 → 1.5 → 1.6. If 1.6 is picked up in parallel with 1.5, coordinate rebases on `package.json` + `README.md` (small mechanical conflicts expected in both files).

### Project structure notes

- `scripts/smoke-clickup-cross-list.mjs` — new sibling of `scripts/smoke-clickup-crud.mjs` (post-1.5). Flat-under-scripts convention. Executable.
- No new directories, no new config files, no vendored-tree changes, no test files.
- `src/**` untouched (AC #7–#11).

### CI exclusion — same concrete workflow files as story 1.5

Same four workflows, same rationale, same zero-match `grep -n 'smoke' .github/workflows/*.yml` invariant (relative to lines this story introduces). See story 1.5 Dev Notes §"CI exclusion — the concrete workflow files" for the table-form justification.

### SDK + package.json interaction

This story does not touch `package.json` dependencies, only `scripts`. No new runtime or dev deps. `@modelcontextprotocol/sdk` stays at `^1.29.0`.

The harness's use of `globalThis.fetch` requires Node 18+. `.nvmrc` pins 22.14.0, safe.

### References

- [EPIC-1 §Outcomes bullet 4](../epics/EPIC-1-clickup-mcp-integration.md) — "Smoke-test: create task, add comment, update status, list folders/lists, cross-list parent/subtask — all round-trip successfully against a real ClickUp workspace." Story 1.6 delivers the last clause; stories 1.5 delivered the first three; `list folders/lists` is implicit in steps d/e's `getListInfo` calls (both this story and 1.5 exercise it).
- [EPIC-1 §Stories bullet 7](../epics/EPIC-1-clickup-mcp-integration.md) — "Smoke-test cross-list parent/subtask (story in sprint list, parent in backlog list)" — scope-exact.
- [EPIC-1 §Exit criteria bullet 1](../epics/EPIC-1-clickup-mcp-integration.md) — "All smoke tests pass against a real ClickUp workspace." This story is the final contributor; combined with story 1.5, all EPIC-1 smoke assertions are operator-runnable via `npm run smoke:clickup && npm run smoke:clickup:http && npm run smoke:clickup:cross-list`.
- [PRD §Risks R1](../PRD.md) — "ClickUp may not support cross-list subtasks (story in sprint list, parent in backlog list) without quirks. _Mitigation:_ Phase 1 smoke test gates Phase 2." This story IS the mitigation.
- [PRD §ClickUp-layout](../PRD.md) — "Stories → subtasks of an epic (parent = epic task), living in the active Sprint list." This story verifies the layout is achievable against a real ClickUp workspace.
- [PRD §Success-criteria](../PRD.md) — the end-to-end flow's "rich story appears in ClickUp" step is a story-in-sprint-list-with-parent-in-backlog operation at the API layer. Story 1.6 proves the primitive.
- [Story 1.5 §Out-of-Scope bullet 2](./1-5-smoke-test-crud.md) — "**Cross-list parent/subtask smoke** — **story 1.6**." Direct deferral; this story discharges it.
- [Story 1.5 AC #4, #5, #6, #15, #16, #17, #18](./1-5-smoke-test-crud.md) — the harness-design pattern 1.6 follows. Operation sequence, log format, exit codes, CI exclusion, black-box contract, idempotency — all inherited unchanged.
- Upstream `src/tools/clickup/src/tools/task-write-tools.ts:324-420` — the `createTask` tool definition with its `parent_task_id` parameter. Confirms the API surface supports the cross-list scenario at the MCP layer (whether ClickUp's backend honors it is the R1 question).
- Upstream `src/tools/clickup/src/tools/task-write-tools.ts:520-522` — `buildTaskRequestBody` maps `parent_task_id` → ClickUp's `parent` field in the POST body. This is the exact API call being tested.
- Upstream `src/tools/clickup/src/tools/task-tools.ts:295-360` — `formatTaskResponse`-style output for `getTaskById`, including the `list: <name> (<id>)`, `parent_task_id: <id>`, and `child_task_ids: <id>, ...` lines this harness parses in steps h and i.
- Upstream `src/tools/clickup/src/tools/task-write-tools.ts:649-699` — `formatTaskResponse` for create/update paths. Source of the `task_id:` line step f/g parse.
- Upstream `src/tools/clickup/src/tools/list-tools.ts:69-83` — `getListInfo` response format; same parsing approach as story 1.5 AC #4d.
- Current `src/server.ts:438-475` — existing `start()` body. Untouched by this story (AC #7). If 1.5 lands first, `start()`'s shape changes to use `ensureInitialized()`; this harness is transparent to that refactor because it's a black-box consumer.
- `CLAUDE.md` §"Common commands" — `npm run build` prerequisite for smoke (no `predev` hook populates `build/`).
- `commitlint.config.cjs` — `feat(clickup)` scope accepted per stories 1.1–1.5.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `scripts/smoke-clickup-cross-list.mjs` — standalone Node stdio-only smoke harness, epic-in-backlog + story-in-sprint cross-list parent relationship, self-cleaning child-then-parent (AC #1–#6, #12, #17–#19, #21, #22)

**Modified**

- `package.json` — one new `scripts` entry: `smoke:clickup:cross-list` (AC #14)
- `README.md` — new §"Running the ClickUp cross-list subtask smoke test" subsection (AC #15)

**Untouched (explicitly)**

- `src/tools/clickup/**` (vendored tree — read-only per story 1.1; harness consumes the published MCP tool surface)
- `BMAD-METHOD/**` (upstream BMAD — read-only)
- `src/server.ts` (story 1.5 `ensureInitialized` refactor scope — AC #7)
- `src/http-server.ts` (AC #8 — harness is stdio-only)
- `src/tools/clickup-adapter.ts`, `src/tools/clickup-session.ts`, `src/tools/clickup-space-picker.ts`, `src/utils/clickup-env.ts` (stories 1.3 / 1.4 scope — AC #9)
- `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts`, `src/index.ts`, `src/index-http.ts` (AC #11)
- `tests/**` (no new tests; no delta — AC #11, #23, #24)
- `scripts/smoke-clickup-crud.mjs` (story 1.5 authors; this story does not share code with it per AC #13)
- `.env.example` (out of scope per the §"Out of Scope" list; smoke-specific env vars documented only in README)
- `package.json` dependencies (no new runtime or dev deps — AC #12)
- `tests/unit/dependency-audit.test.ts` (AC #24)
- `.github/workflows/*.yml` (no smoke in CI — AC #16)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-21 | Story drafted from EPIC-1 §Stories bullet 7 + PRD §Risks R1 + story 1.5 §Out-of-Scope bullet 2's direct deferral via `bmad-create-story`. Status → ready-for-dev. Stdio-only smoke (Dev Notes §"Why stdio only"); deliberate ~40-LOC duplication of 1.5's JSON-RPC client (Dev Notes §"Deliberate duplication"); distinct `[bmad-smoke-x]` prefix for audit clarity (Dev Notes §"Why a separate prefix").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-21 | Validation pass: (a) normalized step-count wording in AC #4 intro and Dev Notes "flow at a glance" caption to "ten steps (a–j) — step a boots, steps b–i are eight JSON-RPC calls, step j issues two DELETEs" (earlier drafts had arithmetic inconsistent between the intro and the summary); (b) tightened AC #4f task-ID parsing to a single regex instruction referencing `task-write-tools.ts:647-659` (removed the misleading `id:`-vs-`task_id:` alternative); (c) AC #4g line citation sharpened from `:414` to `:413-414` (the `text:` field spans both); (d) AC #3 random-suffix descriptor corrected from "6 base36 chars" to "6 base64url chars" (the encoding used is base64url, not base36); (e) Dev Notes §"Parsing task IDs" expanded with a prominent warning that the create-path's `list_id:` line echoes `params.list_id` (not `task.list.id`) and is NOT R1-authoritative — only step h's `getTaskById` `list: <name> (<id>)` line is authoritative; (f) Task 5 gained an explicit `git diff --stat` no-edit-invariant verification sub-step covering ACs #7–#11 and #16 before staging. |
