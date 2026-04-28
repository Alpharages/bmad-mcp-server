---
task_name: ''
task_status: ''
task_url: ''
task_description: ''
epic_task_id: ''
epic_name: ''
---

# Step 2: Task Fetch

> **Inherited context:** `{task_id}` is declared in step-01's frontmatter and is available here.

## RULES

1. **Read-only.** This step calls `getTaskById` at most twice. No ClickUp writes.
2. **Must-complete-task.** If the task fetch fails, emit the task-not-found error block and stop.
3. **Best-effort-epic.** If parent epic is absent or its fetch fails, emit the warning block, leave `{epic_task_id}` and `{epic_name}` as empty strings, and continue.
4. **Status advisory.** If `{task_status}` is not a review-family status (`in review`, `ready for review`, `code review`, `pending review`, `awaiting review`), emit the status advisory block — but do NOT stop. Reviews may legitimately be triggered on tasks in other statuses.
5. **Contract.** `{task_name}`, `{task_status}`, `{task_url}`, and `{task_description}` MUST be non-empty by the time this step completes.

## INSTRUCTIONS

1. Call `getTaskById` with `{task_id}`.
2. Extract and store: `{task_name}` ← `name`, `{task_status}` ← `status`, `{task_url}` ← `task_url`. The full task description and any existing comments are now in conversation context for use by downstream steps — do not re-extract separately.
3. Store the task description text as `{task_description}`. If the description is empty, set `{task_description}` to `'(no description)'`.
4. If the fetch failed, emit the task-not-found error block and stop.
5. If `{task_status}` is not in the review-family set, emit the status advisory block (non-fatal) and continue.
6. Check whether `parent_task_id` appears in the metadata. If absent, emit the epic-context-unavailable warning, leave `{epic_task_id}` and `{epic_name}` as empty strings, and skip to step 9.
7. Call `getTaskById` with the `parent_task_id` value.
8. Extract and store: `{epic_task_id}` ← `task_id`, `{epic_name}` ← `name`. If this call failed, emit the epic-context-unavailable warning, leave both as empty strings.
9. Emit the success summary block and continue to step 3.

### Error block — task not found

```
❌ **Task fetch failed — ClickUp API error**

The `clickup-code-review` skill called `getTaskById` with task ID `{task_id}` but received an error response.

**Possible causes:**
- The task ID does not exist in ClickUp.
- The API token does not have permission to access this task.
- The task belongs to a different workspace.

**What to do:** Verify the task ID is correct and your ClickUp token has access to it, then re-invoke the skill.
```

### Advisory block — task not in review status

```
⚠️ **Task status advisory — task is not currently "in review"**

Task `{task_id}` ({task_name}) has status `{task_status}`, which is not a review-family status.

**Impact:** The review will proceed. If you intended to review a different task, stop now and re-invoke with the correct task ID.
```

### Warning block — epic context unavailable

```
⚠️ **Epic context unavailable — continuing with task context only**

Task `{task_id}` ({task_name}) has no parent epic in ClickUp, or the parent-epic fetch failed.

**Impact:** Review will use task description and planning artifacts only — no epic-level context.
```

### Success block

```
✅ **Task fetch complete**

- **Task:** {task_name} (`{task_id}`) — status: {task_status}
- **URL:** {task_url}
- **Epic:** {epic_name} (`{epic_task_id}`) [or "No parent epic"]

Proceeding to step 3 (code reader).
```
