---
created_task_id: ''
created_task_url: ''
---

# Step 5: Task Creation

## RULES

- (a) **Mode requirement.** `CLICKUP_MCP_MODE` MUST be `write`; `createTask` is only registered in `write` mode. If absent, emit the mode error block and stop immediately.

  > ❌ **Task creation failed — write mode required**
  >
  > The `clickup-create-epic` skill requires `CLICKUP_MCP_MODE=write` to create tasks. The current mode does not register `createTask`.
  >
  > **What to do:** Set `CLICKUP_MCP_MODE=write` in your environment and restart the MCP server, then re-invoke the skill from step 1.

- (b) **One-shot write rule.** `createTask` is called exactly once per skill execution. The step MUST NOT retry on a successful response and MUST NOT call `createTask` a second time for any reason.

- (c) **No parent_task_id.** Epics are root-level tasks in the Backlog list. Do NOT pass `parent_task_id` to `createTask`.

- (d) **Blocking-on-error rule.** If `createTask` returns an error response, emit the creation-error block, surface the raw error text, and stop. MUST NOT silently proceed.

## INSTRUCTIONS

1. **Verify all required context variables are set.** Check that `{backlog_list_id}`, `{space_name}`, `{epic_number}`, `{epic_title}`, and `{epic_description}` are all non-empty. If any are missing, emit the following and stop:

   > ❌ **Task creation failed — missing upstream context**
   >
   > The `clickup-create-epic` skill requires the following variables to be set:
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
   - If a match is found, emit the following and require explicit `y` to proceed:

     > ⚠️ **Duplicate epic detected**
     >
     > A task named "Epic {epic_number}: {epic_title}" already exists in the Backlog list (`{backlog_list_id}`).
     > Existing task: `{existing_task_id}` — {existing_task_url}
     >
     > Type `y` to create a duplicate anyway, or press Enter to abort. [y/N]

     If the user types `y`, continue. Otherwise emit `❌ Epic creation cancelled — duplicate detected.` and stop.

4. **Confirm with user.** Ask: "Confirm creating this ClickUp epic? [Y/n]" Default is Y. If the user types `n`, emit `❌ Epic creation cancelled by user.` and stop.

5. **Create the task.** Call `createTask` with exactly these parameters and no others:
   - `list_id: "{backlog_list_id}"`
   - `name: "Epic {epic_number}: {epic_title}"`
   - `description: "{epic_description}"`

   Do NOT pass `parent_task_id`, `status`, `priority`, `assignees`, `due_date`, `start_date`, `time_estimate`, or `tags`.

6. **Parse the `createTask` response.** Extract `{created_task_id}` from `task_id:` and `{created_task_url}` from `url:`.
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

7. **Confirm success.** Emit the following verbatim:

   > ✅ **ClickUp epic created successfully!**
   >
   > - Epic: **Epic {epic_number}: {epic_title}**
   > - Task ID: `{created_task_id}`
   > - URL: {created_task_url}
   > - List: Backlog in space **{space_name}**
   >
   > Open the epic in ClickUp: {created_task_url}
   >
   > **Next step:** Use `clickup-create-story` with epic ID `{created_task_id}` to create stories under this epic.

## NEXT

Step 5 is the terminal step of the `clickup-create-epic` skill. There are no further steps. End the workflow after step 7.
