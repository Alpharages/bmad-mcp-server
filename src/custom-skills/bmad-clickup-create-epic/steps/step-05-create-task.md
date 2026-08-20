---
created_task_id: ''
created_task_url: ''
---

# Step 5: Task Creation

## RULES

- (a) **Mode requirement.** `CLICKUP_MCP_MODE` MUST be `write`; `createTask` is only registered in `write` mode. If absent, emit the mode error block and stop immediately.

  > ❌ **Task creation failed — write mode required**
  >
  > The `bmad-clickup-create-epic` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.
  >
  > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.

- (b) **One-shot write rule.** `createTask` is called exactly once per skill execution. The step MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason.

- (c) **No parent_task_id.** Epics are root-level tasks in the Backlog list. Do NOT pass `parent_task_id` to `createTask`.

- (d) **Blocking-on-error rule.** If `createTask` returns an error response, emit the creation-error block, surface the raw error text, and stop. MUST NOT silently proceed.

## INSTRUCTIONS

1. **Verify all required context variables are set.** Check that `{backlog_list_id}`, `{space_name}`, `{epic_number}`, `{epic_title}`, and `{epic_description}` are all non-empty. If any are missing, emit the following and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `bmad-clickup-create-epic` skill requires the following variables to be set:
   >
   > - `{backlog_list_id}` — {MISSING or present} (set by step 2)
   > - `{space_name}` — {MISSING or present} (set by step 2)
   > - `{epic_number}` — {MISSING or present} (set by step 3)
   > - `{epic_title}` — {MISSING or present} (set by step 3)
   > - `{epic_description}` — {MISSING or present} (set by step 4)
   >
   > **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed, then return to this step.

2. **Present the pre-creation summary.** Emit the following verbatim:

   > 📋 **Task creation summary**
   >
   > - Title: **Epic {epic_number}: {epic_title}**
   > - List: **Backlog** (`{backlog_list_id}`) in space **{space_name}**
   > - Parent: none (root-level epic)
   > - Description: composed ✓

3. **Check for duplicate tasks.** Call `searchTasks` with `terms: ["Epic {epic_number}: {epic_title}"]` and `list_ids: ["{backlog_list_id}"]`. Scan the returned tasks for a root-level task (no `parent_task_id`) whose name matches `Epic {epic_number}: {epic_title}` case-insensitively.
   - If no match is found, proceed to step 4.
   - If a match is found, emit the following and require explicit input to proceed:

     > ⚠️ **Duplicate epic detected**
     >
     > A task named "Epic {epic_number}: {epic_title}" already exists in the Backlog list (`{backlog_list_id}`).
     > Existing task: `{existing_task_id}` — {existing_task_url}
     >
     > - Type `y` to create a duplicate anyway.
     > - Type `u` to **replace** the existing epic's description with the newly composed one (old description will be deleted).
     > - Press Enter to abort. [y/u/N]

     Wait for user input:
     - If the user types `y`, continue to step 4.
     - If the user types `u`, call `updateTask` with `task_id: "{existing_task_id}"` and `replace_description: "{epic_description}"`. On success emit `✅ Existing epic description replaced.` and stop (do NOT proceed to step 4). On error emit the raw error text and stop.
     - Otherwise emit `❌ Epic creation cancelled — duplicate detected.` and stop.

4. **Infer and confirm dependencies.**

   **Auto-inference phase.** Scan `{epic_description}` AND `{epic_raw_content}` for dependency signals:
   - Explicit sections: `## Dependencies`, `## Blocked By`, `## Blocks`, `## Prerequisites`, `## Related Epics`
   - Epic/story references: patterns like `Epic X`, `Story X-Y`, quoted task titles, or task IDs
   - Natural-language phrases: "depends on", "blocked by", "blocks", "must be completed before/after", "requires", "prerequisite", "builds on", "extends"
   - The **Business Context** section often identifies which other epics must deliver first — treat those as `waiting_on` candidates
   - The **Technical Context** section may reference infrastructure or platform epics this one builds on — also `waiting_on` candidates

   For each reference found, call `searchTasks({ terms: ["<referenced epic title or story key>"] })` (no `list_ids` filter) to resolve it to a task ID. Classify each resolved task:
   - `waiting_on` — if this epic is blocked by it or depends on its delivery
   - `blocking` — if this epic must be completed before it
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

5. **Confirm with user.** Ask: "Confirm creating this ClickUp epic? [Y/n]" Default is Y. If the user types `n`, emit `❌ Epic creation cancelled by user.` and stop.

6. **Create the task.** Call `createTask` with exactly these parameters and no others:
   - `list_id: "{backlog_list_id}"`
   - `name: "Epic {epic_number}: {epic_title}"`
   - `description: "{epic_description}"`
   - `waiting_on: {waiting_on_ids}` — include ONLY if `{waiting_on_ids}` is non-empty
   - `blocking: {blocking_ids}` — include ONLY if `{blocking_ids}` is non-empty
   - `linked_tasks: {linked_ids}` — include ONLY if `{linked_ids}` is non-empty

   Do NOT pass `parent_task_id`, `status`, `priority`, `assignees`, `due_date`, `start_date`, `time_estimate`, or `tags`.

7. **Parse the `createTask` response.** Extract `{created_task_id}` from `task_id:` and `{created_task_url}` from `url:`.
   - If `task_id:` is absent or the response begins with `Error creating task:`, emit the following and stop:

     > ❌ **Task creation failed — ClickUp API error**
     >
     > `createTask` returned an error response. Raw error:
     >
     > {raw_error_text}
     >
     > **Why:** The ClickUp API rejected the request. Common causes: invalid `list_id`, insufficient token permissions, or a transient network error.
     >
     > **What to do:** Review the error above. If the list ID is incorrect, re-run step 2 to re-select it. To retry, re-invoke step 5 after resolving the issue.

   - If the response contains `dependency_warnings:`, surface those lines as non-fatal warnings after the success message.

8. **Confirm success.** Emit the following verbatim:

   > ✅ **ClickUp epic created successfully!**
   >
   > - Epic: **Epic {epic_number}: {epic_title}**
   > - Task ID: `{created_task_id}`
   > - URL: {created_task_url}
   > - List: Backlog in space **{space_name}**
   > - Waiting on: `{waiting_on_ids}` _(only if non-empty)_
   > - Blocking: `{blocking_ids}` _(only if non-empty)_
   > - Linked: `{linked_ids}` _(only if non-empty)_
   >
   > Open the epic in ClickUp: {created_task_url}
   >
   > **Next step:** Use `bmad-clickup-create-story` with epic ID `{created_task_id}` to create stories under this epic.

## NEXT

Step 5 is the terminal step of the `bmad-clickup-create-epic` skill. There are no further steps. End the workflow after step 5.
