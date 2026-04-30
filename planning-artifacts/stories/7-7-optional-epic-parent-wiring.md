# Story 7.7: Optional epic parent wiring for `clickup-create-bug`

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> Implements `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`
> — the only skill-logic file this story touches.
>
> Step 5 already handles the conditional `parent_task_id` correctly (story 7-6):
> if `{epic_id}` is non-empty it wires `parent_task_id`; if empty it omits it.
> This story provides the interactive optional picker that sets `{epic_id}` — or
> leaves it `''` when the user skips. No TypeScript changes; markdown only.

## Story

As a **developer** using the `clickup-create-bug` skill,
I want step 3 to let me optionally attach the bug to an epic parent — or skip if
the bug doesn't belong to any epic —
so that the created task is linked to the right epic when relevant and created as a
top-level task when it is not.

## Acceptance Criteria

### Step file structure

1. `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`
   MUST contain the implemented epic-picker logic. The stub block is replaced;
   no other file is created or deleted.

2. **YAML front-matter** MUST retain the two keys from the stub, byte-for-byte:

   ```yaml
   ---
   epic_id: ''
   epic_name: ''
   ---
   ```

3. **`## STATUS` block removed.** The entire stub (`## STATUS` heading, body
   paragraphs, skip-contract paragraph, `See:` link, and surrounding blank lines)
   is replaced with `## RULES` and `## INSTRUCTIONS` sections.

4. **`## NEXT` line preserved** byte-for-byte. The `step-04-description-composer.md`
   link MUST remain unchanged.

### RULES section

5. The `## RULES` section MUST include these three rules:

   (a) **Optional step.** This step is skippable — bugs do not require an epic
   parent. When the user skips, `{epic_id}` and `{epic_name}` remain `''`.
   Step 5 checks `{epic_id}` before setting `parent_task_id` on the created
   task — an empty value means no parent.

   (b) **Read-only.** This step calls only `searchSpaces` and `searchTasks`.
   MUST NOT call any ClickUp write tool.

   (c) **No fabrication.** MUST NOT invent or assume an epic ID. Always display
   the enumerated list of epics from `searchTasks` and wait for explicit user
   selection. If the user skips, `{epic_id}` stays `''`.

### INSTRUCTIONS section

6. **Pinned-config short-circuit.** Read `{project-root}/.bmadmcp/config.toml`
   if it exists. Treat any missing file, missing section, or missing key as
   unset.

   Derive effective pinned values:

   ```
   effective pinned_epic_id   = [clickup_create_bug].pinned_epic_id   if non-empty
   effective pinned_epic_name = [clickup_create_bug].pinned_epic_name if non-empty
                                else "(pinned)" if pinned_epic_id is set
   ```

   - **If `pinned_epic_id` is set:** confirm to the user:

     > ✅ Epic pinned via .bmadmcp/config.toml — skipping epic picker.

     Set `{epic_id}` = effective `pinned_epic_id`, `{epic_name}` = effective
     `pinned_epic_name`. Proceed directly to step 4 (`## NEXT`).

   - **Otherwise:** continue to instruction 2.

7. **Skip prompt.** Emit the following verbatim:

   > 🔗 **Optional: Attach this bug to an epic**
   >
   > Bugs do not require an epic parent. Press **Enter** or type `s` to skip
   > and create the bug without a parent. Type `y` to browse epics.

   Wait for user input:
   - `s` or empty input (Enter alone): set `{epic_id}` = `''`, `{epic_name}` = `''`.
     Emit `⏭️ Epic picker skipped — bug will be created without an epic parent.`
     Proceed to step 4 (`## NEXT`).
   - `y`: continue to instruction 3.

8. **Resolve Backlog list.** Derive `{backlog_list_id}` via the cascade below.
   Treat any missing file, missing section, or missing key as unset:

   ```
   effective backlog_list_id = [clickup].pinned_backlog_list_id              if non-empty
                               else [clickup_create_story].pinned_backlog_list_id if non-empty
                               else (discover via searchSpaces)
   ```

   - **If effective `backlog_list_id` is set:** proceed to instruction 5.
   - **If not set:** call `searchSpaces` with `terms: ["{space_name}"]` using the
     `{space_name}` from step 2's front-matter. Scan the returned list tree for a
     list whose name is exactly `Backlog` (case-insensitive). If found, set
     `{backlog_list_id}` and proceed to instruction 5. If not found, emit the
     error block in instruction 4 and ask whether to skip.

