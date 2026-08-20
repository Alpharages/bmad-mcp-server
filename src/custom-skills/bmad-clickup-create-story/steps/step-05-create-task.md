---
created_task_id: ''
created_task_url: ''
---

# Step 5: Task Creation

## RULES

- (a) **Mode requirement.** `CLICKUP_MCP_MODE` MUST be `write`; `createTask` is only registered in `write` mode. If the mode is `read-minimal` or `read`, emit the following verbatim and stop immediately:

  > ❌ **Task creation failed — write mode required**
  >
  > The `bmad-clickup-create-story` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.
  >
  > **Why:** `createTask` is only registered in `write` mode. Steps 2 and 3 also require at least `read` mode for `searchSpaces`. The minimum mode for the full skill is `write`.
  >
  > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.

- (b) **One-shot write rule.** `createTask` is called exactly once per skill execution. The step MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason (not on re-presentation, not on network retry).

- (c) **Duplicate-check rule.** Before calling `createTask`, the step MUST call `searchTasks({ terms: ["{story_title}"], list_ids: ["{sprint_list_id}"] })` and scan the results for a task whose name matches `{story_title}` exactly (case-insensitive). If a match is found, emit the duplicate warning (instruction 3) and require the user to type `y`, `u`, or Enter to proceed.

- (d) **Blocking-on-error rule.** If `createTask` returns an error response (i.e., the response text contains `Error creating task:` or the `task_id:` line is absent), emit the standard creation-error block (instruction 7), surface the raw error text, and stop. MUST NOT silently proceed or produce a partial success message.

## INSTRUCTIONS

1. **Verify all required context variables are set.** Check that `{sprint_list_id}`, `{sprint_list_name}`, `{story_title}`, and `{task_description}` are all non-empty. (`{epic_id}` and `{epic_name}` may be intentionally empty on the no-epic path.) If any of the four required variables are missing, emit the following verbatim (replacing `{MISSING or present}` with the actual runtime status of each variable) and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `bmad-clickup-create-story` skill requires the following variables to be set before the task can be created:
   >
   > - `{sprint_list_id}` — {MISSING or present} (set by step 3: sprint-list picker)
   > - `{sprint_list_name}` — {MISSING or present} (set by step 3: sprint-list picker)
   > - `{story_title}` — {MISSING or present} (set by step 4: description composer)
   > - `{task_description}` — {MISSING or present} (set by step 4: description composer)
   >
   > **Why:** All four variables are required parameters for `createTask`. Without them, the task cannot be created or will be created with incomplete data.
   >
   > **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed successfully, then return to this step.

2. **Present the pre-creation summary.**
   - When `{epic_id}` is non-empty, emit the following verbatim:

     > 📋 **Task creation summary**
     >
     > - Title: **{story_title}**
     > - List: **{sprint_list_name}** (`{sprint_list_id}`)
     > - Parent epic: **{epic_name}** (`{epic_id}`)
     > - Description: composed ✓

   - When `{epic_id}` is `''`, emit the following verbatim:

     > 📋 **Task creation summary**
     >
     > - Title: **{story_title}**
     > - List: **{sprint_list_name}** (`{sprint_list_id}`)
     > - Parent epic: *(none — standalone task)*
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
     > - Type `y` to create a duplicate anyway.
     > - Type `u` to **replace** the existing task's description with the newly composed one (old description will be deleted).
     > - Press Enter to abort. [y/u/N]

     Wait for user input:
     - If the user types `y`, continue to step 4.
     - If the user types `u`, call `updateTask` with `task_id: "{existing_task_id}"` and `replace_description: "{task_description}"`. On success emit `✅ Existing task description replaced.` and stop (do NOT proceed to step 4). On error emit the raw error text and stop.
     - Otherwise emit `❌ Task creation cancelled — duplicate detected.` and stop.

