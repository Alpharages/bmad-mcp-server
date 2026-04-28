---
list_id: ''
list_statuses: ''
transition_target: ''
---

# Step 6: Status Transition

## RULES

1. **Write-mode soft gate.** If `updateTask` is not in the current tool list, emit the mode-unavailable warning and continue — status transitions are supplemental.
2. **Validate before transitioning.** Always call `getListInfo` first. Never call `updateTask` with a status not in `{list_statuses}`.
3. **Non-blocking failures.** If `updateTask` returns an error, emit the transition-failed warning and continue.
4. **Single transition per session.** Invoked exactly once — after step 5 completes.
5. **Verdict-driven target.** The match set used depends on `{review_verdict}`.

## INSTRUCTIONS

1. **Check write mode.** Verify whether `updateTask` is available. If absent, emit the mode-unavailable warning, leave `{transition_target}` = `''`, and stop this step.

2. **Extract list ID.** From the task-fetch metadata in conversation context, locate the `list: Name (ID)` line and extract the ID. Store as `{list_id}`.

3. **Fetch allowed statuses.** Call `getListInfo` with `list_id` = `{list_id}`. Extract the `Valid status names` line and store as `{list_statuses}`.

4. **Select match set.** Based on `{review_verdict}`:

   **If `approved`** — use the approved-status match set (priority order):
   1. `approved`
   2. `ready for qa`
   3. `qa`
   4. `done`
   5. `complete`
   6. `closed`

   **If `changes_requested`** — use the rework-status match set (priority order):
   1. `in progress`
   2. `to do`
   3. `open`
   4. `backlog`

5. **Match.** Iterate the selected match set in priority order and search `{list_statuses}` for a case-insensitive, whitespace-trimmed match. Use the first hit. If no match is found, emit the status-mismatch warning and leave `{transition_target}` = `''`. Skip steps 6–7.

6. **Store.** Set `{transition_target}` to the exact matched status name (preserving casing from `getListInfo`).

7. **Transition.** Call `updateTask` with `task_id` = `{task_id}` and `status` = `{transition_target}`. If successful, emit the success block. If it fails, emit the transition-failed warning.

---

### Warning block — write mode unavailable

> ⚠️ **Status transition skipped — write mode not active**
>
> The `clickup-code-review` skill requires `CLICKUP_MCP_MODE=write` to transition task status. The `updateTask` tool is not available.
>
> **Impact:** Task `{task_id}` ({task_name}) will remain in status `{task_status}`. Please manually transition it based on the review verdict (`{review_verdict}`).

### Warning block — status mismatch

> ⚠️ **Status transition skipped — no matching status found in list**
>
> The `clickup-code-review` skill called `getListInfo` for list `{list_id}` but could not find a matching status for verdict `{review_verdict}`.
>
> **Available statuses:** {list_statuses}
>
> **Impact:** Task `{task_id}` ({task_name}) remains in `{task_status}`. Please transition it manually in ClickUp.

### Warning block — transition failed

> ⚠️ **Status transition failed — continuing**
>
> `updateTask` for task `{task_id}` with status `{transition_target}` returned an error.
>
> **Impact:** Task remains in `{task_status}`. Please transition it manually in ClickUp.

### Success block — approved

> ✅ **Status transition complete — task approved**
>
> - **Task:** {task_name} (`{task_id}`)
> - **Previous status:** {task_status}
> - **New status:** {transition_target}
> - **URL:** {task_url}
>
> Review session complete. Task is ready for the next stage.

### Success block — changes requested

> ✅ **Status transition complete — task returned for rework**
>
> - **Task:** {task_name} (`{task_id}`)
> - **Previous status:** {task_status}
> - **New status:** {transition_target}
> - **URL:** {task_url}
>
> Review session complete. Review comment has been posted with the required changes.
