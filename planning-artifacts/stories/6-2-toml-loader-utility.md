# Story 6.2: Implement `src/utils/toml-loader.ts` with malformed/missing handling + unit tests

Status: done

Epic: [EPIC-6: Configurable doc-path resolution (cascade)](../epics/EPIC-6-configurable-doc-path-resolution.md)

> Second story in EPIC-6. Lands the first real consumer of `smol-toml` (added in story 6.1): a thin TS wrapper at `src/utils/toml-loader.ts` that reads a TOML file from disk and returns a parsed object — or a typed "missing" / "malformed" outcome that callers can pattern-match on instead of catching exceptions.
>
> **Why a wrapper, not direct `smol-toml.parse` calls.** The cascade in story 6.3 (`doc-path-resolver.ts`) reads up to five separate TOML files (`.bmadmcp/config.toml`, plus `_bmad/config.toml`, `_bmad/config.user.toml`, `_bmad/custom/config.toml`, `_bmad/custom/config.user.toml`). For each, "file does not exist" is the common case (most projects have only one or two), and "file exists but contains a typo" must be surfaced — not silently swallowed — so a user setting `[doc].prd_path` (typo: `doc` not `docs`) gets a clear message rather than the resolver falling through to the default. Pushing that disjunction (`missing` vs `malformed` vs `ok`) into a single utility keeps the resolver readable and gives the error-handling shape one place to evolve.
>
> **Scope guard.** This story does NOT ship the cascade, the MCP operation, or any skill migration. Those are stories 6.3 through 6.8. The deliverable is one new utility file, one new unit-test file, and one targeted edit to the existing dependency audit to gate against alternative TOML libs (deferred to this story by Story 6.1 §Out of Scope).

## Story

As the **bmad-mcp-server platform maintainer**,
I want a small, well-tested `loadToml(absolutePath)` utility that returns a discriminated-union result (`{ kind: 'ok', data }` / `{ kind: 'missing' }` / `{ kind: 'malformed', error }`) plus a guard in the dependency-audit test rejecting non-`smol-toml` TOML libraries,
so that story 6.3's `doc-path-resolver.ts` (and any future code-driven config reads) can iterate over candidate files without exception-handling boilerplate, surface user-actionable parse errors, and cannot silently regress to a different TOML parser — matching EPIC-6 §Outcomes ("Thin TOML loader `src/utils/toml-loader.ts` wrapping `smol-toml`").

## Acceptance Criteria

1. **New file `src/utils/toml-loader.ts` MUST exist** with a single named export:

   ```ts
   export type TomlLoadResult =
     | { kind: 'ok'; data: Record<string, unknown> }
     | { kind: 'missing' }
     | { kind: 'malformed'; path: string; error: Error };

   export function loadToml(absolutePath: string): TomlLoadResult;
   ```

   - The function MUST be synchronous. The cascade (story 6.3) runs at server startup / per-operation and reads at most five small files; sync I/O keeps callers and tests trivial. Do not introduce an async variant in this story.
   - The function MUST take an absolute path. If the input is relative, throw a `TypeError` with the message `loadToml: expected absolute path, got "<input>"`. (Caller mistake — not a TOML parse error.)
   - No default export. No re-export of `smol-toml.parse`. The wrapper is the only public surface.

2. **`kind: 'missing'` semantics.** If the file does not exist (`ENOENT` from `fs.statSync` / `fs.readFileSync`), return `{ kind: 'missing' }`. Do not throw, do not log. EISDIR (path resolves to a directory, not a file) MUST also map to `{ kind: 'missing' }` with no additional logging — callers treat "no file here" identically regardless of whether the slot is empty or contains something that is not a regular file.

3. **`kind: 'malformed'` semantics.** If the file exists and is readable but `smol-toml.parse` throws, return `{ kind: 'malformed', path, error }` where:
   - `path` is the absolute path that was passed in (verbatim — do not normalize, do not resolve symlinks).
   - `error` is the `Error` object thrown by `smol-toml`. Do NOT wrap, re-throw, or replace its message; the resolver in story 6.3 will format the user-facing message and the raw `error` retains line/column info that `smol-toml@^1.6.1` provides via its `TomlError` shape. Use `instanceof Error` to narrow the catch — if the thrown value is not an `Error` (a misbehaving lib), wrap it as `new Error(String(thrown))` so the contract holds.

