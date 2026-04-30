# Story 8.1: Epic Picker — No-Epic Option for `clickup-create-story`

Status: done

Epic: [EPIC-8: No-epic stories (standalone tasks)](../epics/EPIC-8-no-epic-stories.md)

> Modifies `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
> (the mandatory epic picker) to surface a "no epic" option so users can create
> a standalone top-level ClickUp task without being forced to pick an epic parent.
>
> Also updates step-04 and step-05 so the downstream steps gracefully handle an
> empty `{epic_id}`, and adds the `allow_no_epic` flag to the config schema.
> No TypeScript changes — markdown only.

## Story

As a **developer** using the `clickup-create-story` skill,
I want the epic picker to offer a "no epic / standalone task" option in addition to
the list of discovered epics — and to respect a config flag that hides this option
for teams that always require an epic —
so that I can create research spikes, ops tasks, and hotfix stories that don't belong
under any epic without being blocked by the mandatory picker.

## Acceptance Criteria

### step-02-epic-picker.md changes

1. **Front-matter** MUST retain all five existing keys byte-for-byte:

   ```yaml
   ---
   space_id: ''
   space_name: ''
   backlog_list_id: ''
   epic_id: ''
   epic_name: ''
   ---
   ```

2. **`## RULES` section** MUST add a new rule (after the existing four) that states:
   - **No-epic option.** When `[clickup_create_story].allow_no_epic` is `true` (the
     default), the pick-list includes a "no epic" entry. Selecting it sets `{epic_id}`
     = `''` and `{epic_name}` = `''`. Step 5 omits `parent_task_id` when `{epic_id}`
     is empty.

3. **Instruction 0 (pinned-config short-circuit)** gains one new cascade key:

   ```
   effective allow_no_epic = [clickup_create_story].allow_no_epic if set,
                              else true
   ```

   Persist `effective_allow_no_epic` in step context for later instructions.

4. **Instruction 9 (empty Backlog)** currently stops unconditionally. When
   `effective_allow_no_epic` is `true`, replace the hard stop with:

   > ⚠️ **Backlog list is empty — no epics found**
   >
   > The Backlog list (`{backlog_list_id}`) in space **{space_name}** contains no
   > root-level tasks. No epics are available to pick from.
   >
   > **Would you like to create this story without an epic parent (standalone
   > task)?** [Y/n]
   - Y or Enter: set `{epic_id}` = `''`, `{epic_name}` = `''`. Emit
     `⏭️ No epic selected — story will be created as a standalone task.` Proceed
     to sprint-list picker (`## NEXT`).
   - N: stop.

   When `effective_allow_no_epic` is `false`, emit the original hard-stop error
   block unchanged.

5. **Instruction 10 (present pick-list)** — when `effective_allow_no_epic` is `true`,
   prepend a zeroth entry to the numbered list:

   ```
   [0] No epic — create as standalone task (research spike, ops task, hotfix, etc.)
   [1] <epic_name> (ID: <task_id>) — status: <status>
   [2] …
   ```

   When `effective_allow_no_epic` is `false`, present the list unchanged (no
   zero entry).

6. **Instruction 11 (ask)** text MUST reflect the zero option when shown:

   > "Which epic should this story be created under? Enter the number." →
   > "Which epic should this story be created under? Enter `0` for no epic, or
   > choose a number."

   (Only updated when `effective_allow_no_epic` is `true`.)

7. **Instruction 12 (parse selection)** gains handling for `0`:
   - Input `0` (when `effective_allow_no_epic` is `true`): set `{epic_id}` = `''`,
     `{epic_name}` = `''`. Emit:

     > ⏭️ **No epic selected — story will be created as a standalone task.**

     Proceed to sprint-list picker (`## NEXT`).

   - All other valid numeric inputs: unchanged behaviour (set `{epic_id}` and
     `{epic_name}` from selection, confirm).

