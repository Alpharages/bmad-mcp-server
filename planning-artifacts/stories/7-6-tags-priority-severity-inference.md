# Story 7.6: Wire tags, priority, and severity inference into `createTask`

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> Fills the `🚧 Not yet implemented — stories 7-6 + 7-7` stub in
> `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`.
>
> The step validates all required variables from upstream steps, reads the
> `.bmadmcp/config.toml` `[clickup_create_bug]` table for priority/tag
> overrides, infers `{bug_priority}` from the `**Severity:**` label in
> `{bug_description}`, assembles `{bug_tags}`, runs a duplicate-task search
> with `searchTasks`, presents a pre-creation summary for user confirmation,
> calls `createTask` with `tags` and `priority` set (and `parent_task_id`
> included only when `{epic_id}` is non-empty), and stores the created task's
> `{created_task_id}` and `{created_task_url}`.
>
> No TypeScript is touched; this story ships markdown only.

## Story

As a **developer** using the `clickup-create-bug` skill,
I want step 5 to create a ClickUp task with `bug` tag and severity-inferred
priority, after checking for duplicates and presenting a confirmation summary,
so that the created bug ticket is correctly labelled and prioritised without
manual post-creation edits.

## Acceptance Criteria

### Step file structure

1. `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`
   MUST contain the implemented task-creation logic. The stub block is
   replaced; no other file is created or deleted.

2. **YAML front-matter** MUST retain the eight keys established by story 7-2
   and consumed by downstream / reporting steps, with their original comments
   intact:

   ```yaml
   ---
   # inputs from upstream steps
   target_list_id: ''
   target_list_name: ''
   epic_id: '' # '' when step-03 was skipped — omit parent_task_id from createTask call
   epic_name: ''
   bug_title: ''
   bug_description: ''
   # outputs set by this step
   created_task_id: ''
   created_task_url: ''
   ---
   ```

   No keys are added, removed, or renamed. Exact key spelling and comment
   wording matter — step-05 is the terminal step and its front-matter is the
   record of the created task.

3. **`## STATUS` block replaced.** The `🚧 Not yet implemented — stories 7-6
   - 7-7`stub block (including the`See:`link and its surrounding content)
is removed and replaced with`## RULES`and`## INSTRUCTIONS` sections.

4. **`## NEXT` line preserved** byte-for-byte. The "Terminal step" sentence
   MUST remain unchanged.

### RULES section

