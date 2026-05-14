---
propagation_count: ''
---

# Step 9: Cross-Story Context Propagation

## PURPOSE

When a decision is made during implementation of story N (an assumption via step 7, or a clarification via step 8), sibling stories that were already written may have their approach invalidated. This step posts a context comment on every affected incomplete sibling so the next developer knows what changed before they start.

## RULES

- **(a) Non-blocking.** Any failure in this step MUST be logged as a warning and skipped — never halt implementation or the status transition for this step.
- **(b) Write-mode soft gate.** If `addComment` is not in the current tool list, emit the skip warning and stop this step.
- **(c) Skip if no decisions.** If `{assumption_count}` = `'0'` AND `{clarification_count}` = `'0'`, skip this step entirely — nothing to propagate.
- **(d) Never post to completed stories.** Do NOT post to stories whose status indicates completion: `done`, `closed`, `cancelled`, `approved`, `released`. Only post to stories that have not yet been started or are in-progress.
- **(e) Never post to the current story.** `{task_id}` is always excluded from the sibling list.
- **(f) Variable contract.** `{propagation_count}` is incremented by 1 for each successful `addComment` call in this step.

## WHEN TO RUN

After step 6 (status transition) completes, if `{implementation_complete}` = `'true'` AND (`{assumption_count}` > 0 OR `{clarification_count}` > 0).

## ELIGIBILITY MATRIX — what qualifies for cross-story propagation

Not every decision warrants propagation. Apply this matrix to each decision from the current session:

| Decision type | Propagate to siblings if... |
| --- | --- |
| **Assumption (Template D)** — `**Confidence:** low` | Always propagate |
| **Assumption (Template D)** — `**Confidence:** medium` | Propagate if `**Where applied:**` mentions a shared path: `api`, `service`, `model`, `util`, `config`, `auth`, `schema`, `middleware`, `store`, `hook`, `context`, or `types` |
| **Assumption (Template D)** — `**Confidence:** high` | Only propagate if `**Where applied:**` explicitly mentions a shared API contract, database schema, or authentication flow |
| **Clarification (Template F — resolved)** | Always propagate — clarifications are scope-changing by definition |

Decisions that are purely local (naming within a private component, test coverage approach, internal refactor shape with no shared interface) are NOT propagated.

## SIBLING DISCOVERY

Siblings are incomplete tasks that the propagation-eligible decision could affect:

1. **Primary scope — same epic:** if `{epic_task_id}` is non-empty, call `searchTasks({ terms: [""], list_ids: [<task_list_id>] })` to get all tasks in the same sprint list, then filter to those whose `parent_task_id` matches `{epic_task_id}`.
2. **Extended scope — same list, different epic:** for decisions that affect shared paths (API, schema, auth, config), also include tasks in the same sprint list that are NOT under `{epic_task_id}` but whose description mentions any of the file paths from the decision's `**Where applied:**` field.

Extract `<task_list_id>` from the `getTaskById` response already in conversation context from step 2 (it is in the task's `list.id` field).

## COMMENT TEMPLATE

### Template G — Context Update from Sibling Story

```
## 🔄 Context Update from [{task_name}]({task_url})

A decision was made during implementation of the above story that may affect this story's approach.

---

{For each propagation-eligible decision — repeat this block:}

### {decision title / one-line summary}

**Type:** {Assumption | Clarification}
**Decision:** {what was chosen — option chosen, approach taken, or conclusion reached}
**Rationale:** {why this was the right choice}
**Where it applies:** {file paths, modules, or patterns in the codebase that embody this decision}

---
{end repeat}

**Why this may affect you:** Review your task description for any approach, pattern, or assumption that contradicts the decisions above. If your description references {the superseded approach}, update it before implementation begins.

**Recommended action:**
- If this decision affects your story → update your task description or add a comment acknowledging the change.
- If this decision does not affect your story → dismiss this comment.

*Posted automatically by `clickup-dev-implement` cross-story context propagation (step 9). Source story: {task_url}*
```

## INSTRUCTIONS

1. **Check write mode.** If `addComment` is unavailable, emit:

   > ⚠️ **Cross-story propagation skipped — write mode not active**
   >
   > `addComment` is not in the current tool list. Context comments for sibling stories will not be posted.
   > Manually review sibling stories if any decisions made during this session may affect them.

   Set `{propagation_count}` = `'0'` and stop this step.

2. **Skip if no decisions.** If `{assumption_count}` = `'0'` AND `{clarification_count}` = `'0'`, emit `ℹ️ No decisions logged this session — skipping cross-story propagation.` and stop.

3. **Re-fetch current task comments.** Call `getTaskById({ id: "{task_id}" })` to get the latest task state including all comments posted this session. Parse the comments list for:
   - **Template D** markers: comments whose body contains `## 🤔 Assumption Made`
   - **Template F** markers: comments whose body contains `## ✅ Dev Clarification Resolved`

4. **Apply the eligibility matrix.** For each Template D or Template F comment found in step 3, apply the eligibility matrix above to decide whether it qualifies for propagation. Collect qualifying decisions into `{eligible_decisions}` — a working list of (type, summary, decision, rationale, where_applied) tuples.

   If `{eligible_decisions}` is empty after filtering, emit `ℹ️ No cross-story-eligible decisions this session — skipping propagation.` and stop.

5. **Discover siblings.**

   a. Extract `<task_list_id>` from the `getTaskById` response (field `list.id`).

   b. Call `searchTasks({ terms: [""], list_ids: ["<task_list_id>"] })`. From the results, filter the sibling candidate list:
      - Remove `{task_id}` (current story).
      - Remove any task whose status is `done`, `closed`, `cancelled`, `approved`, or `released`.
      - Keep tasks whose `parent_task_id` matches `{epic_task_id}` (same-epic siblings) — these are **primary targets**.
      - Additionally keep tasks from a different epic if any eligible decision's `where_applied` field mentions a path that also appears in that task's description — these are **extended targets**.

   If no siblings remain after filtering, emit `ℹ️ No incomplete sibling stories found — skipping propagation.` and stop.

6. **Compose and post Template G for each sibling.** For each sibling in the filtered list:

   a. Compose the Template G comment: substitute `{task_name}`, `{task_url}`, `{task_id}` with the CURRENT story's values; fill the decision blocks from `{eligible_decisions}`; write a specific "Why this may affect you" sentence referencing the sibling's task name and the most relevant decision.

   b. Call `addComment` with `task_id` = sibling's task ID and `comment` = the composed markdown.

   c. On success: increment `{propagation_count}`, emit `✅ Context comment posted on **{sibling_name}** ({sibling_id}).`

   d. On failure: emit `⚠️ Failed to post context comment on {sibling_name} ({sibling_id}): {error}. Continuing.`

7. **Report summary.** After all siblings have been processed, emit:

   > 🔄 **Cross-story propagation complete**
   >
   > - Eligible decisions propagated: {count of eligible_decisions}
   > - Sibling stories notified: `{propagation_count}`
   > - Failures: {failure_count (0 if none)}

## NEXT

After step 9 completes (or is skipped), proceed to step 10 (Lore lesson save).
