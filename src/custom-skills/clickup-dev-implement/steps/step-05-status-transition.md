---
list_id: ''
list_statuses: ''
transition_target: ''
---

# Step 5: Status Transition Helper

## RULES

- **(a) Write-mode soft gate:** If `updateTask` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see INSTRUCTIONS step 1), leave `{transition_target}` as `''`, and **continue** — status transitions are supplemental; their absence does not block the skill from completing.
- **(b) Validate before transitioning:** Always call `getListInfo` first to retrieve the list's allowed statuses. Store the result in `{list_statuses}`. Never call `updateTask` with a status name that does not appear in `{list_statuses}` — if no valid match is found, emit the status-mismatch warning block (see INSTRUCTIONS step 4) and **continue**.
- **(c) Non-blocking failures:** If the `updateTask` call returns an error, emit the transition-failed warning block (see INSTRUCTIONS step 6) and **continue** — the skill does not halt on a status-transition failure.
- **(d) Single transition per session:** Step 5 is invoked exactly once per session — after the M2 milestone (implementation complete). It is not re-invoked during the same session. `{transition_target}` is set to the matched status name and `{list_id}` is set from the step 2 task-fetch response.

## INSTRUCTIONS

1. **Check write mode.** Verify whether `updateTask` is available in the current tool list. If absent, emit the mode-unavailable warning block below, leave `{transition_target}` as `''`, and skip steps 2–6. Continue to the next workflow step.

   > ⚠️ **Status transition skipped — write mode not active**
   >
   > The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to transition task status. The `updateTask` tool is not available in the current tool list.
   >
   > **Impact:** Task `{task_id}` ({task_name}) will remain in its current status (`{task_status}`). The skill has completed implementation; please manually transition the task to "in review" in ClickUp.
   >
   > **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable automatic status transitions in future sessions.

2. **Extract list ID.** Read the task-fetch metadata from step 2 that is already in conversation context. Locate the `list:` line (format: `list: Name (ID)`) and extract the ID from inside the parentheses. Store it as `{list_id}`. Example: `list: Sprint 1 (86abc123)` → `{list_id}` = `86abc123`.

3. **Fetch allowed statuses.** Call `getListInfo` with `list_id` = `{list_id}`. From the response, extract the `Valid status names` line and store the comma-separated list as `{list_statuses}`.

4. **Validate target status.** Iterate the **review-status match set** below in priority order and search `{list_statuses}` for a case-insensitive, whitespace-trimmed match. Use the first hit; if multiple statuses in `{list_statuses}` match different entries in the set, the highest-priority hit (earliest in the list below) wins. If no entry in the set matches, emit the status-mismatch warning block below, leave `{transition_target}` as `''`, and skip steps 5–6. Continue to the next workflow step.

   **Review-status match set (priority order):**
   1. `in review`
   2. `ready for review`
   3. `code review`
   4. `pending review`
   5. `awaiting review`

   The set is hardcoded — it covers the synonyms commonly seen across ClickUp workspaces (per `step-05-match-set-too-narrow` in the EPIC-5 friction log). A future workspace surfacing a sixth synonym is a one-line addition to this list.

   > ⚠️ **Status transition skipped — no review-status synonym found in list**
   >
   > The `clickup-dev-implement` skill called `getListInfo` for list `{list_id}` but could not find any of the review-status synonyms in the list's allowed statuses.
   >
   > **Tried (in priority order):** `in review`, `ready for review`, `code review`, `pending review`, `awaiting review` (case-insensitive, whitespace-trimmed).
   >
   > **Available statuses:** {list_statuses}
   >
   > **Impact:** Task `{task_id}` ({task_name}) will remain in its current status (`{task_status}`). Please manually transition the task to the appropriate review status in ClickUp.
   >
   > **What to do (optional):** Ensure the sprint list contains one of the synonyms above (or rename your existing review status to match), then re-run the transition manually.

5. **Set transition target.** Store the exact matched status name (preserving the casing returned by `getListInfo`) as `{transition_target}`.

6. **Transition the task.** Call `updateTask` with `task_id` = `{task_id}` and `status` = `{transition_target}`. If `updateTask` returns successfully, emit the success block below and continue to the next workflow step. If `updateTask` returns an error, emit the transition-failed warning block below and continue to the next workflow step — do not halt.

   > ✅ **Status transition complete**
   >
   > - **Task:** {task_name} (`{task_id}`)
   > - **Previous status:** {task_status}
   > - **New status:** {transition_target}
   > - **URL:** {task_url}
   >
   > Task is now in review. Implementation session complete.

   > ⚠️ **Status transition failed — continuing without updating task status**
   >
   > The `clickup-dev-implement` skill called `updateTask` for task `{task_id}` with status `{transition_target}` but received an error.
   >
   > **Impact:** Task `{task_id}` ({task_name}) remains in its current status (`{task_status}`). Implementation is complete; please manually transition the task to "in review" in ClickUp.
   >
   > **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to update this task, then manually set the status to `{transition_target}` in ClickUp if needed.

> **Refinement source:** `step-05-in-review-literal-match-miss`, `step-05-match-set-too-narrow` (story 5-7).