8. **`## NEXT` line** MUST remain byte-for-byte:

   ```
   Proceed to [step-03-sprint-list-picker.md](./step-03-sprint-list-picker.md) with `{space_id}`, `{space_name}`, `{backlog_list_id}`, `{epic_id}`, and `{epic_name}` available in step context.
   ```

### step-04-description-composer.md changes

9. **Instruction 2 (fetch epic from ClickUp)** MUST be guarded:
   - When `{epic_id}` is non-empty: call `getTaskById` as today, store as
     `{epic_description}`.
   - When `{epic_id}` is `''`: skip `getTaskById`. Set `{epic_description}` = `''`.
     Emit: `ℹ️ No epic parent — epic context will be empty in the story description.`

10. **Instruction 3 (invoke bmad-create-story)** — the pre-supplied context block
    MUST reflect the no-epic case:

    ```
    Epic: {epic_name} ({epic_id})  →  "(no epic)" when both are empty
    Epic description: {epic_description}
    ```

    No other changes to instruction 3.

### step-05-create-task.md changes

11. **Instruction 1 (verify required context)** MUST remove `{epic_id}` and
    `{epic_name}` from the "all non-empty" check. These two variables are now
    intentionally empty on the no-epic path. The remaining four (`{sprint_list_id}`,
    `{sprint_list_name}`, `{story_title}`, `{task_description}`) still require
    non-empty values.

    Update the error block to list only the four required variables and remove the
    two epic variables from the table.

12. **Instruction 2 (pre-creation summary)** MUST handle the no-epic case:

    ```
    - Parent epic: **{epic_name}** (`{epic_id}`)      ← existing line (epic chosen)
    - Parent epic: *(none — standalone task)*          ← shown when {epic_id} is ''
    ```

13. **Instruction 5 (`createTask` call)** MUST make `parent_task_id` conditional:

    ```
    - `parent_task_id: "{epic_id}"` — include ONLY if `{epic_id}` is non-empty;
      omit the parameter entirely when `{epic_id}` is `''`
    ```

    The ClickUp MCP tool already treats `parent_task_id` as optional — this story
    surfaces that in the step file.

14. **Instruction 8 (confirm success)** MUST handle the no-epic case in the summary:

    ```
    - Parent epic: **{epic_name}** (`{epic_id}`)      ← existing (epic chosen)
    - Parent epic: *(none — standalone task)*          ← when {epic_id} is ''
    ```

### Config schema

15. `.bmadmcp/config.example.toml` MUST add `allow_no_epic` as a commented optional
    key in the `[clickup_create_story]` section, after the existing
    `pinned_sprint_folder_id` line:

    ```toml
    # allow_no_epic           = true   # Set false to hide the "no epic" option and always require an epic parent
    ```

### No changes outside these files

16. `step-03-sprint-list-picker.md` is NOT modified. Sprint-list picker is unaffected.

17. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
    MUST be empty.

18. No test files are created or modified. `git diff --stat -- tests/` MUST be
    empty. (Tests are story 8-6.)

19. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no
    new failures.

### sprint-status.yaml updated

20. `8-1-epic-picker-no-epic-option` transitions `backlog` → `ready-for-dev` when
    this story file is saved, and → `done` when implementation is complete.

    `epic-8` transitions `backlog` → `in-progress` at the same time (first story
    in the epic).

### Commit

21. Commit message MUST follow Conventional Commits:

    ```
    feat(custom-skills): add no-epic option to story epic picker (story 8-1)
    ```

    Body MUST reference story 8.1, name the three modified step files and
    `config.example.toml`, note that `{epic_id}` = `''` is the sentinel for
    "no parent", and confirm that `allow_no_epic` defaults to `true`.

## Out of Scope

- Changes to `step-03-sprint-list-picker.md` — the sprint-list picker is unaffected.
- No TypeScript changes — the ClickUp adapter already treats `parent_task_id` as
  optional; this story surfaces that in markdown only.
- No test files — story 8-6 owns unit + integration tests for the no-epic path.
- Changes to `clickup-create-bug` — bug skill already has its own optional picker
  (story 7-7). This story targets the feature-story skill only.
