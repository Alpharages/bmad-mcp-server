# Story 8.3: Create Task — Omit Parent (Conditional Summary Blocks)

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> Refines `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`
> to replace the dual-line annotation format in instructions 2 and 8 with
> explicit conditional blocks.
>
> Story 8-1 added the no-epic path to step-05: it conditionalised `parent_task_id`
> in instruction 5 (correct) and updated instructions 2 and 8 (pre-creation and
> success summaries) by adding a second "Parent epic:" line with `← shown when
{epic_id} is ''` annotations. That format is ambiguous — an LLM executing the
> step reads "Emit the following verbatim" and emits BOTH lines, including the
> annotation text, rather than choosing the correct conditional line.
>
> This story replaces instructions 2 and 8 with explicit IF/ELSE conditional
> branches so the executing LLM always emits exactly one parent-epic line.
> Markdown only — no TypeScript changes.

## Story

As a **developer** using `clickup-create-story` on the no-epic path,
I want the pre-creation summary and success message to show "_(none — standalone
task)_" — and nothing else — for the parent-epic line,
so that the task-creation UX is unambiguous and free of annotation artefacts
regardless of which LLM executes the step.

## Acceptance Criteria

### step-05-create-task.md changes

1. **Instruction 2 (pre-creation summary)** MUST be rewritten to use explicit
   conditional branches instead of the current dual-line annotation format:
   - When `{epic_id}` is non-empty, emit the following verbatim:

     ```
     📋 **Task creation summary**

     - Title: **{story_title}**
     - List: **{sprint_list_name}** (`{sprint_list_id}`)
     - Parent epic: **{epic_name}** (`{epic_id}`)
     - Description: composed ✓
     ```

   - When `{epic_id}` is `''`, emit the following verbatim:

     ```
     📋 **Task creation summary**

     - Title: **{story_title}**
     - List: **{sprint_list_name}** (`{sprint_list_id}`)
     - Parent epic: *(none — standalone task)*
     - Description: composed ✓
     ```

   The current single-block format with two annotated `← …` lines MUST be removed.

2. **Instruction 8 (success summary)** MUST be rewritten using the same
   conditional-branch pattern:
   - When `{epic_id}` is non-empty, emit the following verbatim:

     ```
     ✅ **ClickUp story created successfully!**

     - Task: **{story_title}**
     - Task ID: `{created_task_id}`
     - URL: {created_task_url}
     - Parent epic: **{epic_name}** (`{epic_id}`)
     - Sprint list: **{sprint_list_name}**

     Open the task in ClickUp: {created_task_url}
     ```

   - When `{epic_id}` is `''`, emit the following verbatim:

     ```
     ✅ **ClickUp story created successfully!**

     - Task: **{story_title}**
     - Task ID: `{created_task_id}`
     - URL: {created_task_url}
     - Parent epic: *(none — standalone task)*
     - Sprint list: **{sprint_list_name}**

     Open the task in ClickUp: {created_task_url}
     ```

   The current single-block format with two annotated `← …` lines MUST be removed.

3. All other instructions (1, 3, 4, 5, 6, 7) are NOT modified. In particular,
   instruction 5's `parent_task_id` conditional (added by story 8-1) remains
   byte-unchanged.

### No changes outside this file

4. `step-01-prereq-check.md`, `step-02-epic-picker.md`,
   `step-03-sprint-list-picker.md`, and `step-04-description-composer.md` are
   NOT modified by this story.

5. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
   MUST be empty.

6. No test files are created or modified. `git diff --stat -- tests/` MUST be
   empty. (Tests are story 8-6.)

7. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
   no new failures.

### sprint-status.yaml updated

8. `8-3-create-task-omit-parent` transitions `backlog` → `ready-for-dev` when
   this story file is saved, and → `done` when implementation is complete.

### Commit

9. Commit message MUST follow Conventional Commits:

   ```
   feat(custom-skills): replace dual-line annotation with conditional blocks in step-05 (story 8-3)
   ```

   Body MUST reference story 8.3, name `step-05-create-task.md` as the only
   modified step file, describe the fix (dual-line `←` annotation → explicit
   if/else blocks in instructions 2 and 8), and confirm that instruction 5's
   `parent_task_id` conditional is unchanged.

## Out of Scope

- Changes to instructions 1, 3, 4, 5, 6, or 7 in step-05 — these were
  correctly implemented in story 8-1 and are not modified here.
- Changes to step-02, step-03, or step-04 — those were addressed in stories
  8-1 and 8-2.
- `allow_no_epic` config flag wiring — story 8-4.
- TypeScript changes — no source code changes; markdown only.
- Test files — story 8-6 owns unit + integration tests for the no-epic path.

## Tasks / Subtasks

