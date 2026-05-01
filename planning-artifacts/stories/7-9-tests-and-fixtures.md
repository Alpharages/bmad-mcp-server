# Story 7.9: Fixtures and tests for `clickup-create-bug` — paste-a-bug-report, missing PRD, missing arch, no epic, severity inference

Status: ready-for-dev

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> EPIC-7 added `clickup-create-bug` as a fully scaffolded, five-step skill under
> `src/custom-skills/clickup-create-bug/`. The skill logic lives entirely in step
> files (markdown), so TypeScript-level unit tests target the **resource loader** (can
> the skill be found and loaded?) and **step file content** (do the files contain the
> language that makes each behaviour correct?). Step file content tests are structural
> regression guards: if someone accidentally strips the soft-load language from step-01
> or the severity table from step-04, a test fails immediately.
>
> A sample bug report fixture is added alongside the tests for documentation and future
> integration/E2E use.
>
> **Depends on stories 7.1–7.8 completing first.**

## Story

As the **bmad-mcp-server platform maintainer**,
I want unit tests and fixture files that cover the key behaviours of `clickup-create-bug`
(paste-a-bug-report, missing PRD, missing architecture, no epic, severity inference),
so that regressions in the step files are caught before they reach production.

## Acceptance Criteria

### AC 1 — New test file

`tests/unit/bug-skill.test.ts` MUST be created inside `describe('clickup-create-bug skill', ...)`.
The following eight test cases MUST be present with **exactly** these names:

1. `should load clickup-create-bug via ResourceLoaderGit from src/custom-skills/`
2. `step-01-prereq-check describes PRD as soft-loaded — skill MUST NOT stop when PRD is absent`
3. `step-01-prereq-check describes architecture as soft-loaded — skill MUST NOT stop when arch is absent`
4. `step-03-epic-picker contains skip prompt — bugs do not require an epic parent`
5. `step-04-description-composer severity table includes Critical-level keywords`
6. `step-04-description-composer severity table includes Low-level keywords`
7. `step-04-description-composer defaults to High severity when no keyword matches`
8. `step-05-create-task maps Medium severity to priority 2 — high not normal`

### AC 2 — Test 1: resource loader (paste-a-bug-report path)

Test 1 MUST:

a. Use `mkdtempSync` to create a temp project dir.

b. Create `src/custom-skills/clickup-create-bug/SKILL.md` inside it with content sentinel
`'# ClickUp Create Bug — fixture'`.

c. Instantiate a fresh `ResourceLoaderGit(projectDir)`.

d. Call `loadWorkflow('clickup-create-bug')` and assert:

- `resource.name` === `'clickup-create-bug'`
- `resource.content` contains `'ClickUp Create Bug — fixture'`
- `resource.source` === `'project'`

e. Clean up `projectDir` unconditionally in a `try/finally` block.

### AC 3 — Tests 2–3: missing-PRD / missing-arch (step-01 soft-load language)

Tests 2 and 3 MUST read `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md`
from the real project directory (not a temp dir) using `readFileSync`. The project root is
derived from `import.meta.url` via `fileURLToPath` — not `process.cwd()`.

Test 2 MUST assert the step-01 content:

- Contains the phrase `'MUST NOT stop'` at least twice (once for PRD, once for architecture)
- Contains the phrase `'soft-load'` or `'Soft-load'`

Test 3 MUST assert the step-01 content:

- Contains `'architecture'` in the context of soft-loading (the step addresses both artifacts)
- Contains the phrase `'Missing planning artifacts never block bug creation'`

### AC 4 — Test 4: no-epic scenario (step-03 optional language)

Test 4 MUST read `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md` from
the real project directory using `readFileSync` and assert:

- Contains `'Bugs do not require an epic parent'`
- Contains `'skip'` (the skip prompt for the no-epic path)
- Contains `'epic_id'` and `'epic_name'` remaining `''` when skipped

### AC 5 — Tests 5–7: severity inference (step-04 severity table)

Tests 5–7 MUST read `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`
from the real project directory using `readFileSync`.

Test 5 MUST assert the severity table contains all of: `'Critical'`, `'crash'`, `'data loss'`, `'security'`.

Test 6 MUST assert the severity table contains all of: `'Low'`, `'cosmetic'`, `'typo'`.

Test 7 MUST assert:

- Contains `'Default to **High**'`

### AC 6 — Test 8: severity-to-priority mapping (step-05)

Test 8 MUST read `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`
from the real project directory using `readFileSync` and assert:

