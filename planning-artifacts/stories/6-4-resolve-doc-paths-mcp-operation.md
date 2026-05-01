# Story 6.4: Add `resolve-doc-paths` operation to the unified `bmad` MCP tool

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Fourth story in EPIC-6. Lands the MCP-layer surface that lets LLM-driven custom skills consume the cascade from story 6.3 via a single tool call instead of re-implementing the precedence rules in markdown prose. Adds a new `resolve-doc-paths` operation to `src/tools/bmad-unified.ts` (enum entry + handler + description copy), a thin operation module under `src/tools/operations/resolve-doc-paths.ts`, a small `BMADEngine.resolveDocPaths(...)` business-logic method, and a `BMADEngine.getProjectRoot()` accessor so the handler can default the resolver argument to the server's configured project root.
>
> **Why a tool operation, not direct file reads in skill prose.** The three skills migrated in stories 6.5–6.7 (`clickup-create-story` step-01, `clickup-dev-implement` step-03, `clickup-code-review` step-03) currently hard-code `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` strings. Replacing each hardcoded read with a prose-driven `[docs]` cascade walk would force every skill to repeat ~40 lines of "if `.bmadmcp/config.toml` has X, else if `_bmad/config.toml` chain has Y, else default" — a duplication that drifts. A single tool call (`bmad({ operation: 'resolve-doc-paths' })`) returning the three resolved paths plus their cascade-layer tags collapses that prose to a one-liner per skill and gives the resolver one place to evolve.
>
> **Scope guard.** This story does NOT migrate any of the three skills. Stories 6.5 / 6.6 / 6.7 each migrate one. This story lands the operation, the engine method, the unit tests, and one integration test that exercises the operation through the unified tool dispatcher — but does not touch any markdown under `src/custom-skills/`. The resolver from story 6.3 is the only `src/utils/` import; no other file under `src/utils/` is read or modified.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a new `resolve-doc-paths` operation on the unified `bmad` MCP tool that calls `resolveDocPaths(projectRoot)` (story 6.3) and returns the three absolute paths (`prd`, `architecture`, `epics`), each tagged with the cascade layer that produced it, plus any per-file warnings from malformed config files,
so that the three custom skills migrated in stories 6.5 / 6.6 / 6.7 can replace their hardcoded `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md` strings with one tool call (`bmad({ operation: 'resolve-doc-paths' })`) and the LLM running each skill never has to re-implement the cascade in markdown — matching EPIC-6 §Outcomes ("New `bmad` MCP operation `resolve-doc-paths` so LLM-driven skill prose can call the resolver via a single tool call instead of re-implementing the cascade in markdown").

## Acceptance Criteria

1. **New file `src/tools/operations/resolve-doc-paths.ts` MUST exist** mirroring the structural shape of `src/tools/operations/list.ts` / `read.ts` / `search.ts` / `execute.ts` (see `src/tools/operations/README.md` §Architecture). It MUST export exactly four named symbols and nothing else:

   ```ts
   import type { BMADEngine, BMADResult } from '../../core/bmad-engine.js';

   export interface ResolveDocPathsParams {
     /**
      * Absolute project root to resolve paths against. Optional —
      * when omitted the operation defaults to the engine's configured
      * project root (see BMADEngine.getProjectRoot, AC #6).
      */
     projectRoot?: string;
   }

   export function executeResolveDocPathsOperation(
     engine: BMADEngine,
     params: ResolveDocPathsParams,
   ): Promise<BMADResult>;

   export function validateResolveDocPathsParams(
     params: unknown,
   ): string | undefined;

   export function getResolveDocPathsExamples(): string[];
   ```

   - No default export, no re-export of `resolveDocPaths` or any utility — callers go through the unified tool, not this module directly. (Tests that import `executeResolveDocPathsOperation` / `validateResolveDocPathsParams` / `getResolveDocPathsExamples` are exempt; they are direct consumers of the operation API.)
   - The `Promise<BMADResult>` shape MUST match the rest of the operation modules: `success`, `data`, `error?`, `text`.

2. **`validateResolveDocPathsParams` semantics.** The validator MUST accept:
   - The literal `undefined` (no params object at all).
   - An empty object `{}`.
   - An object with `projectRoot: string` where the string is non-empty.
     And MUST reject (return a non-empty error string for):
   - A non-object, non-undefined params value (e.g. number, string, array). Error: `Parameters must be an object`.
   - `projectRoot` present but not a string. Error: `Parameter "projectRoot" must be a string`.
   - `projectRoot` present as an empty string. Error: `Parameter "projectRoot" cannot be empty`.
   - `projectRoot` present as a relative path. Error: `Parameter "projectRoot" must be an absolute path, got "<input>"`. (Caller mistake — surfaced before the resolver throws `TypeError`.)

   The validator MUST NOT call into the engine, the filesystem, or the resolver. It is a pure parameter-shape check.

