# Story 7.5: Implement bug list / sprint picker

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> Fills the `🚧 Not yet implemented — story 7-5` stub in
> `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`.
>
> Where a bug ticket lands is intentionally flexible: it can go into the active
> sprint list, a dedicated bugs list, or any list the user selects. The step
> resolves this via a two-key pinning cascade in `.bmadmcp/config.toml`:
> `[clickup_create_bug].target_list_id` short-circuits the entire picker when
> set; the shared `[clickup].pinned_space_id` short-circuits space discovery
> when only the list is unknown. When neither is pinned, the step runs the full
> interactive space → list picker and auto-saves the result so future runs skip
> it.
>
> Unlike `clickup-create-story` step 3 (which filters to a sprint folder), this
> step presents **all non-archived lists** in the selected space, giving the
> user full control over where bugs land. No `bmad-create-story` delegation, no
> TypeScript changes — this story ships markdown only.

## Story

As a **developer** using the `clickup-create-bug` skill,
I want step 2 to discover the target ClickUp list for my bug ticket — either
from a pinned config value or via interactive space + list selection — and
remember my choice for future runs,
so that bugs consistently land in the right list without requiring me to
navigate the space picker on every invocation.

## Acceptance Criteria

### Step file structure

1. `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`
   MUST contain the implemented list-picker logic. The stub block is replaced;
   no other file is created or deleted.

2. **YAML front-matter** MUST retain the four keys established by story 7-2
   and consumed by downstream steps, with their original structure intact:

   ```yaml
   ---
   space_id: ''
   space_name: ''
   target_list_id: ''
   target_list_name: ''
   ---
   ```

   No keys are added, removed, or renamed.

3. **`## STATUS` block replaced.** The `🚧 Not yet implemented — story 7-5`
   stub block (including the `See:` link and its surrounding content) is removed
   and replaced with `## RULES` and `## INSTRUCTIONS` sections.

4. **`## NEXT` line preserved** byte-for-byte. The pointer to
   `step-03-epic-picker.md` MUST remain unchanged.

### RULES section

5. The `## RULES` section MUST include these four rules:

   (a) **Mode requirement.** `searchSpaces` is not registered in
   `read-minimal` mode; `CLICKUP_MCP_MODE` MUST be `read` or `write`. Since
   `createTask` in step 5 requires `write`, the practical minimum for the full
   skill is `write` mode.

   (b) **Read-only.** This step calls only `getCurrentSpace`,
   `clearCurrentSpace`, `pickSpace`, and `searchSpaces`. MUST NOT call any
   ClickUp write tool.

   (c) **Blocking.** MUST NOT proceed to step 3 if `{target_list_id}` or
   `{space_id}` is empty at the end of this step.

   (d) **No fabrication.** MUST NOT invent or assume a list ID. Always display
   the enumerated list and wait for explicit user selection when no pinned value
   is present.

### INSTRUCTIONS section

6. **Pinned-config full short-circuit.** Read
   `.bmadmcp/config.toml` (project root) if it exists. Treat any missing file,
   missing section, or missing key as unset.

   Derive the effective pinned values using the cascade:

   ```
   effective target_list_id  = [clickup_create_bug].target_list_id  if non-empty
   effective pinned_space_id  = [clickup_create_bug].pinned_space_id if non-empty,
                                else [clickup].pinned_space_id
   effective pinned_space_name = [clickup_create_bug].pinned_space_name if non-empty,
                                 else [clickup].pinned_space_name
   ```

   - **If effective `target_list_id` is set:** skip all discovery. Call
     `searchSpaces` with `terms: ["{effective pinned_space_name}"]` (or skip
     the search and use the pinned name directly if both `target_list_id` AND
     `pinned_space_id` are set). Set `{target_list_id}` = effective
     `target_list_id`, `{space_id}` = effective `pinned_space_id` (or `""`
     if unset — step 3 does not require it), `{space_name}` = effective
     `pinned_space_name` (fall back to `(pinned)` if unset). Confirm:

     > ✅ Target list pinned via .bmadmcp/config.toml — skipping list picker.

     If the pinned `target_list_id` later causes a ClickUp API error in step 5
     (list not found, permission denied), surface the error verbatim and
     instruct the user to update or remove `[clickup_create_bug].target_list_id`
     in `.bmadmcp/config.toml`. Then proceed directly to step 3 (epic picker).

   - **If only effective `pinned_space_id` is set (no `target_list_id`):**
     skip `getCurrentSpace` and `pickSpace`. Set `{space_id}` = effective
     `pinned_space_id`, `{space_name}` = effective `pinned_space_name` (or
     `(pinned)`). Proceed directly to instruction 9 (list discovery).

   - **If neither pin is set:** continue to instruction 7 (space selection).

