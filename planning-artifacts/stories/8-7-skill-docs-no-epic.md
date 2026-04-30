# Story 8.7: Skill Docs — No-Epic Option

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> Stories 8-1 through 8-6 implemented the no-epic path across `step-02-epic-picker.md`,
> `step-04-description-composer.md`, and `step-05-create-task.md`, added the
> `allow_no_epic` config flag and its boolean-coercion note (8-4), confirmed step-03 is
> epic-agnostic (8-5), and added a test suite asserting the structural invariants of each
> step (8-6). This story completes the EPIC-8 documentation gap: the two overview files —
> `SKILL.md` and `workflow.md` — still describe the skill as always requiring an epic
> parent and make no mention of the no-epic option.
>
> No changes to any step file, TypeScript source, or test file.

## Story

As a **developer** or **team lead** reading the `clickup-create-story` skill overview,
I want `SKILL.md` and `workflow.md` to accurately reflect that the skill supports a
standalone (no-epic) path — covering the `allow_no_epic` config flag, the `[0] No epic`
picker entry, branch 3b in the description composer, and `parent_task_id` omission at
task creation — so that I can discover and configure the no-epic option without digging
into individual step files.

## Acceptance Criteria

### SKILL.md — description frontmatter

1. **Description updated.** The YAML frontmatter `description` field MUST change from:

   ```
   Creates a ClickUp task as a subtask of a chosen epic in the active sprint list, with a
   rich description composed from PRD + architecture + epic context. Use when the user says
   "create the next story" or "create story [id]" in a project where the Dev agent
   (story-creation mode) is routed to ClickUp.
   ```

   to:

   ```
   Creates a ClickUp task in the active sprint list — as a subtask of a chosen epic, or as
   a standalone top-level task when no epic parent is needed — with a rich description
   composed from PRD + architecture + epic context. Use when the user says "create the next
   story" or "create story [id]" in a project where the Dev agent (story-creation mode) is
   routed to ClickUp.
   ```

2. The body line (`Follow the instructions in ./workflow.md.`) is NOT modified.

### workflow.md — Goal

3. **Goal sentence updated.** The Goal line MUST append no-epic context. Change from:

   ```
   **Goal:** Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp
   tasks instead of story files, without modifying upstream BMAD source.
   ```

   to:

   ```
   **Goal:** Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp
   tasks instead of story files, without modifying upstream BMAD source. Supports both
   epic-parented tasks (default) and standalone top-level tasks via the no-epic path.
   ```

### workflow.md — Epic picker section

4. **`allow_no_epic` flag documented.** The Epic picker prose MUST state that when
   `[clickup_create_story].allow_no_epic` is `true` (the default), the picker prepends a
   `[0] No epic — create as standalone task` entry to the list.

5. **Sentinel documented.** The prose MUST state that selecting `[0]` sets `{epic_id}` =
   `''` (the no-epic sentinel) and `{epic_name}` = `''`.

6. **Empty-Backlog path documented.** The prose MUST state that when the Backlog list is
   empty and `allow_no_epic` is `true`, the user is offered a Y/n prompt to proceed as a
   standalone task instead of receiving a hard-stop error.

7. **`allow_no_epic = false` behaviour documented.** The prose MUST state that setting
   `[clickup_create_story].allow_no_epic = false` in `.bmadmcp/config.toml` hides the no-
   epic option and restores the original hard-stop when the Backlog list is empty.

8. The existing `{epic_id}` / `{epic_name}` availability sentence and the step-02 link are
   NOT removed.

### workflow.md — Description Composer section

9. **Branch 3b documented.** The Description Composer prose MUST state that when
   `{epic_id}` is `''` (no-epic path), the step uses branch 3b: `getTaskById` is skipped,
   no epic context is passed to `bmad-create-story`, and the composed description contains
   no "Epic:" or "Parent epic:" field.

10. The existing step-04 link and `{task_description}` blocking note are NOT removed.

### workflow.md — Task Creation section

11. **`parent_task_id` omission documented.** The Task Creation prose MUST replace the
    current call signature:

    ```
    createTask({ list_id: {sprint_list_id}, name: {story_title}, description:
    {task_description}, parent_task_id: {epic_id} })
    ```

    with wording that makes the conditional clear. The updated prose MUST state that
    `parent_task_id: {epic_id}` is included only when `{epic_id}` is non-empty, and is
    omitted entirely when `{epic_id}` is `''`.

12. **Pre-creation summary phrase documented.** The Task Creation prose MUST state that the
    pre-creation summary shows `_(none — standalone task)_` as the parent-epic line when
    `{epic_id}` is empty, so users can confirm intent before the API call.

13. The existing step-05 link, duplicate-search note, and terminal-step note are NOT
    removed.

### No changes outside SKILL.md and workflow.md