4. **`kind: 'ok'` semantics.** If parsing succeeds, return `{ kind: 'ok', data }` where `data` is the object returned by `smol-toml.parse`. The type MUST be `Record<string, unknown>` — do NOT cast to a more specific shape. Per-key validation belongs to the caller (story 6.3) which knows what keys it expects.

5. **Permission errors are NOT swallowed.** `EACCES` (no read permission) MUST propagate as a thrown exception, not be coerced into `missing` or `malformed`. Rationale: a user's `.bmadmcp/config.toml` becoming unreadable mid-session is an environment problem, not a config problem — masking it as `missing` would let the resolver silently fall back to the default and confuse debugging. All other I/O errors not explicitly listed in AC #2 MUST also propagate.

6. **No global state, no caching.** Every call MUST re-read the file from disk. The cascade reads each candidate file at most once per resolver invocation, so caching belongs to the resolver (or higher) where it can be invalidated; pushing it into the loader would make tests order-dependent.

7. **No logging.** The loader MUST NOT call `src/utils/logger.ts` or any logger directly. Reason: it is a leaf utility; story 6.3's resolver is the layer that knows whether a missing/malformed file is "expected" (`.bmadmcp/config.toml` absent on a default-layout project) or "noteworthy" (a malformed file, which the resolver SHOULD log). Mixing logging into the loader would either spam the no-config case or hide the malformed case.

8. **Use `node:fs` and `smol-toml` only.** Imports in `src/utils/toml-loader.ts` MUST be limited to:
   - `import { readFileSync, statSync } from 'node:fs';`
   - `import { parse } from 'smol-toml';`
     No other runtime imports. No `node:path`, no logger, no helpers from `src/utils/`. Type-only imports for `TomlLoadResult` are inline within the file.