- Contains `'Medium'` paired with `'2 (high)'` — proving Medium maps to priority 2, not normal (3)
- Contains `'Medium maps to \`high\` (not \`normal\`)'`

### AC 7 — Fixture file

`tests/fixtures/bug-skill/sample-bug-report.md` MUST be created. It MUST be a realistic,
multi-section bug report that exercises the full description-composer template (Summary,
Steps to Reproduce, Expected Behaviour, Actual Behaviour, Impact/Severity, Suspected Area,
Environment). The report MUST contain at least one keyword from the `High` severity bucket
(e.g. `"error"`, `"broken"`, `"fails"`) so that severity-inference tests can reference it.

### AC 8 — Test runner

`npm run test:unit -- --reporter=verbose --testNamePattern="clickup-create-bug skill"` MUST
print all eight tests as passing.

### AC 9 — Test count

`npm test` → passing count increases by exactly 8 (297 → 305). The pre-existing failure in
`dependency-audit.test.ts` is unchanged and does not count against this story.

### AC 10 — Build, lint, format clean

`npm run build` → clean. `npm run lint` → 0 errors. `npm run format` → no diff.

### AC 11 — File scope

Only the following files are added or modified by this story:

**New:**

- `tests/unit/bug-skill.test.ts`
- `tests/fixtures/bug-skill/sample-bug-report.md`
- `planning-artifacts/stories/7-9-tests-and-fixtures.md` (this file)

**Modified:**

- `planning-artifacts/sprint-status.yaml` (status update)

No TypeScript source files, step files, skill files, or TOML files are added or modified.

## Out of Scope

- Testing the full five-step execution path — that is an E2E/integration concern.
- Testing `createTask` invocation or ClickUp API responses — those are live-API calls.
- Adding tests for `clickup-create-story` or any other skill.
- Documentation → story 7-10.

## Tasks / Subtasks

