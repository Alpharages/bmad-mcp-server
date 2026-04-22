# Story 2.8: Verify upstream `bmad-create-story` still resolves after `findBmmSkillsRoot` extension

Status: ready-for-dev

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Story 2.7 extended `findBmmSkillsRoot` in `resource-loader.ts` to scan `src/custom-skills/` and `custom-skills/` in addition to `src/bmm-skills/` and `bmm-skills/`. That change means the bmad-mcp-server project root now yields a non-null result from `findBmmSkillsRoot` (it returns `src/custom-skills/`). This is correct, but introduces a new execution path: when `loadWorkflow('bmad-create-story')` is called, the loader first checks `src/custom-skills/`, finds no `bmad-create-story` there, and must continue to the next source (user `~/.bmad`, then git cache). If the loop-continue logic is ever disrupted, the upstream skill would silently vanish.
>
> This story adds one unit test that exercises that path in isolation, serving as a permanent guard. It is otherwise a pure test-only story — no TypeScript source changes.
>
> **Depends on stories 2.1 through 2.7 completing first.** The guard test only makes sense once the `findBmmSkillsRoot` extension (story 2.7) is present.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a unit test that proves `loadWorkflow('bmad-create-story')` still resolves from a downstream (git) source when the project root has only a `src/custom-skills/` tree,
so that future changes to `findBmmSkillsRoot` or `loadWorkflow` cannot silently shadow the upstream `bmad-create-story` skill without a failing test — matching EPIC-2 exit criterion "Upstream story-creation skill unchanged" and EPIC-2 Outcome "Upstream story-creation skill remains untouched and still works for file-based mode."

## Acceptance Criteria

1. `tests/unit/lite-resource-loader.test.ts` MUST include a new test case with **exactly** this name and structure:

   ```typescript
   it('should resolve upstream skill from git source when project has only src/custom-skills', async () => {
     // arrange
     const projectDir = join(tmpdir(), `bmad-regression-project-${Date.now()}`);
     const gitCacheDir = join(tmpdir(), `bmad-regression-git-${Date.now()}`);
     const customSkillDir = join(
       projectDir,
       'src',
       'custom-skills',
       'clickup-create-story',
     );
     mkdirSync(customSkillDir, { recursive: true });
     writeFileSync(
       join(customSkillDir, 'SKILL.md'),
       '---\nname: clickup-create-story\n---\n# ClickUp Create Story',
     );
     const upstreamSkillDir = join(
       gitCacheDir,
       'src',
       'bmm-skills',
       'bmad-create-story',
     );
     mkdirSync(upstreamSkillDir, { recursive: true });
     writeFileSync(
       join(upstreamSkillDir, 'SKILL.md'),
       '---\nname: bmad-create-story\n---\n# BMAD Create Story',
     );
     const regressionLoader = new ResourceLoaderGit(projectDir);
     type LoaderInternals = {
       resolvedGitPaths: Map<string, string>;
       paths: { userBmad: string };
     };
     const internals = regressionLoader as unknown as LoaderInternals;
     // Redirect user bmad to a nonexistent path so Stage 1 + Stage 2 user lookups are skipped
     internals.paths.userBmad = join(tmpdir(), 'bmad-nonexistent-user');
     // Pre-populate the git cache map with the real BMAD-METHOD URL so resolveGitRemotes()
     // skips the network fetch (it checks .has(url) before cloning)
     internals.resolvedGitPaths.set(
       'git+https://github.com/Alpharages/BMAD-METHOD.git',
       gitCacheDir,
     );
     // act
     const resource = await regressionLoader.loadWorkflow('bmad-create-story');
     // assert
     expect(resource.name).toBe('bmad-create-story');
     expect(resource.content).toContain('BMAD Create Story');
     expect(resource.source).toBe('git');
     // cleanup
     rmSync(projectDir, { recursive: true, force: true });
     rmSync(gitCacheDir, { recursive: true, force: true });
   });
   ```

   **Why two injections instead of one:** Using `'fake-url'` as the map key would leave the real `'git+https://github.com/Alpharages/BMAD-METHOD.git'` URL unresolved — `resolveGitRemotes()` would attempt a live network fetch and, if the machine's `~/.bmad` cache already has `bmad-create-story`, the user source would be found first (before our injected git cache). Both injections together give a fully deterministic, environment-isolated test: `paths.userBmad` → nonexistent (user source skipped in both Stage 1 candidate scan and Stage 2 bmmSources loop); real BMAD-METHOD URL pre-populated (no network fetch; our `gitCacheDir` is the only git source). This lets us reliably assert `source: 'git'`.

