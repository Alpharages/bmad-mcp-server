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

## RULES

1. **Mode requirement.** `CLICKUP_MCP_MODE` MUST be `write`; `createTask` is only registered in `write` mode. If the mode is `read-minimal` or `read`, emit the following verbatim and stop immediately:

   > ❌ **Task creation failed — write mode required**
   >
   > The `bmad-clickup-create-bug` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.
   >
   > **Why:** `createTask` is only registered in `write` mode.
   >
   > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.

2. **One-shot write rule.** `createTask` is called exactly once per skill execution. MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason.

3. **Duplicate-check rule.** Before calling `createTask`, the step MUST call `searchTasks({ terms: ["{bug_title}"], list_ids: ["{target_list_id}"] })` and scan the results for a task whose name matches `{bug_title}` exactly (case-insensitive). If a match is found, emit the duplicate warning (instruction 8) and require the user to type `y`, `u`, or Enter to proceed.

4. **Blocking-on-error rule.** If `createTask` returns an error response (i.e., the response text contains `Error creating task:` or the `task_id:` line is absent), emit the standard creation-error block (instruction 12), surface the raw error text, and stop. MUST NOT silently proceed or produce a partial success message.

## INSTRUCTIONS

1. **Verify required variables.** Check that `{target_list_id}`, `{target_list_name}`, `{bug_title}`, and `{bug_description}` are all non-empty. `{epic_id}` is optional — its absence is not an error (step 3 is a stub until story 7-7). If any required variable is missing, emit the following verbatim (replacing `{MISSING or present}` with the actual runtime status of each variable) and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `bmad-clickup-create-bug` skill requires the following variables to be set before the task can be created:
   >
   > - `{target_list_id}` — {MISSING or present} (set by step 2: list picker)
   > - `{target_list_name}` — {MISSING or present} (set by step 2: list picker)
   > - `{bug_title}` — {MISSING or present} (set by step 4: description composer)
   > - `{bug_description}` — {MISSING or present} (set by step 4: description composer)
   >
   > **Why:** These variables are required parameters for `createTask`. Without them, the task cannot be created.
   >
   > **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed successfully, then return to this step.

2. **Read config overrides.** Read `.bmadmcp/config.toml` (project root) if it exists. Treat any missing file, missing section, or missing key as unset. Extract:
   - `[clickup_create_bug].default_priority` — integer 1–4, or unset
   - `[clickup_create_bug].default_tags` — array of strings, or unset/empty

3. **Infer severity from `{bug_description}`.** Scan `{bug_description}` for the `**Severity:**` label inside the `## Impact / Severity` section. Extract the word that follows: `Critical`, `High`, `Medium`, or `Low` (case-insensitive). If the label is absent or the word does not match any of these four values, treat severity as unknown.

4. **Map severity to ClickUp priority.** Apply the table below to derive `{inferred_priority}`:

   | Severity        | ClickUp priority integer |
   | --------------- | ------------------------ |
   | Critical        | 1 (urgent)               |
   | High            | 2 (high)                 |
   | Medium          | 2 (high)                 |
   | Low             | 4 (low)                  |
   | Unknown/default | 2 (high)                 |

   Medium maps to `high` (not `normal`) per the EPIC-7 requirement that priority defaults to `high` for severity ≥ medium.

5. **Apply config priority override.** If `[clickup_create_bug].default_priority` is set (non-empty, integer 1–4), use it as `{bug_priority}` instead of `{inferred_priority}`. If it is invalid (out of range or non-integer), emit a non-fatal warning and fall back to `{inferred_priority}`:

   > ⚠️ `.bmadmcp/config.toml` `[clickup_create_bug].default_priority` is invalid (`{value}`). Expected integer 1–4. Falling back to severity-inferred priority {inferred_priority}.

6. **Assemble tags.** Set `{bug_tags}` to the list `["bug"]`. If `[clickup_create_bug].default_tags` is a non-empty array, append each entry to `{bug_tags}` (duplicates allowed — ClickUp deduplicates). The `bug` tag is always included and always first.