- Changes to `clickup-create-epic`, `clickup-dev-implement`, `clickup-code-review`.
- Description-composer auto-fill improvements for the no-epic path — out of scope
  (tracked in EPIC-8 story 8-2 explicitly).
- Auto-saving `allow_no_epic` to config — it is a team preference set once, not
  a per-run discovery value.

## Tasks / Subtasks

- [x] **Task 1 — Update `step-02-epic-picker.md` (AC: #1–#8)**
  - [x] Read the current file fully before making any edits.
  - [x] Add `allow_no_epic` cascade to instruction 0.
  - [x] Add `## RULES` rule for no-epic option.
  - [x] Update instruction 9 (empty Backlog) to offer standalone fallback when flag
        is `true`.
  - [x] Update instruction 10 (pick-list) to prepend `[0]` entry when flag is `true`.
  - [x] Update instruction 11 (ask text) to reference `0`.
  - [x] Update instruction 12 (parse) to handle `0` → empty sentinel.
  - [x] Verify front-matter and `## NEXT` line are byte-unchanged.

- [x] **Task 2 — Update `step-04-description-composer.md` (AC: #9–#10)**
  - [x] Guard instruction 2 (`getTaskById`) with `{epic_id}` non-empty check.
  - [x] Update instruction 3 pre-supplied context to show `(no epic)` label when
        both epic variables are empty.

- [x] **Task 3 — Update `step-05-create-task.md` (AC: #11–#14)**
  - [x] Remove `{epic_id}` and `{epic_name}` from the required-non-empty check in
        instruction 1; update the error block table.
  - [x] Update instruction 2 pre-creation summary to show `*(none — standalone task)*`
        when `{epic_id}` is empty.
  - [x] Update instruction 5 `createTask` call to omit `parent_task_id` when
        `{epic_id}` is empty.
  - [x] Update instruction 8 success summary to handle no-epic case.

- [x] **Task 4 — Update `.bmadmcp/config.example.toml` (AC: #15)**
  - [x] Add `allow_no_epic` commented line to `[clickup_create_story]` section.

- [x] **Task 5 — Regression verification (AC: #16–#19)**
  - [x] Confirm `step-03-sprint-list-picker.md` is untouched.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean
        (one pre-existing failure in dependency-audit unrelated to this story).

- [x] **Task 6 — Update sprint-status.yaml (AC: #20)**
  - [x] Set `8-1-epic-picker-no-epic-option: done`.
  - [x] Set `epic-8: in-progress`.
  - [x] Update `last_updated` field.

- [x] **Task 7 — Commit (AC: #21)**
  - [x] Stage: `step-02-epic-picker.md`, `step-04-description-composer.md`,
        `step-05-create-task.md`, `.bmadmcp/config.example.toml`,
        `planning-artifacts/stories/8-1-epic-picker-no-epic-option.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #21.

## Dev Notes

### Key design decision: sentinel is `''` (empty string)

Consistent with `clickup-create-bug`'s step-03 (story 7-7), we use empty string
`''` as the sentinel for "no epic selected". This aligns with how the ClickUp
adapter already treats `parent_task_id` — an absent or empty value means no parent.
Using `''` (rather than `null` or `__NONE__`) avoids JSON type mismatches and
matches YAML front-matter defaults.

### Why step-05 already handles the empty case (almost)

`step-05` instruction 5 currently passes `parent_task_id: "{epic_id}"` unconditionally.
The ClickUp `createTask` MCP tool already accepts `parent_task_id` as optional (see
`src/tools/clickup-adapter.ts`), so omitting it produces a root-level task. Story 8-1
surfaces this by making the instruction explicit — same pattern as bug skill story 7-6
wired it and story 7-7 used it.

The existing instruction 1 check (`{epic_id}` must be non-empty) is the guard that
currently enforces the always-epic invariant. Story 8-1 relaxes this check.

### `allow_no_epic` defaults to `true`

EPIC-8 doc notes the plan favours `true`. Teams that always require epics can set it
`false` in `.bmadmcp/config.toml`. The flag is read in instruction 0 of step-02 and
stored as `effective_allow_no_epic` for use in instructions 9–12.

### Description composer: empty epic block is valid

When `{epic_id}` is `''`, instruction 2 skips `getTaskById` and leaves
`{epic_description}` = `''`. `bmad-create-story` is invoked with an empty epic block;
it still runs full artifact analysis (PRD, architecture, epics file) — only the
ClickUp epic task description is absent. The story content will reference the
planning-artifact epics file if relevant context exists there.

### Analogy with bug skill (story 7-7)

| Dimension               | Bug skill (7-7)                  | Story skill (8-1)                                   |
| ----------------------- | -------------------------------- | --------------------------------------------------- |
| Epic picker step        | Step 3 (optional from the start) | Step 2 (was mandatory, now has no-epic)             |
| Default stance          | Skip prompt shown first          | Numbered list shown first, 0 = no epic              |
| Config flag             | (none — always optional)         | `allow_no_epic` (default `true`)                    |
| `{epic_id}` sentinel    | `''`                             | `''`                                                |
| Step 5 `parent_task_id` | Conditional since story 7-6      | Conditional after this story                        |
| Backlog-empty fallback  | Soft — offers skip               | Soft when `allow_no_epic = true`; hard when `false` |

### Files changed by this story

**Modified**

- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`
  — adds `allow_no_epic` cascade, `[0]` pick-list entry, instruction 9/11/12 updates
- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`
  — guards `getTaskById` call, updates pre-supplied context for no-epic case
- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md`
  — relaxes instruction 1 required-check; conditionalises `parent_task_id`;
  updates summary and success blocks
- `.bmadmcp/config.example.toml`
  — adds `allow_no_epic` commented line to `[clickup_create_story]`
- `planning-artifacts/stories/8-1-epic-picker-no-epic-option.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**New / Deleted**

- (none)

## Dev Agent Record

### Implementation Plan

- Story 8-1 is a markdown-only change (no TypeScript).
- Sentinel for "no epic" is `''` (empty string), consistent with bug skill story 7-7.
- `allow_no_epic` defaults to `true`; teams can set `false` in `.bmadmcp/config.toml`.
- Step-02 epic picker now prepends `[0] No epic` when flag is true and handles empty Backlog gracefully.
- Step-04 guards `getTaskById` and updates pre-supplied context label.
- Step-05 relaxes required-check, conditionalises `parent_task_id`, and updates summaries.

### Completion Notes

- All ACs satisfied.
- Build, lint, format pass. Tests pass (one pre-existing dependency-audit failure unrelated).
- Sprint status and story file updated to `done`.

## Change Log

| Date       | Change                                       |
| ---------- | -------------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev.       |
| 2026-05-01 | Story implemented. Status → done.            |
| 2026-05-01 | Code review complete. 4 patches, 2 deferred. |

### Review Findings

- [x] [Review][Patch] step-05 dual "Parent epic:" bullets emit ambiguously without conditional fence [`step-05-create-task.md`:49–50, :100–101]
- [x] [Review][Patch] sprint-status.yaml body `last_updated` says `ready-for-dev` instead of `done` — resolved by subsequent commits
- [x] [Review][Patch] Instruction 12: input `0` when `allow_no_epic=false` has no explicit rejection [`step-02-epic-picker.md`:instruction 12]
- [x] [Review][Patch] step-04 Branch 3a: `→ "(no epic)"` annotation is dead/misleading in the epic path [`step-04-description-composer.md`:42]
- [x] [Review][Defer] Non-boolean `allow_no_epic` TOML value (string/int) — coercion undefined — deferred, pre-existing pattern; smol-toml loader handles parsing uniformly across all flags
- [x] [Review][Defer] Instruction 9 / instruction 12: non-Y/N/number inputs unhandled — deferred, pre-existing pattern across the skill's [Y/n] prompts; not introduced here