2. The test cleanup (`rmSync` for both `projectDir` and `gitCacheDir`) MUST run unconditionally in the test body (not deferred to `afterEach`) so that each test remains self-contained and does not rely on the shared `afterEach` cleanup in the outer `describe` block.

3. `npm run test:unit -- --reporter=verbose --testNamePattern="upstream skill from git"` MUST print the new test as passing.

4. `npm test` → passing count increases by exactly 1 compared to the story 2.7 baseline (233 → 234). No other tests change status.

5. `npm run build` → clean. `npm run lint` → 0 errors. `npm run format` → no diff.

6. Only `tests/unit/lite-resource-loader.test.ts` changes. No TypeScript source files, step files, skill files, or TOML files are added or modified.

7. The vendor-tree exclusions from story 1.1 and the TOML wiring from story 2.7 remain unchanged: `src/tools/clickup/`, `_bmad/custom/bmad-agent-dev.toml`, `.gitignore`, `src/core/resource-loader.ts`. `git diff --stat -- src/tools/clickup/ _bmad/ src/core/` MUST be empty after this story.

## Out of Scope (explicitly deferred to later stories)

- Token-permission gating (explicit check that `CLICKUP_API_KEY` has create-task permission before attempting creation) → **story 2.9**.
- An integration test that hits the real BMAD-METHOD git cache to verify `bmad-create-story` loads end-to-end. A unit test with an injected fake cache is sufficient for this regression guard.
- Testing the `listWorkflows` path (which also calls `findBmmSkillsRoot`). The regression risk is lower there — if `listWorkflows` returns an incomplete list the user sees it immediately, whereas `loadWorkflow` silently throws — and the `loadWorkflow` guard covers the same code path.

## Tasks / Subtasks