- [ ] **Task 1 — Create fixture file (AC #7)**
  - [ ] Create `tests/fixtures/bug-skill/` directory.
  - [ ] Write `tests/fixtures/bug-skill/sample-bug-report.md` — a realistic bug report with
        a title, steps to reproduce, expected/actual behaviour, High-severity keyword, suspected
        area, and environment details.

- [ ] **Task 2 — Write unit tests (AC #1–#6)**
  - [ ] Create `tests/unit/bug-skill.test.ts`.
  - [ ] Import: `describe`, `it`, `expect`, `beforeEach`/`afterEach` from `vitest`;
        `ResourceLoaderGit` from `../../src/core/resource-loader.js`; `join` from `node:path`;
        `mkdirSync`, `mkdtempSync`, `writeFileSync`, `rmSync`, `readFileSync` from `node:fs`;
        `tmpdir` from `node:os`; `fileURLToPath` from `node:url`.
  - [ ] Derive `projectRoot` at the top of the file:
        `typescript
const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');
`
  - [ ] Write test 1 (resource loader — AC #2) with `try/finally` cleanup.
  - [ ] Write tests 2–3 (step-01 soft-load — AC #3) using `readFileSync`.
  - [ ] Write test 4 (step-03 optional epic — AC #4) using `readFileSync`.
  - [ ] Write tests 5–7 (step-04 severity inference — AC #5) using `readFileSync`.
  - [ ] Write test 8 (step-05 priority mapping — AC #6) using `readFileSync`.

- [ ] **Task 3 — Verify (AC #8–#10)**
  - [ ] Run `npm run test:unit -- --reporter=verbose --testNamePattern="clickup-create-bug skill"` → 8 passing.
  - [ ] `npm test` → 305 passing (was 297).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors.
  - [ ] `npm run format` → no diff.

- [ ] **Task 4 — Update sprint-status.yaml and commit (AC #11)**
  - [ ] Set `7-9-tests-and-fixtures: done`.
  - [ ] Update `last_updated` field.
  - [ ] Stage: `tests/unit/bug-skill.test.ts`, `tests/fixtures/bug-skill/sample-bug-report.md`,
        `planning-artifacts/stories/7-9-tests-and-fixtures.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [ ] Commit message:
        `test(custom-skills): add bug skill unit tests and fixture — severity, soft-load, no-epic`

## Dev Notes

### Why step-file content tests?

The bug skill's logic (severity inference, soft-load, optional epic) lives entirely in markdown
step files, not TypeScript. Unit tests that read and assert on the step file content provide a
regression layer: if step-01's soft-load language is accidentally removed or step-04's severity
table is edited to drop a row, the test fails immediately without requiring a live ClickUp
session.

### How `loadWorkflow` resolves `clickup-create-bug`

`ResourceLoaderGit.loadWorkflow('clickup-create-bug')` calls `findBmmSkillsRoot(projectRoot)`,
which scans `src/custom-skills/` (among other paths) for a `SKILL.md`. The skill name is the
directory name. Test 1 mirrors the EPIC-7 project layout by placing `SKILL.md` at
`src/custom-skills/clickup-create-bug/SKILL.md` in a temp dir.

### Deriving `projectRoot` in test files

Use `fileURLToPath(import.meta.url)` to get the absolute path of the test file itself, then
navigate up with `join`. From `tests/unit/bug-skill.test.ts`, two levels up is the project root:

```typescript
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');
// → /Volumes/Data/project/products/alpharages/bmad-mcp-server
```

This avoids relying on `process.cwd()`, which varies by how the test runner is invoked.

### Step-file paths for tests 2–8

| Test    | File                                                                         |
| ------- | ---------------------------------------------------------------------------- |
| 2, 3    | `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md`         |
| 4       | `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`          |
| 5, 6, 7 | `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md` |
| 8       | `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`          |

### Key content anchors for assertions

| AC          | File    | Exact string to assert                                                    |
| ----------- | ------- | ------------------------------------------------------------------------- |
| AC 3 test 2 | step-01 | `'MUST NOT stop'` (×≥2), `'soft-load'` or `'Soft-load'`                   |
| AC 3 test 3 | step-01 | `'architecture'`, `'Missing planning artifacts never block bug creation'` |
| AC 4        | step-03 | `'Bugs do not require an epic parent'`, `'skip'`, `'epic_id'`             |
| AC 5 test 5 | step-04 | `'Critical'`, `'crash'`, `'data loss'`, `'security'`                      |
| AC 5 test 6 | step-04 | `'Low'`, `'cosmetic'`, `'typo'`                                           |
| AC 5 test 7 | step-04 | `'Default to **High**'`                                                   |
| AC 6 test 8 | step-05 | `'Medium'` + `'2 (high)'`, `'Medium maps to \`high\` (not \`normal\`)'`   |

### Sample bug report fixture content

The fixture at `tests/fixtures/bug-skill/sample-bug-report.md` should be a realistic report
that exercises all description-composer sections. Example structure:

```markdown
## Bug: `createTask` fails with 404 when `parent_task_id` is set on a non-subtask-enabled list

Steps to reproduce:

1. Set `[clickup_create_bug].pinned_epic_id` in `.bmadmcp/config.toml`.
2. Invoke `clickup-create-bug` and complete steps 1–4.
3. Confirm task creation in step 5.

Expected behaviour: task is created as a subtask of the selected epic.
Actual behaviour: `createTask` returns `Error creating task: 404 — parent task not found`.
Impact: broken — cannot attach bug tickets to epics in any list that disables subtasks.
Suspected area: `step-05-create-task.md`, `parent_task_id` parameter handling.
Environment: Node.js 22.14.0, macOS 15.4, Claude Desktop 0.9.
```

This report contains `"broken"` and `"fails"` (High severity keywords) and enough sections to
populate the full bug description template.

### Import inventory — no imports from `@/` aliases needed

All required symbols are from Node built-ins (`node:fs`, `node:os`, `node:path`, `node:url`)
and the existing project module (`../../src/core/resource-loader.js`). No new dependencies.

### Test count baseline

| Story | Passing tests         |
| ----- | --------------------- |
| 7.8   | 297                   |
| 7.9   | 305 (+8) ← this story |

(The pre-existing failure in `dependency-audit.test.ts` is excluded from the passing count.)

### Files changed by this story

**New**

- `tests/unit/bug-skill.test.ts`
- `tests/fixtures/bug-skill/sample-bug-report.md`
- `planning-artifacts/stories/7-9-tests-and-fixtures.md`

**Modified**

- `planning-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (k1.6)

### Completion Notes List

- Created `tests/unit/bug-skill.test.ts` with 8 test cases covering resource-loader, soft-load language, optional epic, severity inference, and priority mapping.
- Created `tests/fixtures/bug-skill/sample-bug-report.md` as a realistic multi-section bug report with High-severity keywords.
- All 8 tests pass; `npm test` shows 305 passing (up from 297).
- Build, lint (0 errors), and format are clean.

### File List

- `tests/unit/bug-skill.test.ts` (new)
- `tests/fixtures/bug-skill/sample-bug-report.md` (new)
- `planning-artifacts/sprint-status.yaml` (modified)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
