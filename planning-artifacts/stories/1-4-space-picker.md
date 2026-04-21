# Story 1.4: Interactive ClickUp space picker with session caching

Status: ready-for-dev

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Fourth story in EPIC-1. Stories 1.1–1.2 vendored and wired upstream's ClickUp tool surface; story 1.3 added validated env loading (`CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` with actionable diagnostics and a `BMAD_REQUIRE_CLICKUP` hard-fail opt-in). Space — the third piece of the ClickUp auth triplet — is deliberately _not_ an env var per PRD §Env vars ("Space, sprint folder, and backlog list are discovered at runtime via interactive pickers"). This story adds the machinery: a per-server-instance `ClickUpSessionState`, three picker tools (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace`), and the wiring that lets the Dev agent's story-creation skill (story 2.6) ask "which space?" exactly once per session and have subsequent space-scoped calls honor the choice. Upstream's `searchSpaces` tool stays untouched — the picker tools sit _alongside_ it, using the same `getSpaceSearchIndex` cache to avoid duplicate `/api/v2/team/{teamId}/space` fetches.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a session-scoped ClickUp space selection primitive — a `ClickUpSessionState` class owned by each `BMADServerLiteMultiToolGit` instance, three new MCP tools (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace`) that read/write it, and wiring in `src/tools/clickup-adapter.ts` that registers the picker alongside upstream's tool set —
so that the Dev agent's story-creation `createTask` flow (story 2.6) can prompt the user for a space once per session and persist the choice, the hosted HTTP deployment's per-session `BMADServerLiteMultiToolGit` instance model (`src/http-server.ts:74`) keeps space selections isolated across concurrent MCP sessions, and the smoke tests in stories 1.5–1.6 can exercise space-scoped operations without re-picking between calls — all without editing the vendored tree (`src/tools/clickup/**` stays read-only per VENDOR.md and story 1.1 AC #2), without changing the `bmad` tool surface, and without touching `CONFIG` from `src/tools/clickup/src/shared/config.ts` (the singleton is upstream's concern; session state is ours).

## Acceptance Criteria

1. A new module `src/tools/clickup-session.ts` introduces a `ClickUpSessionState` class with a pure in-memory selection slot. Shape:

   ```typescript
   export interface SelectedSpace {
     readonly id: string;
     readonly name: string;
   }

   export class ClickUpSessionState {
     private selected: SelectedSpace | null = null;
     get(): SelectedSpace | null {
       /* return copy or null */
     }
     set(space: SelectedSpace): void {
       /* store a shallow copy */
     }
     clear(): void {
       /* reset to null */
     }
   }
   ```

   The module exports the class and the `SelectedSpace` type. No other side effects (no network, no file system, no `console.*`, no `process.*` writes). `set` stores a defensive shallow copy so external mutation of the passed object cannot mutate the stored selection. `get` returns either `null` or the stored object reference — either is acceptable; `get` MUST NOT return a mutable reference to internal state that a caller could later use to silently mutate the selection. Prefer returning a fresh `{ id, name }` shallow copy on `get` for symmetry with `set`.

2. `BMADServerLiteMultiToolGit` owns exactly one `ClickUpSessionState` instance, created in the constructor before `setupHandlers()`. The field is private. The instance is passed into `registerClickUpTools(this.server, this.clickUpSession)` in `start()` (currently `src/server.ts:454`). Two independently-constructed `BMADServerLiteMultiToolGit` instances MUST have independent session state — i.e. setting a space on instance A MUST NOT be visible from instance B. This is load-bearing for HTTP transport's per-session instance model (`src/http-server.ts:74` creates a fresh `BMADServerLiteMultiToolGit` per `Mcp-Session-Id`).

3. `registerClickUpTools` gains a second parameter: `session: ClickUpSessionState`. The updated signature is:

   ```typescript
   export async function registerClickUpTools(
     server: McpServer,
     session: ClickUpSessionState,
   ): Promise<RegisterResult>;
   ```

   The `RegisterResult` type is extended so `toolsRegistered` in the `ok` branch includes the three new tool names (`pickSpace`, `getCurrentSpace`, `clearCurrentSpace`) appended to the existing per-mode lists. The start-banner line from story 1.3 (`ClickUp tools registered (mode=<mode>, count=<n>)`) therefore reports a count 3 higher than story 1.2's baseline for each mode: 5 (`read-minimal`), 10 (`read`), 16 (`write`). The `disabled` branch is unchanged — if env validation fails, no picker tools are registered either, because they would be useless without upstream's space-search utilities.

4. New MCP tool `pickSpace` is registered unconditionally whenever the adapter reaches the `ok` branch (all three modes: `read-minimal`, `read`, `write`). Name, description, schema, and handler shape:
   - Name: `pickSpace`
   - Description: Multi-line string explaining the tool's three call modes (`spaceId`, `query`, neither) and the session-cache behavior. Include the sentence `The selected space persists for the remainder of this MCP session and can be read back via getCurrentSpace.` in the description so the LLM understands the cache semantics without an out-of-band prompt.
   - Input schema (zod): `{ spaceId: z.string().optional(), query: z.string().optional() }`. Both optional; tool is callable with an empty object.
   - `annotations` (per upstream's convention — see `src/tools/clickup/src/tools/space-tools.ts:23-25`): `{ readOnlyHint: false }` (the tool mutates session state on success, even though it does not mutate ClickUp).
   - Handler behavior:
     - If `spaceId` is provided → fetch the search index via `utils.getSpaceSearchIndex()` (reuse upstream's cached promise), find the matching space by exact `id` match; if found → `session.set({ id, name })` and return a single-line confirmation text block `Selected space: <name> (id: <id>)`; if not found → return `Error: no space with id "<spaceId>" found in workspace. Use pickSpace with query or with no arguments to list available spaces.` and do NOT mutate session state.
     - Else if `query` is provided → run fuzzy search via `searchIndex.search(query)` (Fuse.js); filter out archived spaces by default; branch on result count:
       - Exactly 1 match → `session.set(...)` + single-line confirmation text block.
       - 2–5 matches → do NOT mutate session; return a numbered list of candidates (`1. <name> (id: <id>)`, one per line) with a trailing hint line `More than one space matched "<query>". Call pickSpace again with spaceId or a narrower query.`
       - 6+ matches → do NOT mutate session; return the first 5 candidates + a `…and <N-5> more` line + the same "call again" hint. (Cap at 5 to avoid flooding the LLM's context with 50-entry workspaces.)
       - 0 matches → return `No spaces matched "<query>".` + a hint to call `pickSpace` with no arguments to list all.
     - Else (neither `spaceId` nor `query`) → return a text block listing all non-archived spaces as `<name> (id: <id>)` one per line, capped at 30 entries with a `…and <N-30> more. Narrow your selection with pickSpace(query=...)` footer if exceeded, preceded by the heading line `<N> space(s) available in workspace:`. Do NOT mutate session state. If the workspace has 0 non-archived spaces, return the single line `No spaces available in workspace.` (omit the `N space(s) …` heading to avoid the awkward `0 space(s) available in workspace:` phrasing).
   - The tool NEVER throws. Upstream fetch errors from `getSpaceSearchIndex` (which returns `null` on error per `src/tools/clickup/src/shared/utils.ts:356-357`) are surfaced as a text block `Error: could not fetch spaces from ClickUp. Verify CLICKUP_API_KEY / CLICKUP_TEAM_ID and try again.` The tool's return type is `{ content: [{ type: 'text', text: string }] }` — same shape upstream tools use.

5. New MCP tool `getCurrentSpace` is registered in the same modes as `pickSpace`. Name, description, schema, and handler:
   - Name: `getCurrentSpace`
   - Description: Starts with `Returns the ClickUp space currently selected for this MCP session (set via pickSpace), or indicates no selection.` Keep to one paragraph — this tool has a trivial contract and a long description would be noise.
   - `annotations`: `{ readOnlyHint: true }`.
   - Input schema: `{}` (zod `z.object({}).strict()`).
   - Handler: read `session.get()`. If non-null → return text block `Current space: <name> (id: <id>)`. If null → return text block `No space is currently selected. Use pickSpace to choose one.`
   - The tool NEVER throws. No upstream API call. Pure session-state read.

6. New MCP tool `clearCurrentSpace` is registered in the same modes as `pickSpace`. Name, description, schema, and handler:
   - Name: `clearCurrentSpace`
   - Description: `Clears the currently-selected ClickUp space for this MCP session. Call this to switch to a different space mid-session; subsequent tools requiring a space will need pickSpace to be called again.`
   - `annotations`: `{ readOnlyHint: false }` (mutates session state).
   - Input schema: `{}`.
   - Handler: read `session.get()` before clearing so the response can report what was cleared. Call `session.clear()`. If the prior selection was non-null → return `Cleared selection: <name> (id: <id>).` If null → return `No space was selected; nothing to clear.`
   - The tool NEVER throws.

7. The three picker tools are registered via the **high-level** `McpServer.tool(name, desc, schema, annotations, handler)` API — the same API upstream's register functions use throughout `src/tools/clickup/src/tools/*.ts`. Do NOT drop down to `server.server.setRequestHandler(CallToolRequestSchema, ...)` — that would bypass the per-tool registration plumbing and break `ListToolsRequestSchema`'s auto-enumeration. The registration happens in a new module `src/tools/clickup-space-picker.ts` which exports a single function:

   ```typescript
   export function registerSpacePickerTools(
     server: McpServer,
     session: ClickUpSessionState,
     getSpaceSearchIndex: () => Promise<Fuse<any> | null>,
   ): void;
   ```

   The third parameter is injected (not dynamically imported inside the helper) so unit tests can pass a stub and exercise the tool handlers without touching upstream's cache. The adapter (`src/tools/clickup-adapter.ts`) passes `utils.getSpaceSearchIndex` directly after the dynamic import.

8. `src/tools/clickup-adapter.ts` is updated to:
   - Accept the new `session: ClickUpSessionState` parameter.
   - Call `registerSpacePickerTools(server, session, utils.getSpaceSearchIndex)` AFTER all upstream register functions and AFTER the `my-todos` prompt registration, but BEFORE the `return { disabled: false, mode, toolsRegistered }` statement.
   - Append `'pickSpace', 'getCurrentSpace', 'clearCurrentSpace'` to `toolsRegistered` in each of the three mode branches (`read-minimal`, `read`, `write`). Consistent order across modes keeps the banner count stable.
   - No change to the `disabled` branch — if env vars are missing, the adapter short-circuits BEFORE any registration happens.

9. Session isolation is verified by unit test: construct two `ClickUpSessionState` instances; `set` on one, `get` on the other returns `null`; cross-instance state MUST NOT leak. This is defensive — the class has no static fields, so leakage is structurally impossible — but the test pins the contract against future refactors. See Dev Notes §"Why a class not a module-global".

10. No process-global singleton. The module `src/tools/clickup-session.ts` exports ONLY the class and the type; it MUST NOT export a pre-constructed instance (`export const clickUpSession = new ClickUpSessionState();` is explicitly forbidden — that pattern would leak state across HTTP sessions and defeat AC #2/#9).

11. The three new tools do NOT appear in `tools/list` when `registerClickUpTools` returns `disabled: true` (i.e. env vars missing). The adapter's early-return BEFORE any registration guarantees this — no additional guard needed. Verified by a smoke test: boot with empty env, send `tools/list`, confirm only `bmad` is returned. (Same baseline as story 1.3's Task 7 stdio smoke.)

12. A new unit test file `tests/unit/clickup-session.test.ts` exercises `ClickUpSessionState` directly:
    - `new ClickUpSessionState().get()` returns `null`.
    - After `set({ id: 'abc', name: 'Foo' })`, `get()` returns an object with the same `id` and `name`.
    - Mutating the object passed to `set` (e.g. `(space as any).id = 'xyz'`) does NOT change what `get` returns (verifies the defensive copy in AC #1).
    - Mutating the object returned by `get` does NOT affect a subsequent `get` call (verifies `get`'s return-copy contract from AC #1).
    - After `clear()`, `get()` returns `null`; calling `clear()` on an already-cleared instance is idempotent (no throw).
    - Two instances have independent state (AC #9 contract).
    - The class has no own static fields beyond the ES-class built-ins (`length`, `name`, `prototype`): assert via `expect(Object.getOwnPropertyNames(ClickUpSessionState).sort()).toEqual(['length', 'name', 'prototype'])`. The assertion pins the invariant — if a future refactor introduces a cached singleton (e.g. `static shared = new ClickUpSessionState()`), the test fails loudly and AC #10 is violated at test time rather than at HTTP-session-leak time.

13. A new unit test file `tests/unit/clickup-space-picker.test.ts` exercises the three tool handlers via `registerSpacePickerTools`:
    - Create an `McpServer` instance + `ClickUpSessionState` + a stub `getSpaceSearchIndex` that returns a pre-built Fuse index over a fixed 3-space fixture (`[{id: '100', name: 'Alpha'}, {id: '200', name: 'Beta'}, {id: '300', name: 'Gamma'}]`). Call `registerSpacePickerTools`. Invoke each tool handler by reaching into `(server as any)._registeredTools[<name>].handler(parsedArgs, {} as any)` — SDK 1.29 stores registrations at `McpServer._registeredTools[name] = { handler, inputSchema, annotations, ... }` (confirmed against `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:649` for the assignment and line 212 for the `handler(args, extra)` invocation shape). Do NOT reach for `server.server._requestHandlers` — that map routes MCP request verbs (`tools/call`, `tools/list`, etc.), not per-tool handlers registered via `McpServer.tool(...)`. If a future `InMemoryTransport`-based fixture lands in `tests/`, a later story can migrate these tests to exercise the full protocol round-trip; for now the direct-handler pattern keeps setup at ~5 LOC per test.
    - `pickSpace({ spaceId: '100' })` → sets session; response contains `Selected space: Alpha (id: 100)`; `session.get()` returns `{id: '100', name: 'Alpha'}`.
    - `pickSpace({ spaceId: '999' })` → session unchanged; response starts with `Error: no space with id "999"`.
    - `pickSpace({ spaceId: '100', query: 'Gamma' })` → precedence test: `spaceId` wins, `query` is ignored; session set to Alpha (id 100), NOT Gamma (id 300). Response confirms `Selected space: Alpha (id: 100)`.
    - `pickSpace({ query: 'alp' })` → exactly 1 match; session set to Alpha; response contains `Selected space: Alpha`. (Query choice verified: `alp` is a three-character prefix of `Alpha` and cannot fuzz-match `Beta` / `Gamma` under Fuse's default `threshold: 0.4` + `minMatchCharLength: 1`.)
    - `pickSpace({ query: <multi-match-query> })` → >1 match; session NOT set; response contains a numbered list + `Call pickSpace again with spaceId or a narrower query.` The exact query string is left to the test author — pick one that Fuse provably matches to 2+ entries against the fixture (common candidate: a two-character string like `ta` that appears in both `Beta` and `Gamma`; confirm with a throwaway `new Fuse(fixture, opts).search('ta').length >= 2` check while authoring). The AC is the behavior, not the specific query string.
    - `pickSpace({ query: 'zzzz' })` → 0 matches; session NOT set; response contains `No spaces matched "zzzz".`
    - `pickSpace({})` (empty object) → no session mutation; response lists all 3 spaces with the heading `3 space(s) available in workspace:`.
    - `pickSpace({})` against an empty fixture (`getSpaceSearchIndex` stub returns a Fuse index over `[]`) → no session mutation; response reads `No spaces available in workspace.` (Pins AC #4's empty-workspace behavior per the note in the pickSpace handler description.)
    - `getCurrentSpace` before any selection → `No space is currently selected.`
    - `getCurrentSpace` after selection → `Current space: Alpha (id: 100)`.
    - `clearCurrentSpace` with selection present → response confirms cleared + session is null afterward.
    - `clearCurrentSpace` with no selection → response says nothing to clear; no throw.
    - `pickSpace` with `getSpaceSearchIndex` returning `null` → response is `Error: could not fetch spaces from ClickUp. …`; session unchanged.
    - Test-only dependency: `fuse.js` (already in root `package.json` post story 1.2 AC #7). No network. No upstream `CONFIG` evaluation (pass the stub, never import from `src/tools/clickup/src/**`).

14. `src/server.ts` is updated minimally:
    - Import `ClickUpSessionState` from `./tools/clickup-session.js`.
    - Add a private field `private readonly clickUpSession = new ClickUpSessionState();` on `BMADServerLiteMultiToolGit`.
    - Update the `registerClickUpTools(this.server)` call site at `src/server.ts:454` to `registerClickUpTools(this.server, this.clickUpSession)`.
    - No other changes to `src/server.ts`. The field is private and has no exposed getter — future stories that need cross-cutting access to the session (e.g. story 2.6's Dev-agent story-creation flow that reads the current space before creating a task) will thread it through the register hook the same way AC #2 does.

15. `src/http-server.ts` requires no changes in this story. The per-session `new BMADServerLiteMultiToolGit(...)` construction at line 74 already satisfies AC #2 (independent state per HTTP session) because each new server instance gets its own `ClickUpSessionState` via AC #14. **Known limitation (inherited from story 1.3 AC #7):** under the current design, `registerClickUpTools` is called only from `BMADServerLiteMultiToolGit.start()`, and HTTP transport calls `connect()` not `start()` — so in HTTP mode today, the picker tools never register on a live session just like upstream's ClickUp tools never register. Story 1.4 inherits this gap unchanged and forward-points to the same candidate fixup (story 1.5's HTTP smoke test, or a dedicated 1.4.5-style story). Do NOT close the gap in this story — it is a story-1.2-shaped decision, and conflating it with the picker registration here would blur accountability. The stdio smoke path (`node build/index.js`) is the primary validation target for this story.

16. The three new tools are registered in ALL three `CLICKUP_MCP_MODE` values (`read-minimal`, `read`, `write`). Rationale: space selection is orthogonal to read/write scope — a read-minimal user still needs to choose which space to read from if their team has multiple, and upstream's `searchSpaces` tool is not available in `read-minimal` mode. If the picker were also gated off `read-minimal`, read-minimal users would have no way to select a space, and `getTaskById` / `searchTasks` would effectively be workspace-wide forever. Uniform registration across modes closes that gap.

17. The picker's behavior when no session state exists (e.g. a future caller forgets to pass the session) is a programming error — NOT a runtime fallback. The tool handlers assume `session` is non-null; there is no `if (!session)` guard. `registerSpacePickerTools` receives `session` as a required parameter (no default, no nullable type). TypeScript's strict mode catches misuse at compile time. This is consistent with how upstream's register functions treat `userData` — required at register-time, closed over at handle-time.

18. No edits to vendored tree. `git diff --stat -- src/tools/clickup/src/` prints nothing. `git diff --stat -- BMAD-METHOD/` prints nothing. Same invariant as stories 1.1–1.3. The adapter's access to `getSpaceSearchIndex` is via dynamic import (already in place from story 1.2) and the function reference is passed into `registerSpacePickerTools` — no new import chain into upstream.

19. No edits to `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, or `src/cli.ts`. The `bmad` tool surface is unchanged. `git diff --stat` on those paths prints nothing. Same invariant as story 1.3 AC #18 and story 1.2 AC #17.

20. `npm run build` passes cleanly. The new files (`src/tools/clickup-session.ts`, `src/tools/clickup-space-picker.ts`) are compiled by the root tsc under strict mode — no `any` in exported signatures except where upstream's `Fuse<any>` forces it (AC #7's injected `getSpaceSearchIndex` type). Internal `any` at call sites to upstream utilities is acceptable because the adapter layer is a dispatch shim, not a consumer of upstream's type surface (same principle as story 1.2 AC #9).

21. `npm run lint` produces the same lint baseline story 1.3 lands with on `main`. No new findings introduced by the three new files / edited files. Use `logger` from `src/utils/logger.js` for any new log lines. No direct `console.*` calls except in files where pre-existing style is `console.error` (and this story adds no new console calls to those files).

22. `npm run format` produces no churn. Run before commit so the pre-commit hook does not rewrite new files.

23. `npm test` passes. Expected delta vs story 1.3's green baseline: `+ ~7 tests` from `clickup-session.test.ts` (AC #12) `+ ~11 tests` from `clickup-space-picker.test.ts` (AC #13) `+ 0 failures`. Do NOT hard-code the absolute passing count — story 1.3 is still in flight at story-creation time, so the baseline will shift.

24. `tests/unit/dependency-audit.test.ts` requires no changes. The new files import only `src/tools/clickup-session.ts` (no external deps), `fuse.js` (already declared post story 1.2 AC #7), `src/utils/logger.ts` (already declared), `zod` (already declared), and types from `@modelcontextprotocol/sdk` (already declared). `SCAN_EXCLUDED_PATHS` from story 1.2's AC #11 remains a three-entry list untouched.

25. The commit message follows conventional-commits and is scoped `clickup`: `feat(clickup): interactive space picker with session caching`. The commit body captures (a) the three new tools added, (b) the per-server-instance session scoping (critical for HTTP correctness), (c) the HTTP-mode tool-registration gap inherited from stories 1.2/1.3 as a known-limitation line with a forward-pointer, (d) the fact that session state is intentionally process-lifetime (no persistence across restarts).

## Out of Scope (explicitly deferred to later stories)

- **Dev agent (story-creation mode) consumption of the selected space** — story 2.6 wires `createTask` to read `session.get()` before building the task payload. This story only exposes the primitive; story 2.6 owns the Dev-agent story-creation flow that calls `pickSpace` at the right time, the prompt text that guides the user, and the fallback when no space is selected. Do NOT add an auto-pick-on-first-use fallback in story 1.4 — that is a UX decision belonging to the Dev agent's story-creation prompt, not to the picker primitive.
- **Dev agent consumption of the selected space** — EPIC-3 covers the dev-agent flow. Dev's `ClickUp task ID → fetch context` pattern (story 3.3) may or may not need the session space; that call generally goes through `getTaskById` which takes a task ID directly, independent of space. If EPIC-3 discovers a dependency, it hooks into `session.get()` the same way story 2.6 will.
- **Closing the HTTP-mode tool-registration gap** (story 1.2/1.3 carry-over) — out of scope. Same forward-pointer as story 1.3 AC #7: a dedicated 1.4.5-style fixup or folded into story 1.5 once HTTP smoke tests surface it.
- **Cross-session / cross-restart persistence** — explicitly out. The PRD's §Non-functional-requirements says "Space asked interactively per session." Persisting selections to a file, `.bmad/cache`, or the user's home directory would expand scope AND create a subtle privacy footprint (which workspace was last accessed by whom). If a future story decides persistence is wanted, add it then with an explicit opt-in env var (`BMAD_CLICKUP_SPACE_CACHE_PATH=...`) — NOT in this story.
- **Sprint-list and backlog-list pickers** — PRD §Env vars says space, sprint folder, and backlog list are all runtime-interactive. This story handles space only. Sprint-list / backlog-list pickers belong in EPIC-2 stories 2-3 (epic-picker) and 2-4 (sprint-list-picker) where they are scoped as Dev-agent story-creation flows. The session-state pattern established here is intended to be extended — `ClickUpSessionState` may grow `selectedSprintList`, `selectedBacklogList` slots in those stories.
- **MCP elicitation (`elicitInput`) integration** — SDK 1.29 exposes `server.server.elicitInput(...)` for server-initiated prompts. Some clients support it (notably Claude Code's latest build), others do not. Relying on elicitation would fragment the UX across clients. The tool-call-as-picker pattern (`pickSpace` returns candidates; LLM calls again) works on every MCP 2024-11-05-compliant client. If a future story decides to layer elicitation on top of this for supporting clients, the `ClickUpSessionState` contract is unchanged — elicitation would just replace the multi-turn tool-call pattern with a single-shot elicit. Keep it simple for now.
- **Upstream `searchSpaces` displacement** — story 1.4 does NOT remove or hide upstream's `searchSpaces` tool. It remains exposed in `read` and `write` modes and does not touch session state. The LLM may use `searchSpaces` for exploration and `pickSpace` for commitment — these are complementary, not redundant. If a future story decides the two should merge, that is a separate design conversation.
- **Archived-space selection policy** — the picker filters out archived spaces by default (upstream's `searchSpaces` does the same at `src/tools/clickup/src/tools/space-tools.ts:50-52`). This story does NOT expose an `includeArchived` option. If a team routinely works in archived spaces, add the flag then. Keep the default surface narrow.
- **Mutating the vendored tree** — forbidden. Same invariant as stories 1.1–1.3. The picker uses upstream utilities via the `getSpaceSearchIndex` injection per AC #7; there is no scenario in this story where editing `src/tools/clickup/**` is the right fix.

## Tasks / Subtasks

- [ ] **Task 1 — Implement `src/tools/clickup-session.ts` (AC: #1, #9, #10)**
  - [ ] Create the file. Exports:

    ```typescript
    export interface SelectedSpace {
      readonly id: string;
      readonly name: string;
    }

    export class ClickUpSessionState {
      private selected: SelectedSpace | null = null;

      get(): SelectedSpace | null {
        if (this.selected === null) return null;
        return { id: this.selected.id, name: this.selected.name };
      }

      set(space: SelectedSpace): void {
        this.selected = { id: space.id, name: space.name };
      }

      clear(): void {
        this.selected = null;
      }
    }
    ```

  - [ ] No side effects: no `console.*`, no `logger.*`, no `process.*` writes, no network, no file system. The module is pure state.
  - [ ] Do NOT export a pre-constructed instance. Do NOT add static fields or static methods. (AC #10 is a structural invariant.)
  - [ ] Do NOT add `setTimeout` / TTL logic. Session lifetime = server-instance lifetime, nothing more.

- [ ] **Task 2 — Implement `src/tools/clickup-space-picker.ts` (AC: #4, #5, #6, #7, #17)**
  - [ ] Create the file. Exports one function:

    ```typescript
    import type Fuse from 'fuse.js';
    import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
    import { z } from 'zod';
    import type { ClickUpSessionState } from './clickup-session.js';

    export function registerSpacePickerTools(
      server: McpServer,
      session: ClickUpSessionState,
      getSpaceSearchIndex: () => Promise<Fuse<any> | null>,
    ): void {
      /* register three tools */
    }
    ```

  - [ ] Register `pickSpace` via `server.tool(name, desc, schema, annotations, handler)`:
    - Description per AC #4. Include the session-cache sentence verbatim.
    - Schema: `{ spaceId: z.string().optional(), query: z.string().optional() }`.
    - Handler: precedence `spaceId` > `query` > empty-call; behavior per AC #4. Filter out archived spaces before counting matches. Use `(searchIndex as any)._docs` for the all-spaces list when `query` is absent (mirrors upstream's pattern at `src/tools/clickup/src/tools/space-tools.ts:39`). Use `searchIndex.search(query)` for fuzzy matching; the returned shape is `FuseResult<Space>[]` — map `.item` off each entry. Cap numbered-list output at 5 (ties) / 30 (all-spaces). All-spaces mode precedes the list with the heading `<N> space(s) available in workspace:` where `<N>` is the total non-archived count. If the non-archived count is 0, emit the single line `No spaces available in workspace.` with no heading.
  - [ ] Register `getCurrentSpace` per AC #5. Schema is `{}`. Handler reads `session.get()` and returns a single text block.
  - [ ] Register `clearCurrentSpace` per AC #6. Schema is `{}`. Handler captures the prior value via `session.get()` before calling `session.clear()` so the response can include the cleared space's name.
  - [ ] All three handlers return `{ content: [{ type: 'text', text: string }] }` — never throw. On upstream fetch error (`searchIndex === null`), `pickSpace` returns the user-facing error text per AC #4; `getCurrentSpace` and `clearCurrentSpace` never touch the search index so they are error-free.
  - [ ] Import `type Fuse from 'fuse.js'` (type-only — no runtime import). No `import { CONFIG } from '.../shared/config.js'`. No dynamic import. The helper is pure wiring + closures.

- [ ] **Task 3 — Wire picker into adapter (AC: #3, #8, #11, #16)**
  - [ ] Update `src/tools/clickup-adapter.ts`:
    - Import `type { ClickUpSessionState } from './clickup-session.js'` and `{ registerSpacePickerTools } from './clickup-space-picker.js'`.
    - Extend `registerClickUpTools` signature to accept `session: ClickUpSessionState` as the second parameter.
    - In the `ok`-path (post validator / env-check from story 1.3 — or the existing presence-check if 1.3 has not landed), after the upstream register calls and the `my-todos` prompt registration, before the return:
      ```typescript
      registerSpacePickerTools(server, session, utils.getSpaceSearchIndex);
      ```
    - Append `'pickSpace', 'getCurrentSpace', 'clearCurrentSpace'` to `toolsRegistered` in each of the three mode branches. Keep the order: existing upstream tools first, then the three new names.
  - [ ] Do NOT touch the `disabled` branch — picker tools are never registered when env vars are missing (AC #11).
  - [ ] Do NOT re-implement the validator-vs-presence-check decision — whatever story 1.3 lands is canonical; story 1.4 just threads the session parameter through without changing the env-gating posture.

- [ ] **Task 4 — Own session state in `BMADServerLiteMultiToolGit` (AC: #2, #14)**
  - [ ] Edit `src/server.ts`:
    - Add import: `import { ClickUpSessionState } from './tools/clickup-session.js';`.
    - Add private field on the class: `private readonly clickUpSession = new ClickUpSessionState();` — placed alongside `private engine` and `private initialized`.
    - Update the call at `src/server.ts:454` (post story 1.3's `registerClickUpTools(this.server)` call — line number may shift):
      ```typescript
      const clickUpRes = await registerClickUpTools(
        this.server,
        this.clickUpSession,
      );
      ```
  - [ ] Do NOT expose a public getter for `clickUpSession`. Future stories that need it will thread it through `registerClickUpTools`'s parameter list (or a richer register hook). Exposing it publicly would invite consumers to bypass the registered tools and introduce ad-hoc session-state mutation points.
  - [ ] No other changes to `src/server.ts`. Specifically: the low-level `setRequestHandler` blocks, the `initialize()` flow, the `start()` logging, and the heartbeat loop all stay identical.

- [ ] **Task 5 — Author `tests/unit/clickup-session.test.ts` (AC: #9, #12)**
  - [ ] New file. Vitest's `describe` / `it` / `expect`. Import from `../../src/tools/clickup-session.js`.
  - [ ] Test cases per AC #12. Structure as one `describe('ClickUpSessionState', ...)` with inner cases.
  - [ ] No `beforeEach` needed — each test constructs its own instance. No mocks. No filesystem. No network.
  - [ ] The "two instances have independent state" test constructs instance A and instance B, calls `a.set({id:'1', name:'A'})`, and asserts `b.get()` returns `null`. This is the AC #9 contract.

- [ ] **Task 6 — Author `tests/unit/clickup-space-picker.test.ts` (AC: #13)**
  - [ ] New file. Build a small Fuse index fixture (the three-space fixture from AC #13).
  - [ ] Decide on the invocation pattern for `McpServer.tool()` handlers. Preferred order:
    1. If `tests/` already has a helper that invokes tools via MCP's in-process `Client` transport (grep for `InMemoryTransport` or `Client.from` — not present as of story-creation time), use it.
    2. Otherwise, use the SDK's public `server._registeredTools` map. In SDK 1.29, `McpServer.tool(...)` stores the registration at `server._registeredTools[toolName] = { inputSchema, handler, ... }` — grep `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` for `_registeredTools` to confirm the field name for the installed version and pin it in an inline comment. Invoke the handler directly with the parsed input.
    3. As a last resort, build a pair of `InMemoryTransport`s, wire a `Client` + `McpServer` through them, and call `client.callTool({ name, arguments })`. More realistic but adds 50+ LOC of test setup — defer unless options 1 and 2 fall through.
  - [ ] Document the chosen approach in a comment at the top of the test file so a future reader knows why. If option 2 is chosen, include a one-line `// SDK 1.29: handlers live at server._registeredTools[name].handler` comment.
  - [ ] Test cases per AC #13. Parameterize where it helps (e.g. the three "empty input" permutations: `undefined`, `{}`, `{query: undefined}` — all should route to the all-spaces branch).
  - [ ] No real `McpServer.connect()` call. No real transport. No `fetch` — the stubbed `getSpaceSearchIndex` returns the pre-built Fuse index synchronously (wrapped in `Promise.resolve`).
  - [ ] The "upstream fetch failed" case stubs `getSpaceSearchIndex` to return `Promise.resolve(null)` — one extra `it` block covering the `Error: could not fetch spaces from ClickUp.` response.

- [ ] **Task 7 — Smoke-verify locally (AC: #11, #20–#24)**
  - [ ] `npm run build` — clean.
  - [ ] `npm run lint` — same baseline as story 1.3's merge state; no new findings.
  - [ ] `npm run format` — no churn in vendored tree; new files prettier-clean.
  - [ ] `npm test` — passes with the ~18-test delta from Tasks 5 + 6.
  - [ ] Stdio smoke without env vars: `CLICKUP_API_KEY= CLICKUP_TEAM_ID= node build/index.js` → `tools/list` returns `bmad` only (not `pickSpace` et al). Verifies AC #11.
  - [ ] Stdio smoke with env vars: `CLICKUP_API_KEY=pk_... CLICKUP_TEAM_ID=... node build/index.js` → `tools/list` returns `bmad` + upstream's 13 write-mode tools + `pickSpace`, `getCurrentSpace`, `clearCurrentSpace`. Banner line reads `ClickUp tools registered (mode=write, count=16)`.
  - [ ] Stdio smoke with `CLICKUP_MCP_MODE=read-minimal` → `tools/list` returns `bmad` + 2 upstream tools + 3 picker tools. Banner count=5.
  - [ ] Stdio smoke with `CLICKUP_MCP_MODE=read` → `tools/list` returns `bmad` + 7 upstream tools + 3 picker tools. Banner count=10.
  - [ ] Live-API smoke (opportunistic, only if the author has credentials at hand): send `{"method": "tools/call", "params": {"name": "pickSpace", "arguments": {}}}` → response lists the author's real workspace spaces. Send `pickSpace({query: "<one-word-of-real-space-name>"})` → response confirms `Selected space: ...`. Send `getCurrentSpace()` → response confirms the selection persisted. Send `clearCurrentSpace()` → response confirms cleared. Document any unexpected response in the commit body; if the live smoke can't be run, say so and rely on unit-test coverage + story 1.5's integration smoke.
  - [ ] Session-isolation smoke (manual, optional): boot two separate `node build/index.js` processes against the same ClickUp account; pick different spaces in each; verify `getCurrentSpace` in each process returns its own selection (trivially true given the per-process scope, but a one-liner of confirmation in the commit body is nice).

- [ ] **Task 8 — Commit (AC: #25)**
  - [ ] Stage in this order: `src/tools/clickup-session.ts`, `src/tools/clickup-space-picker.ts`, `tests/unit/clickup-session.test.ts`, `tests/unit/clickup-space-picker.test.ts`, `src/tools/clickup-adapter.ts`, `src/server.ts`. (Source + tests first, then wiring — keeps pre-commit's lint-staged tidy.)
  - [ ] Commit message: `feat(clickup): interactive space picker with session caching`
  - [ ] Commit body per AC #25: summary, three-tool-list, per-server-instance scoping note, HTTP-mode gap known-limitation line (forward-pointer), explicit "no persistence across restarts" line, link back to story key `1-4-space-picker`.

## Dev Notes

### Tool contract summary

Quick reference for the three tools added by this story (detail lives in AC #4–#6):

| Tool                | Input                                                  | Behavior                                                                                                                                                                                                                                                                                                                                | Mutates session           |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `pickSpace`         | `{ spaceId?: string, query?: string }` (both optional) | **spaceId** → exact match, set on success, error on not-found. **query** → fuzzy via Fuse; 1 match sets + confirms, 2–5 lists candidates, 6+ lists first 5 + overflow, 0 returns no-match hint. **Neither** → list all non-archived spaces (cap 30, `No spaces available in workspace.` if 0). Precedence: `spaceId` > `query` > empty. | Yes (on single-match set) |
| `getCurrentSpace`   | `{}`                                                   | Returns current selection as `Current space: <name> (id: <id>)`, or `No space is currently selected.` if none. No API call.                                                                                                                                                                                                             | No                        |
| `clearCurrentSpace` | `{}`                                                   | Clears selection; response names what was cleared, or `No space was selected; nothing to clear.` if none. No API call.                                                                                                                                                                                                                  | Yes                       |

All three return `{ content: [{ type: 'text', text: string }] }` and NEVER throw.

### Why a class, not a module-global

Two reasons, in priority order:

1. **HTTP transport correctness.** `src/http-server.ts:74` constructs a fresh `BMADServerLiteMultiToolGit` per `Mcp-Session-Id`. If `ClickUpSessionState` were a module-level singleton (`export const session = new ClickUpSessionState();`), two concurrent HTTP sessions on the same Node process would share it — picking a space in session A would leak into session B's tool calls. That is a **silent correctness bug** that would ship fine in stdio mode and break in production HTTP mode. The class-per-instance pattern prevents it structurally.
2. **Test isolation.** Module-global singletons survive across `describe` blocks unless you explicitly reset them, which means test order leaks state. A class you `new` per test is safe by construction.

The cost of the class pattern over a module-global is one extra property on `BMADServerLiteMultiToolGit` and one extra parameter on `registerClickUpTools`. Cheap.

### Scope of "session"

Stdio mode: one Node process = one `BMADServerLiteMultiToolGit` instance = one `ClickUpSessionState` = one session. Killing the process resets the selection.

HTTP mode: one `Mcp-Session-Id` = one `BMADServerLiteMultiToolGit` instance = one `ClickUpSessionState`. Session ends when the client closes (`DELETE /mcp` with the session header, or TCP disconnect that triggers `onsessionclosed`). Next `initialize` request spawns a fresh server + fresh state.

Tests: one `new ClickUpSessionState()` per test = per-test isolation.

Per PRD §Non-functional-requirements: "Space asked interactively per session." This story honors that literally — no cross-session persistence, no file cache, no home-directory dotfile. If a team wants stickier defaults (e.g. "always pick Engineering unless told otherwise"), that's a Dev-agent story-creation UX decision, not a bmad-mcp-server infrastructure concern. Layer it into the Dev agent's story-creation workflow, not the primitive.

### Why `pickSpace` instead of mutating upstream's `searchSpaces`

Upstream's `searchSpaces` is a pure search/listing tool — no session side effects. Adding "and remember this choice" to it would require editing the vendored tree, which is explicitly forbidden by story 1.1 AC #2. Even if the vendored tree were writable, conflating search with selection in the same tool would break upstream's mental model (`searchSpaces` is discovery; commitment is a separate decision).

So: `searchSpaces` stays read-only exploration. `pickSpace` is the commitment primitive. The LLM can use either or both — typically `searchSpaces` for "show me the tree of this space and its lists" and `pickSpace` for "OK, I've decided — pick Space Foo."

If a future team wants to merge them, that's an upstream-PR conversation, not a bmad-mcp-server decision.

### Tool naming — why unprefixed

Upstream uses unprefixed names (`searchSpaces`, `getTaskById`, `createTask`). Our BMAD unified tool is named `bmad`. Adding ClickUp-specific prefixes to only the new picker tools (`clickupPickSpace`, `clickupGetCurrentSpace`, `clickupClearCurrentSpace`) would introduce an inconsistent convention: some ClickUp tools prefixed, others not. Keeping the picker unprefixed matches upstream's style and reads more naturally in the LLM's tool-choice prompt. If naming collisions with BMAD tools emerge later (BMAD has no `pickSpace` today), the convention can be revisited then — but the path of least churn today is "match upstream's flat naming."

### Session-state surface: minimal by design

Three slots and three operations (`get` / `set` / `clear`). No history, no undo, no "previous space" recall, no expiration. Every one of those is tempting; every one expands scope without a concrete use case. Add them when a user story demands one.

One future-friendly decision baked in: `SelectedSpace` is an interface, not a `string` space ID. Today the `name` field is used only for display in tool responses (`Selected space: Alpha (id: 100)`). Tomorrow when story 2.6 needs to enrich a task creation log line with the space name, it has it for free without a re-fetch. Costs two fields of memory; saves an API call later.

### Testing `McpServer.tool()` handlers without a live transport

SDK 1.29 stores each `server.tool()` registration on `McpServer._registeredTools[name]`. The registration carries `.handler` (the callback passed to `tool()`), plus `.inputSchema`, `.annotations`, and `.enabled`. Unit tests invoke the handler directly:

```typescript
// SDK 1.29: server.tool(name, ..., cb) stores cb at _registeredTools[name].handler
// Verified against node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:
//   line 649  this._registeredTools[name] = registeredTool;
//   line 616  handler: handler,
//   line 212  const handler = tool.handler;
//   line 233  return await Promise.resolve(typedHandler(args, extra));
const registration = (server as any)._registeredTools['pickSpace'];
const result = await registration.handler({ spaceId: '100' }, {} as any);
expect(result.content[0].text).toContain('Selected space: Alpha');
```

The second `extra` argument carries MCP protocol context (session ID, request ID, progress-notification helpers, etc.); for these unit tests pass `{} as any` because none of the picker handlers read it.

Pros: fast, zero transport setup, maps directly to the handler under test.
Cons: reaches into a non-public API. Pin the SDK field name in an inline comment (as above); if a future SDK bump moves the map, the tests break loudly (a feature, not a bug).

Alternative: use `InMemoryTransport` from `@modelcontextprotocol/sdk/shared/inMemoryTransport.js` to wire a `Client` + `Server` in-process and call through the full MCP protocol. Strictly more realistic but ~50 LOC of setup per test file. Pick the `_registeredTools` option unless it turns out to be fragile.

A third option — mock `McpServer.tool` to intercept registrations — was considered and rejected: it tests the registration call, not the handler behavior, which is what AC #13 cares about.

### Upstream's `getSpaceSearchIndex` — race conditions and staleness

Upstream caches the promise in a module-global `spaceSearchIndexPromise` with a 60-second TTL (`src/tools/clickup/src/shared/utils.ts:318-371`). Three implications:

1. **Concurrency.** If two picker calls arrive within 60s, they share a single API fetch. This is fine for our use case — the cache is promise-not-result, so both calls await the same `Promise<Fuse>`. No double-fetch.
2. **Warm on first pick.** The adapter's existing boot-time `Promise.all([utils.getCurrentUser(), utils.getSpaceSearchIndex()])` (see `src/tools/clickup-adapter.ts:47-50`) already primes the space-index cache during `registerClickUpTools()`. So the very first user-issued `pickSpace` call is typically a cache hit (µs) rather than a cold fetch (~100-500ms). No warmup logic is owed here.
3. **Staleness.** If a team creates a new space and the user `pickSpace`s by its name within 60s, the fuse index won't have it. The user gets "0 matches" and is prompted to try again. This is rare enough to not warrant a manual-refresh path in this story — upstream's 60s TTL is the knob. If it becomes a real issue, add a `forceRefresh: z.boolean().optional()` option on `pickSpace` in a follow-up story.

Do NOT attempt to reach past upstream's cache here — that would mean editing the vendored tree.

### Relationship to story 1.3's `validateClickUpEnv`

Story 1.3's validator guarantees that by the time `registerClickUpTools` reaches the upstream register calls, `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` are non-empty. The picker tools depend on `getSpaceSearchIndex`, which depends on those vars. So the picker registration's gate is transitively `validateClickUpEnv()` returning `ok` — no additional checks needed here.

If story 1.3 has NOT landed on main when this story is picked up, the adapter's bare presence check from story 1.2 (AC #3) gates the same way — story 1.4 works against either. Verify by reading the adapter's current branch in `main` before Task 3. If the adapter's env check looks different from what story 1.3's AC #2 / #3 specifies, revisit whether 1.3 actually landed — but do NOT modify the check in this story.

### Interaction with `CLICKUP_MCP_MODE`

Per AC #16, the picker registers in all three modes. Upstream's `searchSpaces` is `read`/`write` only, so in `read-minimal` mode:

- `searchSpaces` is NOT registered.
- `pickSpace` IS registered (this story).
- `pickSpace` still uses `getSpaceSearchIndex` (from upstream's shared utils, NOT the `searchSpaces` tool).
- `getSpaceSearchIndex` works fine in all three modes — upstream's mode gating is at the register-function level (`registerSpaceTools` is the one skipped in `read-minimal`), not at the utility level. The underlying `/api/v2/team/{teamId}/space` fetch is always available.

So `read-minimal` users who pick a space via `pickSpace` will be able to list and browse — just via `getTaskById` / `searchTasks` rather than upstream's tree-rendering tools. This is consistent with how read-minimal is supposed to work: tight surface, but still functional.

### Session state and progress-notification heartbeat

`src/server.ts:238-252` has a 3-second heartbeat during `tools/call`. The picker tool handlers do one async operation: `getSpaceSearchIndex()`. Upstream's cache guarantees this returns immediately on warm cache (µs) and within the API latency on cold cache (~100-500ms typical). The heartbeat tick is harmless — at most one tick fires during a cold-cache call, which is expected behavior for long-running tools.

Do NOT add pre-emptive heartbeats to the picker tools — tools are `tools/call` requests, and the heartbeat is already wired by `src/server.ts`.

### Internationalization (non-blocker)

Upstream's `my-todos` prompt switches text between English and German based on `CLICKUP_PRIMARY_LANGUAGE` / `LANG` (see `src/tools/clickup/src/shared/config.ts:2-48` + adapter registration at `src/tools/clickup-adapter.ts:53-94`). The three picker tools use English responses only in this story. Reasons:

1. Tool response text (`Selected space: Alpha (id: 100)`) is LLM-consumed, not human-consumed — the LLM translates it to the user's language when composing the final response.
2. Adding a second language pathway doubles the tool-description surface area and the test matrix.
3. Story 1.4's ACs don't call for it; keep scope surgical.

If a future team wants German picker responses, factor the strings out into a lookup table at that point. Today they're plain string literals in the handler — fine for English-only.

### Project structure notes

- `src/tools/clickup-session.ts` — new sibling of `src/tools/clickup-adapter.ts` and `src/tools/bmad-unified.ts`. Same flat-by-concern pattern.
- `src/tools/clickup-space-picker.ts` — new sibling of the above. Separated from the adapter because the picker has its own public-ish surface (`registerSpacePickerTools`) that future stories (e.g. if the Dev agent's story-creation skill needs to call the registration hook directly for testing) can reuse.
- `tests/unit/clickup-session.test.ts`, `tests/unit/clickup-space-picker.test.ts` — new siblings of `tests/unit/clickup-env.test.ts` (from story 1.3) and `tests/unit/dependency-audit.test.ts`.
- No new directories, no new config files, no vendored-tree changes, no `tsconfig.clickup.json` edits.

### Testing standards

- New unit test files live at `tests/unit/clickup-session.test.ts` + `tests/unit/clickup-space-picker.test.ts`. Standard mirror of `src/tools/` under `tests/unit/`.
- No integration tests — the integration surface (tools appearing in `tools/list`, handlers invoking through a real transport, round-trip against ClickUp's API) is covered by manual smoke (Task 7) and by stories 1.5–1.6 against a live workspace.
- Don't mock `McpServer`'s internals beyond what AC #13 needs. If a test reaches for `vi.mock('@modelcontextprotocol/sdk/...')`, that's a signal the test is testing the SDK, not the picker — step back and rewrite.
- No changes to `tests/unit/dependency-audit.test.ts`. The new files import only already-declared deps (AC #24).
- Don't test session persistence across `process.exit()` — there isn't any. AC #12's "After `clear()`, `get()` returns `null`" is as close as the tests get to lifecycle semantics; the process-lifetime property is structural and doesn't need a test.

### SDK + package.json interaction

This story does not touch `package.json` dependencies. `@modelcontextprotocol/sdk` stays at `^1.29.0` (from story 1.2's floor bump to `^1.15.1`, later superseded by `1.29.0` via `npm install`); `fuse.js` stays at `^7.3.0`; `zod` stays at `^3.25.76`. No new runtime or dev deps.

If during Task 6's test authoring the author reaches for a deep-import from the SDK that's not listed in the existing `src/server.ts` imports, verify the import path is public — `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` is the published surface. Internal modules (`/shared/`, `/_internal/`) may change between minor versions and shouldn't be imported.

### Forward-compatibility sketch: how story 2.6 consumes this

Story 2.6 (Dev agent's story-creation skill, `createTask`) will register a new tool in a separate skill/adapter path. That tool's handler will need to read `session.get()` before building the task payload. The wiring will look like:

1. The story-creation skill's adapter receives the same `ClickUpSessionState` instance via a parameter (same pattern as this story's AC #3).
2. The story-creation skill's `createTask` tool handler calls `session.get()` at entry.
3. If `null` → handler returns an instruction text block asking the LLM to call `pickSpace` first.
4. If non-null → handler proceeds with the space from the session.

Story 1.4 establishes the "pass session through the register function" contract; story 2.6 extends it. Do NOT pre-build the story-creation skill's wiring in this story — that's 2.6's scope. Just don't design the session class in a way that makes 2.6 hard (which is why AC #1 keeps the class shape minimal and AC #10 forbids a process-global).

### References

- [EPIC-1 §Outcomes bullet 3](../epics/EPIC-1-clickup-mcp-integration.md) — "`CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` env vars wired; space prompted interactively." This story delivers the "space prompted interactively" half; stories 1.2/1.3 delivered the env-var half.
- [EPIC-1 §Stories bullet 5](../epics/EPIC-1-clickup-mcp-integration.md) — "Build 'pick space' interactive picker with session caching" — scope-exact.
- [PRD §Env vars](../PRD.md) — "Space, sprint folder, and backlog list are discovered at runtime via interactive pickers." Story 1.4 handles space; sprint-list/backlog are EPIC-2's scope (stories 2-3, 2-4).
- [PRD §Non-functional requirements — Auth](../PRD.md) — "Space asked interactively per session." Per-session scoping drives AC #2 and AC #9.
- [Story 1.3 §AC #7 / §Out of Scope bullet 2](./1-3-env-var-wiring.md) — "Interactive space picker with session caching → **story 1.4**." This story is where that deferred scope lands.
- [Story 1.3 §AC #7 HTTP-mode limitation](./1-3-env-var-wiring.md) — "in HTTP transport today, the adapter is never actually called regardless of env vars." Story 1.4 inherits this unchanged per AC #15.
- [Story 1.2 §AC #4](./1-2-wire-register-functions.md) — dynamic-import gating. The picker module itself does NOT need to be dynamically imported because it imports no upstream code statically — the upstream reference `getSpaceSearchIndex` is threaded through as a function parameter. Safe to static-import from the adapter.
- [Story 1.2 §AC #5](./1-2-wire-register-functions.md) — adapter's `RegisterResult` shape. AC #3 of this story extends the `ok` branch's `toolsRegistered` list; the `disabled` branch is unchanged.
- Upstream `src/tools/clickup/src/shared/utils.ts:318-371` — `getSpaceSearchIndex` implementation. The picker reuses this cached promise.
- Upstream `src/tools/clickup/src/tools/space-tools.ts` — upstream's `searchSpaces` tool. The picker is complementary, not replacing.
- Upstream `src/tools/clickup/src/resources/space-resources.ts` — upstream's `clickup://space/{spaceId}` resource template. No interaction with this story; the picker reads spaces but does not fabricate the resource URI.
- `src/utils/logger.ts` — use for any new log lines in the adapter's banner-line path. The picker tool handlers do NOT log at default level (tool responses ARE the user-facing output); if debugging is needed, gate via `logger.debug`.
- `src/server.ts:30-65` — `BMADServerLiteMultiToolGit` constructor. AC #14's field addition lives here.
- `src/http-server.ts:67-76` — per-`Mcp-Session-Id` `BMADServerLiteMultiToolGit` construction. This is why AC #2's per-instance scoping is not optional.
- `commitlint.config.cjs` — no `scope-enum` rule; `feat(clickup)` accepted per stories 1.1–1.3.
- SDK `McpServer`: `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts`. Read the `.tool(name, desc, schema, annotations, handler)` signature before Task 2 — the fourth-parameter `annotations` object's shape has evolved across 1.x minor versions.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/tools/clickup-session.ts` — `ClickUpSessionState` class + `SelectedSpace` interface (AC #1, #10)
- `src/tools/clickup-space-picker.ts` — `registerSpacePickerTools(server, session, getSpaceSearchIndex)` (AC #4, #5, #6, #7)
- `tests/unit/clickup-session.test.ts` — Vitest unit tests for the state class (AC #12)
- `tests/unit/clickup-space-picker.test.ts` — Vitest unit tests for the three tool handlers (AC #13)

**Modified**

- `src/tools/clickup-adapter.ts` — accept `session: ClickUpSessionState`, call `registerSpacePickerTools`, append picker tool names to `toolsRegistered` in all three mode branches (AC #3, #8, #16)
- `src/server.ts` — own `ClickUpSessionState` instance on `BMADServerLiteMultiToolGit`, thread it into `registerClickUpTools` (AC #2, #14)

**Untouched (explicitly)**

- `src/tools/clickup/**` (vendored tree — read-only per story 1.1; picker reuses upstream's `getSpaceSearchIndex` via parameter injection without any import-path into upstream)
- `BMAD-METHOD/**` (upstream BMAD — read-only)
- `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts` (BMAD engine + unified-tool surface; AC #19)
- `src/http-server.ts` (HTTP-mode tool-registration gap inherited from stories 1.2/1.3; AC #15)
- `src/utils/clickup-env.ts` (story 1.3's validator; no changes needed here)
- `package.json`, `package-lock.json` (no new deps; AC #24)
- `tests/unit/dependency-audit.test.ts` (no changes; AC #24)
- `tests/unit/clickup-env.test.ts` (story 1.3's tests; unaffected)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Story drafted from EPIC-1 bullet 5 + story 1.3 deferred work via `bmad-create-story`. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-04-21 | Validation pass (checklist): fixed AC #12 static-fields assertion (prior check `.filter(...).length === 0` always false — replaced with explicit built-ins allowlist `['length', 'name', 'prototype']`); corrected AC #13 test invocation guidance to lead with `_registeredTools[name].handler(args, extra)` and drop the inaccurate `server.server._requestHandlers` reference (verified against SDK 1.29 `mcp.js:649` + `:212` + `:233`); softened AC #13's multi-match Fuse test to specify a behavior contract rather than a brittle query string, and added a precedence test (`spaceId` + `query` both → `spaceId` wins) + an empty-workspace test; clarified AC #4 and Task 2's `pickSpace` empty-call branch to emit `No spaces available in workspace.` when the non-archived count is 0; added Dev Notes §"Tool contract summary" table for at-a-glance scan of the three tools; pinned exact SDK file + line citations in Dev Notes §"Testing `McpServer.tool()` handlers"; noted the adapter's boot-time `getSpaceSearchIndex` priming already warms the cache so first `pickSpace` is typically a hit. |
