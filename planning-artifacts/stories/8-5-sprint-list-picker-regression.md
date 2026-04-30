# Story 8.5: Sprint-List Picker Regression — Confirm Step-03 Is Epic-Agnostic

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> EPIC-8 explicitly states "Sprint-list picker (`step-03`) is unaffected — confirm via test."
> Stories 8-1 through 8-4 added the no-epic path to steps 02, 04, and 05 (and the config
> flag), but explicitly left step-03 untouched. This story delivers the promised test coverage:
> a regression test suite that asserts step-03 never references `{epic_id}` or `{epic_name}`,
> consumes only the space variables that step-02 always populates, produces the three sprint
> variables downstream steps expect, and remains correctly wired in both epic and no-epic
> execution paths.
>
> No changes to any step file or TypeScript source — tests only.

## Story

As a **platform maintainer** who added the no-epic path across steps 02, 04, and 05,
I want a regression test suite that explicitly verifies `step-03-sprint-list-picker.md`
is completely epic-agnostic — neither reading `{epic_id}` nor `{epic_name}` — so that
future changes to the epic-picker flow cannot silently break the sprint-list picker.

## Acceptance Criteria

### Test file: `tests/unit/sprint-list-picker-regression.test.ts`

1. **Must exist** at `tests/unit/sprint-list-picker-regression.test.ts`.

2. **`step-03 is epic-agnostic — no {epic_id} references`** — read
   `step-03-sprint-list-picker.md` and assert the string `epic_id` does NOT appear
   anywhere in the file.

3. **`step-03 is epic-agnostic — no {epic_name} references`** — assert the string
   `epic_name` does NOT appear anywhere in `step-03-sprint-list-picker.md`.

4. **`step-03 frontmatter declares exactly the three sprint variables`** — parse
   the YAML front-matter block (the `---` delimited block at the top of the file)
   and assert it contains exactly the keys `sprint_folder_id`, `sprint_list_id`, and
   `sprint_list_name` — no more, no fewer.

5. **`step-03 reads {space_id} from step-02 context`** — assert the string
   `{space_id}` appears at least once in the `## INSTRUCTIONS` section of
   `step-03-sprint-list-picker.md`. This confirms the step consumes the space
   variable that step-02 always populates in both the epic and no-epic paths.

6. **`step-03 reads {space_name} from step-02 context`** — assert the string
   `{space_name}` appears at least once in the `## INSTRUCTIONS` section.

7. **`step-03 NEXT pointer targets step-04-description-composer.md`** — assert the
   `## NEXT` section of `step-03-sprint-list-picker.md` contains the string
   `step-04-description-composer.md`.

8. **`step-03 NEXT line lists all three produced sprint variables`** — assert the
   `## NEXT` section contains all three of: `sprint_folder_id`, `sprint_list_id`,
   `sprint_list_name`. These are the runtime-populated variables downstream steps
   (step-04 and step-05) consume.

9. **`step-03 RULES includes blocking rule — sprint_list_id must be non-empty`** —
   assert the `## RULES` section of `step-03-sprint-list-picker.md` contains the
   string `sprint_list_id`.

10. **`step-03 RULES includes read-only constraint`** — assert the `## RULES` section
    contains the phrase `MUST NOT` (case-sensitive). This is the read-only rule that
    forbids write-tool calls.

11. **`step-03 RULES includes mode requirement — searchSpaces not available in read-minimal`** —
    assert the `## RULES` section contains the string `read-minimal`.

12. **`step-02 NEXT always passes {space_id} to step-03 — epic and no-epic paths`** —
    read `step-02-epic-picker.md` and assert its `## NEXT` section contains `{space_id}`.
    This cross-file assertion confirms step-02 always hands off the space context that
    step-03 depends on, regardless of whether the user selected an epic or chose "no epic".

13. **`step-02 NEXT always passes {space_name} to step-03`** — assert step-02's
    `## NEXT` section contains `{space_name}`.