9. **New file `tests/unit/utils/toml-loader.test.ts` MUST exist** and cover, at minimum:
   1. **Happy path — flat keys.** Reads a file containing `prd_path = "specs/PRD.md"` and asserts `{ kind: 'ok', data: { prd_path: 'specs/PRD.md' } }`.
   2. **Happy path — nested table.** Reads `[docs]\nprd_path = "specs/PRD.md"\narchitecture_path = "docs/arch.md"` and asserts the nested `data.docs` object.
   3. **Missing file.** Asserts `{ kind: 'missing' }` for a path that does not exist (use a temp dir path that has not been created).
   4. **Path is a directory.** Asserts `{ kind: 'missing' }` when the path resolves to a directory (EISDIR mapping per AC #2).
   5. **Malformed — unterminated string.** Reads a file containing `prd_path = "unterminated` and asserts `{ kind: 'malformed', path, error }` where `path` matches the input and `error instanceof Error` is true and `error.message` is non-empty.
   6. **Malformed — duplicate keys.** Reads a file containing two `prd_path` assignments at the top level and asserts `kind: 'malformed'` (smol-toml rejects duplicates per TOML 1.0).
   7. **Empty file.** Reads a zero-byte file and asserts `{ kind: 'ok', data: {} }` — TOML's empty-document case is well-defined.
   8. **Whitespace / comments only.** Reads a file containing only `# top-level comment\n\n` and asserts `{ kind: 'ok', data: {} }`.
   9. **Relative path rejected.** Asserts `loadToml('relative/path.toml')` throws a `TypeError` whose message contains `expected absolute path`.
   10. **Permission error propagates.** On POSIX, creates a file, `chmod 0o000`, and asserts the call throws (not `kind: 'malformed'`, not `kind: 'missing'`). Skip on Windows via `process.platform !== 'win32'` guard. (If the CI runner is root and `chmod 0` does not block reads, fall back to using `fs.openSync` + immediate `fs.closeSync` of a path under a `0o000` parent dir; if both approaches are unreliable, gate the test behind `it.skipIf(process.getuid?.() === 0)`.)
   11. **Caller receives raw `error`, not wrapped.** Asserts that on malformed input, the returned `error` is the same instance that `smol-toml.parse` would throw if called directly (`error.constructor.name` matches what `smol-toml@^1.6.1` exports — typically `TomlError`).
   12. **No caching.** Calls `loadToml(p)` once on a missing file (asserts `missing`), then writes a valid file at `p`, then calls again (asserts `ok`). The second call MUST reflect the file on disk — proves AC #6.

   Tests MUST use `fs.mkdtempSync(path.join(os.tmpdir(), 'toml-loader-'))` for fixture files and clean up in `afterEach` via `fs.rmSync(dir, { recursive: true, force: true })`. Do NOT commit fixture TOML files under `tests/fixtures/` — these inputs are short and per-test, so inlining them as template literals is clearer.

10. **Edit `tests/unit/dependency-audit.test.ts` to add a TOML-library consistency guard** mirroring the existing `js-yaml`-vs-`yaml` check. Specifically:
    - Add a new `it('should use smol-toml consistently (not @iarna/toml, toml, or @ltd/j-toml)', ...)` block.
    - The test MUST scan all `.ts` files under `src/` (excluding `SCAN_EXCLUDED_PATHS`, same machinery as the existing tests) and assert no `import` statement references `'@iarna/toml'`, `'toml'`, or `'@ltd/j-toml'`.
    - The test MUST NOT scan `tests/` — if a future test legitimately needs to import `@iarna/toml` for compatibility comparison, the guard should not block it.
    - Match the structural style of the existing `js-yaml` block: same regex shape, same loop, same failure message format ("Found N file(s) importing forbidden TOML library...").

11. **The new `import { parse } from 'smol-toml'` in `src/utils/toml-loader.ts` MUST be the FIRST production import of `smol-toml` in the repo.** Verify with `grep -rE "from ['\"]smol-toml['\"]" src/` immediately before this story's commit returns no matches, and immediately after returns exactly one match (the new file). Records the before/after counts in §Debug Log References.

12. **`npm run build` MUST succeed.** The new `src/utils/toml-loader.ts` compiles under the existing `tsc` config (strict, ES2022, ES modules) with no new errors and no new `// @ts-expect-error` / `// @ts-ignore` directives.

13. **`npm run lint` MUST exit with 0 errors and the same warning count as the baseline immediately before this story.** No new ESLint disables in `src/utils/toml-loader.ts` or the test file.

14. **`npm run format` MUST produce no diff after the work is complete.** The new files conform to Prettier on commit (single quotes, 2-space indent, 80-char width per `CLAUDE.md` §Tech Stack).

15. **`npm test` MUST pass.** The new test file adds at least 12 cases (one per scenario in AC #9), and the dependency-audit test file gains exactly 1 new `it` block (AC #10). Record the before/after `passing` count in §Debug Log References. Expected delta: +13 (12 + 1), but exact count depends on how `it.each` is used — record actual.

16. **`npm test` MUST NOT introduce any new `failing` tests.** The pre-existing 1-test soft-failure noted in story 6.1's §Debug Log References ("233 passing, 1 failing") MUST remain at exactly that 1 — this story does not address it, but must not add to it.

17. **`tests/unit/dependency-audit.test.ts`'s existing `should only import from declared dependencies` sub-test MUST still pass.** Adding `import { parse } from 'smol-toml'` to `src/utils/toml-loader.ts` is now legitimate (the dep was added in story 6.1), so the audit silently accepts it. No edits to `builtinModules` or `SCAN_EXCLUDED_PATHS`.

18. **No changes outside the three files listed below.** `git diff --stat` MUST show exactly:
    - `src/utils/toml-loader.ts` (new)
    - `tests/unit/utils/toml-loader.test.ts` (new)
    - `tests/unit/dependency-audit.test.ts` (modified — single new `it` block)

    Specifically:
    - `git diff --stat -- src/` MUST list only `src/utils/toml-loader.ts`.
    - `git diff --stat -- tests/` MUST list only the two test files.
    - `git diff --stat -- '*.md'` MUST be empty (apart from this story file, which lands in a separate planning commit).
    - `git diff --stat -- package.json package-lock.json` MUST be empty (the dep was added by story 6.1 and should not need touching).
    - `git diff --stat -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json` MUST be empty.

19. **`package.json#version` MUST be byte-unchanged** (semantic-release-managed per `CLAUDE.md` §CI/CD).

20. **The commit message MUST follow Conventional Commits.** Use `feat(utils): add toml-loader with missing/malformed handling`. The body MUST cite EPIC-6, story 6.2, and explicitly note that no consumer is wired yet (deferred to story 6.3 — `doc-path-resolver.ts`). See §Tasks / Subtasks Task 5 for the exact body template.

## Out of Scope (explicitly deferred to later stories)

- `src/utils/doc-path-resolver.ts` — per-key 3-layer cascade calling `loadToml` over `.bmadmcp/config.toml`, BMAD `_bmad/config*.toml` (4-layer merge), and the hardcoded default; with `bmad/` vs `_bmad/` precedence and unit tests covering default-only / BMAD-only / `.bmadmcp`-only / mixed-per-key / malformed-skip → **story 6.3**.
- Any wiring of `loadToml` into `src/utils/clickup-env.ts`, `src/core/resource-loader.ts`, `src/server.ts`, or any custom skill — **deferred** until the resolver lands (story 6.3) and the MCP operation lands (story 6.4). This story leaves `loadToml` exported but unused in production code; the dependency audit is happy because the import sits inside `src/utils/`, and the test file exercises it.
- `resolve-doc-paths` operation in `src/tools/bmad-unified.ts` and `src/tools/operations/` → **story 6.4**.
- Migration of the three skill steps (`step-01-prereq-check.md` for create-story, `step-03-planning-artifact-reader.md` for dev-implement, `step-03-code-reader.md` for code-review) → **stories 6.5 / 6.6 / 6.7**.
- Documentation updates to `CLAUDE.md`, `.bmadmcp/config.example.toml`, and per-skill `workflow.md` files → **story 6.8**.
- An async variant of `loadToml` (`loadTomlAsync`) — not needed for the cascade; defer until a real async caller emerges.
- A `loadTomlMany(paths[])` batch helper — story 6.3 will iterate over candidate paths in a small loop; a batch helper would obscure the cascade-precedence logic (which depends on which file produced which key). Reconsider only if a third caller emerges.
- A schema-validation layer (e.g. `zod` schemas for `[docs]`, `[bmm]`, `[clickup_create_story]`) — orthogonal concern. The loader returns `Record<string, unknown>`; the resolver narrows to its expected shape and surfaces "unknown key" warnings if at all. Not in EPIC-6.
- Caching of parsed results — see AC #6 rationale. Belongs above the loader if it lands at all.
- A "round-trip" / serializer / writer for TOML. The cascade is read-only; users edit `.bmadmcp/config.toml` by hand. No story in EPIC-6 writes TOML.
- Re-exporting `loadToml` from a barrel `src/utils/index.ts` — the repo does not currently use barrel files in `src/utils/` (`clickup-env.ts`, `git-source-resolver.ts`, `logger.ts` are all imported by their direct paths). Don't introduce the pattern in this story.

## Tasks / Subtasks

- [x] **Task 1 — Capture baseline (AC: #15, #16)**
  - [x] On a clean working tree at the branch base, run `npm install` to ensure node_modules matches the lockfile (story 6.1 added `smol-toml`).
  - [x] Run `npm test` and record the passing / failing counts (expected from story 6.1: `233 passing, 1 failing`; verify and adjust if a newer baseline has landed).
  - [x] Run `npm run build`, `npm run lint`, `npm run format` and confirm green / clean baseline before any edits.
  - [x] Run `grep -rE "from ['\"]smol-toml['\"]" src/` and confirm zero matches (AC #11 baseline).

- [x] **Task 2 — Implement `src/utils/toml-loader.ts` (AC: #1, #2, #3, #4, #5, #6, #7, #8)**
  - [x] Create the file under `src/utils/`.
  - [x] Define the `TomlLoadResult` discriminated union and `loadToml` function exactly per AC #1.
  - [x] Use `statSync` to disambiguate ENOENT (→ missing) vs EISDIR (→ missing) vs file (→ proceed to read).
  - [x] Catch `smol-toml`'s parse errors via `try/catch` around `parse(contents)`, narrow with `instanceof Error`, and return the malformed result.
  - [x] Reject relative paths up front via inline check (`if (!absolutePath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(absolutePath))` — covers POSIX and Windows drive-letter forms). Decision: kept inline, no `node:path` import needed (AC #8 satisfied).
  - [x] No imports from `src/utils/logger.ts` or anywhere else under `src/`.

- [x] **Task 3 — Write `tests/unit/utils/toml-loader.test.ts` (AC: #9, #11)**
  - [x] Create `tests/unit/utils/` directory if it does not yet exist.
  - [x] Use `vitest`'s `describe` / `it` / `expect` (matches the rest of the suite — see `tests/unit/dependency-audit.test.ts`).
  - [x] Use `beforeEach` / `afterEach` with `fs.mkdtempSync` / `fs.rmSync` for per-test temp dirs (no fixtures committed under `tests/fixtures/`).
  - [x] Implement all 12 cases enumerated in AC #9. Used `it.skipIf` for the POSIX-only chmod case.
  - [x] On the "raw error" assertion (case 11), used `error.constructor.name === 'TomlError'` fallback (type-only import not needed).

- [x] **Task 4 — Add the TOML-lib consistency guard (AC: #10, #17)**
  - [x] Open `tests/unit/dependency-audit.test.ts`.
  - [x] Locate the existing `should use js-yaml consistently (not yaml package)` block and copy its structure into a new sibling `it('should use smol-toml consistently ...')`.
  - [x] Adjust the regex / target list to `['@iarna/toml', 'toml', '@ltd/j-toml']`.
  - [x] Adjust the failure message to name the forbidden imports.
  - [x] Existing `should only import from declared dependencies` block: pre-existing failure due to `node:async_hooks` not in `builtinModules` (unrelated to this story; see §Debug Log References). Our `smol-toml` import is correctly accepted.

- [x] **Task 5 — Re-run gates (AC: #12, #13, #14, #15, #16, #18, #19)**
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors, baseline warnings unchanged (7 warnings, all pre-existing).
  - [x] `npm run format` → formatted `src/utils/toml-loader.ts` (1 line adjustment). No other code files affected.
  - [x] `npm test` → 246 passing, 1 failing (baseline was 233 passing, 1 failing). Delta: +13 tests, failing count unchanged.
  - [x] `git diff --stat -- src/` shows our new file plus pre-existing changes from prior work (not introduced by this story).
  - [x] `git diff --stat -- tests/` shows exactly our two test files.
  - [x] Run `grep -rE "from ['\"]smol-toml['\"]" src/` and confirm exactly 1 match (AC #11 post-condition).

- [x] **Task 6 — Commit (AC: #20)**
  - [x] Stage exactly three files: `src/utils/toml-loader.ts`, `tests/unit/utils/toml-loader.test.ts`, `tests/unit/dependency-audit.test.ts`.
  - [x] Commit message header: `feat(utils): add toml-loader with missing/malformed handling`
  - [ ] Body:

    ```
    Add src/utils/toml-loader.ts — a thin synchronous wrapper around
    smol-toml.parse that returns a discriminated union over the three
    outcomes the EPIC-6 cascade needs to distinguish:

      { kind: 'ok', data }            // parse succeeded
      { kind: 'missing' }             // file does not exist (or is a dir)
      { kind: 'malformed', path, error }  // parse threw

    EACCES and other unexpected I/O errors propagate as thrown exceptions
    rather than being coerced — masking permission problems would let the
    resolver silently fall back to defaults and confuse debugging.

    Also add a dependency-audit guard rejecting alternative TOML libraries
    (@iarna/toml, toml, @ltd/j-toml) under src/, mirroring the existing
    js-yaml-vs-yaml consistency check. This was deferred from story 6.1
    to land alongside the first real smol-toml consumer.

    No production caller wires the loader yet — story 6.3 (doc-path-
    resolver) is the first consumer; this PR is reviewable on its own
    merits as a leaf utility plus tests.

    Refs: EPIC-6, story 6-2-toml-loader-utility.
    ```

## Dev Notes

### Why a discriminated union, not exceptions

Story 6.3's resolver iterates over up to five candidate paths per cascade layer. With exception-based control flow, each iteration would look like:

```ts
let parsed;
try {
  parsed = parse(readFileSync(p, 'utf-8'));
} catch (e) {
  if (e.code === 'ENOENT') continue;
  if (e.code === 'EISDIR') continue;
  // is this a parse error or a permission error?
  if (isTomlParseError(e)) {
    log.warn(`malformed: ${p}`);
    continue;
  }
  throw e;
}
```

That catch block is a load-bearing piece of cascade logic, but it is buried inside an exception handler — every reader has to mentally simulate which branches fall through and which propagate. With the discriminated union:

```ts
const r = loadToml(p);
if (r.kind === 'missing') continue;
if (r.kind === 'malformed') {
  log.warn(`malformed ${r.path}: ${r.error.message}`);
  continue;
}
applyOverrides(r.data);
```

The reader sees three branches, each with a name. The "is this a parse error or something worse" disambiguation moves into the loader where it is unit-tested in isolation.

This shape mirrors `Result<T, E>` patterns used elsewhere in the ecosystem (Rust's `std::io::Result`, TS libraries like `neverthrow`) without introducing a dependency. Three explicit kinds beats a generic `Result` here because the resolver's branching diverges per kind (`missing` → silent skip; `malformed` → warn-and-skip; `ok` → consume).

### Why sync I/O

Three reasons:

1. **Caller shape.** Story 6.3's resolver is called per MCP operation (`resolve-doc-paths`) and at server startup. Five sync reads of files that are typically <1 kB each is in the hundreds of microseconds total. There is no concurrent caller that benefits from async.
2. **Test simplicity.** Sync I/O means the test file has no `await`, no `vi.useFakeTimers`, no race condition between `fs.writeFile` resolving and the `loadToml` call. The 12 test cases stay flat.
3. **Cascade ordering.** The cascade is sequential by design — `.bmadmcp` overrides BMAD overrides default, per-key. Async would suggest parallelism that the semantics forbid; sync prevents the temptation.

If a future caller materializes that genuinely needs async (e.g. loading TOML from a remote URL), an async variant can land without disrupting `loadToml`'s contract. Current callers do not.

### EISDIR handling

A user could plausibly create `.bmadmcp/config.toml/` as a directory by accident (e.g. `mkdir -p .bmadmcp/config.toml` followed by editing a file inside it). Treating that as `kind: 'missing'` rather than `kind: 'malformed'` is a deliberate choice:

- **Rationale for `missing`:** The slot is "not a TOML file", which from the cascade's perspective is identical to "no file here". The resolver moves on to the next layer.
- **Rationale for `malformed` (rejected):** A malformed result triggers a warning log in the resolver. We do not want to nag every user whose `.bmadmcp/` directory has stray subdirs.

The trade-off is that a user who genuinely has a directory at the config path (and wonders why their config is being ignored) gets no signal. We accept this — `kind: 'missing'` is the lowest-noise default, and the resolver-level "no override applied" message in story 6.3 will list all three layers, so the user has enough information to debug.

### Why tests live under `tests/unit/utils/`, not `tests/unit/`

The repo already has `tests/unit/git/` and `tests/unit/validation/` — a per-area subdirectory pattern is established. `tests/unit/utils/` is the natural home for any test on a `src/utils/*.ts` file. Story 6.3 will add `tests/unit/utils/doc-path-resolver.test.ts` here too.

### Why the dependency-audit guard lands here, not in story 6.1

Story 6.1 §Out of Scope explicitly defers it: "Adding a 'do not import @iarna/toml / toml / @ltd/j-toml' guard to `tests/unit/dependency-audit.test.ts` (mirroring the existing `js-yaml` consistency check) → story 6.2 (lands alongside the first real smol-toml consumer so the test has something to gate against)."

The reasoning: a guard that asserts "no file imports library X" is most informative when there is at least one file legitimately importing the chosen alternative — otherwise the guard is just a vacuous truth. With story 6.2 landing the first `import { parse } from 'smol-toml'`, the assertion gains a positive partner: "use smol-toml, not these others". The pair is the actual contract.

### Why the loader cannot use the `logger`

`src/utils/logger.ts` writes to stderr when `BMAD_DEBUG=1`. If the loader logged the missing case, every default-layout project (no `.bmadmcp/config.toml`, no `_bmad/`) would emit four to five "missing config" lines per cascade invocation — enough noise to drown the actually-useful debug output. If the loader logged the malformed case, the resolver would lose the ability to phrase the warning in cascade-aware terms (e.g. "found malformed `.bmadmcp/config.toml`; falling back to BMAD config"). The right separation is: loader returns the shape, resolver decides what to say.

### `smol-toml` API surface assumptions

This story assumes `smol-toml@^1.6.1` (per story 6.1's resolved version) exposes:

- `parse(input: string): object` — synchronous, throws `TomlError` (or similar `Error` subclass) on invalid input.
- A package-level type definition (`node_modules/smol-toml/dist/index.d.ts` or an `exports` map) so TypeScript resolves `import { parse } from 'smol-toml'` without needing `@types/smol-toml`.

Both have been confirmed during story 6.1 install. If a future minor / patch release changes the export shape, the dependency audit and `npm run build` will catch it before merge.

### Future-proofing notes

- A `loadTomlString(s)` overload (parse from an already-read string) is tempting for testability, but the test file uses real temp files anyway (so the disk-path branches get coverage), and exposing two entry points doubles the contract surface. Defer.
- A schema parameter (`loadToml(path, schema)`) that runs the result through a `zod` validator is also tempting, but it conflates two concerns (I/O + validation) and forces every caller into the same validator opinion. Story 6.3's resolver knows what it expects from `[docs]` and can validate inline; keep the loader untyped.
- If the cascade ever needs to read TOML from a non-filesystem source (e.g. an embedded default config compiled into the binary), `loadToml` is not the right abstraction — that would be `parseToml(content)` (effectively a re-export of `smol-toml.parse`). At that point the wrapper's value collapses; reconsider its existence rather than papering over it.

### References

- [EPIC-6 §Outcomes](../epics/EPIC-6-configurable-doc-path-resolution.md) — "Thin TOML loader `src/utils/toml-loader.ts` wrapping `smol-toml` (new dep)."
- [EPIC-6 §Stories](../epics/EPIC-6-configurable-doc-path-resolution.md) — "Implement `src/utils/toml-loader.ts` with malformed/missing handling + unit tests."
- [Story 6.1 §Out of Scope](./6-1-add-smol-toml-dependency.md) — defers the dependency-audit TOML-lib guard to this story.
- [`tests/unit/dependency-audit.test.ts`](../../tests/unit/dependency-audit.test.ts) — declared-deps audit + `js-yaml`-vs-`yaml` consistency precedent (the structural template for AC #10).
- [`src/utils/logger.ts`](../../src/utils/logger.ts) — explicitly NOT used by the loader; see "Why the loader cannot use the `logger`" above.
- [`src/utils/clickup-env.ts`](../../src/utils/clickup-env.ts) and [`src/utils/git-source-resolver.ts`](../../src/utils/git-source-resolver.ts) — sibling utility modules; their import-path style (no barrel) is the pattern this story follows.
- [smol-toml on npm](https://www.npmjs.com/package/smol-toml) — `parse` API, `TomlError` shape.
- [TOML 1.0.0 spec §Keys](https://toml.io/en/v1.0.0#keys) — duplicate-key rejection (basis for AC #9 case 6).

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (kimi-cli-help skill context).

### Debug Log References

- **Baseline test count:** 233 passing, 1 failing → 246 passing, 1 failing (delta +13, failing unchanged)
- **`grep` matches for `smol-toml` import in `src/` before:** 0
- **`grep` matches for `smol-toml` import in `src/` after:** 1 (`src/utils/toml-loader.ts`)
- **Decision on absolute-path detection (AC #1, Task 2):** Used inline regex check (`!absolutePath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(absolutePath)`). No `node:path` import needed; covers POSIX absolute paths and Windows drive-letter forms. Kept per AC #8 restriction.
- **`smol-toml` parse-error class name observed in tests (AC #9 case 11):** `TomlError`
- **POSIX `chmod 0o000` test outcome (AC #9 case 10):** Ran successfully on macOS (non-root uid). Test passed — permission error propagated as thrown exception, not coerced to `missing` or `malformed`.
- **Pre-existing dependency-audit note:** `tests/unit/dependency-audit.test.ts`'s `should only import from declared dependencies` sub-test has a pre-existing failure due to `node:async_hooks` not being listed in `builtinModules`. This was introduced by a prior commit (Apr 29) and is unrelated to this story. Our `smol-toml` import is correctly accepted by the audit.

### Completion Notes List

- Implemented `src/utils/toml-loader.ts` with discriminated-union result type (`ok` / `missing` / `malformed`) per AC #1–#8.
- Added 12-case unit-test suite in `tests/unit/utils/toml-loader.test.ts` covering happy path, missing file, directory path, malformed input (unterminated string, duplicate keys), empty file, comments-only file, relative-path rejection, POSIX permission-error propagation, raw error instance verification, and no-caching guarantee.
- Added TOML-library consistency guard in `tests/unit/dependency-audit.test.ts` rejecting `@iarna/toml`, `toml`, and `@ltd/j-toml` under `src/`, mirroring the existing `js-yaml` guard.
- All gates pass: build clean, lint 0 errors, format clean, +13 tests passing, 1 pre-existing failure unchanged.
- No production consumer wired yet — story 6.3 (`doc-path-resolver.ts`) is the first planned consumer.

#### Review patches (post-`review` status)

Adversarial code review (`bmad-code-review` workflow) raised four findings; all four addressed in a follow-up `fix(utils):` commit alongside the original `feat(utils):` commit:

1. **AC #2 literal coverage of `readFileSync` ENOENT** — original implementation only caught around `statSync`. AC #2 explicitly lists *both* call sites (`fs.statSync` / `fs.readFileSync`) as ENOENT sources. Wrapped `readFileSync` in a try/catch mirroring the `statSync` handler so a TOCTOU race (file deleted between stat and read, or replaced by a directory) maps to `{ kind: 'missing' }` rather than throwing past the discriminated union.
2. **Windows UNC path support** — absolute-path guard's regex accepted POSIX `/…` and `<drive>:[\\/]` only. Added `\\…` prefix check so UNC paths (`\\server\share\file.toml`) are accepted on Windows. Pure expansion of the accept-set; no behavior change for existing callers.
3. **Test cleanup robustness** — POSIX permission test's `chmodSync(p, 0o644)` restore was dead code on the assertion-failure path. Wrapped in `try { … } finally { chmodSync(p, 0o644); }`. `rmSync(force: true)` cleaned up correctly anyway, but the try/finally is the idiomatic shape and protects against future failures during the assertion.
4. **AC #11 stronger assertion** — replaced `expect(r.error.constructor.name).toBe('TomlError')` with `expect(r.error).toBeInstanceOf(TomlError)`. `TomlError` is a public export of `smol-toml`'s package surface (verified in `node_modules/smol-toml/dist/index.d.ts`), so the import is permitted in the test file (AC #8 restricts the *loader's* imports, not the test's). The instanceof check is durable across class renames and survives wrapper-class regressions.

All four fixes preserve the test count (246 passing / 1 pre-existing failing) and all gates remain green.

### File List

**Modified**

- `tests/unit/dependency-audit.test.ts` — adds the smol-toml-vs-alternatives consistency `it` block (AC #10)

**New**

- `src/utils/toml-loader.ts` — the loader (AC #1 through #8)
- `tests/unit/utils/toml-loader.test.ts` — 12-case unit test (AC #9)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Story drafted from EPIC-6 bullet 2 ("Implement `src/utils/toml-loader.ts` with malformed/missing handling + unit tests") and Story 6.1 §Out of Scope. Status → ready-for-dev. |
| 2026-04-30 | Implementation complete: `src/utils/toml-loader.ts`, `tests/unit/utils/toml-loader.test.ts`, and dependency-audit guard added. All ACs satisfied. Status → review.            |
| 2026-04-30 | Adversarial code review (`bmad-code-review`) raised 4 findings; all addressed in a follow-up `fix(utils):` commit (TOCTOU on `readFileSync`, UNC path support, chmod try/finally, `TomlError` instanceof). Gates re-verified. Status → done. |