9. **Backlog-not-found fallback.** If no Backlog list was located in instruction 3,
   emit the following verbatim:

   > ❌ **Epic picker failed — Backlog list not found**
   >
   > Could not find a list named "Backlog" in space **{space_name}**.
   >
   > **Why:** Epics are stored as root-level tasks in the Backlog list. Without
   > it the picker cannot enumerate epics.
   >
   > **What to do:** Create a "Backlog" list in your space, set
   > `[clickup].pinned_backlog_list_id` in `.bmadmcp/config.toml`, or skip the
   > epic picker.

   Ask: `Skip epic picker and create bug without a parent? [Y/n]`
   - Y or Enter: set `{epic_id}` = `''`, `{epic_name}` = `''`. Proceed to
     step 4 (`## NEXT`).
   - N: stop.

10. **Enumerate epics.** Call `searchTasks` with `list_ids: ["{backlog_list_id}"]`
    and no search terms to retrieve all tasks in the Backlog list.

    **Filter to root-level tasks only.** Drop any task whose `parent_task_id` field
    is non-empty. Treat all of the following as "no parent" (keep the task):
    the field is missing entirely from the response, the value is the literal
    string `null`, the value is an empty string `''`, or the value is JSON `null`.
    Only tasks that survive this filter are candidate epics.

11. **No epics found.** If zero root-level tasks are returned, emit the following
    verbatim:

    > ⚠️ **No epics found in Backlog list**
    >
    > The Backlog list (`{backlog_list_id}`) contains no root-level tasks.
    >
    > **Why:** Epics are created by the team lead as root-level tasks in the
    > Backlog list before bugs can be attached to them.

    Ask: `Skip epic picker and create bug without a parent? [Y/n]`
    - Y or Enter: set `{epic_id}` = `''`, `{epic_name}` = `''`. Proceed to
      step 4 (`## NEXT`).
    - N: stop.

12. **Present epic list.** Display a numbered pick-list:

    ```
    [N] <epic_name> (ID: <task_id>) — status: <status>
    ```

    Follow with:

    > "Which epic should this bug be attached to? Enter the number, or press
    > **Enter** to skip (no parent)."

13. **Parse selection.**
    - **Empty input (Enter alone):** set `{epic_id}` = `''`, `{epic_name}` = `''`.
      Emit `⏭️ No epic selected — bug will be created without a parent.` Proceed to
      step 4 (`## NEXT`).
    - **Numeric input:** validate the number is between 1 and N. If invalid,
      re-present the list and ask again.
    - Set `{epic_id}` = selected task ID, `{epic_name}` = selected task name.
    - Confirm:

      > ✅ Epic selected: **{epic_name}** (`{epic_id}`). Continuing to description
      > composer…

### No changes outside step-03

14. `step-05-create-task.md` is NOT modified. The existing conditional
    `parent_task_id` logic already handles `{epic_id}` being `''` correctly
    (from story 7-6). `git diff --stat -- 'src/custom-skills/clickup-create-bug/steps/step-05-create-task.md'`
    MUST be empty.

15. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
    MUST be empty.

16. No test files are created or modified. `git diff --stat -- tests/` MUST be
    empty.

17. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
    no new failures.

### Config example updated

18. `.bmadmcp/config.example.toml` MUST have two new optional-key comment lines
    added to the `[clickup_create_bug]` section:

    ```toml
    # pinned_epic_id   = ""    # Pin the epic parent (skips epic picker)
    # pinned_epic_name = ""    # Display name for the pinned epic
    ```

    These lines MUST appear after the existing three comment lines
    (`target_list_id`, `default_priority`, `default_tags`). No other lines in
    the file are modified.

### sprint-status.yaml updated

19. `7-7-optional-epic-parent-wiring` transitions `backlog` → `ready-for-dev`
    when this story file is saved, and → `done` when implementation is complete.