4. **Infer and confirm dependencies.**

   **Auto-inference phase.** Scan `{task_description}` AND the epic description (`{epic_description}`) for dependency signals:
   - Explicit sections: `## Dependencies`, `## Blocked By`, `## Blocks`, `## Prerequisites`
   - Story/task references in any section: patterns like `Story X-Y`, `Epic X`, quoted task titles, or task IDs
   - Natural-language phrases: "depends on", "blocked by", "blocks", "must be completed before/after", "requires", "prerequisite"

   For each reference found, call `searchTasks({ terms: ["<referenced title or story key>"] })` (no `list_ids` filter — dependencies can live in any list) to resolve it to a task ID. Classify each resolved task:
   - `waiting_on` — if this story is blocked by it or it is a prerequisite
   - `blocking` — if this story must be completed before it
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

   If any of the three lists are non-empty, append dependency lines to the pre-creation summary previously emitted:

   > - Waiting on: `{waiting_on_ids joined as comma-separated list}` _(only if non-empty)_
   > - Blocking: `{blocking_ids joined as comma-separated list}` _(only if non-empty)_
   > - Linked: `{linked_ids joined as comma-separated list}` _(only if non-empty)_

5. **Confirm with user.** Ask: `Confirm creating this ClickUp task? [Y/n]` Default answer is Y (proceed if user presses Enter). If the user types `n`, emit `❌ Task creation cancelled by user.` and stop.

6. **Create the task.** Call `createTask` with exactly these parameters and no others:
   - `list_id: "{sprint_list_id}"`
   - `name: "{story_title}"`
   - `description: "{task_description}"`
   - `parent_task_id: "{epic_id}"` — include ONLY if `{epic_id}` is non-empty; omit the parameter entirely when `{epic_id}` is `''`
   - `waiting_on: {waiting_on_ids}` — include ONLY if `{waiting_on_ids}` is non-empty
   - `blocking: {blocking_ids}` — include ONLY if `{blocking_ids}` is non-empty
   - `linked_tasks: {linked_ids}` — include ONLY if `{linked_ids}` is non-empty

   Do NOT pass `status`, `priority`, `assignees`, `due_date`, `start_date`, `time_estimate`, or `tags` — let ClickUp apply list defaults so the team lead can configure them in the UI after creation.

7. **Parse the `createTask` response.** Extract the value after `task_id:` as `{created_task_id}`. Extract the value after `url:` as `{created_task_url}`.
   - If `task_id:` is absent or the response begins with `Error creating task:`, emit the following verbatim (replacing `{raw_error_text}` with the full text of the `createTask` response) and stop:

     > ❌ **Task creation failed — ClickUp API error**
     >
     > `createTask` returned an error response. Raw error:
     >
     > {raw_error_text}
     >
     > **Why:** The ClickUp API rejected the request. Common causes: invalid `list_id`, invalid `parent_task_id`, insufficient token permissions, or a transient network error.
     >
     > **What to do:** Review the error above. If the list or epic IDs are incorrect, re-run steps 2–3 to re-select them. If the error indicates a permission issue, check that your `CLICKUP_API_KEY` token has create-task permission on the target list. To retry, re-invoke step 5 after resolving the underlying issue.
   - If the response contains `dependency_warnings:`, surface those lines as non-fatal warnings after the success message.

8. **Store the created task identifiers.** Set `{created_task_id}` and `{created_task_url}` from the parsed values.

9. **Confirm success.**
   - When `{epic_id}` is non-empty, emit the following verbatim:

     > ✅ **ClickUp story created successfully!**
     >
     > - Task: **{story_title}**
     > - Task ID: `{created_task_id}`
     > - URL: {created_task_url}
     > - Parent epic: **{epic_name}** (`{epic_id}`)
     > - Sprint list: **{sprint_list_name}**
     > - Waiting on: `{waiting_on_ids}` _(only if non-empty)_
     > - Blocking: `{blocking_ids}` _(only if non-empty)_
     > - Linked: `{linked_ids}` _(only if non-empty)_
     >
     > Open the task in ClickUp: {created_task_url}

   - When `{epic_id}` is `''`, emit the following verbatim:

     > ✅ **ClickUp story created successfully!**
     >
     > - Task: **{story_title}**
     > - Task ID: `{created_task_id}`
     > - URL: {created_task_url}
     > - Parent epic: *(none — standalone task)*
     > - Sprint list: **{sprint_list_name}**
     > - Waiting on: `{waiting_on_ids}` _(only if non-empty)_
     > - Blocking: `{blocking_ids}` _(only if non-empty)_
     > - Linked: `{linked_ids}` _(only if non-empty)_
     >
     > Open the task in ClickUp: {created_task_url}

## NEXT

Step 5 is the terminal step of the `bmad-clickup-create-story` skill. There are no further steps. End the workflow after step 9.