7. **Space selection — session check.** Call `getCurrentSpace` (no arguments).
   If a space is already selected for this MCP session, confirm with the user:

   > Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]

   If confirmed, set `{space_id}` and `{space_name}` from the response and
   skip to instruction 9. If declined, call `clearCurrentSpace` and continue
   to instruction 8.

8. **Space selection — interactive picker.** Call `pickSpace` with no
   arguments to list all available spaces. Ask:

   > "Which space are you working in? Enter the space name or ID."

   Call `pickSpace` with `query: "<user input>"` to select the space. If one
   match, extract `{space_id}` and `{space_name}` from the confirmation
   response. If multiple matches, present them and ask the user to narrow the
   query or provide the exact space ID.

9. **List discovery.** Call `searchSpaces` with `terms: ["{space_name}"]`. If
   the call fails or returns an error response, emit the following error block
   and stop:

   ```
   ❌ **List picker failed — space search error**

   The `searchSpaces` call for space **{space_name}** returned an error.

   **Why:** The ClickUp API or MCP tool encountered a problem retrieving the
   space list tree.

   **What to do:** Check your ClickUp API key and network connection, then
   re-invoke this step.
   ```

   If the response is in summary mode (no list data — occurs when the space
   name matches more than five spaces), emit the following error block and stop:

   ```
   ❌ **List picker failed — space name is ambiguous**

   The name "{space_name}" matched multiple spaces and the search returned
   summary mode with no list data.

   **Why:** `searchSpaces` switches to summary mode when more than five spaces
   match the query. In summary mode, list data is not included.

   **What to do:** Re-run space selection with a more specific name or the
   exact space ID, then re-invoke this step.
   ```

   From the detailed response, filter the tree to entries matching `{space_id}`
   to ensure only the selected space's lists are shown. Collect **all lists**
   visible in the tree — both lists at the top level of the space and lists
   nested inside folders. Filter out any list where `archived: true`.

   If no non-archived lists are found, emit the following error block and stop:

   ```
   ❌ **List picker failed — no active lists**

   Space **{space_name}** (`{space_id}`) contains no non-archived lists.

   **Why:** All lists in this space are archived or the space is empty.

   **What to do:** Unarchive a list or create a new list in your ClickUp
   space, then re-invoke this step.
   ```

10. **List presentation.** Present a numbered list of non-archived lists:

    ```
    [N] <list_name> (list_id: <id>)  [folder: <folder_name>]
    ```

    Omit the `[folder: …]` clause for top-level (unfoldered) lists. Precede
    the list with the hint:

    > "Select the list where this bug ticket should be created. You can choose
    > the active sprint list, a dedicated bugs list, or any other list."

    Follow with:

    > "Enter the number of the target list."

11. **Parse selection.** Validate the user's response is a number between 1
    and N; if invalid, re-present the list and ask again. Set `{target_list_id}`
    to the selected list's ID and `{target_list_name}` to its name.

12. **Auto-save discovered values.** If `{target_list_id}` was set by
    interactive selection in instruction 11 (i.e., NOT from a pinned config
    value), persist the choice so future runs skip the picker:

    a. Write `target_list_id = {target_list_id}` into the
    `[clickup_create_bug]` section of `.bmadmcp/config.toml`.
    - If the file does not exist, create it with just the
      `[clickup_create_bug]` section.
    - If the file exists but has no `[clickup_create_bug]` section, append
      the section.
    - If the `[clickup_create_bug]` section already exists, update the key
      only if it is absent or empty.

    b. If the space was resolved interactively (instructions 7–8, not from a
    pinned `[clickup].pinned_space_id`), also write `pinned_space_id`,
    `pinned_space_name` into the `[clickup]` section using the same
    create-or-append-or-skip-if-set logic.

    c. Before writing each key, check whether it already exists with a
    non-empty value. If it does and the current value differs from the
    discovered value, emit a non-fatal warning:
    `⚠️ .bmadmcp/config.toml already has [{section}].{key} set — not overwriting. Update manually if needed.`
    and skip that key.

    d. After a successful write, confirm:
    `✅ Target list saved to .bmadmcp/config.toml ([clickup_create_bug].target_list_id) — future runs will skip this picker.`

    e. If the write fails for any reason (permission error, disk error), emit
    a non-fatal warning and continue — auto-save is supplemental and MUST
    NOT interrupt the skill session.

