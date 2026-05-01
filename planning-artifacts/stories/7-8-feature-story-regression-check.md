# Story 7.8: Regression check — `clickup-create-story` feature flow unchanged after EPIC-7

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> EPIC-7 added `clickup-create-bug` as a sibling skill under `src/custom-skills/` and registered
> it as trigger `CB` in `_bmad/custom/bmad-agent-dev.toml`. A `fix` commit (story 7-3 code
> review) also touched `clickup-create-story/steps/step-02-epic-picker.md` and
> `clickup-create-story/steps/step-03-sprint-list-picker.md` — both changes were
> formatting-only (indentation of markdown sub-bullets). No logic was altered.
>
> The resource loader (`ResourceLoaderGit.loadWorkflow`) uses name-based directory lookup under
> `src/custom-skills/`. Having two skills in that directory creates no collision risk because
> names differ. This story adds a permanent unit test guard that proves the loader resolves
> `clickup-create-story` correctly even when `clickup-create-bug` also exists as a sibling.
>
> **Depends on stories 7.1–7.7 completing first.**

## Story

As the **bmad-mcp-server platform maintainer**,
I want a unit test that proves `loadWorkflow('clickup-create-story')` returns the correct skill
when `clickup-create-bug` also lives in `src/custom-skills/`,
so that future changes to the loader's directory-scan logic cannot silently shadow or swap the
wrong skill — matching the EPIC-7 exit criterion "Feature `clickup-create-story` flow remains
identical."

## Acceptance Criteria

1. `tests/unit/lite-resource-loader.test.ts` MUST include a new test case with **exactly** this
   name:

   ```
   should load clickup-create-story without confusion when clickup-create-bug also exists
   ```

   The test MUST:

   a. Create a temp project dir (via `mkdtempSync`) with **both**
   `src/custom-skills/clickup-create-story/SKILL.md`
   (content sentinel: `'# ClickUp Create Story — sentinel'`) and
   `src/custom-skills/clickup-create-bug/SKILL.md`
   (content sentinel: `'# ClickUp Create Bug — sentinel'`) present.

   b. Instantiate a fresh `ResourceLoaderGit(projectDir)`.

   c. Call `loadWorkflow('clickup-create-story')` and assert:
   - `resource.name` === `'clickup-create-story'`
   - `resource.content` contains `'ClickUp Create Story — sentinel'`
   - `resource.content` does NOT contain `'ClickUp Create Bug'`
   - `resource.source` === `'project'`

   d. Call `loadWorkflow('clickup-create-bug')` and assert:
   - `resource.name` === `'clickup-create-bug'`
   - `resource.content` contains `'ClickUp Create Bug — sentinel'`
   - `resource.content` does NOT contain `'ClickUp Create Story'`
   - `resource.source` === `'project'`

   e. Cleanup `projectDir` unconditionally in a `try/finally` block.

2. The test cleanup MUST run unconditionally (in a `try/finally` block) so each test is
   self-contained and does not depend on the shared `afterEach` cleanup in the outer `describe`.

3. `npm run test:unit -- --reporter=verbose --testNamePattern="clickup-create-story without confusion"` MUST print the new test as passing.

4. `npm test` → passing count increases by exactly 1 (296 → 297). The pre-existing failure in
   `dependency-audit.test.ts` is unchanged and does not count against this story.

5. `npm run build` → clean. `npm run lint` → 0 errors. `npm run format` → no diff.

6. Only `tests/unit/lite-resource-loader.test.ts` is modified. No TypeScript source files,
   step files, skill files, or TOML files are added or modified.

7. `git diff --stat -- src/custom-skills/clickup-create-story/` confirms only the formatting
   changes from story 7-3 code review (step-02, step-03 indentation fixes). No new changes to
   `clickup-create-story/` are introduced by this story.

8. `git diff --stat -- _bmad/custom/bmad-agent-dev.toml` confirms the `CB` trigger entry exists
   and the `CS` trigger entry (`skill = "clickup-create-story"`) is unchanged.

## Out of Scope

- Testing the full skill step-file execution path — that is an E2E/integration concern.
- Testing the TOML routing dispatch logic itself — the TOML file is markdown-doc; routing tests
  belong to the BMAD-METHOD upstream if at all.
- Any changes to `clickup-create-story` step files — the formatting fixes from story 7-3 review
  were already committed; no further edits are needed.
- Fixtures and integration-level bug skill tests → story 7-9.
- Documentation → story 7-10.

## Tasks / Subtasks