7. **Present the pre-creation summary.** Emit the following verbatim:

   > 📋 **Bug task creation summary**
   >
   > - Title: **{bug_title}**
   > - List: **{target_list_name}** (`{target_list_id}`)
   > - Tags: {bug_tags joined as comma-separated list}
   > - Priority: {bug_priority} ({priority label: urgent/high/normal/low})
   > - Parent epic: **{epic_name}** (`{epic_id}`) _(only if `{epic_id}` is non-empty)_
   > - Description: composed ✓

   Omit the "Parent epic" line entirely when `{epic_id}` is empty.

8. **Check for duplicate tasks.** Call `searchTasks` with `terms: ["{bug_title}"]` and `list_ids: ["{target_list_id}"]`. Scan the returned tasks for a name that matches `{bug_title}` case-insensitively.
   - If `searchTasks` returns `No tasks available or index could not be built.` or no matching task is found, proceed to instruction 9.
   - If a match is found, emit the following verbatim (replacing `{existing_task_id}` and `{existing_task_url}` with values from the `searchTasks` result):

     > ⚠️ **Duplicate task detected**
     >
     > A task named "{bug_title}" already exists in **{target_list_name}** (`{target_list_id}`).
     > Existing task: `{existing_task_id}` — {existing_task_url}
     >
     > **Creating a second task with the same name may cause confusion.**
     >
     > - Type `y` to create a duplicate anyway.
     > - Type `u` to **replace** the existing task's description with the newly composed one (old description will be deleted).
     > - Press Enter to abort. [y/u/N]

     Wait for user input:
     - If the user types `y`, continue to instruction 9.
     - If the user types `u`, call `updateTask` with `task_id: "{existing_task_id}"` and `replace_description: "{bug_description}"`. On success emit `✅ Existing task description replaced.` and stop (do NOT proceed to instruction 9). On error emit the raw error text and stop.
     - Otherwise emit `❌ Task creation cancelled — duplicate detected.` and stop.

9. **Infer and confirm dependencies.**

   **Auto-inference phase.** Scan `{bug_description}` for dependency signals:
   - Explicit sections: `## Dependencies`, `## Blocked By`, `## Blocks`, `## Related Tasks`
   - Task/story references: patterns like `Story X-Y`, `Epic X`, quoted task titles, or task IDs
   - Natural-language phrases: "depends on", "blocked by", "blocks", "caused by", "must be fixed before/after", "requires", "prerequisite", "related to"
   - The **Impact / Severity** section often references tasks or stories that are affected by this bug — treat those as `blocking` candidates

   For each reference found, call `searchTasks({ terms: ["<referenced title or story key>"] })` (no `list_ids` filter) to resolve it to a task ID. Classify each resolved task:
   - `waiting_on` — if this bug is blocked by it or it is a prerequisite fix
   - `blocking` — if this bug must be resolved before it, or this bug affects it
   - `linked` — if the reference is informational / related-only

   **Propose to user.** After inference emit ONE of:

   a) If any dependencies were inferred:

   > 🔗 **Inferred dependencies**
   >
   > - Waiting on: `{waiting_on_ids}` — {task names} _(only if non-empty)_
   > - Blocking: `{blocking_ids}` — {task names} _(only if non-empty)_
   > - Linked: `{linked_ids}` — {task names} _(only if non-empty)_
   >
   > Confirm these dependencies? [Y/edit/n]
   - `Y` or Enter → use the inferred lists as `{waiting_on_ids}`, `{blocking_ids}`, `{linked_ids}` and proceed.
   - `edit` → ask the three correction questions in sequence (each skippable with Enter), replacing the inferred lists.
   - `n` → clear all three lists to `[]` and proceed without any dependencies.

   b) If no dependencies were inferred:

   > 🔗 **No dependencies detected in the description.**
   >
   > Want to add manual dependencies? [y/N]
   - `y` → ask the three questions in sequence (each skippable with Enter):
     1. **Waiting on** (comma-separated task IDs, or Enter to skip) → `{waiting_on_ids}`
     2. **Blocking** (comma-separated task IDs, or Enter to skip) → `{blocking_ids}`
     3. **Linked** (comma-separated task IDs, or Enter to skip) → `{linked_ids}`
   - Enter/`n` → set all three lists to `[]` and proceed.

   If any are non-empty, append dependency lines to the pre-creation summary:

   > - Waiting on: `{waiting_on_ids joined as comma-separated list}` _(only if non-empty)_
   > - Blocking: `{blocking_ids joined as comma-separated list}` _(only if non-empty)_
   > - Linked: `{linked_ids joined as comma-separated list}` _(only if non-empty)_