- [ ] **Task 1 — Add regression unit test (AC: #1–#4)**
  - [ ] Open `tests/unit/lite-resource-loader.test.ts`.
  - [ ] Add the test case from AC #1 inside the existing `describe('ResourceLoader (Lite)', ...)` block, after the test added by story 2.7 (`'should load a workflow from src/custom-skills layout'`).
  - [ ] Confirm that `tmpdir` is already imported (line 9: `import { tmpdir } from 'node:os';`). No new imports are needed — all referenced symbols (`join`, `mkdirSync`, `writeFileSync`, `rmSync`, `tmpdir`, `ResourceLoaderGit`) are already in scope.
  - [ ] Run `npm run test:unit -- --reporter=verbose --testNamePattern="upstream skill from git"` and confirm the new test passes.

- [ ] **Task 2 — Verify regression-free (AC: #5–#7)**
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. Pre-existing 7 warnings in `tests/support/litellm-helper.mjs` unchanged; no new findings.
  - [ ] `npm run format` → no diff.
  - [ ] `npm test` → 234 passing (was 233 after story 2.7).
  - [ ] `git diff --stat -- src/tools/clickup/ _bmad/ src/core/` → empty.

- [ ] **Task 3 — Commit (AC: all)**
  - [ ] Stage: `tests/unit/lite-resource-loader.test.ts` only.
  - [ ] Commit message: `test(resource-loader): guard upstream skill resolution after findBmmSkillsRoot extension`
  - [ ] Body:

    ```
    Adds a unit test that proves loadWorkflow('bmad-create-story') still resolves
    from a downstream git source even when the project root has only
    src/custom-skills/ (no src/bmm-skills/). The test injects a fake git cache
    via the private resolvedGitPaths Map, simulating the post-story-2.7 layout
    where findBmmSkillsRoot returns src/custom-skills/ for the project root.

    This guards the loop-continue logic in loadWorkflow's bmmSources iteration:
    when scanBmmSkills(src/custom-skills/) does not find the requested name, the
    loop must continue to the next source rather than failing silently. Without
    this test, the safety guarantee from EPIC-2 exit criterion "Upstream
    story-creation skill unchanged" has no automated verification.

    No source changes. Pure test addition.

    Refs: EPIC-2, story 2-8-upstream-regression-check.
    ```

## Dev Notes

### Why this test is needed

Story 2.7 extended `findBmmSkillsRoot` from two paths (`src/bmm-skills`, `bmm-skills`) to four (`src/bmm-skills`, `bmm-skills`, `src/custom-skills`, `custom-skills`). In the bmad-mcp-server project root, `src/custom-skills/` now exists (created by stories 2.1–2.6). Before story 2.7, `findBmmSkillsRoot(projectRoot)` returned `null` for this project — meaning `loadWorkflow` skipped the project source entirely for bmm-skills fallback. After story 2.7, it returns `src/custom-skills/`, so `scanBmmSkills` is called on it.

The safety of this change depends on `scanBmmSkills` returning an empty `workflows` map (i.e., `.get('bmad-create-story')` → `undefined`) and the `if (skillPath && existsSync(skillPath))` guard in `loadWorkflow` correctly not returning. Both are correct in the current implementation, but this test makes the contract explicit and catches any future regression.

### How the two-injection isolation works

`loadWorkflow` has two stages:

1. **Stage 1 (candidates array):** Looks for `{bmadRoot}/workflows/{name}/workflow.yaml` — the flat BMAD layout. Checks project, user, and git sources. `bmad-create-story` lives in the bmm-skills layout, not the workflows layout, so Stage 1 always falls through for this test.
2. **Stage 2 (bmmSources loop):** The bmm-skills fallback. Calls `findBmmSkillsRoot` on each source root, then `scanBmmSkills`. This is where `bmad-create-story` is found.

The test uses two injections via a type-cast to bypass `private` access:

```typescript
type LoaderInternals = {
  resolvedGitPaths: Map<string, string>;
  paths: { userBmad: string };
};
const internals = regressionLoader as unknown as LoaderInternals;
```

**Injection 1 — neutralise the user source:**

```typescript
internals.paths.userBmad = join(tmpdir(), 'bmad-nonexistent-user');
```

On a developer machine with `~/.bmad/src/bmm-skills/bmad-create-story/`, the user source would normally be found first in Stage 2, returning `source: 'user'` with the real content (which does NOT contain our sentinel string `'BMAD Create Story'`). Redirecting `userBmad` to a nonexistent path means `findBmmSkillsRoot` returns `null` for it and the source is skipped entirely.

**Injection 2 — prevent a live network fetch and provide the fake cache:**

```typescript
internals.resolvedGitPaths.set(
  'git+https://github.com/Alpharages/BMAD-METHOD.git',
  gitCacheDir,
);
```

`resolveGitRemotes()` (called inside `loadWorkflow`) skips any URL whose key is already in the map:

```typescript
if (this.resolvedGitPaths.has(gitUrl)) continue;
```

By pre-populating with the real BMAD-METHOD URL, we prevent the network fetch. Our `gitCacheDir` (which has `src/bmm-skills/bmad-create-story/SKILL.md`) becomes the sole git source resolved in `bmmSources`, and `source: 'git'` is guaranteed.

### Import inventory — no new imports needed

`tests/unit/lite-resource-loader.test.ts` already imports every symbol the new test uses:

| Symbol                                                | Already imported from               |
| ----------------------------------------------------- | ----------------------------------- |
| `describe`, `it`, `expect`, `beforeEach`, `afterEach` | `vitest`                            |
| `ResourceLoaderGit`                                   | `../../src/core/resource-loader.js` |
| `join`                                                | `node:path`                         |
| `mkdirSync`, `writeFileSync`, `rmSync`                | `node:fs`                           |
| `tmpdir`                                              | `node:os`                           |

### Test count baseline

| Story | Passing tests         |
| ----- | --------------------- |
| 2.6   | 232                   |
| 2.7   | 233 (+1)              |
| 2.8   | 234 (+1) ← this story |

### References

- `src/core/resource-loader.ts` — `findBmmSkillsRoot` (~line 371, extended by story 2.7), `loadWorkflow` bmmSources loop (~line 846), `scanBmmSkills` (~line 393), `resolvedGitPaths` (~line 117).
- `tests/unit/lite-resource-loader.test.ts` — the test file where the new case lands (currently 98 lines after story 2.7).
- [Story 2.7 §Out of Scope](./2-7-config-toml-wiring.md) — "Regression check that upstream `bmad-create-story` still works in isolation → story 2.8."
- [Story 2.7 §Dev Notes — `findBmmSkillsRoot` change and its scope](./2-7-config-toml-wiring.md) — explains the known limitation around first-match priority.
- [EPIC-2 §Exit criteria](../epics/EPIC-2-dev-story-creation-clickup.md) — "Upstream story-creation skill unchanged."

## Dev Agent Record

### Agent Model Used

(to be filled in during implementation)

### Debug Log References

(to be filled in during implementation)

### Completion Notes List

(to be filled in during implementation)

### File List

**New**

- (none)

**Modified**

- `tests/unit/lite-resource-loader.test.ts` — one new regression test case (AC #1)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-2 bullet "Verify upstream story-creation skill still works in isolation". Status → ready-for-dev. |