### Commit

20. Commit message MUST follow Conventional Commits:

    ```
    feat(custom-skills): implement optional epic picker for bug skill (story 7-7)
    ```

    Body MUST reference story 7.7, name `step-03-epic-picker.md` as the modified
    file, note that `{epic_id}` is set only when the user selects an epic and is
    `''` otherwise, and confirm that step-05 picks up the value automatically with
    no changes.

## Out of Scope

- Any changes to `step-05-create-task.md` — it already handles `{epic_id}`
  conditionally (story 7-6).
- Changes to `clickup-create-story`, `clickup-create-epic`, `clickup-dev-implement`,
  or `clickup-code-review`.
- Auto-saving the chosen epic to config — bugs rarely repeat under the same epic,
  so pinning is a manual opt-in via `pinned_epic_id` only.
- Anything requiring EPIC-8 infrastructure — the bug skill has treated `{epic_id}`
  as optional since story 7-2 (scaffold), and step-05 handles the empty case since
  story 7-6. EPIC-8 covers the feature-story flow; the bug skill does not depend on
  it for this story.
- Regression check of `clickup-create-story` (story 7-8).
- Tests and fixtures (story 7-9).
- Documentation updates (story 7-10).

## Tasks / Subtasks

- [x] **Task 1 — Implement `step-03-epic-picker.md` (AC: #1–#13)**
  - [x] Remove `## STATUS` stub block entirely (heading, body, skip-contract
        paragraph, `See:` link, and surrounding blank lines).
  - [x] Add `## RULES` section with three rules: optional, read-only, no-fabrication
        (AC #5).
  - [x] Add `## INSTRUCTIONS` section with numbered steps matching ACs #6–#13:
        config short-circuit, skip prompt, Backlog-list cascade, Backlog-not-found
        fallback, searchTasks + root-level filter, no-epics fallback, pick-list
        display, parse selection.
  - [x] Verify front-matter is byte-unchanged (two keys per AC #2).
  - [x] Verify `## NEXT` line is byte-unchanged (AC #4).

- [x] **Task 2 — Update `.bmadmcp/config.example.toml` (AC: #18)**
  - [x] Add `pinned_epic_id` and `pinned_epic_name` comment lines to
        `[clickup_create_bug]` section after the existing three comment lines.

- [x] **Task 3 — Regression verification (AC: #14–#17)**
  - [x] `git diff --stat -- 'src/custom-skills/clickup-create-bug/steps/step-05-create-task.md'`
        → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean
        (1 pre-existing failure in dependency-audit.test.ts unrelated to this story).

- [x] **Task 4 — Update sprint-status.yaml (AC: #19)**
  - [x] Set `7-7-optional-epic-parent-wiring: done`.
  - [x] Update `last_updated` field.

- [x] **Task 5 — Commit (AC: #20)**
  - [x] Stage: `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`,
        `.bmadmcp/config.example.toml`,
        `planning-artifacts/stories/7-7-optional-epic-parent-wiring.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #20.

## Dev Notes

### Why only step-03 changes (not step-05)

Story 7-6 implemented `step-05-create-task.md` with the conditional
`parent_task_id` logic already in place:

```markdown
- `parent_task_id: "{epic_id}"` — include ONLY if `{epic_id}` is non-empty;
  omit the parameter entirely when `{epic_id}` is `''`
```

When story 7-7 lands and step-03 starts setting `{epic_id}` to a real task ID (or
leaving it `''` on skip), step-05 picks it up automatically. **Do not touch
`step-05-create-task.md`.**

### Stale comment in step-05

Step-05 instruction 1 contains: _"step 3 is a stub until story 7-7"_. After
story 7-7 ships, this comment is historically accurate but stale. Per story 7-6
dev notes, step-05 is NOT edited in story 7-7. The stale note is benign; it can
be cleaned up in story 7-10 documentation pass if desired.

### EPIC-8 dependency clarification

The EPIC-7 epic file notes that story 7-7 "depends on EPIC-8 landing first."
That was a forward-looking precaution written when step-05 still had the full
`## STATUS` stub. Since story 7-6 shipped the conditional `parent_task_id`
logic in step-05 — with `{epic_id}` explicitly optional and `''`-safe — the
EPIC-8 dependency no longer blocks story 7-7. EPIC-8 addresses optional-parent
for the feature-story flow (`clickup-create-story`), which is a separate concern.

### Skip-first UX rationale

The skip prompt (instruction 2) appears **before** any Backlog discovery calls.
If the user wants no parent, they press Enter and zero additional API calls are
made. Only when the user types `y` does the Backlog resolution run. This
ordering is intentional: bugs frequently don't belong to any epic, so the
default path (skip) should be instant.

### Backlog list cascade rationale

`[clickup].pinned_backlog_list_id` is auto-saved by `clickup-create-story` and
`clickup-create-epic` after their first picker run. Reusing it here avoids a
`searchSpaces` call in the happy path for teams that have run those skills
before. The cascade:

```
[clickup].pinned_backlog_list_id              (written by create-story / create-epic)
[clickup_create_story].pinned_backlog_list_id (skill-specific override, uncommon)
searchSpaces fallback                         (first-run, no prior create-story run)
```

### Root-level filter

Same filter as `clickup-create-story` step-02 instruction 8. Prevents subtasks
(created under the Backlog list via the cross-list-subtask pivot) from appearing
as candidate epics. The filter is strict: only tasks with absent, `null`, or
empty-string `parent_task_id` are candidates.

### Variable flow after step-03

| Variable      | Selected-epic path | Skip path |
| ------------- | ------------------ | --------- |
| `{epic_id}`   | Task ID string     | `''`      |
| `{epic_name}` | Task name string   | `''`      |

Step-05 instruction 10 passes `parent_task_id` only when `{epic_id}` is
non-empty; instruction 7 (pre-creation summary) omits the "Parent epic" line
when `{epic_id}` is empty. No downstream changes needed.

### Config keys added to config.example.toml

Exact lines to add after `# default_tags     = []` in `[clickup_create_bug]`:

```toml
# pinned_epic_id   = ""    # Pin the epic parent (skips epic picker)
# pinned_epic_name = ""    # Display name for the pinned epic
```

### Git commit pattern (analogous stories)

```
feat(custom-skills): implement optional epic picker for bug skill (story 7-7)
```

Body: references story 7.7, names `step-03-epic-picker.md`, notes that
`{epic_id}` is set only when the user selects an epic (empty string otherwise),
and confirms step-05 picks up the change automatically with no edits.

### Files changed by this story

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`
  — `## STATUS` stub deleted; `## RULES` + `## INSTRUCTIONS` inserted between H1
  and `## NEXT`
- `.bmadmcp/config.example.toml`
  — two new comment lines appended to `[clickup_create_bug]` section
- `planning-artifacts/stories/7-7-optional-epic-parent-wiring.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**New / Deleted**

- (none)

## Dev Agent Record

### Agent Model Used
Kimi Code CLI

### Debug Log References
N/A — markdown-only story, no runtime debug logs generated.

### Completion Notes List
- Implemented step-03-epic-picker.md with 3 RULES (optional, read-only, no-fabrication) and 8 INSTRUCTIONS (pinned-config short-circuit, skip prompt, Backlog-list cascade, Backlog-not-found fallback, enumerate epics with root-level filter, no-epics fallback, present epic list, parse selection).
- Front-matter (`epic_id`, `epic_name`) and `## NEXT` link preserved byte-for-byte.
- Added `pinned_epic_id` and `pinned_epic_name` comment lines to `.bmadmcp/config.example.toml` under `[clickup_create_bug]`.
- Regression checks confirm step-05-create-task.md, all `.ts` files, and `tests/` are untouched.
- Build, lint, and format pass. One pre-existing test failure in `dependency-audit.test.ts` (unrelated `node:async_hooks` import issue).

### File List

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-03-epic-picker.md`
- `.bmadmcp/config.example.toml`
- `planning-artifacts/stories/7-7-optional-epic-parent-wiring.md`
- `planning-artifacts/sprint-status.yaml`

**New / Deleted**

- (none)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
| 2026-05-01 | Story implemented. Status → done.      |