14. **`step-02 NEXT links to step-03-sprint-list-picker.md`** — assert step-02's
    `## NEXT` section contains the string `step-03-sprint-list-picker.md`.

### No changes to step files or TypeScript

15. `step-03-sprint-list-picker.md` is NOT modified. `git diff --stat --
src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
    MUST be empty.

16. No `.ts` source files are created or modified. `git diff --stat --
'src/**/*.ts'` MUST be empty.

17. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no
    new failures.

### sprint-status.yaml updated

18. `8-5-sprint-list-picker-regression` transitions `backlog` → `ready-for-dev`
    when this story file is saved, and → `done` when implementation is complete.

### Commit

19. Commit message MUST follow Conventional Commits:

    ```
    test(custom-skills): add regression tests confirming step-03 is epic-agnostic (story 8-5)
    ```

    Body MUST reference story 8.5, name `tests/unit/sprint-list-picker-regression.test.ts`
    as the only new file, describe the intent (assert step-03 has no `epic_id`/`epic_name`
    references and is correctly wired in both epic and no-epic execution paths), and confirm
    that no step files or TypeScript source were modified.

## Out of Scope

- Changes to `step-03-sprint-list-picker.md` — the sprint-list picker is already
  unaffected by the no-epic changes; no edits are required.
- Changes to any other step file.
- TypeScript source changes — tests only.
- Broader no-epic happy-path and `allow_no_epic = false` integration tests — story 8-6.
- Documentation updates — story 8-7.
- Pilot quickstart — story 8-8.

## Tasks / Subtasks

- [x] **Task 1 — Create `tests/unit/sprint-list-picker-regression.test.ts` (AC: #1–#14)**
  - [x] Read `step-03-sprint-list-picker.md` fully before writing tests.
  - [x] Read `step-02-epic-picker.md` `## NEXT` section before writing cross-file tests.
  - [x] Write 13 `it()` assertions matching AC #2–#14, following the pattern in
        `tests/unit/bug-skill.test.ts` (plain `readFileSync` + `expect(content).toContain`
        / `not.toContain` — no fixtures, no mock network).
  - [x] Verify all 13 assertions pass with `npm test`.