10. **Confirm with user.** Ask: `Confirm creating this ClickUp bug task? [Y/n]` Default answer is Y (proceed if user presses Enter). If the user types `n`, emit `❌ Task creation cancelled by user.` and stop.

11. **Create the task.** Call `createTask` with exactly these parameters:
    - `list_id: "{target_list_id}"`
    - `name: "{bug_title}"`
    - `description: "{bug_description}"`
    - `tags: {bug_tags}`
    - `priority: {bug_priority}`
    - `parent_task_id: "{epic_id}"` — include ONLY if `{epic_id}` is non-empty; omit the parameter entirely when `{epic_id}` is `''`
    - `waiting_on: {waiting_on_ids}` — include ONLY if `{waiting_on_ids}` is non-empty
    - `blocking: {blocking_ids}` — include ONLY if `{blocking_ids}` is non-empty
    - `linked_tasks: {linked_ids}` — include ONLY if `{linked_ids}` is non-empty

    Do NOT pass `status`, `assignees`, `due_date`, `start_date`, or `time_estimate` — let ClickUp apply list defaults.

12. **Parse the `createTask` response.** Extract the value after `task_id:` as `{created_task_id}`. Extract the value after `url:` as `{created_task_url}`.

    If `task_id:` is absent or the response begins with `Error creating task:`, emit the following verbatim (replacing `{raw_error_text}` with the full text of the `createTask` response) and stop:

    > ❌ **Task creation failed — ClickUp API error**
    >
    > `createTask` returned an error response. Raw error:
    >
    > {raw_error_text}
    >
    > **Why:** The ClickUp API rejected the request. Common causes: invalid `list_id`, invalid `parent_task_id`, insufficient token permissions, or a transient network error.
    >
    > **What to do:** Review the error above. If the list ID is incorrect, re-run step 2 to re-select it. If the error indicates a permission issue, check that your `CLICKUP_API_KEY` token has create-task permission on the target list. To retry, re-invoke step 5 after resolving the underlying issue.

    If the response contains `dependency_warnings:`, surface those lines as non-fatal warnings after the success message.

13. **Store the created task identifiers.** Set `{created_task_id}` and `{created_task_url}` from the parsed values.

14. **Confirm success.** Emit the following verbatim:

    > ✅ **ClickUp bug task created successfully!**
    >
    > - Task: **{bug_title}**
    > - Task ID: `{created_task_id}`
    > - URL: {created_task_url}
    > - List: **{target_list_name}**
    > - Tags: {bug_tags joined as comma-separated list}
    > - Priority: {bug_priority} ({priority label})
    > - Waiting on: `{waiting_on_ids}` _(only if non-empty)_
    > - Blocking: `{blocking_ids}` _(only if non-empty)_
    > - Linked: `{linked_ids}` _(only if non-empty)_
    >
    > Open the task in ClickUp: {created_task_url}

    Include the "Parent epic" line only when `{epic_id}` is non-empty:
    `- Parent epic: **{epic_name}** (`{epic_id}`)`

## NEXT

Terminal step — skill execution ends after `createTask` completes or errors.