- [x] **Task 1 — Add regression unit test (AC: #1–#4)**
  - [x] Open `tests/unit/lite-resource-loader.test.ts`.
  - [x] Add the test case from AC #1 inside the existing `describe('ResourceLoader (Lite)', ...)`
        block, after the test added by story 2-8
        (`'should resolve upstream skill from git source when project has only src/custom-skills'`).
  - [x] Confirm `mkdtempSync` is already imported from `node:fs` (line 8). No new imports needed.
  - [x] Run `npm run test:unit -- --reporter=verbose --testNamePattern="clickup-create-story without confusion"` and confirm the new test passes.

- [x] **Task 2 — Verify regression-free (AC: #5–#8)**
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors.
  - [x] `npm run format` → no diff.
  - [x] `npm test` → 297 passing (was 296).
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/` → only step-02 and step-03 formatting diffs from story 7-3; no new changes.
  - [x] `git diff --stat -- _bmad/custom/bmad-agent-dev.toml` → CB entry added, CS entry intact.

- [x] **Task 3 — Update sprint-status.yaml**
  - [x] Set `7-8-feature-story-regression-check: done`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Commit (AC: all)**
  - [x] Stage: `tests/unit/lite-resource-loader.test.ts`,
        `planning-artifacts/stories/7-8-feature-story-regression-check.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit message:
        `test(resource-loader): guard clickup-create-story disambiguation after EPIC-7 sibling addition`
  - [x] Body: references story 7.8, explains the EPIC-7 sibling layout, confirms name-based lookup
        returns the correct skill for each.

## Dev Notes

### Why this test is needed

EPIC-7 placed `clickup-create-bug/` as a sibling of `clickup-create-story/` in `src/custom-skills/`.
Both are loaded by `ResourceLoaderGit.loadWorkflow()`, which scans
`src/custom-skills/{name}/SKILL.md`. Because the lookup is strictly name-keyed there is no
collision today. But if someone were to change the loader to use prefix matching, fuzzy matching,
or alphabetical first-match, the wrong skill could silently surface. This test makes the
disambiguation contract explicit and machine-verifiable.

### How `loadWorkflow` finds custom skills

`ResourceLoaderGit` calls `findBmmSkillsRoot(projectRoot)` which (since story 2.7) scans four
paths: `src/bmm-skills/`, `bmm-skills/`, `src/custom-skills/`, `custom-skills/`. When found,
`scanBmmSkills(root)` builds a map from skill name → SKILL.md path. `loadWorkflow('clickup-create-story')` does a `.get('clickup-create-story')` on that map — an exact-name lookup.
Adding `clickup-create-bug` adds a second entry to the map; `.get('clickup-create-story')` still
returns the correct path.

### Import inventory — no new imports needed

`tests/unit/lite-resource-loader.test.ts` already imports every symbol the new test uses:

| Symbol                                                | Already imported from               |
| ----------------------------------------------------- | ----------------------------------- |
| `describe`, `it`, `expect`                            | `vitest`                            |
| `ResourceLoaderGit`                                   | `../../src/core/resource-loader.js` |
| `join`                                                | `node:path`                         |
| `mkdirSync`, `mkdtempSync`, `writeFileSync`, `rmSync` | `node:fs`                           |
| `tmpdir`                                              | `node:os`                           |

### EPIC-7 changes to `clickup-create-story` files (context)

| File                               | Change in EPIC-7                                | Introduced by             |
| ---------------------------------- | ----------------------------------------------- | ------------------------- |
| `step-02-epic-picker.md`           | Indentation only (sub-bullets reformatted)      | Story 7-3 code review fix |
| `step-03-sprint-list-picker.md`    | Indentation only (sub-bullets reformatted)      | Story 7-3 code review fix |
| `_bmad/custom/bmad-agent-dev.toml` | `CB` trigger entry added; `CS` + `DS` unchanged | Story 7-2 scaffold        |

No TypeScript source changes were made to support `clickup-create-bug` in EPIC-7.

### Test count baseline

| Story | Passing tests         |
| ----- | --------------------- |
| 7.7   | 296                   |
| 7.8   | 297 (+1) ← this story |

(The pre-existing failure in `dependency-audit.test.ts` is excluded from the passing count.)

### Files changed by this story

**Modified**

- `tests/unit/lite-resource-loader.test.ts` — one new test case (AC #1)
- `planning-artifacts/stories/7-8-feature-story-regression-check.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**New / Deleted**

- (none)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

N/A — pure test addition, no runtime debug logs generated.

### Completion Notes List

- Added one test case `'should load clickup-create-story without confusion when clickup-create-bug also exists'` to `tests/unit/lite-resource-loader.test.ts` (after the story 2-8 regression test). Uses `mkdtempSync` + `try/finally` for atomic cleanup.
- Test verifies both directions: `loadWorkflow('clickup-create-story')` returns story sentinel content and `loadWorkflow('clickup-create-bug')` returns bug sentinel content — no cross-contamination.
- Prettier reformatted one chained call into multi-line form; no semantic change.
- Build, lint (0 errors, 7 pre-existing console warnings in vendored test helpers), and format all clean.
- `npm test` → 297 passing (was 296); 1 pre-existing failure in `dependency-audit.test.ts` unchanged.

### File List

**Modified**

- `tests/unit/lite-resource-loader.test.ts`
- `planning-artifacts/stories/7-8-feature-story-regression-check.md`
- `planning-artifacts/sprint-status.yaml`

**New / Deleted**

- (none)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
| 2026-05-01 | Story implemented. Status → done.      |