- [x] **Task 1 — Update `step-05-create-task.md` (AC: #1–#3)**
  - [x] Read the current file fully before making any edits.
  - [x] Replace instruction 2's single dual-annotated-line block with two
        conditional branches (`{epic_id}` non-empty vs `''`), each with its
        own "emit verbatim" block (AC #1).
  - [x] Replace instruction 8's single dual-annotated-line block with two
        conditional branches, each with its own "emit verbatim" block (AC #2).
  - [x] Verify instructions 1, 3, 4, 5, 6, 7 are byte-unchanged (AC #3).

- [x] **Task 2 — Regression verification (AC: #4–#7)**
  - [x] Confirm step-01, step-02, step-03, step-04 are untouched.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean
        (1 pre-existing failure in `dependency-audit.test.ts` unrelated to this change).

- [x] **Task 3 — Update sprint-status.yaml (AC: #8)**
  - [x] Set `8-3-create-task-omit-parent: done`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Commit (AC: #9)**
  - [x] Stage: `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`,
        `planning-artifacts/stories/8-3-create-task-omit-parent.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #9.

## Dev Notes

### Why this is a real bug, not cosmetic cleanup

The current step-05 instructions 2 and 8 use this pattern:

```markdown
> - Parent epic: **{epic_name}** (`{epic_id}`) ← existing line (epic chosen)
> - Parent epic: _(none — standalone task)_ ← shown when {epic_id} is ''
```

This is inside a "Emit the following verbatim" block. An LLM following the
instruction literally will emit both lines — including the `←` annotation
text — producing output like:

```
- Parent epic: **My Epic** (`abc123`) ← existing line (epic chosen)
- Parent epic: *(none — standalone task)* ← shown when {epic_id} is ''
```

Neither the duplicate line nor the annotation comment should appear in the
user-facing task creation summary. The fix makes the conditional explicit so
only the correct line is emitted.

### What story 8-1 already did correctly in step-05

Story 8-1 made four changes to step-05:

- **Instruction 1:** Removed `{epic_id}` and `{epic_name}` from the required
  non-empty check — both are intentionally empty on the no-epic path. ✅
- **Instruction 2:** Added the second parent-epic line (dual-annotation format).
  This story fixes that format.
- **Instruction 5:** `parent_task_id` is now conditional — include only when
  `{epic_id}` is non-empty, omit entirely when `''`. ✅ Remains unchanged.
- **Instruction 8:** Added the second parent-epic line (dual-annotation format).
  This story fixes that format.

### Sentinel convention (carried from story 8-1)

`{epic_id}` = `''` (empty string) is the project-wide sentinel for "no parent",
consistent across:

- `step-02-epic-picker.md` instructions 9/12 (story 8-1): sets `{epic_id}` = `''`
- `step-05-create-task.md` instruction 5 (story 8-1): omits `parent_task_id`
- `clickup-create-bug` step-03 (story 7-7): `{epic_id}` = `''` means no parent

[Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md#key-design-decision]

### Files changed by this story

**Modified:**

- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`
  — replaces dual-line annotation format with explicit conditional blocks in
  instructions 2 and 8
- `planning-artifacts/stories/8-3-create-task-omit-parent.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**New / Deleted:**

- (none)

### References

- EPIC-8 story list [Source: planning-artifacts/epics/EPIC-8-no-epic-stories.md#stories]
- Story 8-1 sentinel and step-05 changes [Source: planning-artifacts/stories/8-1-epic-picker-no-epic-option.md]
- Story 8-2 out-of-scope note (step-05 changes attributed to 8-1) [Source: planning-artifacts/stories/8-2-description-composer-no-epic-handling.md#out-of-scope]
- Current step-05 [Source: src/custom-skills/clickup-create-story/steps/step-05-create-task.md]

### Review Findings

- [x] [Review][Patch] Italic delimiter mismatch: `_(none — standalone task)_` uses underscores but AC1/AC2 specify `*(none — standalone task)*` (asterisks) as verbatim output [step-05-create-task.md: instructions 2 and 8, no-epic branches]
- [x] [Review][Defer] Condition gap: `{epic_id}` whitespace/null/undefined falls into epic branch or neither branch [step-05-create-task.md: instructions 2 and 8] — deferred, pre-existing design limitation of the no-epic feature (originates in story 8-1)
- [x] [Review][Defer] `{epic_name}` not validated when `{epic_id}` is non-empty — blank name emits silently in epic branch [step-05-create-task.md: instructions 2 and 8, epic branch] — deferred, pre-existing; instruction 1 intentionally exempts `{epic_name}` from required check by design (story 8-1)
- [x] [Review][Defer] `{created_task_url}` duplicated in success block (URL line + "Open the task" line) [step-05-create-task.md: instruction 8] — deferred, pre-existing design

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (claude-code)

### Debug Log References

### Completion Notes List

- Replaced instruction 2's dual-annotated-line block with two explicit conditional branches
  (`{epic_id}` non-empty vs `''`), each with its own "emit verbatim" block.
- Replaced instruction 8's dual-annotated-line block with the same conditional-branch pattern.
- Verified instructions 1, 3, 4, 5, 6, 7 are byte-unchanged.
- Confirmed step-01 through step-04 are untouched.
- Confirmed no `.ts` files or test files were modified.
- `npm run build`, `npm run lint`, `npm run format` all pass.
- `npm test`: 305/306 pass; the 1 failure is a pre-existing `dependency-audit.test.ts` issue
  (`node:async_hooks` not in package.json) unrelated to this change.

### File List

- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md` (modified)
- `planning-artifacts/stories/8-3-create-task-omit-parent.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status updated)
