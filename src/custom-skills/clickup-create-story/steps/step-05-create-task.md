---
created_task_id: ''
created_task_url: ''
---

# Step 5: Task Creation

## RULES

- (a) **Mode requirement.** `CLICKUP_MCP_MODE` MUST be `write`; `createTask` is only registered in `write` mode. If the mode is `read-minimal` or `read`, emit the following verbatim and stop immediately:

  > ❌ **Task creation failed — write mode required**
  >
  > The `clickup-create-story` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.
  >
  > **Why:** `createTask` is only registered in `write` mode. Steps 2 and 3 also require at least `read` mode for `searchSpaces`. The minimum mode for the full skill is `write`.
  >
  > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.

- (b) **One-shot write rule.** `createTask` is called exactly once per skill execution. The step MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason (not on re-presentation, not on network retry).

- (c) **Duplicate-check rule.** Before calling `createTask`, the step MUST call `searchTasks({ terms: ["{story_title}"], list_ids: ["{sprint_list_id}"] })` and scan the results for a task whose name matches `{story_title}` exactly (case-insensitive). If a match is found, emit the duplicate warning (AC #4) and require the user to type the literal character `y` (lower-case) to proceed; any other input (including Enter alone) aborts.

- (d) **Blocking-on-error rule.** If `createTask` returns an error response (i.e., the response text contains `Error creating task:` or the `task_id:` line is absent), emit the standard creation-error block (AC #5), surface the raw error text, and stop. MUST NOT silently proceed or produce a partial success message.

## INSTRUCTIONS

1. **Verify all required context variables are set.** Check that `{sprint_list_id}`, `{sprint_list_name}`, `{epic_id}`, `{epic_name}`, `{story_title}`, and `{task_description}` are all non-empty. If any are missing, emit the following verbatim (replacing `{MISSING or present}` with the actual runtime status of each variable) and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `clickup-create-story` skill requires the following variables to be set before the task can be created:
   >
   > - `{sprint_list_id}` — {MISSING or present}  (set by step 3: sprint-list picker)
   > - `{sprint_list_name}` — {MISSING or present}  (set by step 3: sprint-list picker)
   > - `{epic_id}` — {MISSING or present}  (set by step 2: epic picker)
   > - `{epic_name}` — {MISSING or present}  (set by step 2: epic picker)
   > - `{story_title}` — {MISSING or present}  (set by step 4: description composer)
   > - `{task_description}` — {MISSING or present}  (set by step 4: description composer)
   >
   > **Why:** All six variables are required parameters for `createTask`. Without them, the task cannot be created or will be created with incomplete data.
   >
   > **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed successfully, then return to this step.

2. **Present the pre-creation summary.** Emit the following verbatim:

   > 📋 **Task creation summary**
   >
   > - Title: **{story_title}**
   > - List: **{sprint_list_name}** (`{sprint_list_id}`)
   > - Parent epic: **{epic_name}** (`{epic_id}`)
   > - Description: composed ✓

3. **Check for duplicate tasks.** Call `searchTasks` with `terms: ["{story_title}"]` and `list_ids: ["{sprint_list_id}"]`. Scan the returned tasks for a name that matches `{story_title}` case-insensitively.
   - If `searchTasks` returns `No tasks available or index could not be built.` or no matching task is found, proceed to step 4.
   - If a match is found, emit the following verbatim (replacing `{existing_task_id}` and `{existing_task_url}` with the actual values from the `searchTasks` result):

     > ⚠️ **Duplicate task detected**
     >
     > A task named "{story_title}" already exists in **{sprint_list_name}** (`{sprint_list_id}`).
     > Existing task: `{existing_task_id}` — {existing_task_url}
     >
     > **Creating a second task with the same name may cause confusion.**
     >
     > Type `y` to create a duplicate anyway, or press Enter to abort. [y/N]

     Wait for user input: if the user types `y`, continue to step 4; otherwise emit `❌ Task creation cancelled — duplicate detected.` and stop.

4. **Confirm with user.** Ask: `Confirm creating this ClickUp task? [Y/n]` Default answer is Y (proceed if user presses Enter). If the user types `n`, emit `❌ Task creation cancelled by user.` and stop.

5. **Create the task.** Call `createTask` with exactly these parameters and no others:
   - `list_id: "{sprint_list_id}"`
   - `name: "{story_title}"`
   - `description: "{task_description}"`
   - `parent_task_id: "{epic_id}"`

   Do NOT pass `status`, `priority`, `assignees`, `due_date`, `start_date`, `time_estimate`, or `tags` — let ClickUp apply list defaults so the team lead can configure them in the UI after creation.

6. **Parse the `createTask` response.** Extract the value after `task_id:` as `{created_task_id}`. Extract the value after `url:` as `{created_task_url}`.
   - If `task_id:` is absent or the response begins with `Error creating task:`, emit the following verbatim (replacing `{raw_error_text}` with the full text of the `createTask` response) and stop:

     > ❌ **Task creation failed — ClickUp API error**
     >
     > `createTask` returned an error response. Raw error:
     >
     > {raw_error_text}
     >
     > **Why:** The ClickUp API rejected the request. Common causes: invalid `list_id`, invalid `parent_task_id`, insufficient token permissions, or a transient network error.
     >
     > **What to do:** Review the error above. If the list or epic IDs are incorrect, re-run steps 2–3 to re-select them. If the error indicates a permission issue, check that your `CLICKUP_API_KEY` token has create-task permission on the target list (story 2.9 will add explicit gating). To retry, re-invoke step 5 after resolving the underlying issue.

7. **Store the created task identifiers.** Set `{created_task_id}` and `{created_task_url}` from the parsed values.

8. **Confirm success.** Emit the following verbatim:

   > ✅ **ClickUp story created successfully!**
   >
   > - Task: **{story_title}**
   > - Task ID: `{created_task_id}`
   > - URL: {created_task_url}
   > - Parent epic: **{epic_name}** (`{epic_id}`)
   > - Sprint list: **{sprint_list_name}**
   >
   > Open the task in ClickUp: {created_task_url}

## NEXT

Step 5 is the terminal step of the `clickup-create-story` skill. There are no further steps. End the workflow after step 8.
