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
   > The `clickup-create-bug` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.
   >
   > **Why:** `createTask` is only registered in `write` mode.
   >
   > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.

2. **One-shot write rule.** `createTask` is called exactly once per skill execution. MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason.

3. **Duplicate-check rule.** Before calling `createTask`, the step MUST call `searchTasks({ terms: ["{bug_title}"], list_ids: ["{target_list_id}"] })` and scan the results for a task whose name matches `{bug_title}` exactly (case-insensitive). If a match is found, emit the duplicate warning (instruction 8) and require the user to type the literal character `y` (lower-case) to proceed; any other input (including Enter alone) aborts.

4. **Blocking-on-error rule.** If `createTask` returns an error response (i.e., the response text contains `Error creating task:` or the `task_id:` line is absent), emit the standard creation-error block (instruction 11), surface the raw error text, and stop. MUST NOT silently proceed or produce a partial success message.

## INSTRUCTIONS

1. **Verify required variables.** Check that `{target_list_id}`, `{target_list_name}`, `{bug_title}`, and `{bug_description}` are all non-empty. `{epic_id}` is optional — its absence is not an error (step 3 is a stub until story 7-7). If any required variable is missing, emit the following verbatim (replacing `{MISSING or present}` with the actual runtime status of each variable) and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `clickup-create-bug` skill requires the following variables to be set before the task can be created:
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
     > Type `y` to create a duplicate anyway, or press Enter to abort. [y/N]

     Wait for user input: if the user types `y`, continue to instruction 9; otherwise emit `❌ Task creation cancelled — duplicate detected.` and stop.

9. **Confirm with user.** Ask: `Confirm creating this ClickUp bug task? [Y/n]` Default answer is Y (proceed if user presses Enter). If the user types `n`, emit `❌ Task creation cancelled by user.` and stop.

10. **Create the task.** Call `createTask` with exactly these parameters:
    - `list_id: "{target_list_id}"`
    - `name: "{bug_title}"`
    - `description: "{bug_description}"`
    - `tags: {bug_tags}`
    - `priority: {bug_priority}`
    - `parent_task_id: "{epic_id}"` — include ONLY if `{epic_id}` is non-empty; omit the parameter entirely when `{epic_id}` is `''`

    Do NOT pass `status`, `assignees`, `due_date`, `start_date`, or `time_estimate` — let ClickUp apply list defaults.

11. **Parse the `createTask` response.** Extract the value after `task_id:` as `{created_task_id}`. Extract the value after `url:` as `{created_task_url}`.

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

12. **Store the created task identifiers.** Set `{created_task_id}` and `{created_task_url}` from the parsed values.

13. **Confirm success.** Emit the following verbatim:

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

## NEXT

Terminal step — skill execution ends after `createTask` completes or errors.