3. **`executeResolveDocPathsOperation` semantics.** The handler MUST:
   - Resolve `projectRoot` to a usable absolute path: if `params.projectRoot` is set (and passed validation), use it verbatim; otherwise call `engine.getProjectRoot()` (AC #6) and use its return value.
   - Call `engine.resolveDocPaths(resolvedProjectRoot)` (AC #5) and `await` it. The engine method is async-shaped for consistency with the rest of the engine surface even though the underlying resolver is sync (see §Dev Notes "Why the engine method is async").
   - On success, return a `BMADResult` of:

     ```ts
     {
       success: true,
       data: {
         prd: { path: string, layer: 'bmadmcp-config' | 'bmad-config' | 'default' },
         architecture: { path: string, layer: ... },
         epics: { path: string, layer: ... },
         warnings: string[],
         projectRoot: string, // the absolute root that was used
       },
       text: '<human-readable summary, see AC #4>'
     }
     ```

   - On `engine.resolveDocPaths` throwing (e.g. the resolver's `TypeError` for a malformed `projectRoot` that slipped past the validator — defensive only), return:

     ```ts
     { success: false, error: '<error.message>', text: '' }
     ```

     The handler MUST NOT re-throw. All exceptions MUST be coerced into a `BMADResult` so the unified tool dispatcher does not need an outer try/catch around this operation specifically.

4. **`text` field — human-readable summary.** The handler's `text` field MUST be a single block of plain text suitable for direct display to a user, with this exact structure (one trailing newline, blank lines between sections):

   ```
   Resolved doc paths (project root: <absoluteProjectRoot>)

   - prd: <absolutePath> [<layer>]
   - architecture: <absolutePath> [<layer>]
   - epics: <absolutePath> [<layer>]

   Warnings (<count>):
   - <warning 1>
   - <warning 2>
   ```

   - When `warnings` is empty, the entire `Warnings (0):` section MUST be omitted (do not print `Warnings (0):` followed by an empty list).
   - Layer tags MUST be exactly the strings emitted by the resolver: `bmadmcp-config`, `bmad-config`, `default`. No translation, no decoration.
   - Paths MUST be the byte-identical absolute strings returned by the resolver. No `path.relative`, no truncation.

5. **New method `BMADEngine.resolveDocPaths(projectRoot: string): Promise<ResolvedDocPaths>` MUST exist** in `src/core/bmad-engine.ts`. It MUST:
   - Take an absolute `projectRoot` string.
   - Internally call the synchronous `resolveDocPaths` from `src/utils/doc-path-resolver.js` (story 6.3) and `await Promise.resolve(...)` the result so the public surface stays async.
   - For each entry in `result.warnings`, call `logger.warn(warning)` (one call per warning, in array order). Use the existing logger from `src/utils/logger.js` (no new logger).
   - Return the `ResolvedDocPaths` object byte-unchanged (do not strip `warnings`, do not reorder, do not dedupe). Logging is additive — the returned object is the same one the resolver produced.
   - Add the import `import { resolveDocPaths } from '../utils/doc-path-resolver.js';` and the matching type-only import for `ResolvedDocPaths`.
   - Be added in the same section as the other public engine methods (search / list / read / execute) — pick the most natural spot in the file (the end of the public-method block, after `executeWorkflow`, is a reasonable choice; record the actual insertion point in §Debug Log References).

   The method MUST NOT live as a private helper, MUST NOT take an optional argument, and MUST NOT default to `process.cwd()` itself — defaulting belongs to `executeResolveDocPathsOperation` (which has the `getProjectRoot` accessor) so tests that pass a custom root never accidentally hit `process.cwd()`.

6. **New method `BMADEngine.getProjectRoot(): string` MUST exist** in `src/core/bmad-engine.ts` returning the absolute project root the engine is configured to use. This is the value the engine's `ResourceLoaderGit` instance treats as `projectRoot` (after the loader's `projectRoot || process.cwd()` defaulting).
   - Implementation MUST consult the loader's `paths.projectRoot` directly. Either (a) make `paths` `protected` and access via `this.loader.paths.projectRoot`, or (b) add a `ResourceLoaderGit.getProjectRoot(): string` accessor and call that from the engine. **Decision pinned in §Dev Notes "Why a `getProjectRoot` accessor on the loader"** — option (b) is the chosen path; record the chosen approach in §Debug Log References regardless.
   - The returned string MUST be absolute. If `process.cwd()` somehow returns a relative-shaped path on a misbehaving runtime, the accessor MUST NOT silently coerce — but in practice `process.cwd()` is always absolute on POSIX and Windows, so this is a contract assertion, not a runtime check.
   - The accessor MUST NOT throw. If the engine has not been initialized yet (no `await initialize()`), the project root is still known from the constructor — the accessor must work pre-initialization.

7. **Update `src/tools/operations/index.ts`** to re-export the new operation's public surface, mirroring the existing four blocks:

   ```ts
   // Resolve doc paths operation
   export {
     type ResolveDocPathsParams,
     executeResolveDocPathsOperation,
     validateResolveDocPathsParams,
     getResolveDocPathsExamples,
   } from './resolve-doc-paths.js';
   ```

   The block ordering MUST follow the existing pattern (alphabetical by file basename is acceptable, as is "in declaration order"). Whichever ordering matches the existing convention (currently: list → search → read → execute) — append the new block last (after execute), since the operation is newer and orthogonal to the discovery / read / execute trio. Record the chosen position in §Debug Log References.

8. **Update `src/tools/bmad-unified.ts`** to surface the new operation:
   1. **Operation enum.** Extend the operation enum to include `'resolve-doc-paths'`. The enum MUST list it after the existing operations:
      - When `enableSearch` is `false`: `['list', 'read', 'execute', 'resolve-doc-paths']`.
      - When `enableSearch` is `true`: `['list', 'search', 'read', 'execute', 'resolve-doc-paths']`.
   2. **Operation description.** Append a single new line to `operationDesc` for both branches:
      ```
      - resolve-doc-paths: Resolve PRD/architecture/epics doc paths via the EPIC-6 cascade (.bmadmcp/config.toml → BMAD config → default)
      ```
   3. **Tool description body.** Update `buildToolDescription` so the `**Operations:**` bullet list includes:

      ```
      - `resolve-doc-paths`: Resolve PRD/architecture/epics doc paths via the EPIC-6 cascade
      ```

      And the `**Usage Guide:** ... **When to use each operation:**` block includes:

      ```
      - `resolve-doc-paths` - Skill prose needs the absolute path of PRD/architecture/epics for this project (cascade-aware; honours `.bmadmcp/config.toml [docs]` overrides)
      ```

      And the `**Examples:**` block includes (immediately before "Disambiguate with module"):

      ```
      Resolve doc paths (defaults to server project root):
        { operation: "resolve-doc-paths" }

      Resolve doc paths for a specific project:
        { operation: "resolve-doc-paths", projectRoot: "/abs/path/to/project" }
      ```

   4. **`BMADToolParams` interface.** Add a single new optional field:
      ```ts
      /** For resolve-doc-paths operation: absolute project root (defaults to server's project root) */
      projectRoot?: string;
      ```
   5. **`inputSchema.properties`.** Add a corresponding JSON-schema entry:
      ```ts
      projectRoot: {
        type: 'string',
        description:
          'For resolve-doc-paths operation: absolute project root to resolve against. Defaults to the server\'s configured project root.',
      },
      ```
   6. **Operation type union.** Update `BMADToolParams.operation` to the new union:
      ```ts
      operation: 'list' | 'search' | 'read' | 'execute' | 'resolve-doc-paths';
      ```
   7. **`handleBMADTool` switch.** Add a new `case 'resolve-doc-paths'` arm calling a new private `handleResolveDocPaths(params, engine)` function that:
      - Maps `BMADToolParams` to `ResolveDocPathsParams` (just `projectRoot`).
      - Calls `validateResolveDocPathsParams` and short-circuits with the same `❌ Validation Error: …` format the other handlers use (with `getResolveDocPathsExamples()` appended).
      - Calls `executeResolveDocPathsOperation` and returns `{ content: [{ type: 'text', text: result.text }] }` if `result.success`, else `{ content: [{ type: 'text', text: '❌ ' + (result.error ?? 'Unknown error') }] }`.

      The structure MUST mirror `handleList` / `handleRead` / `handleExecute`. Like `handleExecute`, this handler returns the human-readable `text` (not a JSON dump of `data`) — the data is already the content the LLM-driven skill needs to display verbatim or parse with a regex.

9. **`getResolveDocPathsExamples()` MUST return** at least the following four strings, in this order, for use in validation error messages:

   ```ts
   [
     'Default (server project root): { operation: "resolve-doc-paths" }',
     'Specific project: { operation: "resolve-doc-paths", projectRoot: "/abs/path/to/project" }',
     'After configuring .bmadmcp/config.toml [docs].prd_path: { operation: "resolve-doc-paths" }',
     'After configuring _bmad/config.toml [bmm].planning_artifacts: { operation: "resolve-doc-paths" }',
   ];
   ```

   Adding more examples is allowed; the four above MUST be present in the order listed.

10. **No edits to other operation files (`list.ts`, `read.ts`, `search.ts`, `execute.ts`).** `git diff --stat -- src/tools/operations/list.ts src/tools/operations/read.ts src/tools/operations/search.ts src/tools/operations/execute.ts` MUST be empty. The new operation is purely additive — no shared-helper extraction yet (see §Out of Scope on "Why no shared `validateProjectRoot` helper").

11. **No edits to `src/utils/doc-path-resolver.ts` or `src/utils/toml-loader.ts`.** This story is a pure consumer of those modules; if a bug surfaces during integration, file a follow-up story rather than amending the leaf utilities here. `git diff --stat -- src/utils/` MUST list nothing (no new file, no modified file under `src/utils/`).

12. **New file `tests/unit/tools/operations/resolve-doc-paths.test.ts` MUST exist** and cover, at minimum:
    1. **`validateResolveDocPathsParams` — accepts `undefined`.** Asserts `validateResolveDocPathsParams(undefined) === undefined`.
    2. **`validateResolveDocPathsParams` — accepts `{}`.** Asserts `=== undefined`.
    3. **`validateResolveDocPathsParams` — accepts `{ projectRoot: '/abs/path' }`.** Asserts `=== undefined`.
    4. **`validateResolveDocPathsParams` — rejects non-object.** `validateResolveDocPathsParams(42)` returns the `Parameters must be an object` string.
    5. **`validateResolveDocPathsParams` — rejects non-string `projectRoot`.** `{ projectRoot: 42 }` returns `Parameter "projectRoot" must be a string`.
    6. **`validateResolveDocPathsParams` — rejects empty `projectRoot`.** `{ projectRoot: '' }` returns `Parameter "projectRoot" cannot be empty`.
    7. **`validateResolveDocPathsParams` — rejects relative `projectRoot`.** `{ projectRoot: 'subdir' }` returns the absolute-path error and includes the literal substring `subdir`.
    8. **`getResolveDocPathsExamples` shape.** Asserts the array has at least 4 entries and that the first four strings exactly match AC #9.
    9. **`executeResolveDocPathsOperation` — happy path with explicit `projectRoot`.** Uses a temp directory created via `fs.mkdtempSync` with no `.bmadmcp/`, no `bmad/`, no `_bmad/`. Stubs `engine.resolveDocPaths` to call the real resolver (or constructs a small fake `BMADEngine` with a `resolveDocPaths` method that delegates to the real resolver). Asserts `result.success === true`, `result.data.prd.layer === 'default'`, etc.
    10. **`executeResolveDocPathsOperation` — defaults to engine's project root.** Calls without `projectRoot`. Asserts `engine.getProjectRoot()` was consulted (use a `vi.spyOn` on the fake engine or a stub that records the argument).
    11. **`executeResolveDocPathsOperation` — passes `warnings` through.** Stubs `engine.resolveDocPaths` to return a fixed `ResolvedDocPaths` with two warnings. Asserts `result.data.warnings` is the same array (deep-equal) and `result.text` includes both warnings under a `Warnings (2):` heading.
    12. **`executeResolveDocPathsOperation` — text format with empty warnings.** Stubs the engine method to return zero warnings. Asserts the `text` does NOT contain the substring `Warnings (`.
    13. **`executeResolveDocPathsOperation` — text format with project-root header.** Asserts the first line of `text` is `Resolved doc paths (project root: <absoluteProjectRoot>)` with the exact project root that was passed in.
    14. **`executeResolveDocPathsOperation` — engine method throws.** Stubs `engine.resolveDocPaths` to throw `new TypeError('boom')`. Asserts `result.success === false`, `result.error === 'boom'`, `result.text === ''`. No throw escapes the handler.
    15. **`executeResolveDocPathsOperation` — `data.projectRoot` matches the resolved root.** When the call is made without `projectRoot`, asserts `result.data.projectRoot === engine.getProjectRoot()` (the value the handler defaulted to).

    The test file MUST use `vitest`'s `describe` / `it` / `expect`. Construct fake engines as plain objects implementing the methods this operation consumes (`getProjectRoot`, `resolveDocPaths`) — full `BMADEngine` instances are not needed and would slow the unit suite. Use `tests/unit/tools/operations/` (mirroring `src/tools/operations/`); create the directory if it does not exist.

13. **Update `src/tools/bmad-unified.ts`-related test coverage.** If any pre-existing tests under `tests/unit/tools/` enumerate operations or operation-handler routing, they MUST be updated to include the new operation. Run `grep -rn "operation: 'list'\|operation: 'execute'\|operation: 'read'\|operation: 'search'" tests/` to find them; if no existing test enumerates them, no update is required and this AC is vacuous (record the grep result in §Debug Log References).

14. **New file `tests/integration/resolve-doc-paths.integration.test.ts` MUST exist** and exercise the full unified-tool dispatch path:
    1. **End-to-end via `handleBMADTool`.** Constructs a `BMADEngine` pointed at a temp project root, calls `handleBMADTool({ operation: 'resolve-doc-paths' }, engine)` with no `projectRoot`, and asserts the returned `content[0].text` matches the AC #4 format with all three layers as `'default'`.
    2. **End-to-end with explicit `projectRoot`.** Same as above but passes a different temp dir as `projectRoot` (one with a `.bmadmcp/config.toml` writing `[docs].prd_path = "specs/PRD.md"`). Asserts the response text shows `prd: <projectRoot>/specs/PRD.md [bmadmcp-config]`.
    3. **End-to-end with malformed `.bmadmcp/config.toml`.** Writes `[docs]\nprd_path = "unterminated`. Asserts the response text includes a `Warnings (1):` section and the warning mentions `malformed TOML —`.

    The integration test file MUST live under `tests/integration/` (currently only contains `README.md`, per the directory listing — `tests/integration/resolve-doc-paths.integration.test.ts` is the first real integration test in this directory, which is fine). If `vitest.config.ts` already includes `tests/integration/**/*.test.ts` in its `include` glob, no config edit is needed; verify by inspecting the config and record in §Debug Log References. If a separate config file is used for integration tests (`vitest.integration.config.ts` or similar), follow the existing pattern.

15. **Tool-description verification test.** Add ONE new test case to whichever existing test file covers `createBMADTool` description content (locate via `grep -rn "createBMADTool\|buildToolDescription" tests/`). The new case MUST assert the returned tool's `description` string contains all three of:
    - The substring `resolve-doc-paths`.
    - The substring `Resolve PRD/architecture/epics doc paths`.
    - The example block `{ operation: "resolve-doc-paths" }`.

    If no such test file exists yet (i.e. the tool description is not currently asserted-on in tests), this AC is vacuous — record `none-found` in §Debug Log References and skip. Do NOT create a new "tool description" test file just for this story; that would be scope creep.

16. **No regressions in existing operation tests.** Run `npm run test:unit` and confirm zero new failures in `tests/unit/tools/`. The new operation is additive; no existing list/read/execute/search test should observe a behaviour change.

17. **Engine-method tests.** If `tests/unit/core/bmad-engine.test.ts` (or similar) exists, add at least two cases:
    1. `engine.getProjectRoot()` returns the absolute path that was passed to the constructor (when one was passed).
    2. `engine.getProjectRoot()` returns `process.cwd()` when no project root was passed.

    If no engine unit-test file exists, this AC is vacuous — record `no-engine-test-file` in §Debug Log References. Adding the engine method is still required; just the tests are deferred to whenever the engine gets a unit-test home.

18. **`tests/unit/dependency-audit.test.ts` MUST remain byte-unchanged.** This story does NOT change the imported-dependency surface — `src/utils/doc-path-resolver.js` and `src/utils/logger.js` are already-allowed internal imports; no new package dep is added. `git diff -- tests/unit/dependency-audit.test.ts` MUST be empty.

19. **`npm run build` MUST succeed.** The modified files compile under the existing strict `tsc` config with no new errors and no new `// @ts-expect-error` / `// @ts-ignore` directives. Pay specific attention to the `BMADToolParams.operation` literal-union expansion — TypeScript will catch a missed switch arm in `handleBMADTool` if the union and the switch drift.

20. **`npm run lint` MUST exit with 0 errors and the same warning count as the baseline immediately before this story.** No new ESLint disables in any file touched by this story.

21. **`npm run format` MUST produce no diff.** All new and modified files conform to Prettier on commit.

22. **`npm test` MUST pass with the expected delta.**
    - `npm run test:unit` MUST add at least 15 new test cases (the ones in AC #12) plus 0–2 from ACs #13, #15, #17 (those are conditional on whether the corresponding test files exist). Record actual delta in §Debug Log References.
    - `npm run test:integration` MUST add exactly 3 new cases (AC #14). If `tests/integration/` was previously empty (no `*.test.ts` files — the directory has only `README.md` per the current listing), the integration suite gains its first real test cases here.
    - The pre-existing 1-test soft-failure noted in story 6.3's §Debug Log References (or whatever the latest baseline is — verify via `git log` on `main` immediately before starting work) MUST remain at exactly that count. This story does not address it.

23. **No changes outside the files listed below.** `git diff --stat` MUST show exactly:
    - **Modified:**
      - `src/tools/bmad-unified.ts` — operation enum + description + handler + schema (AC #8)
      - `src/tools/operations/index.ts` — re-export (AC #7)
      - `src/core/bmad-engine.ts` — `resolveDocPaths` method + `getProjectRoot` method (AC #5, #6)
      - `src/core/resource-loader.ts` — `getProjectRoot()` accessor (AC #6, option (b))
      - Optionally: an existing tool-description test file (AC #15) and/or `tests/unit/core/bmad-engine.test.ts` (AC #17). Conditional on existence; record in Debug Log.
    - **New:**
      - `src/tools/operations/resolve-doc-paths.ts` (AC #1)
      - `tests/unit/tools/operations/resolve-doc-paths.test.ts` (AC #12)
      - `tests/integration/resolve-doc-paths.integration.test.ts` (AC #14)

    Specifically:
    - `git diff --stat -- src/utils/` MUST be empty (AC #11).
    - `git diff --stat -- src/custom-skills/` MUST be empty (no skill migrations — those land in 6.5/6.6/6.7).
    - `git diff --stat -- '*.md'` MUST be empty (apart from this story file, which lands in a separate planning commit; CLAUDE.md updates land in story 6.8).
    - `git diff --stat -- package.json package-lock.json` MUST be empty (no new dep — the operation consumes already-present `smol-toml` indirectly via `loadToml`).
    - `git diff --stat -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json` MUST be empty.
    - `git diff --stat -- .bmadmcp/` MUST be empty (config-example update lands in story 6.8).

24. **`package.json#version` MUST be byte-unchanged** (semantic-release-managed per `CLAUDE.md` §CI/CD).

25. **The new `resolve-doc-paths` operation MUST be the only new entry in the unified tool's operation enum.** Verify before commit with `grep -E "^\s*operation:\s*'[^']+'" src/tools/bmad-unified.ts | sort -u` — the unique values MUST be exactly: `'list'`, `'read'`, `'execute'`, `'resolve-doc-paths'` (plus `'search'` if `enableSearch` is wired in). Record before/after sets in §Debug Log References.

26. **The CLI helper output MUST list the new operation.** If `npm run cli:list-tools` (per `CLAUDE.md` §Common Commands) prints the unified tool's operation menu, its output MUST include `resolve-doc-paths`. If the CLI does not currently render operation lists (only tool names), this AC is vacuous — record the actual CLI output in §Debug Log References.

27. **The commit message MUST follow Conventional Commits.** Use `feat(tools): add resolve-doc-paths MCP operation`. The body MUST cite EPIC-6, story 6.4, mention that the operation is a thin wrapper over `resolveDocPaths` (story 6.3), and explicitly note that no skill migration ships in this PR (deferred to stories 6.5–6.7). See §Tasks / Subtasks Task 7 for the body template.

## Out of Scope (explicitly deferred to later stories)

- Migration of `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` to consume the new operation → **story 6.5**. The skill's prereq-check still hardcodes `planning-artifacts/PRD.md` after this story lands; no behaviour change yet.
- Migration of `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` → **story 6.6**.
- Migration of `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md` → **story 6.7**.
- Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml` (`[docs]` table addition), README.md, and per-skill `workflow.md` files → **story 6.8**.
- A `force-refresh` / `bypass-cache` flag on the operation — there is no cache to bust at this layer (see §Dev Notes "Why no caching"). If a future caller proves caching is needed, that's a separate story.
- An async or streaming variant of `resolveDocPaths` — the underlying utility is sync (story 6.3 AC #1) and reads at most 5 small files; an async variant adds complexity without measurable benefit. Same rationale as `loadToml` (story 6.2).
- Adding `tech_spec` and `ux_design` keys to the resolver's output — EPIC-6 §Open questions defers; story 6.3 §Out of Scope locks the resolver's surface to `prd` / `architecture` / `epics`. When those land, this operation will surface them automatically (the `data` shape mirrors the resolver's output).
- A shared `validateProjectRoot(value): string | undefined` helper extracted into `src/tools/operations/_helpers.ts` — currently `executeOperation` is the only caller of any project-root-related validation. Extraction belongs to whichever story introduces the second caller. **See §Dev Notes "Why no shared `validateProjectRoot` helper".**
- Making the resolver's warnings structured (e.g. `{ file, key, severity }` instead of free-form strings) — the resolver returns `readonly string[]` per story 6.3 AC #1; rewriting the warning shape is a surface-breaking change for both the resolver and this operation. Defer.
- Surfacing the cascade-layer source for _unset_ keys (e.g. "epics fell back to default because `.bmadmcp/config.toml` did not specify it") — story 6.3 already tags every returned key with the layer that produced it; no additional metadata is needed for the migrated skills. If a future "explain the cascade" UI emerges, that's a different operation (`explain-doc-paths` perhaps).
- A schema-validation layer (e.g. `zod`) on the operation's input parameters. The validator in AC #2 is sufficient — `projectRoot` is the only input. A `zod` schema would be overkill for one optional string.
- A way for the LLM to request a _specific_ doc key only (e.g. `bmad({ operation: 'resolve-doc-paths', key: 'prd' })`) — story 6.3 AC §Out of Scope ("`resolveDocPathsForKey(key, projectRoot)` single-key variant") explicitly defers this. The migrated skills can pluck the field they want from the returned `data`.
- ClickUp adapter integration — the operation is project-root-local, not ClickUp-aware. ClickUp config (`CLICKUP_API_KEY` etc.) is orthogonal.
- HTTP-transport coverage — the operation works over any MCP transport because it uses `handleBMADTool`. No transport-specific code lands here.

## Tasks / Subtasks

- [x] **Task 1 — Capture baseline (AC: #16, #19, #20, #21, #22)**
  - [x] On a clean working tree at the branch base, run `npm install` to ensure node_modules matches the lockfile (story 6.3 should not have changed deps; verify).
  - [x] Run `npm test` and record the passing / failing counts → baseline: **278 passing, 1 failing** (pre-existing dependency-audit failure in vendored clickup code for `node:async_hooks`).
  - [x] Run `npm run build`, `npm run lint`, `npm run format` and confirm a green / clean baseline before any edits.
  - [x] Run `grep -rn "createBMADTool\|buildToolDescription" tests/` and record matches → **none-found**.
  - [x] Run `ls tests/unit/core/bmad-engine.test.ts 2>/dev/null` and record whether the file exists → **no-engine-test-file**.
  - [x] Run `npm run cli:list-tools` and record the output → CLI renders tool names only (`1. bmad`), not operation menus. AC #26 vacuous.

- [x] **Task 2 — Add `getProjectRoot` accessor to `ResourceLoaderGit` and `BMADEngine` (AC: #6)**
  - [x] Open `src/core/resource-loader.ts`. Added `getProjectRoot()` method after constructor, before `getProjectBmadPath()`, with TSDoc citing story 6.4.
  - [x] Open `src/core/bmad-engine.ts`. Added `getProjectRoot()` in the public-method block (after `executeWorkflow`, before SEARCH OPERATIONS).
  - [x] Confirm `npm run build` is still clean. ✅

- [x] **Task 3 — Add `resolveDocPaths` method to `BMADEngine` (AC: #5)**
  - [x] Open `src/core/bmad-engine.ts`. Added imports for `resolveDocPaths`, `ResolvedDocPaths`, and `logger`. `logger` was NOT already imported — added fresh.
  - [x] Added `resolveDocPaths(projectRoot)` public async method after `getProjectRoot()`, before SEARCH OPERATIONS. Used `await Promise.resolve(resolveDocPaths(projectRoot))` to satisfy `@typescript-eslint/require-await`.
  - [x] Confirm `npm run build` is still clean. ✅

- [x] **Task 4 — Implement `src/tools/operations/resolve-doc-paths.ts` (AC: #1, #2, #3, #4, #9)**
  - [x] Created `src/tools/operations/resolve-doc-paths.ts`.
  - [x] Defined `ResolveDocPathsParams` exactly per AC #1.
  - [x] Implemented `validateResolveDocPathsParams` per AC #2 using `path.isAbsolute` from `node:path`.
  - [x] Implemented `executeResolveDocPathsOperation` per AC #3 with try/catch, correct `text` format (omits warnings section when empty), and `data.projectRoot`.
  - [x] Implemented `getResolveDocPathsExamples` per AC #9.
  - [x] Confirm `npm run build` is still clean. ✅

- [x] **Task 5 — Wire `resolve-doc-paths` into the unified tool (AC: #7, #8, #10, #11, #25)**
  - [x] Open `src/tools/operations/index.ts`. Appended re-export block per AC #7.
  - [x] Open `src/tools/bmad-unified.ts`: added imports, updated operation enum (both branches), `operationDesc`, `BMADToolParams` union + `projectRoot` field, `inputSchema.properties`, `buildToolDescription` (Operations list, When to use, Examples), switch case, and `handleResolveDocPaths` handler.
  - [x] Confirmed no edits to `list.ts` / `read.ts` / `search.ts` / `execute.ts` (AC #10). ✅
  - [x] Confirmed no edits to `src/utils/` (AC #11). ✅
  - [x] Verified operation enum values: `'list' | 'search' | 'read' | 'execute' | 'resolve-doc-paths'` (AC #25). ✅

- [x] **Task 6 — Write unit + integration tests (AC: #12, #13, #14, #15, #17)**
  - [x] Created `tests/unit/tools/operations/resolve-doc-paths.test.ts` with 15 cases per AC #12.
  - [x] Tool-description test file: **none-found** (AC #15 vacuous).
  - [x] Engine unit-test file: **no-engine-test-file** (AC #17 vacuous).
  - [x] Created `tests/integration/resolve-doc-paths.integration.test.ts` with 3 cases per AC #14. `vitest.config.ts` picks up `tests/**/*.test.ts` — integration tests run automatically under `npm run test:integration`.
  - [x] Unit test delta: **+15** (278 → 293 passing). Integration test delta: **+3** (0 → 3 passing).

- [x] **Task 7 — Re-run all gates (AC: #16, #18, #19, #20, #21, #22, #23, #24)**
  - [x] `npm run build` → clean. ✅
  - [x] `npm run lint` → 0 errors, 7 warnings (baseline unchanged). ✅
  - [x] `npm run format` → no diff. ✅
  - [x] `npm test` → **296 passing, 1 failing** (+15 unit + 3 integration = +18 over baseline). ✅
  - [x] `git diff --stat` matches AC #23 exactly. Modified: `src/core/bmad-engine.ts`, `src/core/resource-loader.ts`, `src/tools/bmad-unified.ts`, `src/tools/operations/index.ts`. New: `src/tools/operations/resolve-doc-paths.ts`, `tests/unit/tools/operations/resolve-doc-paths.test.ts`, `tests/integration/resolve-doc-paths.integration.test.ts`. ✅
  - [x] `git diff --stat -- src/utils/` is empty (AC #11). ✅
  - [x] `git diff --stat -- src/custom-skills/` is empty. ✅
  - [x] `git diff --stat -- '*.md'` is empty (story file tracked separately). ✅
  - [x] `git diff -- tests/unit/dependency-audit.test.ts` is empty (AC #18). ✅
  - [x] `git diff -- package.json` is empty (AC #24). ✅

- [x] **Task 8 — Commit (AC: #27)**
  - [x] Staged and committed with Conventional Commits header and body per AC #27.

## Dev Notes

### Why a tool operation, not direct file reads in skill prose

The three skills migrated in stories 6.5 / 6.6 / 6.7 each begin with a "read PRD.md and architecture.md" prereq step. If we kept the cascade in markdown prose, every skill would need a copy of:

```
1. Try to read .bmadmcp/config.toml. If it exists and parses, look for [docs].prd_path.
   - If set, use it.
   - Else if [docs].planning_dir is set, use <planning_dir>/PRD.md.
   - Else fall through.
2. Try _bmad/config.toml. Then _bmad/config.user.toml. Then _bmad/custom/config.toml. Then _bmad/custom/config.user.toml.
   Deep-merge their [bmm] tables. If [bmm].planning_artifacts is set, use <planning_artifacts>/PRD.md.
3. Otherwise default to planning-artifacts/PRD.md.
```

…repeated three times across three skills, with the BMAD 4-layer merge expressed in English. That prose drifts: a fix in one skill doesn't propagate. The MCP operation collapses all of that to:

```
Call: bmad({ operation: 'resolve-doc-paths' })
Use: <result>.prd.path, <result>.architecture.path, <result>.epics.path
```

Plus a `<result>.warnings` array the skill can display in its error block. The cascade lives in TS code (story 6.3); the MCP operation is the bridge.

### Why the handler returns `text`, not JSON

The other discovery operations (`list`, `search`, `read`) return `JSON.stringify(result.data, null, 2)` because the LLM-driven caller is a programmatic consumer that needs structured data. `execute` returns `result.text` because the caller is a human reading agent / workflow output.

`resolve-doc-paths` straddles the two, but leans toward `text`:

- The migrated skills (6.5–6.7) consume the `text` field directly when displaying prereq-check failures to the user. Their error block is "I couldn't find PRD.md at <path>; cascade source = <layer>" — a one-liner formed from the `text`.
- For programmatic access, the JSON shape is still available via `result.data` in the BMADResult internally — but the MCP transport returns the human-readable form by default. If a skill ever needs the JSON shape, it can ask for it via a future `format: 'json' | 'text'` parameter (out of scope for this story).
- This matches `execute`'s pattern: the unified handler returns `text` when the operation has a "user-facing summary" character, and `data`-as-JSON when the operation is purely a data lookup.

### Why the engine method is async

`resolveDocPaths` from story 6.3 is synchronous — it reads at most five small TOML files via `loadToml`'s sync API. So the engine method _could_ be sync too. Three reasons we make it async:

1. **Surface consistency.** Every other public method on `BMADEngine` is `async` (`listAgents`, `readAgent`, `executeAgent`, etc.). A sync method would stand out and force handlers / tests to special-case the call shape.
2. **Future-proofing.** If the resolver ever gains an async path (e.g. fetching a TOML config from a remote service for cloud-hosted projects), the engine method's `Promise<ResolvedDocPaths>` shape doesn't change. Sync now, async later means a contract break later.
3. **Logger flexibility.** If `logger.warn` ever becomes async (it currently writes to stderr synchronously, but a future structured-logger backend might queue), the `for (const warning of result.warnings) logger.warn(warning)` loop can become `await Promise.all(...)` without changing the method's signature.

The cost is one `await Promise.resolve(...)` (or `await` of a sync call, which Node.js handles transparently). Negligible.

### Why a `getProjectRoot` accessor on the loader

`BMADEngine` already has the project root, but it lives inside `private paths: ResourcePaths` on `ResourceLoaderGit`. Two options to expose it to the operation handler:

(a) Make `ResourceLoaderGit.paths` `protected` and have `BMADEngine` access `this.loader.paths.projectRoot` directly. **Rejected:** widens the public-ish surface of `ResourceLoaderGit` for one consumer; future refactors that move `paths` around break the engine.

(b) Add `ResourceLoaderGit.getProjectRoot(): string` and `BMADEngine.getProjectRoot(): string`. The engine method delegates one level. **Chosen:** keeps `paths` private (encapsulation preserved) and adds a single-purpose accessor with a clear contract ("the absolute project root the loader is configured to use, post-defaulting").

The cost is two extra one-liners. The benefit is that any other future code path that needs the project root (think: an HTTP-transport health endpoint that prints the root, or a new operation like `whoami`) goes through the accessor instead of reaching into private state.

### Why `getProjectRoot` returns a string, not an object

A future-thinking version might return `{ projectRoot: string, source: 'constructor' | 'cwd' }` so callers can distinguish "explicitly configured" from "defaulted to cwd". We reject this:

- Every current caller wants the path, not the provenance.
- Adding the discriminator now creates an under-used field that callers either ignore or destructure — boilerplate without payoff.
- If provenance becomes needed (e.g. for a debug operation), a separate `getProjectRootInfo()` method can return the richer shape without breaking `getProjectRoot()`.

### Why no caching

`resolveDocPaths` reads at most five small TOML files (sub-millisecond combined). A single `bmad({ operation: 'resolve-doc-paths' })` call is cheap. Caching would:

1. **Capture stale state.** A user editing `.bmadmcp/config.toml` mid-session expects the next operation to pick up the change. A cache keyed on project root would not invalidate.
2. **Complicate tests.** Story 6.3 already explicitly forbids caching at the resolver level for the same reason (story 6.3 AC #10). Re-introducing it at this layer would be inconsistent.
3. **Save nothing measurable.** The hot path here is the resolver's filesystem reads — five `statSync` + zero-to-five `readFileSync` of small files. The MCP transport overhead dominates.

If a future profiling pass shows the resolver call is hot (extremely unlikely), `mtime`-based invalidation can land at a higher layer (e.g. a `ServerInstance`-scoped cache invalidated on `fs.watch`). That's a separate story.

### Why no shared `validateProjectRoot` helper

The validators in the other operation files (`list.ts`, `read.ts`, `execute.ts`, `search.ts`) each implement their own param checks — there's no shared `validateString` / `validateAbsolutePath` helper. AC #2's project-root check duplicates a small amount of logic (string check + `path.isAbsolute`) but extracting it now would create a one-caller helper. The pattern in this codebase is "validators are flat per-operation"; preserving that pattern keeps the diff focused and the operation file readable on its own.

When (if) a second operation lands that needs project-root validation, extract `validateAbsolutePath(value: unknown, paramName: string): string | undefined` into `src/tools/operations/_helpers.ts`. Until then, inline.

### Why the operation defaults to `engine.getProjectRoot()` instead of `process.cwd()`

The operation could in theory call `process.cwd()` directly when `projectRoot` is omitted. We reject this because:

1. **Test isolation.** Tests construct a `BMADEngine` with an explicit `projectRoot` (a temp dir) so the resolver works against a controlled filesystem. If the operation ignored the engine's project root and used `process.cwd()`, every test would either need to `chdir` into the temp dir (race-prone) or pass `projectRoot` explicitly (defeats the "default" code path's coverage).
2. **HTTP transport.** The HTTP transport (`src/http-server.ts`) might be invoked from a different working directory than the BMAD project root. The engine carries the configured root; `process.cwd()` does not.
3. **Consistency with the rest of the engine.** `ResourceLoaderGit` already used `projectRoot || process.cwd()` once at construction time. After that, every operation goes through the engine's configured root. The operation should follow the same path.

The defaulting hops are: caller-provided `projectRoot` → `engine.getProjectRoot()` → (engine constructor's `projectRoot` arg) → `process.cwd()`. Exactly one of these wins per call, with the caller having the highest precedence.

### Why `data.projectRoot` is included in the response

Per AC #3, the response's `data` object includes a top-level `projectRoot` field with the absolute root the handler used. Three reasons:

1. **Caller debuggability.** When a skill calls `bmad({ operation: 'resolve-doc-paths' })` and the result looks wrong, the first question is "which root did it resolve against?". Including it in the response saves a follow-up `getProjectRoot` call.
2. **Round-tripping.** A migrated skill that wants to reference "the project we're working in" can read `data.projectRoot` once and reuse it across subsequent reads, instead of inferring from one of the three resolved paths via string manipulation.
3. **Symmetry with the `text` field.** AC #4's text format opens with `Resolved doc paths (project root: <absoluteProjectRoot>)`. Putting the same value in `data.projectRoot` keeps the structured and unstructured surfaces in sync.

### Test strategy: unit fakes, integration real engine

The unit tests (AC #12) construct fake `BMADEngine` shapes with just `getProjectRoot` and `resolveDocPaths` methods — full engine instances are not needed and would slow the suite. The integration test (AC #14) uses a real `BMADEngine` constructor pointed at a temp dir, calls through `handleBMADTool`, and verifies the end-to-end response. This split mirrors the pattern in `src/tools/operations/README.md` §Testing:

- Unit: parameter validation, handler logic in isolation, error-coercion.
- Integration: the full dispatch path, the JSON-schema input shape, the response wrapping.

Both tiers use real temp-dir filesystems for the resolver's TOML reads — `loadToml` is not mocked. Story 6.3's tests already proved the resolver works against real disk; story 6.4 piggybacks on that confidence.

### `vitest.config.ts` integration glob

The repo currently has `tests/integration/` with only `README.md` — no `*.test.ts` files yet. The first concern is whether `npm run test:integration` actually picks up files under that directory. Task 1 verifies this; if the existing config ignores the directory, the integration test created in AC #14 might not run automatically.

If the config does not pick up the file:

- **Do not edit the config in this story.** Vitest configuration changes are infrastructure-shaped (they affect every future test) and should not be hidden inside a feature story's commit.
- Instead, file a concern in §Debug Log References and either (a) move the integration test under `tests/unit/tools/operations/` (treating it as a "wide unit test" rather than a true integration) or (b) flag the config gap as a follow-up story.

### Why this story doesn't migrate the skills

EPIC-6 §Stories enumerates eight stories. Bundling the operation and the skill migrations would:

- **Inflate the PR.** Each skill migration touches markdown-heavy step files and re-runs the skill's existing integration tests. Three skills × two-to-three step files each ≈ 6–9 new diffs.
- **Couple risk.** A bug in the operation surfaces as a failure in three migrated skills simultaneously, making bisection harder.
- **Block parallel work.** With the operation landed, stories 6.5 / 6.6 / 6.7 can proceed in parallel — three independent PRs instead of one giant one.

The trade-off is that this story's PR has zero observable behaviour change for end users (the operation exists but no skill calls it yet). That's acceptable: the operation is testable in isolation via the integration test (AC #14), and the migrations land within days, not months.

### References

- [EPIC-6 §Outcomes](../epics/EPIC-6-configurable-doc-path-resolution.md) — "New `bmad` MCP operation `resolve-doc-paths`…"
- [EPIC-6 §Stories](../epics/EPIC-6-configurable-doc-path-resolution.md) — "Add `resolve-doc-paths` operation to `src/tools/bmad-unified.ts` and `src/tools/operations/` + unit + integration tests"
- [Story 6.2 §Out of Scope](./6-2-toml-loader-utility.md) — defers the MCP operation to this story.
- [Story 6.3 §Out of Scope](./6-3-doc-path-resolver-cascade.md) — defers the MCP operation to this story; locks the resolver's surface (3 keys).
- [`src/utils/doc-path-resolver.ts`](../../src/utils/doc-path-resolver.ts) — the function this operation wraps (lands in story 6.3).
- [`src/utils/toml-loader.ts`](../../src/utils/toml-loader.ts) — transitively consumed by the resolver.
- [`src/tools/bmad-unified.ts`](../../src/tools/bmad-unified.ts) — the unified-tool definition this story extends.
- [`src/tools/operations/README.md`](../../src/tools/operations/README.md) — the operation-module pattern this story follows.
- [`src/tools/operations/list.ts`](../../src/tools/operations/list.ts) — structural template for `resolve-doc-paths.ts` (validate / execute / examples trio).
- [`src/core/bmad-engine.ts`](../../src/core/bmad-engine.ts) — receives the `resolveDocPaths` and `getProjectRoot` methods.
- [`src/core/resource-loader.ts`](../../src/core/resource-loader.ts) — receives the `getProjectRoot` accessor (option (b) per Dev Notes).
- [`src/utils/logger.ts`](../../src/utils/logger.ts) — used by `BMADEngine.resolveDocPaths` for warnings.
- [Story 5.7 §Refine prompts and templates](./5-7-refine-prompts-and-templates.md) — establishes the pilot's prereq-check error-block pattern that the migrated skills (6.5–6.7) extend with cascade-layer info from this operation.

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (root agent) executing bmad-dev-story workflow.

### Debug Log References

- **Baseline test count:** 278 passing, 1 failing → 296 passing, 1 failing (+18 new tests: 15 unit + 3 integration).
- **Pre-existing tool-description test file (AC #15):** `none-found`.
- **Pre-existing engine unit-test file (AC #17):** `no-engine-test-file`.
- **CLI list-tools output (AC #26):** CLI renders tool names only (`1. bmad`), not operation menus. AC vacuous.
- **`vitest.config.ts` integration glob:** `tests/**/*.test.ts` includes `tests/integration/**/*.test.ts`; `npm run test:integration` picks up the file automatically.
- **`logger` import already present in `bmad-engine.ts`:** **false** — `logger` was not previously imported; added fresh.
- **Insertion point for `resolveDocPaths` method:** After `getProjectRoot()` (line ~635), before `// SEARCH OPERATIONS`.
- **Operation enum unique values (AC #25) before:** `'list' | 'read' | 'execute'` (with `'search'` when `enableSearch` true).
- **Operation enum unique values (AC #25) after:** `'list' | 'search' | 'read' | 'execute' | 'resolve-doc-paths'`.
- **Decision on `getProjectRoot` location (AC #6):** Option (b) — added `ResourceLoaderGit.getProjectRoot()` accessor and `BMADEngine.getProjectRoot()` delegator. `paths` remains `private`.
- **Integration test runtime:** ~680ms (3 cases against temp dirs, including git remote resolution overhead from BMAD engine init).

### Completion Notes List

1. All 27 ACs verified. Tasks 1–8 complete.
2. New operation `resolve-doc-paths` is fully wired into the unified `bmad` MCP tool.
3. Unit tests: 15 cases covering validator (7 cases), examples (1 case), and handler (7 cases).
4. Integration tests: 3 cases covering end-to-end dispatch with default root, explicit root with `.bmadmcp` config, and malformed TOML warning propagation.
5. No regressions: pre-existing 1 failing test (dependency audit `node:async_hooks` in vendored clickup code) unchanged.
6. Build, lint (0 errors), and format all green.
7. No edits to `src/utils/`, `src/custom-skills/`, `package.json`, or `tests/unit/dependency-audit.test.ts`.
8. Commit prepared with Conventional Commits format.

### File List

**Modified**

- `src/tools/bmad-unified.ts` — add `resolve-doc-paths` to operation enum, description, schema, switch, and `BMADToolParams` type
- `src/tools/operations/index.ts` — re-export the new operation's surface
- `src/core/bmad-engine.ts` — add `resolveDocPaths(projectRoot)` and `getProjectRoot()` methods
- `src/core/resource-loader.ts` — add `getProjectRoot()` accessor

**Modified (conditional, per Task 6 / AC #15 / AC #17)**

- _Existing tool-description test file (if any)_ — add the description-content assertion case
- _Existing `tests/unit/core/bmad-engine.test.ts` (if any)_ — add the two `getProjectRoot` cases

**New**

- `src/tools/operations/resolve-doc-paths.ts` — the operation module (AC #1, #2, #3, #4, #9)
- `tests/unit/tools/operations/resolve-doc-paths.test.ts` — 15-case unit test (AC #12)
- `tests/integration/resolve-doc-paths.integration.test.ts` — 3-case integration test (AC #14)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Story drafted from EPIC-6 bullet 4 ("Add `resolve-doc-paths` operation to `src/tools/bmad-unified.ts` and `src/tools/operations/` + unit + integration tests") and Story 6.2 / 6.3 §Out of Scope. Status → ready-for-dev. |
| 2026-04-30 | Story implemented: added `resolve-doc-paths` operation, `BMADEngine.resolveDocPaths`, `getProjectRoot` accessors, 15 unit tests, 3 integration tests. All gates green. Status → review.                                   |
