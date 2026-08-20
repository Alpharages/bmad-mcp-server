---
list_id: ''
list_statuses: ''
transition_target: ''
---

# Step 7: Status Transition

> **Inherited context:** `{qa_verdict}`, `{task_id}`, `{task_name}`, `{task_status}`, `{task_url}` are available.

## RULES

1. **Write-mode soft gate.** If `updateTask` is not in the current tool list, emit the mode-unavailable warning and continue — status transitions are supplemental.
2. **Validate before transitioning.** Always call `getListInfo` first. Never call `updateTask` with a status not in `{list_statuses}`.
3. **Non-blocking failures.** If `updateTask` returns an error, emit the transition-failed warning and continue. Do NOT retry the call — a retry risks a duplicate write when the first call succeeded server-side.
4. **At most one transition per session.** Invoked exactly once — after step 6 completes. `updateTask` is called at most once, and only for a conclusive `passed` or `failed` verdict.
5. **Read-only on the repo.** This step touches ClickUp only. It MUST NOT create, modify, or delete any source or test file.
6. **Inconclusive never transitions.** If `{qa_verdict}` is `inconclusive`, skip this step entirely (leave the task where it is) — QA did not actually verify anything.

## INSTRUCTIONS

1. **Inconclusive guard.** If `{qa_verdict}` is `inconclusive`, emit the block below, set `{transition_target}` = `''`, and proceed to step 8. Do NOT call `getListInfo` and do NOT call `updateTask` — an inconclusive QA run verified nothing, so moving the task in either direction would be a false signal.

   > ⚠️ **Status transition skipped — QA was inconclusive**
   >
   > `{qa_inconclusive_reason}`
   >
   > **Impact:** Task `{task_id}` ({task_name}) deliberately remains in `{task_status}`.
   >
   > **What to do:** Resolve the missing evidence named above and re-run `bmad-clickup-qa` on this task.

2. **Check write mode.** Verify whether `updateTask` is available. If absent, emit the mode-unavailable warning, leave `{transition_target}` = `''`, and proceed to step 8.

3. **Extract list ID.** From the task-fetch metadata in conversation context, locate the `list: Name (ID)` line and extract the ID. Store as `{list_id}`.

4. **Fetch allowed statuses.** Call `getListInfo` with `list_id` = `{list_id}`. Extract the `Valid status names` line and store as `{list_statuses}`.

5. **Select match set.** Based on `{qa_verdict}`:

   **If `passed`** — use the passed-status match set (priority order):
   1. `qa passed`
   2. `qa approved`
   3. `passed`
   4. `ready for release`
   5. `ready for deploy`
   6. `done`
   7. `complete`
   8. `closed`
   9. `approved`

   **If `failed`** — use the rework-status match set (priority order):
   1. `in progress`
   2. `reopened`
   3. `qa failed`
   4. `to do`
   5. `open`
   6. `backlog`

6. **Match.** Iterate the selected match set in priority order and search `{list_statuses}` for a case-insensitive, whitespace-trimmed match. Use the first hit. If no match is found, emit the status-mismatch warning and leave `{transition_target}` = `''`. Skip steps 7–8.

7. **Store.** Set `{transition_target}` to the exact matched status name (preserving casing from `getListInfo`).

8. **Transition.** Call `updateTask` with `task_id` = `{task_id}` and `status` = `{transition_target}`. If successful, emit the matching success block. If it fails, emit the transition-failed warning.

---

### Warning block — write mode unavailable

> ⚠️ **Status transition skipped — write mode not active**
>
> The `bmad-clickup-qa` skill requires `CLICKUP_MCP_MODE=write` to transition task status. The `updateTask` tool is not available.
>
> **Impact:** Task `{task_id}` ({task_name}) will remain in status `{task_status}`. Please transition it manually based on the QA verdict (`{qa_verdict}`).

### Warning block — status mismatch

> ⚠️ **Status transition skipped — no matching status found in list**
>
> The `bmad-clickup-qa` skill called `getListInfo` for list `{list_id}` but could not find a matching status for verdict `{qa_verdict}`.
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

### Success block — passed

> ✅ **Status transition complete — QA passed**
>
> - **Task:** {task_name} (`{task_id}`)
> - **Previous status:** {task_status}
> - **New status:** {transition_target}
> - **URL:** {task_url}
>
> QA session complete. Task has cleared QA.

### Success block — failed

> ✅ **Status transition complete — QA failed, returned for rework**
>
> - **Task:** {task_name} (`{task_id}`)
> - **Previous status:** {task_status}
> - **New status:** {transition_target}
> - **URL:** {task_url}
>
> QA session complete. The QA report comment lists the failures the dev needs to address.

## NEXT

After step 7 completes (or is skipped), proceed to step 8 (Lore lesson save).
