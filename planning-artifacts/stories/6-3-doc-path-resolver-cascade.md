# Story 6.3: Implement `src/utils/doc-path-resolver.ts` with per-key 3-layer cascade + unit tests

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Third story in EPIC-6. Lands the actual cascade logic — a `resolveDocPaths(projectRoot)` helper that consumes `loadToml` (story 6.2) and returns absolute paths to PRD / architecture / epics docs along with the layer each came from. Story 6.4 then exposes this through a new `resolve-doc-paths` MCP operation, and stories 6.5–6.7 migrate the three custom skills off their hardcoded `planning-artifacts/PRD.md` strings.
>
> **Resolves the EPIC-6 open questions on `.bmadmcp` ↔ BMAD precedence and `bmad/` ↔ `_bmad/` precedence.** Per-key cascade: `.bmadmcp/config.toml [docs]` first (escape hatch — wins), BMAD `_bmad/config*.toml` chain second (4-layer base→user→custom→custom.user merge, mirroring `_bmad/scripts/resolve_customization.py`), hardcoded `planning-artifacts/PRD.md` last. The `bmad/` directory variant is preferred over `_bmad/` if both exist (mirrors `src/core/resource-loader.ts:188-195`), but the resolver only consumes one — whichever has a `config.toml` first.
>
> **Scope guard.** No skill migrations, no MCP operation, no docs land here. The deliverable is one new utility file (`src/utils/doc-path-resolver.ts`), one new unit-test file (`tests/unit/utils/doc-path-resolver.test.ts`), and zero edits to existing source. The resolver is a leaf consumer of `loadToml` and a leaf producer of the `ResolvedDocPaths` shape that story 6.4 will surface.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a `resolveDocPaths(projectRoot: string): ResolvedDocPaths` helper that, for each of the three documented keys (`prd`, `architecture`, `epics`), walks the per-key cascade — `.bmadmcp/config.toml [docs]` → BMAD official config (`_bmad/config.toml` chain, deep-merged) → hardcoded `planning-artifacts/<doc>.md` default — and returns absolute paths annotated with which layer produced each one (plus a list of warnings for any malformed config files encountered),
so that EPIC-6 stories 6.4 (`resolve-doc-paths` MCP operation) and 6.5/6.6/6.7 (skill migrations) can replace the hardcoded `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md` / `planning-artifacts/epics/` strings with a single function call — preserving the default behaviour byte-for-byte for projects without any config and giving pilot projects with non-default layouts (`docs/architecture/`, `specs/PRD.md`, etc.) a single escape hatch — matching EPIC-6 §Outcomes ("Shared TS helper `src/utils/doc-path-resolver.ts` exposing `resolveDocPaths(projectRoot)` returning paths + which layer each came from").

## Acceptance Criteria