14. `step-01-prereq-check.md`, `step-02-epic-picker.md`, `step-03-sprint-list-picker.md`,
    `step-04-description-composer.md`, and `step-05-create-task.md` are NOT modified.
    `git diff --stat -- src/custom-skills/clickup-create-story/steps/` MUST be empty.

15. No `.ts` source files are created or modified. `git diff --stat -- 'src/**/*.ts'`
    MUST be empty.

16. No test files are created or modified. `git diff --stat -- tests/` MUST be empty.

17. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new
    failures.

### sprint-status.yaml updated

18. `8-7-skill-docs-no-epic` transitions `backlog` → `ready-for-dev` when this story file
    is saved, and → `done` when implementation is complete.

### Commit

19. Commit message MUST follow Conventional Commits:

    ```
    docs(custom-skills): document no-epic option in SKILL.md and workflow.md (story 8-7)
    ```

    Body MUST reference story 8.7, name `SKILL.md` and `workflow.md` as the two modified
    files, describe each change (description frontmatter, Goal extension, Epic picker
    no-epic docs, Description Composer branch 3b note, Task Creation `parent_task_id`
    omission and summary phrase), and confirm that no step files, TypeScript, or tests
    were modified.

## Out of Scope

- Changes to any step file (`step-01` through `step-05`) — all no-epic implementation is
  complete; these files already carry the authoritative documentation at the instruction
  level.
- Propagating `allow_no_epic` docs to `clickup-create-bug` — that skill has an always-
  optional epic picker (story 7-7) with no config flag; no overview change is needed.
- Pilot quickstart update — story 8-8.
- EPIC-9 README pass — separate epic.

## Tasks / Subtasks