5. The `## RULES` section MUST include these four rules, identical in intent
   to the corresponding rules in `clickup-create-story` step 5:

   (a) **Mode requirement.** `CLICKUP_MCP_MODE` MUST be `write`; `createTask`
   is only registered in `write` mode. If the mode is `read-minimal` or
   `read`, emit the following verbatim and stop immediately:

   > ❌ **Task creation failed — write mode required**
   >
   > The `clickup-create-bug` skill requires `CLICKUP_MCP_MODE=write` to
   > create tasks. The current mode does not register `createTask`.
   >
   > **Why:** `createTask` is only registered in `write` mode.
   >
   > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and
   > restart the MCP server, then re-invoke the skill from step 1.

   (b) **One-shot write rule.** `createTask` is called exactly once per skill
   execution. MUST NOT retry on a successful response and MUST NOT call
   `createTask` a second time for any reason.

   (c) **Duplicate-check rule.** Before calling `createTask`, the step MUST
   call `searchTasks({ terms: ["{bug_title}"], list_ids: ["{target_list_id}"]
})` and scan the results for a task whose name matches `{bug_title}` exactly
   (case-insensitive). If a match is found, emit the duplicate warning (AC #13)
   and require the user to type the literal character `y` (lower-case) to
   proceed; any other input (including Enter alone) aborts.

   (d) **Blocking-on-error rule.** If `createTask` returns an error response
   (i.e., the response text contains `Error creating task:` or the `task_id:`
   line is absent), emit the standard creation-error block (AC #16), surface
   the raw error text, and stop. MUST NOT silently proceed or produce a partial
   success message.

### INSTRUCTIONS section

6. **Verify required variables.** Check that `{target_list_id}`,
   `{target_list_name}`, `{bug_title}`, and `{bug_description}` are all
   non-empty. `{epic_id}` is optional — its absence is not an error (step 3
   is a stub until story 7-7). If any required variable is missing, emit the
   following verbatim (replacing `{MISSING or present}` with the actual runtime
   status of each variable) and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `clickup-create-bug` skill requires the following variables to be set
   > before the task can be created:
   >
   > - `{target_list_id}` — {MISSING or present} (set by step 2: list picker)
   > - `{target_list_name}` — {MISSING or present} (set by step 2: list picker)
   > - `{bug_title}` — {MISSING or present} (set by step 4: description composer)
   > - `{bug_description}` — {MISSING or present} (set by step 4: description composer)
   >
   > **Why:** These variables are required parameters for `createTask`. Without
   > them, the task cannot be created.
   >
   > **What to do:** Re-run from step 1 to ensure all prerequisite steps have
   > completed successfully, then return to this step.

7. **Read config overrides.** Read `.bmadmcp/config.toml` (project root) if
   it exists. Treat any missing file, missing section, or missing key as
   unset. Extract:
   - `[clickup_create_bug].default_priority` — integer 1–4, or unset
   - `[clickup_create_bug].default_tags` — array of strings, or unset/empty

8. **Infer severity from `{bug_description}`.** Scan `{bug_description}` for
   the `**Severity:**` label inside the `## Impact / Severity` section.
   Extract the word that follows: `Critical`, `High`, `Medium`, or `Low`
   (case-insensitive). If the label is absent or the word does not match any
   of these four values, treat severity as unknown.

9. **Map severity to ClickUp priority.** Apply the table below to derive
   `{inferred_priority}`:

   | Severity        | ClickUp priority integer |
   | --------------- | ------------------------ |
   | Critical        | 1 (urgent)               |
   | High            | 2 (high)                 |
   | Medium          | 2 (high)                 |
   | Low             | 4 (low)                  |
   | Unknown/default | 2 (high)                 |

   Medium maps to `high` (not `normal`) per the EPIC-7 requirement that
   priority defaults to `high` for severity ≥ medium.

10. **Apply config priority override.** If `[clickup_create_bug].default_priority`
    is set (non-empty, integer 1–4), use it as `{bug_priority}` instead of
    `{inferred_priority}`. If it is invalid (out of range or non-integer), emit
    a non-fatal warning and fall back to `{inferred_priority}`:

    > ⚠️ `.bmadmcp/config.toml` `[clickup_create_bug].default_priority` is
    > invalid (`{value}`). Expected integer 1–4. Falling back to
    > severity-inferred priority {inferred_priority}.

11. **Assemble tags.** Set `{bug_tags}` to the list `["bug"]`. If
    `[clickup_create_bug].default_tags` is a non-empty array, append each entry
    to `{bug_tags}` (duplicates allowed — ClickUp deduplicates). The `bug` tag
    is always included and always first.

12. **Present the pre-creation summary.** Emit the following verbatim:

    > 📋 **Bug task creation summary**
    >
    > - Title: **{bug_title}**
    > - List: **{target_list_name}** (`{target_list_id}`)
    > - Tags: {bug_tags joined as comma-separated list}
    > - Priority: {bug_priority} ({priority label: urgent/high/normal/low})
    > - Parent epic: **{epic_name}** (`{epic_id}`) _(only if `{epic_id}` is non-empty)_
    > - Description: composed ✓

    Omit the "Parent epic" line entirely when `{epic_id}` is empty.

13. **Check for duplicate tasks.** Call `searchTasks` with
    `terms: ["{bug_title}"]` and `list_ids: ["{target_list_id}"]`. Scan the
    returned tasks for a name that matches `{bug_title}` case-insensitively.
    - If `searchTasks` returns `No tasks available or index could not be built.`
      or no matching task is found, proceed to instruction 14.
    - If a match is found, emit the following verbatim (replacing
      `{existing_task_id}` and `{existing_task_url}` with values from the
      `searchTasks` result):

      > ⚠️ **Duplicate task detected**
      >
      > A task named "{bug_title}" already exists in **{target_list_name}**
      > (`{target_list_id}`).
      > Existing task: `{existing_task_id}` — {existing_task_url}
      >
      > **Creating a second task with the same name may cause confusion.**
      >
      > Type `y` to create a duplicate anyway, or press Enter to abort. [y/N]

      Wait for user input: if the user types `y`, continue to instruction 14;
      otherwise emit `❌ Task creation cancelled — duplicate detected.` and stop.

14. **Confirm with user.** Ask: `Confirm creating this ClickUp bug task? [Y/n]`
    Default answer is Y (proceed if user presses Enter). If the user types `n`,
    emit `❌ Task creation cancelled by user.` and stop.

15. **Create the task.** Call `createTask` with exactly these parameters:
    - `list_id: "{target_list_id}"`
    - `name: "{bug_title}"`
    - `description: "{bug_description}"`
    - `tags: {bug_tags}`
    - `priority: {bug_priority}`
    - `parent_task_id: "{epic_id}"` — include ONLY if `{epic_id}` is non-empty;
      omit the parameter entirely when `{epic_id}` is `''`

    Do NOT pass `status`, `assignees`, `due_date`, `start_date`, or
    `time_estimate` — let ClickUp apply list defaults.

16. **Parse the `createTask` response.** Extract the value after `task_id:` as
    `{created_task_id}`. Extract the value after `url:` as `{created_task_url}`.

    If `task_id:` is absent or the response begins with `Error creating task:`,
    emit the following verbatim (replacing `{raw_error_text}` with the full
    text of the `createTask` response) and stop:

    > ❌ **Task creation failed — ClickUp API error**
    >
    > `createTask` returned an error response. Raw error:
    >
    > {raw_error_text}
    >
    > **Why:** The ClickUp API rejected the request. Common causes: invalid
    > `list_id`, invalid `parent_task_id`, insufficient token permissions, or a
    > transient network error.
    >
    > **What to do:** Review the error above. If the list ID is incorrect,
    > re-run step 2 to re-select it. If the error indicates a permission issue,
    > check that your `CLICKUP_API_KEY` token has create-task permission on the
    > target list. To retry, re-invoke step 5 after resolving the underlying
    > issue.

17. **Store the created task identifiers.** Set `{created_task_id}` and
    `{created_task_url}` from the parsed values.

18. **Confirm success.** Emit the following verbatim:

    > ✅ **ClickUp bug task created successfully!**
    >
    > - Task: **{bug_title}**
    > - Task ID: `{created_task_id}`
    > - URL: {created_task_url}
    > - List: **{target_list_name}**
    > - Tags: {bug_tags joined as comma-separated list}
    > - Priority: {bug_priority} ({priority label})
    >
    > Open the task in ClickUp: {created_task_url}

    Include the "Parent epic" line only when `{epic_id}` is non-empty:
    `- Parent epic: **{epic_name}** (`{epic_id}`)`

### No TypeScript changes

19. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
    MUST be empty.

20. No test files are created or modified. `git diff --stat -- tests/` MUST
    be empty.

21. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
    no new failures.

### sprint-status.yaml updated

22. `7-6-tags-priority-severity-inference` transitions `backlog` →
    `ready-for-dev` when this story file is saved, and → `done` when
    implementation is complete.

### Commit

23. Commit message MUST follow Conventional Commits:

    ```
    feat(custom-skills): wire tags priority and severity inference into createTask (story 7-6)
    ```

    Body MUST reference story 7.6, name the modified step file, and note that
    `{bug_priority}` is inferred from the `**Severity:**` label in
    `{bug_description}` and that `parent_task_id` is omitted when `{epic_id}`
    is empty.

## Out of Scope

- Epic picker (step 3 / story 7-7) — step-03 remains a stub; this story only
  wires the `{epic_id}` pass-through in step-05 (conditional `parent_task_id`).
  Step-03's interactive picker is story 7-7.
- Feature story regression check (story 7-8) — `clickup-create-story` is
  unchanged by this story.
- Tests and fixtures (story 7-9).
- Documentation updates (story 7-10).
- Any changes to `clickup-create-story`, `clickup-create-epic`, or
  `clickup-dev-implement`.
- Adding new keys to `.bmadmcp/config.example.toml` — the `default_priority`
  and `default_tags` keys are already documented there.

## Tasks / Subtasks

- [x] **Task 1 — Implement `step-05-create-task.md` (AC: #1–#18)**
  - [x] Remove the `## STATUS` stub block entirely (heading + body + `See:` link).
  - [x] Add `## RULES` section with four rules: mode-requirement, one-shot-write,
        duplicate-check, blocking-on-error (AC #5).
  - [x] Add `## INSTRUCTIONS` section with numbered steps matching ACs #6–#18:
        variable check, config read, severity inference, priority mapping, config
        override, tag assembly, pre-creation summary, duplicate search,
        confirmation, `createTask` call (with conditional `parent_task_id`),
        response parsing, success emit.
  - [x] Verify front-matter is byte-unchanged (eight keys + two comments as in
        AC #2).
  - [x] Verify `## NEXT` line is byte-unchanged (AC #4).

- [x] **Task 2 — Regression verification (AC: #19–#21)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean (1 pre-existing failure in dependency-audit unrelated to this change).

- [x] **Task 3 — Update sprint-status.yaml (AC: #22)**
  - [x] Set `7-6-tags-priority-severity-inference: done`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Commit (AC: #23)**
  - [x] Stage: `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`,
        `planning-artifacts/stories/7-6-tags-priority-severity-inference.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #23.

## Dev Notes

### Exact change surface in `step-05-create-task.md`

The file already exists at
`src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`.
Its current content is:

```
---
# inputs from upstream steps
target_list_id: ''
target_list_name: ''
epic_id: '' # '' when step-03 was skipped — omit parent_task_id from createTask call
epic_name: ''
bug_title: ''
bug_description: ''
# outputs set by this step
created_task_id: ''
created_task_url: ''
---

# Step 5: Create Task

## STATUS

🚧 **Not yet implemented — stories 7-6 + 7-7**

This step will: validate all required context from steps 01–04, call `searchTasks`
to check for duplicate task names in the target list, present a pre-creation summary
for user confirmation, call `createTask` with bug defaults (`bug` tag, priority
inferred from severity), and store the created task's `{created_task_id}` and
`{created_task_url}`. Optional epic parent wiring (via `{epic_id}`) is handled here
once EPIC-8 lands.

See: [EPIC-7 stories 7-6 and 7-7](../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Terminal step — skill execution ends after `createTask` completes or errors.
```

**Surgical diff — what changes:**

| Region                                      | Action                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| Lines 1–10 (front-matter)                   | **KEEP byte-for-byte** — including both comment lines        |
| `# Step 5: Create Task` (H1)                | **KEEP**                                                     |
| `## STATUS` block + stub body + `See:` link | **DELETE** entirely                                          |
| _(gap between H1 and `## NEXT`)_            | **INSERT** `## RULES` section then `## INSTRUCTIONS` section |
| `## NEXT` + terminal sentence               | **KEEP byte-for-byte**                                       |

The finished file structure must be:

```
---
[front-matter — unchanged]
---

# Step 5: Create Task

## RULES
[4 bullet rules]

## INSTRUCTIONS
[numbered steps 1–13]

## NEXT
Terminal step — skill execution ends after `createTask` completes or errors.
```

### Why step-05 changes once (not twice)

The STATUS stub is shared between stories 7-6 and 7-7 because both touch
step-05. Story 7-6 replaces the stub and includes the conditional
`parent_task_id` logic already: if `{epic_id}` is non-empty, `parent_task_id`
is passed; if empty, it is omitted. When story 7-7 implements step-03 (epic
picker) and sets `{epic_id}`, the existing conditional in step-05 picks it up
automatically. This means step-05 does NOT need to be edited again for story
7-7 — step-03 is the only file story 7-7 modifies.

### Severity inference algorithm

Step 4 composed `{bug_description}` following this section structure:

```
## Impact / Severity

**Severity:** {Critical|High|Medium|Low}

{one-line impact note}
```

Step 5 extracts the value by scanning for the literal string `**Severity:**`
followed by whitespace and one of the four labels. The extraction is
case-insensitive for the label word. If step 4 did not produce this section
(e.g., the user edited the description in the review loop and removed it),
treat severity as unknown and default to priority 2 (high).

### Severity-to-priority mapping rationale

| Severity | Priority integer | Label  | Rationale                                              |
| -------- | ---------------- | ------ | ------------------------------------------------------ |
| Critical | 1                | urgent | Crash / data-loss class — needs immediate triage       |
| High     | 2                | high   | Broken feature — should land in current sprint         |
| Medium   | 2                | high   | EPIC-7: priority floor for severity ≥ medium is `high` |
| Low      | 4                | low    | Cosmetic — can be deferred                             |
| Unknown  | 2                | high   | Fail safe: high is better than silently deprioritising |

Note: priority integer 3 (`normal`) is intentionally not used in the inferred
mapping. It is only reachable via `[clickup_create_bug].default_priority = 3`
in config — giving teams an explicit escape hatch if they want `normal`.

### Tag assembly

`{bug_tags}` is always `["bug", ...extra]`. The `bug` tag identifies the task
class across ClickUp views and automations; it MUST never be omitted. The
`default_tags` config key appends team-specific tags (e.g., `["triage",
"area-backend"]`). ClickUp deduplicates tags server-side, so passing `"bug"`
twice is safe.

### Config keys already documented

Both `default_priority` and `default_tags` are already present in
`.bmadmcp/config.example.toml`:

```toml
[clickup_create_bug]
# default_priority = ""    # Override severity-inferred priority (1=urgent,2=high,3=normal,4=low)
# default_tags     = []    # Extra tags added beyond the automatic "bug" tag
```

No changes to the example file are needed.

### Difference from `clickup-create-story` step 5

The story skill's step 5 (`clickup-create-story`) explicitly DOES NOT pass
`tags` or `priority` to `createTask` — it lets ClickUp apply list defaults.
The bug skill's step 5 explicitly DOES pass both because bug tickets need
the `bug` tag for filtering and severity-inferred priority for triage.

| Concern            | Story step-05                        | Bug step-05 (this story)                          |
| ------------------ | ------------------------------------ | ------------------------------------------------- |
| `parent_task_id`   | Always set (epic required)           | Conditional — set only when `{epic_id}` non-empty |
| `tags`             | Not passed (list defaults)           | `["bug"]` + config extras (always set)            |
| `priority`         | Not passed (list defaults)           | Severity-inferred integer 1–4 (always set)        |
| Required variables | 6 (incl. `{epic_id}`, `{epic_name}`) | 4 (epic vars optional)                            |

### Variable flow at step-05 runtime

| Variable             | Value origin   | Expected content                                    |
| -------------------- | -------------- | --------------------------------------------------- |
| `{target_list_id}`   | step-02        | ClickUp list ID (non-empty — step-02 blocks if '')  |
| `{target_list_name}` | step-02        | Display name for the list                           |
| `{epic_id}`          | step-03 (stub) | `''` until story 7-7 lands                          |
| `{epic_name}`        | step-03 (stub) | `''` until story 7-7 lands                          |
| `{bug_title}`        | step-04        | One-line summary (non-empty — step-04 blocks if '') |
| `{bug_description}`  | step-04        | Full bug-shaped description markdown                |

Step-05 must handle `{epic_id}` being `''` without failing — the conditional
`parent_task_id` logic is the downstream expression of that contract.

### `createTask` parameter contract

Parameters passed by this step:

```
createTask({
  list_id:        "{target_list_id}",
  name:           "{bug_title}",
  description:    "{bug_description}",
  tags:           {bug_tags},         // e.g. ["bug"] or ["bug", "triage"]
  priority:       {bug_priority},     // integer 1–4
  parent_task_id: "{epic_id}",        // omitted entirely when {epic_id} is ''
})
```

Parameters deliberately NOT passed: `status`, `assignees`, `due_date`,
`start_date`, `time_estimate` — let ClickUp apply list defaults.

### Response parsing

The ClickUp MCP `createTask` response format (same as `clickup-create-story`
step 5, confirmed from story 2-5 debug logs):

```
task_id: <id>
url: https://app.clickup.com/t/<id>
```

Extract `{created_task_id}` from the `task_id:` line and `{created_task_url}`
from the `url:` line. An error response starts with `Error creating task:`.

### Git pattern (analogous stories)

Story 7-4 commit: `feat(custom-skills): implement bug description composer (story 7-4)`
Story 7-5 commit: `feat(custom-skills): implement bug list and sprint picker (story 7-5)`
Story 7-6 commit: `feat(custom-skills): wire tags priority and severity inference into createTask (story 7-6)`

### Files changed by this story

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`
  — `## STATUS` stub deleted; `## RULES` + `## INSTRUCTIONS` inserted between
  H1 and `## NEXT`
- `planning-artifacts/stories/7-6-tags-priority-severity-inference.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**No other files change.** Do not touch `workflow.md` — its `## Task Creation`
section already accurately describes step-05's behaviour.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-05-create-task.md`
- `planning-artifacts/stories/7-6-tags-priority-severity-inference.md`
- `planning-artifacts/sprint-status.yaml`

**New / Deleted**

- (none)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