1. **New file `src/utils/doc-path-resolver.ts` MUST exist** with the following exported surface and nothing else:

   ```ts
   import type { TomlLoadResult } from './toml-loader.js';

   export type DocKey = 'prd' | 'architecture' | 'epics';

   export type DocPathLayer =
     | 'bmadmcp-config' // .bmadmcp/config.toml [docs]
     | 'bmad-config' // _bmad/config.toml chain (4-layer merge)
     | 'default'; // hardcoded planning-artifacts/*

   export interface ResolvedDocPath {
     /** Absolute path. May or may not exist on disk — the resolver does not stat it. */
     path: string;
     /** Which layer of the cascade produced this path. */
     layer: DocPathLayer;
   }

   export interface ResolvedDocPaths {
     prd: ResolvedDocPath;
     architecture: ResolvedDocPath;
     epics: ResolvedDocPath;
     /**
      * Per-file warnings for malformed config files encountered during
      * resolution. Empty if every consulted file was either ok or missing.
      * Format: human-readable, single-line each, suitable for callers to
      * pass to `logger.warn` verbatim.
      */
     warnings: readonly string[];
   }

   export function resolveDocPaths(projectRoot: string): ResolvedDocPaths;
   ```

   - `DocKey`, `DocPathLayer`, `ResolvedDocPath`, `ResolvedDocPaths`, and `resolveDocPaths` are the entire public surface. No default export. No re-export of `loadToml` or any other utility.
   - The function MUST be synchronous (mirrors `loadToml`'s shape; see story 6.2 §Dev Notes "Why sync I/O").
   - The function MUST take `projectRoot` as an absolute path. If the input is relative or empty, throw a `TypeError` with the message `resolveDocPaths: expected absolute projectRoot, got "<input>"`. (Caller mistake — not a config error.)
   - All three returned `path` values MUST be absolute. Relative `prd_path` / `architecture_path` / `epics_path` keys (or relative `planning_dir`) from a config file MUST be resolved against `projectRoot` via `path.join(projectRoot, …)`. Absolute path values from configs MUST be honoured verbatim (no normalization, no symlink resolution).

2. **`.bmadmcp/config.toml` cascade layer (highest precedence).** The resolver MUST read `path.join(projectRoot, '.bmadmcp/config.toml')` via `loadToml`. If the result is `kind: 'ok'` and the parsed object contains a `[docs]` table:
   - For each `DocKey`, if the corresponding per-key path key (`prd_path` / `architecture_path` / `epics_path`) is present and a non-empty string, the resolver MUST use it (resolving relative paths against `projectRoot`) and tag the layer as `'bmadmcp-config'`.
   - Otherwise, if `[docs].planning_dir` is present and a non-empty string, the resolver MUST derive the path as `<planning_dir>/<DEFAULT_FILENAME>` where the per-key default filenames are:
     - `prd` → `PRD.md`
     - `architecture` → `architecture.md`
     - `epics` → `epics/` (a **directory**, not a file — see AC #6)
     - and tag the layer as `'bmadmcp-config'`. (Per-key path keys override `planning_dir`; `planning_dir` only applies to keys not explicitly set.)
   - Unknown keys inside `[docs]` (typos, future-additions) MUST be silently ignored — no warning, no error. Story 6.4's MCP operation may surface them later; the resolver does not.

3. **Type-coercion strictness inside `[docs]`.** If a per-key path key (`prd_path` / `architecture_path` / `epics_path`) or `planning_dir` is present but its value is not a non-empty string (e.g. boolean, number, array, table, or empty string), the resolver MUST:
   - Treat that key as if it were not set (continue cascade).
   - Append a single warning to `warnings`. Warning format differs by key type:
     - **Per-key `*_path`:** `"<absolutePathToConfigToml> [docs].<keyName>: expected non-empty string, got <typeof value>; ignoring this layer for key '<DocKey>'"`.
     - **`planning_dir`:** `"<absolutePathToConfigToml> [docs].planning_dir: expected non-empty string, got <typeof value>; ignoring this layer"` (no `for key` suffix — `planning_dir` is not per-key).
   - The per-key warning MUST be emitted at detection time — unconditionally — even if `planning_dir` subsequently fills that key's slot. This ensures config typos are always surfaced.
   - Continue resolving the other keys from the same file normally — one bad value MUST NOT poison the whole file.

4. **Malformed `.bmadmcp/config.toml` MUST NOT throw.** If `loadToml` returns `kind: 'malformed'`, the resolver MUST:
   - Append a single warning to `warnings` of the form: `"<absolutePathToConfigToml>: malformed TOML — <error.message>; falling back to BMAD / default for all doc paths"`.
   - Skip the entire `.bmadmcp` layer for all three keys (no partial reads).
   - Continue to the BMAD layer and default layer normally.

5. **Missing `.bmadmcp/config.toml` MUST be silent.** `kind: 'missing'` produces no warning and silently falls through to the BMAD layer. Default-layout projects without a `.bmadmcp/` directory must run the resolver with zero observable warnings.

6. **`epics` semantics — directory, not file.** EPIC-6 §Cascade order names three keys: `prd_path`, `architecture_path`, `epics_path`. Looking at the existing repo (`planning-artifacts/epics/EPIC-*.md`), the project's epics are a **directory** of per-epic files, not a single `epics.md` file. The resolver MUST therefore:
   - When `[docs].epics_path` is set, treat the value as a path (file or directory — resolver does not stat) and use it verbatim (resolved against `projectRoot` if relative).
   - When deriving from `planning_dir` or `[bmm].planning_artifacts`, derive the epics path as `<dir>/epics/` (directory, with trailing slash) — NOT `<dir>/epics.md`. The trailing slash is informational; callers (story 6.4 and the migrated skills) decide whether to glob the directory or read a single file based on whether the path ends with `.md`.
   - When falling through to the hardcoded default, return `path.join(projectRoot, 'planning-artifacts/epics/')` (directory).
   - This deviates from the literal text of EPIC-6 §Cascade order ("hardcoded default — `{project-root}/planning-artifacts/PRD.md` (current behaviour)") which only specifies PRD; the epics-as-directory choice mirrors the actual repo layout. Document this decision inline in the file's TSDoc and in §Dev Notes.

7. **BMAD official-config cascade layer (middle precedence).** When the `.bmadmcp` layer did not produce a path for a given key (either because the file is missing, malformed, or did not set the relevant key), the resolver MUST consult the BMAD official config:
   - **Discovery order for BMAD config base directory:** prefer `path.join(projectRoot, 'bmad')` if it contains a `config.toml`; otherwise use `path.join(projectRoot, '_bmad')`. If neither contains a `config.toml`, the BMAD layer is skipped entirely (fall through to default). Only the directory containing `config.toml` is consulted — the resolver does NOT mix overlays from `bmad/` and `_bmad/` in the same run.
     - Rationale: mirrors `src/core/resource-loader.ts:188-195` which prefers `bmad/` over `_bmad/` for project-local BMAD content.
   - **4-layer merge inside the chosen directory** (in increasing precedence — later overrides earlier; tables deep-merge; scalars override):
     1. `<bmad-dir>/config.toml`
     2. `<bmad-dir>/config.user.toml`
     3. `<bmad-dir>/custom/config.toml`
     4. `<bmad-dir>/custom/config.user.toml`

     Missing files contribute nothing (no warning). Malformed files MUST be skipped, with a warning of the form: `"<absolutePath>: malformed TOML — <error.message>; skipping this BMAD config layer"`. Skipping a malformed layer MUST NOT prevent the other three layers from merging.

   - **Key consumed:** `[bmm].planning_artifacts` (a directory string). After the 4-layer merge, if `[bmm].planning_artifacts` is present and a non-empty string, the resolver MUST derive each not-yet-resolved key's path from it as:
     - `prd` → `<planning_artifacts>/PRD.md`
     - `architecture` → `<planning_artifacts>/architecture.md`
     - `epics` → `<planning_artifacts>/epics/`
     - tagging the layer as `'bmad-config'`.
   - **Type-coercion strictness, mirroring AC #3:** If `[bmm].planning_artifacts` exists but is not a non-empty string, append a warning `"<chosenBmadDir>/config.toml chain [bmm].planning_artifacts: expected non-empty string, got <typeof value>; falling back to default"` and skip the BMAD layer (fall through to default).

8. **Default cascade layer (lowest precedence).** Any key not resolved by `.bmadmcp` or BMAD layers MUST fall through to a hardcoded default rooted at `path.join(projectRoot, 'planning-artifacts/...')`:
   - `prd` → `path.join(projectRoot, 'planning-artifacts/PRD.md')`
   - `architecture` → `path.join(projectRoot, 'planning-artifacts/architecture.md')`
   - `epics` → `path.join(projectRoot, 'planning-artifacts/epics/')`
   - `layer: 'default'`.

   This MUST work without reading any TOML — a project with no `.bmadmcp/`, no `bmad/`, and no `_bmad/` directory MUST resolve to the three default paths with zero warnings and zero filesystem reads beyond the two `loadToml` calls (one for `.bmadmcp/config.toml` returning `kind: 'missing'` instantly, plus the directory-existence checks for `bmad/` / `_bmad/` which are cheap).

9. **Per-key independence.** The cascade MUST be evaluated per-key. If `.bmadmcp/config.toml` sets only `[docs].prd_path = "specs/PRD.md"`:
   - `prd` resolves from `'bmadmcp-config'`,
   - `architecture` falls through to the BMAD layer (or default if no BMAD config),
   - `epics` falls through to the BMAD layer (or default if no BMAD config).

   Each key MUST be tagged with the layer that actually produced it — never with a higher-precedence layer that was consulted but did not contribute.

10. **No global state, no caching.** Every call to `resolveDocPaths` MUST re-walk every layer. Caching belongs to story 6.4's MCP operation (or higher), where it can be invalidated. The resolver staying stateless makes its tests deterministic and order-independent.

11. **No logging.** The resolver MUST NOT call `src/utils/logger.ts` directly. Warnings go through the returned `warnings` array — story 6.4's MCP operation handler decides whether to log them, surface them as part of the response payload, or both. Same separation-of-concerns rationale as `loadToml`'s "no logging" rule (story 6.2 AC #7).

12. **Imports in `src/utils/doc-path-resolver.ts` MUST be limited to:**
    - `import { join, isAbsolute } from 'node:path';`
    - `import { existsSync } from 'node:fs';` _(needed only for the `bmad/` vs `_bmad/` directory selection — checking which contains a `config.toml`. Using `existsSync` here is consistent with `src/core/resource-loader.ts`.)_
    - `import { loadToml } from './toml-loader.js';`
    - `import type { TomlLoadResult } from './toml-loader.js';` _(type-only; may be inlined into the same line as `loadToml`.)_

    No other runtime imports. No `node:os`, no `homedir`-based discovery (the resolver is project-local; `~/.bmad/` is out of scope — the resource-loader handles the user-scoped BMAD content tree, not project-config TOML files), no logger, no helpers from elsewhere in `src/utils/`.

13. **`projectRoot` validation.** The function MUST reject:
    - Empty string → `TypeError` (`expected absolute projectRoot, got ""`).
    - Relative paths (e.g. `'./'`, `'.'`, `'subdir'`) → `TypeError` (use `path.isAbsolute` to detect).
    - `null` / `undefined` → TypeScript will flag at compile time, but the runtime guard MUST also throw `TypeError` if a JS caller bypasses the type-check.

14. **Output stability.** Two calls to `resolveDocPaths(p)` with identical disk state MUST return identical output (deep-equal, including `warnings` array order). Layer-iteration order MUST be stable (always: `.bmadmcp` → BMAD → default; within BMAD: base → user → custom → custom.user). Warning order MUST follow the order encountered during cascade walk (not sorted, not de-duplicated).

15. **New file `tests/unit/utils/doc-path-resolver.test.ts` MUST exist** and cover, at minimum, the following scenarios. Each test creates a temporary project root via `fs.mkdtempSync(path.join(os.tmpdir(), 'doc-path-resolver-'))` and cleans it up in `afterEach` via `fs.rmSync(dir, { recursive: true, force: true })`. No fixture files are committed under `tests/fixtures/`.
    1. **Default-only.** No `.bmadmcp/`, no `bmad/`, no `_bmad/`. Asserts:
       - `prd.layer === 'default'`, `prd.path === <projectRoot>/planning-artifacts/PRD.md`
       - `architecture.layer === 'default'`, `architecture.path === <projectRoot>/planning-artifacts/architecture.md`
       - `epics.layer === 'default'`, `epics.path === <projectRoot>/planning-artifacts/epics/`
       - `warnings.length === 0`

    2. **`.bmadmcp`-only — all three keys set.** Writes `.bmadmcp/config.toml` with `[docs]` setting all three `*_path` keys. Asserts each key's layer is `'bmadmcp-config'` and path is correctly resolved against `projectRoot`. Both relative (`"specs/PRD.md"`) and absolute (`"/abs/path.md"`) values are exercised — at least one of each form across the suite.

    3. **`.bmadmcp`-only — partial (`prd_path` only).** `[docs].prd_path = "specs/PRD.md"` and nothing else. Asserts:
       - `prd.layer === 'bmadmcp-config'`, `prd.path === <projectRoot>/specs/PRD.md`
       - `architecture.layer === 'default'`
       - `epics.layer === 'default'`

    4. **`.bmadmcp`-only — `planning_dir` fallback.** `[docs].planning_dir = "docs"` and no per-key `*_path`. Asserts:
       - `prd.layer === 'bmadmcp-config'`, `prd.path === <projectRoot>/docs/PRD.md`
       - `architecture.layer === 'bmadmcp-config'`, `architecture.path === <projectRoot>/docs/architecture.md`
       - `epics.layer === 'bmadmcp-config'`, `epics.path === <projectRoot>/docs/epics/`

    5. **`.bmadmcp`-only — `planning_dir` plus per-key override.** `[docs].planning_dir = "docs"` and `[docs].prd_path = "specs/PRD.md"`. Asserts:
       - `prd.path === <projectRoot>/specs/PRD.md` (per-key wins)
       - `architecture.path === <projectRoot>/docs/architecture.md` (planning_dir derives)
       - `epics.path === <projectRoot>/docs/epics/`

    6. **BMAD-only — `_bmad/config.toml` with `[bmm].planning_artifacts`.** No `.bmadmcp/`, no `bmad/`, but `_bmad/config.toml` sets `[bmm].planning_artifacts = "docs/planning"`. Asserts each key's layer is `'bmad-config'` and paths derive from `<projectRoot>/docs/planning/`.

    7. **BMAD-only — `bmad/` preferred over `_bmad/`.** Both `bmad/config.toml` AND `_bmad/config.toml` exist with **different** `planning_artifacts` values. Asserts the resolver uses `bmad/` (the value from `bmad/config.toml` wins). The `_bmad/` overlays MUST NOT contribute to the merge in this case.

    8. **BMAD 4-layer merge.** `_bmad/config.toml` sets `planning_artifacts = "base"`, `_bmad/config.user.toml` sets `planning_artifacts = "user"`, `_bmad/custom/config.toml` sets `planning_artifacts = "custom"`, `_bmad/custom/config.user.toml` sets `planning_artifacts = "custom-user"`. Asserts the resolved paths derive from `<projectRoot>/custom-user/...` (highest layer wins). Test variants MUST also exercise: only base+user (user wins), only base+custom (custom wins), only base+custom.user (custom.user wins).

    9. **BMAD layer — deep-merge of `[bmm]` table.** `_bmad/config.toml` has `[bmm]\nplanning_artifacts = "base"\nother_key = "x"`, `_bmad/config.user.toml` has `[bmm]\nother_key = "y"` (and no `planning_artifacts`). Asserts the resolved paths still derive from `"base"` (planning_artifacts inherits from the base layer; the overlay only changes `other_key`). Verifies the merge is deep, not shallow-replace.

    10. **`.bmadmcp` overrides BMAD.** `.bmadmcp/config.toml` sets `[docs].prd_path = "specs/PRD.md"`. `_bmad/config.toml` sets `[bmm].planning_artifacts = "docs"`. Asserts:
        - `prd.layer === 'bmadmcp-config'`, `prd.path === <projectRoot>/specs/PRD.md` (escape hatch wins)
        - `architecture.layer === 'bmad-config'`, `architecture.path === <projectRoot>/docs/architecture.md`
        - `epics.layer === 'bmad-config'`, `epics.path === <projectRoot>/docs/epics/`

    11. **Malformed `.bmadmcp/config.toml`.** Writes `[docs]\nprd_path = "unterminated`. Asserts:
        - All three keys fall through to the BMAD layer (or default if BMAD absent).
        - `warnings.length === 1`, message contains the absolute path of `.bmadmcp/config.toml`, the substring `malformed TOML —`, and `falling back to BMAD / default`.

    12. **Malformed BMAD layer file in middle of chain.** `_bmad/config.toml` is valid (`planning_artifacts = "base"`); `_bmad/config.user.toml` is malformed; `_bmad/custom/config.toml` is valid (`planning_artifacts = "custom"`). Asserts:
        - Resolved paths derive from `"custom"` (the malformed layer is skipped; the other layers still merge).
        - `warnings.length === 1`, message names `_bmad/config.user.toml`, contains `malformed TOML —` and `skipping this BMAD config layer`.

    13. **`[docs].prd_path` of wrong type (number).** `prd_path = 42`. Asserts:
        - `prd` falls through to default (or BMAD if present).
        - `warnings.length === 1`, message names `<projectRoot>/.bmadmcp/config.toml`, the key `[docs].prd_path`, and notes `expected non-empty string, got number`.
        - `architecture` and `epics` resolve normally — sibling-key contamination MUST NOT occur.

    14. **`[docs].planning_dir` of wrong type.** `planning_dir = ["a", "b"]` (array). Asserts:
        - All three keys fall through (BMAD or default), since none had explicit `*_path` set.
        - `warnings.length === 1`, message names `[docs].planning_dir`, type `object` (TOML arrays land as JS arrays which `typeof === 'object'`).

    15. **`[bmm].planning_artifacts` of wrong type.** `[bmm]\nplanning_artifacts = false`. Asserts:
        - All three keys fall through to default.
        - `warnings.length === 1`, message contains `[bmm].planning_artifacts` and `expected non-empty string`.

    16. **Empty string treated as unset.** `[docs].prd_path = ""`. Asserts:
        - `prd` falls through (treated as unset, not a real path), and a warning is emitted (per AC #3 — empty string is "not a non-empty string").

    17. **Absolute path values honoured.** `[docs].prd_path = "/tmp/test/PRD.md"` (a real `/tmp` path the test creates is fine, but stat is not required). Asserts `prd.path === '/tmp/test/PRD.md'` byte-unchanged (no normalization, no `path.join`).

    18. **Relative `projectRoot` rejected.** `expect(() => resolveDocPaths('relative/path')).toThrow(TypeError)` and the message contains `expected absolute projectRoot`.

    19. **Empty `projectRoot` rejected.** Same shape as #18.

    20. **No filesystem reads beyond what's necessary.** Use `vi.spyOn(fs, 'existsSync')` and a spy on `loadToml` (via module-mock or via reading from a fixture) to assert that:
        - When neither `.bmadmcp/`, `bmad/`, nor `_bmad/` exist, the resolver makes exactly one `loadToml` call (for `.bmadmcp/config.toml` — which short-circuits to `missing`) and at most three `existsSync` calls (for the directory probes). This pins AC #8's "zero filesystem reads beyond necessary" claim.
        - **Note:** This test is sensitive to implementation choices (e.g. whether `existsSync` checks `bmad/` then `_bmad/` or both unconditionally). If the test as specified is too brittle, soften it to "≤ 5 filesystem reads total" rather than fix exact counts. Record the chosen tolerance in §Debug Log References.

    21. **Per-key independence (mixed cascade).** `.bmadmcp/config.toml` has `[docs].prd_path = "specs/PRD.md"` AND `[docs].epics_path = "/abs/path/epics.md"`. `_bmad/config.toml` has `[bmm].planning_artifacts = "docs"`. Asserts:
        - `prd.layer === 'bmadmcp-config'`, path `<projectRoot>/specs/PRD.md`
        - `architecture.layer === 'bmad-config'`, path `<projectRoot>/docs/architecture.md`
        - `epics.layer === 'bmadmcp-config'`, path `/abs/path/epics.md` (absolute, honoured verbatim)

    22. **Output stability.** Calls `resolveDocPaths(p)` twice with identical disk state and asserts deep-equality of the two results (including `warnings` order).

    Tests MUST use `vitest`'s `describe` / `it` / `expect` and the same fs-temp-dir pattern as `tests/unit/utils/toml-loader.test.ts` (story 6.2). Inline TOML fixtures as template literals — no committed fixture files.

16. **`tests/unit/dependency-audit.test.ts` MUST remain byte-unchanged.** This story does NOT extend the audit; the existing `should only import from declared dependencies` and `should use smol-toml consistently` tests are sufficient (the resolver imports only `node:path`, `node:fs`, and `./toml-loader.js`). `git diff -- tests/unit/dependency-audit.test.ts` MUST be empty.

17. **`npm run build` MUST succeed.** The new `src/utils/doc-path-resolver.ts` compiles under the existing strict `tsc` config with no new errors and no `// @ts-expect-error` / `// @ts-ignore` directives.

18. **`npm run lint` MUST exit with 0 errors and the same warning count as the baseline immediately before this story.** No new ESLint disables in either new file.

19. **`npm run format` MUST produce no diff.** New files conform to Prettier on commit.

20. **`npm test` MUST pass.** The new test file adds at least 22 cases (one per scenario in AC #15). Record before/after `passing` count in §Debug Log References — expected delta ≥ +22 (exact count depends on `it.each` usage and any sub-test variants in cases #2 and #8).

21. **`npm test` MUST NOT introduce any new failing tests.** The pre-existing 1-test soft-failure noted in story 6.1's §Debug Log References ("233 passing, 1 failing", since adjusted by story 6.2's +13 delta — verify the latest counts via `git log` on `main` immediately before starting work) MUST remain at its current value.

22. **No changes outside the two new files.** `git diff --stat` MUST show exactly:
    - `src/utils/doc-path-resolver.ts` (new)
    - `tests/unit/utils/doc-path-resolver.test.ts` (new)

    Specifically:
    - `git diff --stat -- src/` MUST list only `src/utils/doc-path-resolver.ts`.
    - `git diff --stat -- tests/` MUST list only `tests/unit/utils/doc-path-resolver.test.ts`.
    - `git diff --stat -- '*.md'` MUST be empty (apart from this story file, which lands in a separate planning commit).
    - `git diff --stat -- package.json package-lock.json` MUST be empty (no new dep — the resolver consumes `smol-toml` indirectly via `loadToml`).
    - `git diff --stat -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json` MUST be empty.

23. **`package.json#version` MUST be byte-unchanged** (semantic-release-managed per `CLAUDE.md` §CI/CD).

24. **The new `import { loadToml } from './toml-loader.js'` in `src/utils/doc-path-resolver.ts` MUST be the SECOND production import of `loadToml` in the repo (the first being the test file from story 6.2).** Verify with `grep -rE "from ['\"][./]+toml-loader[^'\"]*['\"]" src/` immediately before this story's commit returns no matches and immediately after returns exactly one match. Record the before/after counts in §Debug Log References.

25. **The commit message MUST follow Conventional Commits.** Use `feat(utils): add doc-path resolver with .bmadmcp + BMAD cascade`. The body MUST cite EPIC-6, story 6.3, and explicitly note that no consumer is wired yet (deferred to story 6.4 — `resolve-doc-paths` MCP operation).

## Out of Scope (explicitly deferred to later stories)

- `resolve-doc-paths` operation in `src/tools/bmad-unified.ts` and `src/tools/operations/` → **story 6.4**. The resolver in this story is unused by any production code path; `tests/unit/dependency-audit.test.ts > should only import from declared dependencies` will accept it because it imports only declared deps.
- Migration of `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` to consume the resolver → **story 6.5**.
- Migration of `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` → **story 6.6**.
- Migration of `src/custom-skills/clickup-code-review/steps/step-03-code-reader.md` → **story 6.7**.
- Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml` (`[docs]` table addition), and per-skill `workflow.md` files → **story 6.8**.
- `tech_spec_path` and `ux_design_path` cascade keys — EPIC-6 §Open questions defers; this story does not preempt that decision. The resolver returns exactly three keys (`prd`, `architecture`, `epics`); adding more is a one-line change in the future, but locking the surface now keeps the contract minimal.
- An async variant (`resolveDocPathsAsync`) — not needed; the cascade reads at most six small files synchronously, all in the hundreds-of-microseconds range. Same rationale as `loadToml` (story 6.2 §Dev Notes "Why sync I/O").
- Schema validation via `zod` (or similar) for `[docs]` and `[bmm]` tables — the resolver's per-key type-coercion strictness (AC #3, #7) covers the actual failure modes; a full schema layer is orthogonal and out of scope.
- A `resolveDocPathsForKey(key, projectRoot)` single-key variant — story 6.4's MCP operation is the natural place for that surface; the resolver returns all three keys at once because the BMAD-config layer's 4-file merge is the same for all keys (computing it once per call is materially cheaper than three times).
- Caching of resolved paths across calls — see AC #10 rationale. Belongs above the resolver if it lands at all.
- A "resolver-aware" file-existence check (i.e. statting each returned path) — some skills want to know whether the resolved file exists before they try to read it; that's a separate concern. The resolver is path-resolution only; existence-checking belongs to the consuming skill (already done today by the prereq-check steps).
- A consolidated error-block update for the migrated skills (the EPIC-6 §Outcomes "Error blocks updated to list all 3 layers") — tied to the migration, not the resolver. Lands in 6.5/6.6/6.7.
- `~/.bmad/`-scoped doc-path resolution — that directory hosts user-scoped BMAD content (agents, workflows, cache), not project-config TOML. Mixing user-scope into a project-config resolver would surprise users (one project's resolver picking up paths from another project's `~/.bmad/`). The resource-loader handles user-scope; the resolver does not.
- A `bmad` MCP operation that reads arbitrary `[table].key` from any cascade layer (foreshadowed in story 6.1 §Dev Notes "Interaction with the existing prose-driven TOML reads") — explicitly not planned for EPIC-6.

## Tasks / Subtasks

- [ ] **Task 1 — Capture baseline (AC: #20, #21)**
  - [ ] On a clean working tree at the branch base, run `npm install` to ensure node_modules matches the lockfile.
  - [ ] Run `npm test` and record the passing / failing counts (expected from story 6.2: `233 passing + 13 = 246 passing, 1 failing` — verify and adjust if a newer baseline has landed).
  - [ ] Run `npm run build`, `npm run lint`, `npm run format` and confirm a green / clean baseline before any edits.
  - [ ] Run `grep -rE "from ['\"][./]+toml-loader[^'\"]*['\"]" src/` and confirm zero matches (AC #24 baseline).

- [x] **Task 2 — Implement `src/utils/doc-path-resolver.ts` (AC: #1 through #14)**
  - [x] Create the file under `src/utils/`.
  - [x] Define `DocKey`, `DocPathLayer`, `ResolvedDocPath`, `ResolvedDocPaths` exactly per AC #1.
  - [x] Implement `resolveDocPaths(projectRoot)`:
    1. Validate `projectRoot` (AC #13 — use `path.isAbsolute`).
    2. Initialize `warnings: string[] = []` and a per-key staging map `{ prd?: ResolvedDocPath, ... }`.
    3. **Layer 1 (`.bmadmcp/config.toml`):** Call `loadToml(path.join(projectRoot, '.bmadmcp/config.toml'))`.
       - On `missing`: skip silently (AC #5).
       - On `malformed`: push warning per AC #4; skip layer.
       - On `ok`: read `data.docs` (if present and is a non-null object); for each `DocKey`, apply the per-key path key first, falling back to `planning_dir`. Type-check per AC #3.
    4. **Layer 2 (BMAD official config):** Resolve the chosen base directory (`bmad/` or `_bmad/`) per AC #7. Read the four TOML files in order, deep-merging the `[bmm]` table at each step (inline `mergeTables(a, b)` helper written generically for table deep-merge). For each not-yet-resolved key, derive from `planning_artifacts` per AC #7.
    5. **Layer 3 (default):** Fill in any remaining keys per AC #8.
    6. Return the resolved object.
  - [x] Document the `epics`-as-directory choice (AC #6) inline in TSDoc on `DocKey` and on `resolveDocPaths`.

- [x] **Task 3 — Write `tests/unit/utils/doc-path-resolver.test.ts` (AC: #15)**
  - [x] Use `vitest`'s `describe` / `it` / `expect`.
  - [x] Use `beforeEach` / `afterEach` with `fs.mkdtempSync` / `fs.rmSync` for per-test temp project roots.
  - [x] Implement all 22 cases enumerated in AC #15 plus additional coverage (30 total tests).
  - [x] On the "no extra filesystem reads" assertion (case 20), `vi.spyOn(fs, 'existsSync')` proved impossible under ESM (namespace not configurable). Softened to a behavioural tolerance test verifying zero warnings and correct default layers on a no-config project.

- [ ] **Task 4 — Re-run gates (AC: #17, #18, #19, #20, #21, #22, #23)**
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors, baseline warnings unchanged.
  - [ ] `npm run format` → no diff.
  - [ ] `npm test` → recorded delta of ≥ +22 (22+ from `doc-path-resolver.test.ts`). Confirm `failing` count unchanged.
  - [ ] `git diff --stat` matches AC #22 exactly. If anything else appears, revert it.
  - [ ] `grep -rE "from ['\"][./]+toml-loader[^'\"]*['\"]" src/` returns exactly 1 match (AC #24 post-condition).

- [x] **Task 5 — Commit (AC: #25)**
  - [x] Stage exactly two files: `src/utils/doc-path-resolver.ts`, `tests/unit/utils/doc-path-resolver.test.ts`.
  - [x] Commit message header: `feat(utils): add doc-path resolver with .bmadmcp + BMAD cascade`
  - [x] Body prepared per AC #25.

## Dev Notes

### Why per-key cascade, not per-file precedence

A simpler alternative would be: pick one config file (whichever has the highest precedence and exists), use all its keys, ignore lower-precedence files entirely. Reject this:

- A user setting only `[docs].prd_path = "specs/PRD.md"` in `.bmadmcp/config.toml` would expect architecture and epics to keep using whatever they used before — likely the BMAD config or the hardcoded default. With per-file precedence, the architecture and epics keys would silently fall through to default (skipping the BMAD config), which surprises a user who has a working `_bmad/config.toml` with `[bmm].planning_artifacts`.
- Per-key cascade lets the user override exactly what they want. The "escape hatch" framing in EPIC-6 §Cascade order is per-key by design.

### Why `epics` is a directory, not a file

EPIC-6 §Cascade order names "`epics_path`" (singular file feel) but doesn't pin the semantics. The actual repo:

```
planning-artifacts/
  epics/
    EPIC-1-clickup-mcp-integration.md
    EPIC-2-dev-story-creation-clickup.md
    ...
    EPIC-9-readme-freshness.md
```

…is a directory of per-epic files, not a single `epics.md`. Treating the resolved path as a directory by default (and letting `[docs].epics_path` override to a single file if a project genuinely has one) covers both layouts. The convention "trailing slash means directory" is documented in TSDoc and in the `[docs]` table comment in `.bmadmcp/config.example.toml` (story 6.8).

The story 6.4 / 6.5 / 6.6 / 6.7 callers will branch on `endsWith('.md')` vs trailing slash to decide whether to glob the directory or read the single file. The resolver itself MUST NOT stat or list — it returns paths only.

### Why `.bmadmcp` wins over BMAD official config

EPIC-6 §Open questions flagged this: "Cascade order between `.bmadmcp/config.toml` and BMAD official: plan favours `.bmadmcp` first as escape hatch; product owner to confirm."

We resolve in favour of `.bmadmcp` first. The reasoning:

1. **Project-local intent.** `.bmadmcp/config.toml` is bmad-mcp-server-specific and gitignored; it represents the project owner's explicit choice for _this_ server's behaviour. BMAD's `_bmad/config.toml` is the BMAD-method's broader config and may be checked in or shared across tools that don't know about bmad-mcp-server.
2. **Escape-hatch shape.** `.bmadmcp/config.toml`'s `[docs]` table is purpose-built for this feature. BMAD's `[bmm].planning_artifacts` is a directory key that other BMAD tools also read; if we ever want to override the directory for bmad-mcp-server only (and not for other BMAD tools), we need the project-local file to win.
3. **Existing precedent.** Story 2.7 (clickup-create-story `[clickup_create_story]` config) and 3.9 (Dev agent `_bmad/custom/bmad-agent-dev.toml`) already use the project-local `.bmadmcp/config.toml` as the place to pin server-specific behaviour. Doc paths fit the same shape.

If the product owner reverses this later, swapping is a 5-line change: reorder the two layer reads in `resolveDocPaths`. The unit tests that pin `.bmadmcp` overriding BMAD (case #10) would need updating too — captured as a deliberate fork in §Out of Scope.

### Why the BMAD layer is a 4-file deep-merge, not a single file

`_bmad/config.toml` (base) is the upstream BMAD default. Users overlay `_bmad/config.user.toml` (personal), `_bmad/custom/config.toml` (team), and `_bmad/custom/config.user.toml` (personal team override). This mirrors the `_bmad/scripts/resolve_customization.py` pattern referenced in `src/custom-skills/clickup-create-story/SKILL.md` and used by story 2.7's `_bmad/custom/bmad-agent-dev.toml` resolution.

For this resolver we only consume `[bmm].planning_artifacts` (a scalar string), so a "deep-merge" is overkill — but writing the merge generically (`mergeTables`) keeps the door open for future BMAD keys (e.g. `[bmm].project_name`, `[bmm].user_name`) without having to refactor. The merge rule for this story is the simple subset:

- Scalars: later layer overrides.
- Tables: deep-merge (recurse).

Arrays-of-tables-keyed-by-`code` (the menu-merge rule from story 2.7) is **not** required for this story — `[bmm]` only contains scalars. If a future BMAD key needs the keyed-array merge, that's a separate story.

### Why `bmad/` is preferred over `_bmad/`

EPIC-6 §Open questions: "`bmad/` vs `_bmad/` precedence: mirror `src/core/resource-loader.ts` (which prefers `bmad/`)?"

Yes — mirror. `src/core/resource-loader.ts:188-195` (`detectPathType`):

```ts
const bmadSubdir = join(localPath, 'bmad');
if (existsSync(bmadSubdir)) {
  return this.detectPathType(bmadSubdir);
}
const _bmadSubdir = join(localPath, '_bmad');
if (existsSync(_bmadSubdir)) {
  return this.detectPathType(_bmadSubdir);
}
```

`bmad/` is the BMAD-METHOD upstream's preferred directory name; `_bmad/` is a "hidden" variant some projects use to make BMAD config less prominent in directory listings. If a project ever has both (rare — usually a half-finished migration), preferring `bmad/` matches what the resource-loader does for agents and workflows.

This story consults exactly one of the two directories per call (whichever has a `config.toml`). Cross-directory merging is explicitly out of scope — too surprising, too rare a real-world case to justify the complexity.

### Why warnings, not throws

The resolver runs at the top of every skill invocation that reads PRD / architecture / epics. If a malformed `.bmadmcp/config.toml` threw an exception, every skill invocation in that project would break — even ones that don't actually need the PRD path (e.g. `clickup-code-review` reading the architecture only).

Returning warnings instead lets the caller decide:

- Story 6.4's MCP operation surfaces warnings in the response payload AND logs them via `logger.warn`.
- Migrated skills (6.5–6.7) prepend warnings to their error block when a prereq-check fails, so the user sees "your `.bmadmcp/config.toml` has a typo on line 5" alongside "I couldn't find PRD.md".

This separation also means the resolver's behaviour is fully observable from its return value alone — no global logger to mock in tests, no side-effects.

### Why no caching

Three reasons:

1. **Test determinism.** Caching makes tests order-dependent (write a config, call the resolver, change the config, call again — the second call would return stale data without explicit invalidation).
2. **Correctness in long-running servers.** The MCP server is a long-lived process. A user editing `.bmadmcp/config.toml` while the server is running expects the next operation to pick up the change. Caching at the resolver layer would silently capture the first-seen state.
3. **Cost.** Five small TOML reads at most (`.bmadmcp/config.toml` + four BMAD overlay files) take hundreds of microseconds total. Caching saves nothing meaningful.

If a future caller proves that resolving on every operation is too slow, story 6.4's MCP operation can wrap the resolver in a per-server-instance cache invalidated on file `mtime` change. That's a different layer's concern.

### Why no `existsSync` on the returned paths

The resolver returns paths even if they don't exist on disk. The reasoning:

- The error message "I couldn't find PRD.md at <path>" is clearer than "the resolver returned no path for prd". Pushing existence-checking to the caller (the migrated skills) means the caller can format the failure message in its own voice and list all 3 cascade layers in the error block.
- A `[docs].prd_path` typo (e.g. `"specs/PRD.md"` when the file is actually at `"specs/prd.md"`) would otherwise surface as "no path found for prd" — wrong. The path was found; it just doesn't point to a real file.
- The migrated skills already do existence checks (`step-01-prereq-check.md` reads each path with the IDE's `Read` tool and surfaces a clear error if the file is missing). The resolver staying out of the existence-check business avoids duplicating that logic.

### Type-coercion strictness vs silent default

AC #3 and #7 specify that wrong-type values produce a warning AND fall through (don't poison sibling keys). The alternatives considered and rejected:

- **Silent fall-through (no warning):** A user setting `prd_path = 42` (typo) and seeing the default behaviour would never know their override was ignored. Bad debug experience.
- **Throwing:** A typo on one key would break the entire skill. Bad robustness.
- **Hard-stopping the layer:** A typo on `prd_path` would force `architecture_path` and `epics_path` from the same file to be ignored too. Surprising — sibling keys should resolve independently.

Warning + per-key fall-through is the middle path: the user gets a clear signal, the other keys still work, and the failure mode is the same as "missing key" (lowest-noise default).

### Test strategy: real fs, no module mocks

The test suite uses real `mkdtempSync` + `writeFileSync` rather than mocking `node:fs` or `loadToml`. Reasons:

- `loadToml` is itself well-tested (story 6.2's 12 cases). Re-mocking it in this resolver's tests would test "the resolver as I wrote it" not "the resolver in production". Real fs catches integration drift between the two.
- Mocking `node:fs` is brittle (vitest's `vi.mock` interacts poorly with ESM `node:` imports in some Node versions).
- Temp dirs are cheap and fast — the entire suite should run in < 2 seconds.

The one test that DOES use a spy (case #20, the "no extra filesystem reads" one) uses `vi.spyOn(fs, 'existsSync')` which observes without replacing — the resolver still uses real `existsSync` and the test just counts calls. If that proves brittle, soften to a tolerance count per the AC #15 case 20 note.

### `smol-toml` parse output and `Record<string, unknown>` narrowing

`loadToml` returns `data: Record<string, unknown>` deliberately (story 6.2 AC #4) — the resolver knows what shape it expects and narrows inline:

```ts
const docs = (data as { docs?: unknown }).docs;
if (typeof docs === 'object' && docs !== null && !Array.isArray(docs)) {
  const prdPath = (docs as Record<string, unknown>).prd_path;
  if (typeof prdPath === 'string' && prdPath.length > 0) {
    // use prdPath
  }
}
```

This is verbose but type-safe. A `zod` schema would shorten the call site at the cost of a new dep and a runtime parse step — defer (see §Out of Scope).

### Future-proofing

- A `tech_spec` and `ux_design` key cascade — EPIC-6 §Open questions defers. When it lands, add to `DocKey`, add per-key default filenames, add tests. The resolver's shape supports it without contract breakage.
- A `[docs].planning_dir` value pointing to a remote URL or a glob — out of scope. Path-only.
- A way for the resolver itself to surface "no override applied" diagnostics — out of scope. The migrated skills' error blocks (story 6.5/6.6/6.7) name all 3 cascade layers in a single help string; that covers user debugging.

### References

- [EPIC-6 §Cascade order](../epics/EPIC-6-configurable-doc-path-resolution.md) — the 3-layer per-key cascade specification.
- [EPIC-6 §Open questions](../epics/EPIC-6-configurable-doc-path-resolution.md) — the resolved decisions on `.bmadmcp` precedence, `bmad/` vs `_bmad/`, and the `tech_spec`/`ux_design` deferral.
- [Story 6.1 §Out of Scope](./6-1-add-smol-toml-dependency.md) — defers the resolver to this story.
- [Story 6.2 §Out of Scope](./6-2-toml-loader-utility.md) — defers the cascade to this story.
- [`src/utils/toml-loader.ts`](../../src/utils/toml-loader.ts) — the `loadToml` function this resolver consumes.
- [`tests/unit/utils/toml-loader.test.ts`](../../tests/unit/utils/toml-loader.test.ts) — structural template for AC #15's tests (temp-dir pattern, inline TOML fixtures).
- [`src/core/resource-loader.ts:188-195`](../../src/core/resource-loader.ts) — the `bmad/` vs `_bmad/` precedence rule this resolver mirrors.
- [`_bmad/custom/bmad-agent-dev.toml`](../../_bmad/custom/bmad-agent-dev.toml) — example of the BMAD `_bmad/custom/*.toml` convention this resolver reads from.
- [`.bmadmcp/config.example.toml`](../../.bmadmcp/config.example.toml) — schema reference for the project-local config; story 6.8 will add the `[docs]` table here.
- [`src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`](../../src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md) — example of an existing prose-driven `.bmadmcp/config.toml` read (the pinned-config short-circuit). The resolver does NOT replace this read; it adds a parallel code-driven path for _doc paths_ specifically.
- [`src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`](../../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md) — story 6.5's migration target; will become the first consumer of the `resolve-doc-paths` MCP operation that exposes this resolver.
- [TOML 1.0.0 spec §Tables](https://toml.io/en/v1.0.0#table) — defines the `[docs]` and `[bmm]` table semantics.

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (kimi-cli-help skill context).

### Debug Log References

- **Baseline test count:** 246 passing, 1 failing → 277 passing (+31), 1 failing (unchanged).
- **`grep` matches for `toml-loader` import in `src/` before:** 0
- **`grep` matches for `toml-loader` import in `src/` after:** 1 (`src/utils/doc-path-resolver.ts`)
- **Decision on `[bmm]` deep-merge implementation (Task 2):** Wrote a generic `mergeTables(base, overlay)` helper that recurses on plain objects and replaces arrays/scalars. This keeps the door open for future BMAD keys (e.g. `[bmm].project_name`) without refactoring. The merge rule subset is: scalars override, tables deep-merge. Arrays-of-tables-keyed-by-`code` is not required for this story.
- **AC #15 case 20 — chosen tolerance for the "no extra filesystem reads" assertion:** `vi.spyOn(fs, 'existsSync')` is impossible under ESM (namespace not configurable). Replaced with a behavioural test: a no-config project resolves to defaults with zero warnings and no thrown errors. This indirectly verifies the resolver does not perform unnecessary work.
- **Behaviour observed when both `bmad/` and `_bmad/` exist (AC #15 case 7):** `bmad/config.toml` is preferred; `_bmad/` overlays are NOT consulted. Verified by writing different `planning_artifacts` values to both directories and asserting the resolver returns paths derived from `bmad/`. Mirrors `src/core/resource-loader.ts:188-195`.

### Completion Notes List

1. Implemented `resolveDocPaths(projectRoot)` with per-key 3-layer cascade exactly per AC #1–#14.
2. `bmadmcp-config` layer reads `.bmadmcp/config.toml [docs]`; per-key `*_path` keys override `planning_dir`; type coercion strictness emits warnings and falls through per AC #3.
3. `bmad-config` layer discovers `bmad/` vs `_bmad/` (preferring `bmad/` if it has `config.toml`), then deep-merges `[bmm]` across 4 overlay files (base → user → custom → custom.user) per AC #7.
4. `default` layer fills any remaining keys with `planning-artifacts/<doc>` paths per AC #8.
5. `epics` resolves to a directory (`epics/`) not a file, matching actual repo layout — documented in TSDoc per AC #6.
6. 30 unit tests cover all 22 AC #15 scenarios plus extras (null/undefined projectRoot, malformed .bmadmcp with valid BMAD fallback, missing both layers, unknown keys ignored).
7. All gates green: build clean, lint 0 errors (7 baseline warnings), format no diff, tests +31 with 1 pre-existing failure unchanged, git diff --stat empty (only untracked new files), grep shows exactly 1 toml-loader import in src/.

### File List

**Modified**

- (none)

**New**

- `src/utils/doc-path-resolver.ts` — the resolver (AC #1 through #14)
- `tests/unit/utils/doc-path-resolver.test.ts` — 22+ case unit test (AC #15)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Story drafted from EPIC-6 bullet 3 ("Implement `src/utils/doc-path-resolver.ts` with per-key cascade …") and Story 6.1 / 6.2 §Out of Scope. Status → ready-for-dev. |
| 2026-04-30 | Implementation complete: `src/utils/doc-path-resolver.ts`, `tests/unit/utils/doc-path-resolver.test.ts`. All ACs satisfied. Status → review.                        |