13. **Confirm selection.** Emit:

    > ✅ Target list selected: **{target_list_name}** (list_id: `{target_list_id}`).
    > Continuing to epic picker…

    Then proceed to step 3.

### No TypeScript changes

14. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
    MUST be empty.

15. No test files are created or modified. `git diff --stat -- tests/` MUST
    be empty.

16. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
    no new failures.

### sprint-status.yaml updated

17. `7-5-bug-list-and-sprint-picker` transitions `backlog` → `ready-for-dev`
    when this story file is saved, and → `done` when implementation is complete.

### Commit

18. Commit message MUST follow Conventional Commits:

    ```
    feat(custom-skills): implement bug list and sprint picker (story 7-5)
    ```

    Body MUST reference story 7.5, name the modified step file, and note
    that `[clickup_create_bug].target_list_id` pins the target list.

## Out of Scope

- Epic picker (step 3 / story 7-7) — step-03 remains a stub; this step only
  outputs `{space_id}`, `{space_name}`, `{target_list_id}`, `{target_list_name}`.
- Tags, priority, and severity inference (story 7-6) — `createTask` defaults
  are wired in step 5, not here.
- Duplicate-task search (story 7-6) — that runs in step 5 against
  `{target_list_id}`, not here.
- Tests and fixtures (story 7-9).
- Documentation updates (story 7-10).
- Any changes to `clickup-create-story`, `clickup-create-epic`, or
  `clickup-dev-implement`.
- Adding `target_list_name` to the `config.toml` schema (the example toml
  already has `target_list_id`; `target_list_name` is display-only and not
  persisted).

## Tasks / Subtasks

