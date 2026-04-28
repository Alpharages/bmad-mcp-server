# Story 1.1: Vendor hauptsacheNet/clickup-mcp source into src/tools/clickup/

Status: done

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Merges EPIC-1 bullets 1 + 2 (vendor source + record SHA) into one atomic operation — you cannot record a SHA without vendoring it.

## Story

As the **bmad-mcp-server platform maintainer**,
I want the upstream `hauptsacheNet/clickup-mcp` source tree vendored into `src/tools/clickup/` with LICENSE preserved and the pinned commit SHA recorded in `VENDOR.md` at the repo root,
so that subsequent stories in EPIC-1 can wire the ClickUp `register*Tools` functions into the MCP bootstrap (1.3), add env-var handling (1.4), and smoke-test the integration (1.6–1.7) — all without depending on an npm package we don't control and without drifting from a known upstream baseline.

## Acceptance Criteria

1. Directory `src/tools/clickup/` exists and contains upstream's **source files** at a single pinned commit. Specifically: upstream's `src/` tree copied verbatim under `src/tools/clickup/src/`, plus `LICENSE` at `src/tools/clickup/LICENSE`, plus `README.md` at `src/tools/clickup/README.md` for attribution. No upstream source file is modified.
2. Upstream tooling/config files are **excluded** from the vendor: no `.github/`, no upstream `tsconfig.json`, no upstream `package.json` / `package-lock.json` / `yarn.lock`, no `.eslintrc*`, no `.prettierrc*`, no `scripts/`, no `dist/`, no `build/`, no `node_modules/`, no `.git/`. The rationale for each exclusion category is recorded in `VENDOR.md`.
3. `VENDOR.md` exists at the repo root and records:
   - Upstream repo URL: `https://github.com/hauptsacheNet/clickup-mcp`
   - Pinned commit SHA (full 40-char hash)
   - Upstream branch the SHA came from (typically `main`)
   - Date vendored (ISO-8601)
   - License (MIT, per upstream)
   - What was vendored (upstream `src/`, `LICENSE`, `README.md`) and what was deliberately excluded (see AC #2)
   - Upstream's declared runtime dependencies copied from upstream's `package.json` (name + version range) — so story 1.3 knows what to add to our root `package.json`
   - Upgrade procedure: re-run the vendor command from a newer SHA, update this file, commit as `chore(clickup): bump vendored SHA → <new-short-sha>`
4. `.gitignore` is updated so vendored files are actually tracked: add negation rule `!src/tools/clickup/**` at the end of the file. The repo-wide `src/**/*.js` rule (line 18) would otherwise silently drop any `.js` files upstream ships, breaking AC #1.
5. `npm run build` passes. If tsc errors originate inside `src/tools/clickup/`, add `"src/tools/clickup/**"` to `tsconfig.json#exclude` — do NOT modify vendored source. Wiring happens in story 1.3.
6. `npm run lint` and `npm run format` do NOT touch the vendored tree. Append `src/tools/clickup/` to `.eslintignore` and `.prettierignore`.
7. `npm test` passes (no regressions; no new tests in this story).
8. No edits to anything under `BMAD-METHOD/`.

## Out of Scope (explicitly deferred to later stories)

- Wiring `register*Tools` functions into `src/server.ts` → **story 1.3**.
- Env-var loading/validation for `CLICKUP_API_KEY` / `CLICKUP_TEAM_ID` → **story 1.4**.
- Interactive space picker → **story 1.5**.
- Smoke tests against a real ClickUp workspace → **stories 1.6, 1.7**.
- README / CHANGELOG entries announcing the tool surface → **story 1.8**.
- Fixing any TypeScript / ESM import-extension mismatches in vendored code (upstream likely uses bare `./foo` imports; our convention is `.js` extensions). This is story 1.3's problem and is why we exclude the vendored tree from tsc here.

## Tasks / Subtasks

- [x] **Task 1 — Resolve and record the upstream SHA (AC: #1, #3)**
  - [x] `SHA=$(git ls-remote https://github.com/hauptsacheNet/clickup-mcp.git HEAD | cut -f1)` — capture the 40-char SHA from the default branch.
  - [x] Confirm the default branch name: `git ls-remote --symref https://github.com/hauptsacheNet/clickup-mcp.git HEAD | head -1` (expect `main`).
  - [x] Record SHA, branch, today's ISO-8601 date for `VENDOR.md`.

- [x] **Task 2 — Vendor the scoped source tree (AC: #1, #2)**
  - [x] Shallow-clone the pinned SHA into a scratch directory outside the repo:
    ```bash
    mkdir -p /tmp/clickup-mcp-vendor
    git clone --depth 1 https://github.com/hauptsacheNet/clickup-mcp.git /tmp/clickup-mcp-vendor/repo
    (cd /tmp/clickup-mcp-vendor/repo && git fetch --depth 1 origin "$SHA" && git checkout "$SHA")
    ```
    _(GitHub does not support `git archive --remote`, so shallow clone + checkout is the reliable path.)_
  - [x] Copy **only** these paths into `bmad-mcp-server/src/tools/clickup/`:
    - `src/` → `src/tools/clickup/src/`
    - `LICENSE` → `src/tools/clickup/LICENSE`
    - `README.md` → `src/tools/clickup/README.md`
  - [x] Do NOT copy anything else. If upstream lacks a `src/` dir (e.g. flat layout), pause and report — the story's vendor shape needs revision before proceeding.
  - [x] From upstream's `package.json`, extract the `dependencies` block verbatim and paste it into `VENDOR.md` under "Upstream runtime dependencies" — story 1.3 will reconcile these against our root `package.json`.
  - [x] Remove the scratch clone: `rm -rf /tmp/clickup-mcp-vendor`.

- [x] **Task 3 — Make our tooling skip the vendored tree (AC: #4, #5, #6)**
  - [x] Append to `.gitignore`: `!src/tools/clickup/**` (negation must come _after_ the existing `src/**/*.js` rule to override it).
  - [x] Append `src/tools/clickup/` to `.eslintignore` AND add `'src/tools/clickup/**'` to the `ignores` array in `eslint.config.mjs`. Both are required: ESLint 9 runs flat-config (`eslint.config.mjs`) which no longer honors `.eslintignore` (deprecation warning otherwise), so the flat-config entry is what actually satisfies AC #6. The `.eslintignore` entry is kept as a documentary breadcrumb.
  - [x] Append `src/tools/clickup/` to `.prettierignore`.
  - [x] Run `npm run build`. If tsc emits errors from inside `src/tools/clickup/`, add `"src/tools/clickup/**"` to `tsconfig.json#exclude`. Leave `tsconfig.json#include` as `["src/**/*"]` untouched.
  - [x] Re-run `npm run build`, `npm run lint`, `npm run format` — all pass, none touch the vendored tree.

- [x] **Task 4 — Author `VENDOR.md` (AC: #3)**
  - [x] Create `VENDOR.md` at the repo root with sections: Upstream, Pinned SHA, Branch, Date vendored, License, What was vendored, What was excluded (and why), Upstream runtime dependencies, Upgrade procedure.
  - [x] Fill all fields from Task 1 and Task 2.

- [x] **Task 5 — Verify regression-free (AC: #7, #8)**
  - [x] `npm test` passes (existing unit + integration suites unchanged, allowing for the dep-audit adaptation below). _(Completion Notes: one pre-existing failure — `node:http` missing from dep-audit builtin list — confirmed present on baseline `e6cdae7`, not a regression.)_
  - [x] `tests/unit/dependency-audit.test.ts` may be extended with a `VENDORED_PATHS` exclusion so the audit skips `src/tools/clickup/**`. AC #7 (tests pass) otherwise collides with the dep-audit's recursive scan of `src/**/*.ts`, which would flag upstream's imports of `zod`, `fuse.js`, `remark-gfm`, `remark-parse`, `unified`, and `buffer` — none of which are declared in our root `package.json` until Story 1.3. Scope is limited to adding the exclusion; no other test logic changes.
  - [x] `git status --porcelain` shows only: new files under `src/tools/clickup/**`, new `VENDOR.md`, and modifications limited to `.gitignore`, `.eslintignore`, `.prettierignore`, `tsconfig.json` (if needed), `eslint.config.mjs` (per Task 3 flat-config adaptation), and `tests/unit/dependency-audit.test.ts` (per the `VENDORED_PATHS` adaptation above). Any other modified path = stop and investigate.
  - [x] `git diff --stat -- BMAD-METHOD/` prints nothing.
  - [x] `git diff --stat -- src/server.ts src/tools/bmad-unified.ts src/tools/operations/ src/index.ts src/index-http.ts src/config.ts` prints nothing.

- [x] **Task 6 — Commit (AC: all)**
  - [x] Stage `.gitignore`, `.eslintignore`, `.prettierignore`, `tsconfig.json` (if modified), `VENDOR.md`, and `src/tools/clickup/**` — in that order so lint-staged sees the ignore-file updates before the vendored tree. _(Also staged `eslint.config.mjs` and `tests/unit/dependency-audit.test.ts` per the adaptations.)_
  - [x] Commit with: `feat(clickup): vendor hauptsacheNet/clickup-mcp@<short-sha>` (commitlint has no scope restriction; `clickup` is accepted). _(Commit: `f5bd256` on `feat/http-docker-deployment`.)_
  - [x] Commit body: upstream URL, full SHA, vendored date, one-line summary of what was and wasn't vendored.

## Dev Notes

### Vendoring posture

- **No git subtree.** It imports upstream history into this repo and complicates future re-vendoring.
- **No npm dependency.** PRD §Customization boundary and EPIC-1's "no edits to BMAD-METHOD source" posture both imply local, modifiable control of the ClickUp source tree.
- **No edits to vendored source in this story.** All ESM / TypeScript adaptation happens in story 1.3.

### Why the tooling-file exclusions (AC #2) matter

- Upstream `package.json` at `src/tools/clickup/package.json` would be picked up by Node's `package.json` lookup walk (nearest-ancestor wins). Our server code would unknowingly resolve against upstream's `type`, `dependencies`, and `exports` fields — silent breakage.
- Upstream `.github/` workflows would run in our CI if GitHub Actions picks them up (it does — any `.github/workflows/*.yml` under the repo root triggers). Keeping them out prevents phantom CI jobs.
- Upstream `.eslintrc`, `.prettierrc`, `tsconfig.json` would collide with ours via nearest-config discovery.

### The `.gitignore` trap (AC #4)

Line 18 of the current `.gitignore` is:

```
src/**/*.js
```

Rationale upstream (our repo): "TS sources only — never commit compiled JS under src/." But the vendored tree is _upstream's_ source and may include `.js` / `.cjs` / `.mjs` files (config shims, etc.). Without the negation rule, `git add src/tools/clickup/` silently drops them and we ship a broken vendor. Verify after Task 3 with:

```bash
git check-ignore -v src/tools/clickup/**/*.js
```

No output = tracked (good). Any output listing line 18 = the negation didn't take; re-check rule order.

### After vendoring, inventory upstream's tool surface

Once `src/tools/clickup/README.md` is in place, skim it to identify the `register*Tools` functions upstream exports. Story 1.3 will need this inventory to wire them into `src/server.ts`. Not a task here — just a heads-up so you know what's coming.

### Commit-hook interaction

`.husky/pre-commit` runs `npx lint-staged`. `lint-staged` in `package.json` applies `eslint --fix` + `prettier --write` to staged `*.{ts,js,mjs,json,md,yml,yaml}` files. Because Task 3 updates `.eslintignore` and `.prettierignore` _before_ staging the vendored tree, both tools will skip the vendored paths. If you stage in the wrong order, the hook will rewrite vendored files and break AC #1.

### Build system interaction

`tsconfig.json` currently has `include: ["src/**/*"]`, so tsc sees the vendored tree by default. Two paths, in order of preference:

1. **Exclude the vendored tree**: add `"src/tools/clickup/**"` to `tsconfig.json#exclude`. Story 1.3 will introduce the adapter layer that imports the register functions with the correct module shape.
2. **Leave it included** only if `npm run build` already passes cleanly — unlikely given strict mode + ESM + `.js`-extension convention mismatch with upstream.

Do not silence tsc with broader `skipLibCheck` settings or `// @ts-nocheck` pragmas in vendored files. If tsc still errors after excluding the tree, stop and report — something else is wrong.

### Testing standards

- No new tests in this story. Vendoring is inert until story 1.3 wires it in.
- Existing `npm test` (= `vitest run tests/unit tests/integration`) must pass unchanged.
- `vitest.config.ts` scans only `tests/**/*.{test,spec}.ts`, so any upstream test files that land under `src/tools/clickup/src/` will not execute in our suite. No action needed.

### Project Structure Notes

- `src/tools/` currently holds `bmad-unified.ts`, `index.ts`, `operations/`. Adding `clickup/` as a sibling is consistent with the flat-by-tool layout.
- `VENDOR.md` lives at repo root — it's a project-level attribution ledger, discoverable next to `README.md`, `CHANGELOG.md`, and the project `LICENSE`.

### References

- [EPIC-1 §Outcomes bullet 1](../epics/EPIC-1-clickup-mcp-integration.md) — defines vendor target, LICENSE preservation, `VENDOR.md` SHA recording.
- [EPIC-1 §Exit criteria](../epics/EPIC-1-clickup-mcp-integration.md) — `VENDOR.md records upstream SHA and date vendored`; `No edits to BMAD-METHOD source`.
- [PRD §Non-functional requirements — License compliance](../PRD.md) — MIT LICENSE preservation; SHA tracking in `VENDOR.md`.
- [PRD §Customization boundary](../PRD.md) — upstream sources are read-only to us; all customization lands in separate layers.
- Current `.gitignore` line 18 (`src/**/*.js`) — origin of the tracking hazard called out in AC #4.
- Current `tsconfig.json` `include: ["src/**/*"]` — origin of the build hazard addressed in Task 3.
- `commitlint.config.cjs` — no `scope-enum` rule, so `feat(clickup): ...` is accepted.
- Upstream: `https://github.com/hauptsacheNet/clickup-mcp` (MIT).

## Dev Agent Record

### Agent Model Used

`claude-opus-4-7` (Amelia, BMM dev agent)

### Debug Log References

- Build: `npm run build` → tsc clean after adding `src/tools/clickup/**` to `tsconfig.json#exclude`.
- Lint: `npm run lint` → 2 errors + 7 warnings in `src/http-server.ts` and `tests/support/litellm-helper.mjs` — all pre-existing on baseline `e6cdae7` (verified by stashing vendor work and re-running). None originate from vendored tree.
- Format: `npm run format` reformats any out-of-scope file that doesn't match prettier; those were restored via `git checkout --` to keep AC #5 scope clean (see Completion Notes).
- Tests: `npm test` → 194/195 passing. Single failure (`src/http-server.ts imports 'node:http' which is not in package.json`) is pre-existing on baseline, not a regression.
- Gitignore negation verified: `git check-ignore -v src/tools/clickup/__gitignore_probe.js` reports `.gitignore:98:!src/tools/clickup/**` → `.js` files in vendor tree are trackable.

### Completion Notes List

**Vendor pin**

- SHA: `c79b21e3f77190a924ef8e2c9ba3dd8088369e17`
- Branch: `main`
- Date: `2026-04-21`
- Upstream license: MIT (preserved at `src/tools/clickup/LICENSE`).
- Upstream runtime deps captured in `VENDOR.md`: `@modelcontextprotocol/sdk@1.15.1`, `fuse.js@^7.1.0`, `remark-gfm@^4.0.1`, `remark-parse@^11.0.0`, `unified@^11.0.5`, `zod@^3.24.2`. Story 1.3 reconciles these.
- Vendor tree verified byte-identical to upstream for sampled files (e.g. `src/tools/clickup/src/index.ts` diffed clean against `raw.githubusercontent.com/...@<SHA>/src/index.ts`).

**Adaptation #1 — ESLint flat config**

- Task 3 says "Append `src/tools/clickup/` to `.eslintignore`." Done as instructed, but this repo runs ESLint 9 with flat config (`eslint.config.mjs`), which no longer honors `.eslintignore` (the tool emits a deprecation warning on every run). To actually satisfy AC #6 ("lint does NOT touch the vendored tree"), `src/tools/clickup/**` was added to the `ignores` array in `eslint.config.mjs`. The `.eslintignore` entry is kept as a documentary breadcrumb consistent with the story's instruction.

**Adaptation #2 — dep-audit test (user-approved)**

- `tests/unit/dependency-audit.test.ts` recursively scans `src/**/*.ts` for undeclared imports. Vendored tree imports `zod`, `fuse.js`, `remark-gfm`, `remark-parse`, `unified`, `buffer` — none declared in our `package.json` (wiring is Story 1.3's scope per Out-of-Scope). AC #7 (tests pass) collided with AC / Task 5 (suites unchanged). User approved Option #1: extend the test with a `VENDORED_PATHS` exclusion mirroring the tsconfig / eslint / prettier exclusions. Both `it` blocks now skip vendored trees.

**Adaptation #3 — out-of-scope prettier reformats reverted**

- `npm run format` (= `prettier --write .`) reformatted seven unrelated repo files that were already non-compliant on baseline: `CLAUDE.md`, `README.md`, `docker-compose.yml`, `src/core/resource-loader.ts`, `src/http-server.ts`, `src/server.ts`, `src/tools/bmad-unified.ts`. AC #5 requires empty diff for `src/server.ts` and `src/tools/bmad-unified.ts` specifically, so all seven were restored via `git checkout --` to keep scope surgical. These files remain pre-existing prettier debt, orthogonal to this story.

**Final git status (expected, AC-aligned)**

- Modified: `.eslintignore`, `.gitignore`, `.prettierignore`, `eslint.config.mjs`, `tests/unit/dependency-audit.test.ts`, `tsconfig.json`
- Untracked (new): `VENDOR.md`, `src/tools/clickup/` (33 files)
- Untracked (pre-existing, unrelated): `BMAD-METHOD.code-workspace`, `planning-artifacts/`
- `git diff -- BMAD-METHOD/`: empty (AC #8 ✓)
- `git diff -- src/server.ts src/tools/bmad-unified.ts src/tools/operations/ src/index.ts src/index-http.ts src/config.ts`: empty (Task 5 ✓)

**Story-ahead heads-up for Story 1.3**

- Upstream `src/tools/clickup/src/index.ts` exports the registration surface Story 1.3 will wire into `src/server.ts`. The `README.md` lists the full tool/resource catalog.
- Upstream uses bare relative imports (`./foo`, no `.js` extension). Our ESM convention requires `.js` extensions. This is why we excluded the tree from tsc here — Story 1.3's adapter layer handles the translation.
- Dep-audit test will need the six vendor deps plus `buffer`/`node:buffer` (Node builtin currently missing from the test's builtin list) by the time 1.3 wires the register calls in — or the vendor-path exclusion in the test stays in place.

### File List

**Modified**

- `.eslintignore` — added `src/tools/clickup/` entry (documentary; see Adaptation #1)
- `.gitignore` — added `!src/tools/clickup/**` negation after `src/**/*.js` rule
- `.prettierignore` — added `src/tools/clickup/` entry
- `eslint.config.mjs` — added `src/tools/clickup/**` to flat-config `ignores` array (Adaptation #1)
- `tests/unit/dependency-audit.test.ts` — added `VENDORED_PATHS` exclusion for vendor trees (Adaptation #2, user-approved)
- `tsconfig.json` — added `"src/tools/clickup/**"` to `exclude` array

**New**

- `VENDOR.md` — vendoring ledger (upstream, SHA, branch, date, license, what vendored, what excluded, upstream runtime deps, upgrade procedure)
- `src/tools/clickup/LICENSE` — MIT, upstream
- `src/tools/clickup/README.md` — upstream attribution + tool surface inventory
- `src/tools/clickup/src/` — 31 `.ts` files verbatim from upstream at `c79b21e3`

## Change Log

| Date       | Change                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Vendored `hauptsacheNet/clickup-mcp@c79b21e3` into `src/tools/clickup/`; authored `VENDOR.md`.    |
| 2026-04-21 | Configured tsc / eslint / prettier / dep-audit to skip vendored tree. Status → review.            |
| 2026-04-21 | Committed as `f5bd256` on `feat/http-docker-deployment` — `feat(clickup): vendor ...@c79b21e`.    |
| 2026-04-21 | Code review run (bmad-code-review) — 1 decision-needed, 6 patch, 5 defer, 5 dismissed. See below. |
| 2026-04-21 | Decision resolved (spec body amended); all 6 patches applied. Status → done.                      |

### Review Findings

Review of commit `f5bd256` on `feat/http-docker-deployment` (scope: 245-line non-vendor diff + sampled byte-identity check on 11 vendored files against upstream SHA `c79b21e3` — all OK).

- [x] [Review][Decision] **Task 3/Task 5 scope drift self-authorized by dev** — RESOLVED via Option 2: spec body amended. Task 3 now explicitly requires both the `.eslintignore` entry and the `eslint.config.mjs` flat-config ignore (necessary under ESLint 9). Task 5 now explicitly allow-lists `eslint.config.mjs` and `tests/unit/dependency-audit.test.ts` as in-scope modifications, with the `VENDORED_PATHS` dep-audit adaptation called out in its own sub-bullet. Spec and implementation now agree.

- [x] [Review][Patch] Add `'**/src/tools/clickup/**'` to `vitest.config.ts#test.exclude` — applied.
- [x] [Review][Patch] Add `'**/src/tools/clickup/**'` to `vitest.config.ts#coverage.exclude` — applied.
- [x] [Review][Patch] Add a pre-commit guard blocking edits to `src/tools/clickup/**` — applied to `.husky/pre-commit`. Bypass for the documented upgrade procedure via `ALLOW_VENDOR_EDIT=1 git commit ...`; `VENDOR.md` upgrade procedure updated to reference the bypass. Verified: guard blocks (exit 1) on staged vendored change; `ALLOW_VENDOR_EDIT=1` bypass succeeds.
- [x] [Review][Patch] Tripwire test added (`vendored trees must not contain nested package/tsconfig/lint configs`) in `tests/unit/dependency-audit.test.ts` — passes on current baseline.
- [x] [Review][Patch] `findTsFiles` and `isVendored` extracted to module scope in `tests/unit/dependency-audit.test.ts`; both `it()` blocks now share a single implementation.
- [x] [Review][Patch] `isVendored` hardened: resolves `REPO_ROOT` from `import.meta.url` (ESM-correct; independent of `process.cwd()`), normalizes via `toPosix` (`.replace(/\\/g, '/')`) for mixed-separator tolerance.

- [x] [Review][Defer] `.eslintignore` entry is dead under ESLint 9 flat-config [.eslintignore:13-15] — harmless breadcrumb consistent with Task 3's literal text; clean up when Task 3 wording is corrected. Deferred, pre-existing (same commit, but cosmetic).
- [x] [Review][Defer] Dep-audit no longer enforces vendored import versions against root `package.json` [tests/unit/dependency-audit.test.ts VENDORED_PATHS] — by design for Story 1.1, but once Story 1.3 declares the six runtime deps, a vendor-aware version check should be added so a `zod` major bump silently breaking upstream gets caught. Deferred to Story 1.3.
- [x] [Review][Defer] Six different glob dialects for the same path across `.gitignore`, `.eslintignore`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`, `dependency-audit.test.ts` — each dialect is correct individually, but no test keeps them in sync. Deferred, fixable later via a single vendor-paths manifest.
- [x] [Review][Defer] `tsconfig.test.json` silently inherits `exclude` from parent [tsconfig.test.json] — works today, but a future exclude redefinition could forget `src/tools/clickup/**`. Deferred — add a comment or restate explicitly on next tsconfig edit.
- [x] [Review][Defer] `.gitignore` negation won't re-include if a future ancestor rule excludes `src/tools/` [.gitignore:98] — hypothetical future regression, not a current bug. Deferred.