- [x] **Task 1 — Update `SKILL.md` (AC: #1–#2)**
  - [x] Read the current file in full before editing.
  - [x] Update the `description` frontmatter field (AC #1).
  - [x] Verify the body line is unchanged (AC #2).

- [x] **Task 2 — Update `workflow.md` (AC: #3–#13)**
  - [x] Read the current file in full before editing.
  - [x] Extend the Goal line (AC #3).
  - [x] Update the Epic picker prose:
    - Add `allow_no_epic` flag and `[0] No epic` entry (AC #4).
    - Add sentinel documentation (AC #5).
    - Add empty-Backlog Y/n path (AC #6).
    - Add `allow_no_epic = false` hard-stop note (AC #7).
    - Verify step-02 link and `{epic_id}` / `{epic_name}` sentence are intact (AC #8).
  - [x] Update the Description Composer prose with branch 3b note (AC #9), verifying
        step-04 link and blocking note are intact (AC #10).
  - [x] Update the Task Creation prose:
    - Replace unconditional `parent_task_id` call signature (AC #11).
    - Add pre-creation summary phrase note (AC #12).
    - Verify step-05 link, duplicate-search note, and terminal-step note are intact (AC #13).

- [x] **Task 3 — Regression verification (AC: #14–#17)**
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/steps/` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean (1 pre-existing failure in dependency-audit, no new failures).

- [x] **Task 4 — Update sprint-status.yaml (AC: #18)**
  - [x] Set `8-7-skill-docs-no-epic: done`.
  - [x] Update `last_updated` field.

- [x] **Task 5 — Commit (AC: #19)**
  - [x] Stage: `src/custom-skills/clickup-create-story/SKILL.md`,
        `src/custom-skills/clickup-create-story/workflow.md`,
        `planning-artifacts/stories/8-7-skill-docs-no-epic.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #19.

## Dev Notes

### Summary of EPIC-8 implementation already shipped

| Story | Deliverable                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 8-1   | `step-02`: `allow_no_epic` cascade, `[0] No epic` picker entry, empty-Backlog Y/n fallback, sentinel `{epic_id}` = `''` |
| 8-2   | `step-04`: branch 3b (no-epic path) — skips `getTaskById`, prohibits Epic field in composed description                 |
| 8-3   | `step-05`: conditional blocks in instructions 2 (summary) and 8 (success) for `{epic_id}` = `''`                        |
| 8-4   | `step-02`: boolean coercion note; `.bmadmcp/config.toml`: commented `allow_no_epic` key                                 |
| 8-5   | `tests/unit/sprint-list-picker-regression.test.ts`: 13 assertions confirming step-03 is epic-agnostic                   |
| 8-6   | `tests/unit/no-epic-paths.test.ts`: 20 assertions across steps 02, 04, 05                                               |

This story closes the final documentation gap — `SKILL.md` and `workflow.md` still describe
an always-epic-required skill.

### Sentinel convention

`{epic_id}` = `''` (empty string) is the project-wide no-epic sentinel, established in
story 8-1. All documentation MUST reference this exact sentinel value, not `null` or any
other placeholder.

### Exact target state for each file

#### SKILL.md — after this story

```markdown
---
name: clickup-create-story
description:
  'Creates a ClickUp task in the active sprint list — as a subtask of a chosen
  epic, or as a standalone top-level task when no epic parent is needed — with a rich
  description composed from PRD + architecture + epic context. Use when the user says
  "create the next story" or "create story [id]" in a project where the Dev agent
  (story-creation mode) is routed to ClickUp.'
---

Follow the instructions in ./workflow.md.
```

#### workflow.md — section-by-section diff

**Goal (line 3):**

```
Before: ...without modifying upstream BMAD source.
After:  ...without modifying upstream BMAD source. Supports both epic-parented tasks
        (default) and standalone top-level tasks via the no-epic path.
```

**Epic picker section — full replacement:**

```markdown
### Epic picker

Presents the user with their ClickUp spaces and the tasks (epics) in the selected
space's Backlog list so they can choose an epic interactively. When
`[clickup_create_story].allow_no_epic` is `true` (the default), a
`[0] No epic — create as standalone task` entry is prepended to the picker list.
Selecting `[0]` sets `{epic_id}` = `''` (the no-epic sentinel) and `{epic_name}` =
`''`. If the Backlog list is empty and `allow_no_epic` is `true`, the user is offered
a Y/n prompt to continue as a standalone task rather than receiving a hard-stop error.
Setting `[clickup_create_story].allow_no_epic = false` in `.bmadmcp/config.toml`
hides the `[0]` entry and restores the original hard-stop when the Backlog list is
empty.

See: [./steps/step-02-epic-picker.md](./steps/step-02-epic-picker.md)

`{epic_id}` and `{epic_name}` are available to downstream steps after this step
completes. On the no-epic path both values are `''`.
```

**Description Composer section — full replacement:**

```markdown
## Description Composer

Delegates to the `bmad-create-story` workflow in content-composition mode (skip file
writes, return content). `bmad-create-story` performs exhaustive artifact analysis:
BDD acceptance criteria, ordered task/subtask checklist, architecture guardrails,
previous-story intelligence from git, and web research for latest tech. When
`{epic_id}` is non-empty (branch 3a), epic context is pre-supplied from the ClickUp
fetch so story discovery is skipped. When `{epic_id}` is `''` (branch 3b — no-epic
path), `getTaskById` is skipped, no epic context is passed to `bmad-create-story`,
and the composed description contains no "Epic:" or "Parent epic:" field. When
`bmad-create-story` improves upstream, this skill inherits those improvements
automatically. Presents the composed description for review (Y/n/edit) and stores the
confirmed text in `{task_description}`.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{task_description}` before the workflow
proceeds to step 5.
```

**Task Creation section — full replacement:**

```markdown
## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for
duplicate task names in the target sprint list, presents a pre-creation summary for
user confirmation, then calls `createTask`. When `{epic_id}` is non-empty, the call
includes `parent_task_id: {epic_id}`; when `{epic_id}` is `''` (no-epic path),
`parent_task_id` is omitted entirely. The pre-creation summary shows
`_(none — standalone task)_` as the parent-epic line when `{epic_id}` is empty, so
the user can confirm intent before the API call. The created task's `{created_task_id}`
and `{created_task_url}` are stored on success.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step
surfaces it and stops — it does not retry silently.
```

### Files changed by this story

**Modified:**

- `src/custom-skills/clickup-create-story/SKILL.md`
  — updates description frontmatter to mention no-epic / standalone option
- `src/custom-skills/clickup-create-story/workflow.md`
  — extends Goal, documents no-epic option in Epic picker, Description Composer, and Task
  Creation sections

**Unchanged:**

- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`
- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`
- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`
- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`
- All TypeScript source files
- All test files

### References

- EPIC-8 story list bullet 7: "Update `clickup-create-story/SKILL.md` and `workflow.md` to
  describe the no-epic option." [Source: planning-artifacts/epics/EPIC-8-no-epic-stories.md]
- Story 8-4 out of scope: "Documenting `allow_no_epic` in `workflow.md` or `SKILL.md` —
  story 8-7." [Source: planning-artifacts/stories/8-4-allow-no-epic-config-flag.md]
- Current SKILL.md [Source: src/custom-skills/clickup-create-story/SKILL.md]
- Current workflow.md [Source: src/custom-skills/clickup-create-story/workflow.md]
- Current step-02 (allow_no_epic cascade + instructions 9–12)
  [Source: src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md]
- Current step-04 (branch 3a / 3b dispatch)
  [Source: src/custom-skills/clickup-create-story/steps/step-04-description-composer.md]
- Current step-05 (parent_task_id conditional, summary phrase)
  [Source: src/custom-skills/clickup-create-story/steps/step-05-create-task.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