- [ ] **Task 1 — Implement `step-02-list-picker.md` (AC: #1–#13)**
  - [ ] Remove the `## STATUS` stub block entirely (heading + body + `See:` link).
  - [ ] Add `## RULES` section with four rules: mode-requirement, read-only,
        blocking, no-fabrication (AC #5).
  - [ ] Add `## INSTRUCTIONS` section with numbered steps matching ACs #6–#13:
        pinned-config cascade, session check, interactive space picker, list
        discovery via `searchSpaces`, list presentation, selection parse,
        auto-save, confirmation emit.
  - [ ] Verify front-matter is byte-unchanged (four keys as in AC #2).
  - [ ] Verify `## NEXT` line is byte-unchanged (AC #4).

- [ ] **Task 2 — Regression verification (AC: #14–#16)**
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- tests/` → empty.
  - [ ] `npm run build && npm run lint && npm run format && npm test` → clean.

- [ ] **Task 3 — Update sprint-status.yaml (AC: #17)**
  - [ ] Set `7-5-bug-list-and-sprint-picker: done`.
  - [ ] Update `last_updated` field.

- [ ] **Task 4 — Commit (AC: #18)**
  - [ ] Stage: `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`,
        `planning-artifacts/stories/7-5-bug-list-and-sprint-picker.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [ ] Commit with header + body per AC #18.

## Dev Notes

### Exact change surface in `step-02-list-picker.md`

The file already exists at
`src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`.
Its current content is:

```
---
space_id: ''
space_name: ''
target_list_id: ''
target_list_name: ''
---

# Step 2: List Picker

## STATUS

🚧 **Not yet implemented — story 7-5**

This step will: discover the target list for the bug ticket — either a dedicated bug
list or the active sprint list, governed by `.bmadmcp/config.toml`
`[clickup_create_bug].target_list_id`. Presents the user with available spaces and
lists for interactive selection when no pinned list is configured.

See: [EPIC-7 story 7-5](../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Proceed to [step-03-epic-picker.md](./step-03-epic-picker.md).
```

**Surgical diff — what changes:**

| Region                                      | Action                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| Lines 1–6 (front-matter)                    | **KEEP byte-for-byte**                                       |
| `# Step 2: List Picker` (H1)                | **KEEP**                                                     |
| `## STATUS` block + stub body + `See:` link | **DELETE** entirely                                          |
| _(gap between H1 and `## NEXT`)_            | **INSERT** `## RULES` section then `## INSTRUCTIONS` section |
| `## NEXT` + pointer line                    | **KEEP byte-for-byte**                                       |

### Difference from `clickup-create-story` step 3 (sprint picker)

The story skill's sprint picker (`step-03-sprint-list-picker.md`) filters to a
"sprint" folder first, then presents only lists inside that folder. The bug
list picker is deliberately simpler and more flexible:

| Concern                | Story step-03 (sprint picker)                           | Bug step-02 (this story)                                 |
| ---------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Lists shown            | Only lists inside a folder whose name contains "sprint" | All non-archived lists in the space (any folder or none) |
| Config pin             | `[clickup_create_story].pinned_sprint_folder_id`        | `[clickup_create_bug].target_list_id` (direct list ID)   |
| Space pin source       | `[clickup_create_story]` → `[clickup]` cascade          | `[clickup_create_bug]` → `[clickup]` cascade             |
| Auto-save target       | `[clickup_create_story].pinned_sprint_folder_id`        | `[clickup_create_bug].target_list_id`                    |
| Full pin short-circuit | space + folder both pinned → skip searchSpaces          | `target_list_id` set → skip everything                   |

The simpler design is intentional: bugs can go to a sprint list, a dedicated
bugs list, or any list the team chooses. There is no assumption about folder
structure.

### Config cascade for space pins

Both the story and bug skills share the `[clickup]` table for space pins.
The bug skill adds its own space-override tier (`[clickup_create_bug]`) for
teams that use different spaces per intent (e.g., feature stories in one
space, bugs in another). The cascade in instruction 6 must be applied in this
order (highest priority first):

1. `[clickup_create_bug].pinned_space_id` / `pinned_space_name`
2. `[clickup].pinned_space_id` / `pinned_space_name`

This mirrors the pattern established in step-02 of `clickup-create-story`
(`[clickup_create_story]` → `[clickup]` cascade).

### `searchSpaces` list enumeration detail

`searchSpaces` returns a tree structure. Lists can appear:

- Directly in `space.lists[]` (top-level, unfoldered)
- Inside `space.folders[].lists[]` (foldered)

The step must collect from both locations. For the numbered picker, include
the folder name in brackets when the list is foldered (omit for top-level).
This helps users distinguish lists with identical names in different folders.

### Auto-save write target

Space auto-save writes to the shared `[clickup]` table (same as
`clickup-create-story` step-02), so both skills benefit from a single space
discovery. Target-list auto-save writes only to `[clickup_create_bug]`
(bug-specific). This matches the config schema already documented in
`.bmadmcp/config.example.toml`.

### Variable flow at step-02 runtime

| Variable             | Set by    | Consumed by                             |
| -------------------- | --------- | --------------------------------------- |
| `{space_id}`         | this step | step-03 (epic discovery context)        |
| `{space_name}`       | this step | step-03 (epic discovery context)        |
| `{target_list_id}`   | this step | step-05 (`createTask`, `searchTasks`)   |
| `{target_list_name}` | this step | step-04 footer, step-05 summary display |

Step-03 (epic picker stub) reads `{space_id}` / `{space_name}` to scope the
epic search. Step-05's front-matter already has `target_list_id` and
`target_list_name` as inputs (confirmed from the step-05 stub read in story
7-4 dev notes).

### `config.example.toml` already covers this step

The existing `.bmadmcp/config.example.toml` documents:

```toml
[clickup_create_bug]
# target_list_id   = ""    # Pin the target list for bug tickets (skips list picker)
```

No changes to the example file are needed — the key and its description are
already present.

### Git pattern (analogous stories)

Story 7-3 commit: `feat(custom-skills): implement bug prereq check with soft artifact loading (story 7-3)`
Story 7-4 commit: `feat(custom-skills): implement bug description composer (story 7-4)`
Story 7-5 commit: `feat(custom-skills): implement bug list and sprint picker (story 7-5)`

### Files changed by this story

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`
  — `## STATUS` stub deleted; `## RULES` + `## INSTRUCTIONS` inserted between
  H1 and `## NEXT`
- `planning-artifacts/stories/7-5-bug-list-and-sprint-picker.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**No other files change.** Do not touch `workflow.md` — its `## Target-list
Picker` section already accurately describes step-02's behaviour.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-02-list-picker.md`
- `planning-artifacts/stories/7-5-bug-list-and-sprint-picker.md`
- `planning-artifacts/sprint-status.yaml`

**New / Deleted**

- (none)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