- [x] **Task 2 — Regression verification (AC: #15–#17)**
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
        → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean (1 pre-existing
        failure in `dependency-audit` unrelated to this story; verified failing on stashed
        baseline before changes were applied).

- [x] **Task 3 — Update sprint-status.yaml (AC: #18)**
  - [x] Set `8-5-sprint-list-picker-regression: done`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Commit (AC: #19)**
  - [x] Stage: `tests/unit/sprint-list-picker-regression.test.ts`,
        `planning-artifacts/stories/8-5-sprint-list-picker-regression.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #19.

## Dev Notes

### Why these tests are valuable even though step-03 hasn't changed

The regression test suite documents a permanent invariant: `step-03-sprint-list-picker.md`
MUST remain epic-agnostic. Without explicit assertions, a future contributor editing the
no-epic flow could accidentally introduce `{epic_id}` references into step-03 — for
instance, to gate the sprint-list search on the chosen epic's space. The tests make this
mistake immediately visible in CI.

### How the no-epic path flows through step-03

When the user selects `[0] No epic` in step-02 (instruction 12), step-02 sets:

- `{epic_id}` = `''`
- `{epic_name}` = `''`

Step-02's `## NEXT` then passes `{space_id}`, `{space_name}`, `{backlog_list_id}`,
`{epic_id}`, and `{epic_name}` to step-03. Of these, step-03 only reads `{space_id}`
and `{space_name}` — it never inspects `{epic_id}`. This means the sprint-list picker
executes identically in both the epic and no-epic paths.

Step-03 then passes `{sprint_folder_id}`, `{sprint_list_id}`, and `{sprint_list_name}`
to step-04. Step-04 uses `{epic_id}` (from step-02, now either empty or non-empty) to
decide whether to fetch the epic task from ClickUp — but step-03 is never involved in
that decision.

### Variable contract diagram

```
step-02 produces → step-03 consumes (ALWAYS):
  {space_id}         {space_id}     ← sprint folder discovery
  {space_name}       {space_name}   ← searchSpaces call + error messages

step-02 produces → step-03 ignores (pass-through):
  {backlog_list_id}
  {epic_id}          ('' on no-epic path, non-empty on epic path)
  {epic_name}        ('' on no-epic path, non-empty on epic path)

step-03 produces → step-04/05 consumes:
  {sprint_folder_id}
  {sprint_list_id}
  {sprint_list_name}
```

### Test implementation pattern

Follow `tests/unit/bug-skill.test.ts` exactly:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');

describe('sprint-list picker step-03 — no-epic regression', () => {
  // read step-03 once, reuse across tests
  const step03 = readFileSync(
    join(
      projectRoot,
      'src',
      'custom-skills',
      'clickup-create-story',
      'steps',
      'step-03-sprint-list-picker.md',
    ),
    'utf-8',
  );

  // Helper: extract a named ## section
  function getSection(content: string, heading: string): string {
    const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
    return content.match(pattern)?.[1] ?? '';
  }

  it('step-03 is epic-agnostic — no {epic_id} references', () => {
    expect(step03).not.toContain('epic_id');
  });

  // ... remaining assertions
});
```

Parse the frontmatter by extracting the text between the first two `---` fences:

```typescript
function parseFrontmatterKeys(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.split(':')[0].trim())
    .filter(Boolean);
}
```

### Files changed by this story

**New:**

- `tests/unit/sprint-list-picker-regression.test.ts`
  — 13 `it()` assertions covering AC #2–#14

**Modified:**

- `planning-artifacts/stories/8-5-sprint-list-picker-regression.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**Unchanged:**

- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
  — must remain byte-unchanged (verified by AC #15)

### References

- EPIC-8 story list bullet 5: "Sprint-list picker (`step-03`) is unaffected — confirm via test"
  [Source: planning-artifacts/epics/EPIC-8-no-epic-stories.md]
- Story 8-1 AC #16: "step-03-sprint-list-picker.md is NOT modified."
  [Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md]
- Current step-03 [Source: src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md]
- Current step-02 NEXT line [Source: src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md]
- Test pattern reference [Source: tests/unit/bug-skill.test.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (claude-code)

### Debug Log References

- `npx vitest run tests/unit/sprint-list-picker-regression.test.ts` — 13/13 pass.
- `npm run build` → ok. `npm run lint` → 0 errors. `npm run format` → unchanged.
- `git diff --stat` confirms step-03 byte-unchanged and no `src/**/*.ts` modified.
- Pre-existing `dependency-audit` failure (unrelated `node:async_hooks` vendored import)
  reproduces on stashed baseline; not a new regression introduced by this story.

### Completion Notes List

- Added 13 `it()` assertions in `tests/unit/sprint-list-picker-regression.test.ts`
  covering AC #2–#14: epic-agnostic invariants, frontmatter shape, INSTRUCTIONS context
  consumption, NEXT pointer + variable hand-off, RULES constraints, and step-02 → step-03
  hand-off across both epic and no-epic paths.
- Followed the `tests/unit/bug-skill.test.ts` pattern (plain `readFileSync` +
  `expect(...).toContain` / `.not.toContain`); no fixtures, no mocks.
- Helpers added: `getSection(content, heading)` and `parseFrontmatterKeys(content)`,
  both inlined in the test file.
- Zero edits to step files or TypeScript source — tests-only delivery.

### File List

**New:**
- `tests/unit/sprint-list-picker-regression.test.ts`

**Modified:**
- `planning-artifacts/stories/8-5-sprint-list-picker-regression.md`
- `planning-artifacts/sprint-status.yaml`
