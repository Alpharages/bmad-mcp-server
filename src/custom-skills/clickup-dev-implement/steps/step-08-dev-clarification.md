---
clarification_count: ''
last_clarification_comment_id: ''
pending_clarification: ''
---

# Step 8: Dev Clarification Prompt

## RULES

- **(a) Blocking:** Implementation MUST halt immediately after the clarification request is composed. The Dev agent does NOT resume implementation, continue to the next workflow step, or invoke any other step until the dev replies in the active conversation (see rule (f) for the resume contract). This rule defines the entire purpose of step 8 and separates it from step 7 (assumption pattern), which is explicitly non-blocking.
- **(b) Asks the dev, never the PM:** The clarification is directed at the **human in the active session** (the dev who invoked `clickup-dev-implement`). The ClickUp `addComment` call is a record for reviewers, not the question's destination. The Dev agent MUST NOT tag, mention, or otherwise route the clarification to the PM, architect, or any other role. If the dev is unavailable, the agent stays halted — it does NOT escalate elsewhere or fall back to an assumption.
- **(c) Append-only, markdown-formatted:** Clarification comments (request and resolution) are posted via `addComment` as markdown strings. They are never edited or deleted. The `updateTask` tool MUST NOT be used in this step.
- **(d) Write-mode soft gate — still halts:** If `addComment` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see INSTRUCTIONS step (3)), set `{clarification_count}` = `'0'`, set `{pending_clarification}` = `'true'`, skip the ClickUp comment for this invocation, and **still halt implementation** — ask the dev directly in the active conversation using Template E's content (minus the ClickUp-side-channel framing). The blocking contract (rule (a)) is preserved regardless of write-mode availability. This is the key semantic divergence from step 6, which continues without blocking when write mode is unavailable.
- **(e) Blocking on post-failure:** If the `addComment` call returns an error, emit the clarification-failed warning block (see INSTRUCTIONS step (6)), set `{pending_clarification}` = `'true'`, do NOT increment `{clarification_count}`, and **still halt implementation** — ask the dev directly in the active conversation. As with rule (d), the blocking contract is preserved; only the ClickUp side-channel record is lost.
- **(f) Resume contract:** Implementation resumes ONLY when the dev replies in the active conversation. The reply can take any form (prose answer, file pointer, acceptance-criterion clarification, "proceed with option B", etc.). Upon receiving the reply, the Dev agent MUST: (1) record the resolution by composing Template F and posting it via `addComment` if and only if the original request was successfully posted (i.e., `{last_clarification_comment_id}` is non-empty); (2) set `{pending_clarification}` = `'false'`; (3) continue implementation applying the dev's resolution. If the dev's reply introduces a new ambiguity that itself matches a step-7 row, invoke step 7 again (the counter increments for each cycle).
- **(g) Variable contract:** `{clarification_count}` is incremented by 1 after each successful `addComment` call that posts a Template E (request) from step 7. `{last_clarification_comment_id}` is set to the `comment_id` returned by the most recent successful Template-E `addComment` call. `{pending_clarification}` is `'true'` while step 7 is blocking and `'false'` otherwise. All three values persist across all invocations of step 7 within a session. These counters are independent of step 5's progress-comment counters (`comment_count`, `last_comment_id`) and step 7's assumption counters (`assumption_count`, `last_assumption_comment_id`) — step 7 maintains its own counters so the M2 summary and future reporting can report "N clarifications requested" separately from progress comments and assumption comments. **Step 8 MUST NOT read, reference, increment, or modify any of these four variables: `comment_count`, `last_comment_id`, `assumption_count`, `last_assumption_comment_id`.** Verified by `grep -E '\{(comment_count|last_comment_id|assumption_count|last_assumption_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-08-dev-clarification.md` returning zero matches (see Task 3 of story 3-8).

## WHEN TO INVOKE

Step 7 is discretionary but gated by the step-6 decision matrix — invoked zero or more times per session, only when the triage determines the ambiguity matches a step-7 row. It is always post–step-3 (planning artifacts loaded) and pre–step-5 (status transition) — i.e. any point during implementation through M2. Each invocation corresponds to exactly one blocking clarification request.

**Pre-M1 ordering rule:** if a step-7-class ambiguity is discovered after step 3 completes but before step 4 has posted M1, the agent MUST invoke step 4 M1 first (so reviewers see implementation-start context before any clarification comment), then invoke step 7.

**Explicit delegation to step 6:** step 7 does NOT re-implement the decision matrix; it assumes the matrix in step 6 has already been consulted and has escalated the ambiguity to step 7.

## TRIAGE

The canonical decision matrix lives in [`step-07-assumptions.md`](./step-07-assumptions.md) `## DECISION MATRIX`. Step 7 does not redefine it; the matrix is reproduced there once and referenced here for quick triage. The five step-7 rows are, for reminder only:

- A requirement or acceptance criterion appears self-contradictory
- Two PRD or architecture clauses conflict on the same decision
- Implementing the literal AC would break a previously shipped story
- The fix requires adding a dependency, schema change, or breaking API change not mentioned in the story
- The agent cannot find a reasonable default and any guess has material risk of rework

If an ambiguity matches none of these rows, use step 6 (assumption pattern) instead — this step is for ambiguities where no reasonable default exists.

## COMMENT TEMPLATES

### Template E — Dev Clarification Needed

```
## ❓ Dev Clarification Needed

**Context:** {one or two sentences describing the blocker — what was unclear, contradictory, or scope-expanding in the PRD, architecture, task description, or code}

**Question:** {the specific, answerable question for the dev — phrased so a reply in a few sentences (or a pointer to a file/section) is sufficient to unblock}

**Options considered:** {numbered list of the candidate resolutions the agent evaluated, each with a one-line pro/con. Write "No reasonable default found." on a single line if the agent could not enumerate viable options}

**Why this is a clarification (not an assumption):** {reference to the step-6 decision matrix — name the matching step-7 row: AC self-contradiction, PRD/architecture clause conflict, cross-story regression, undocumented dependency/schema/API change, or material rework risk}

**Blocked on:** {file path(s), function name, or code region that cannot proceed until this is resolved}

**Ticket:** {task_url}

**Status:** Implementation is halted on task `{task_id}`. Reply in the **IDE session where the Dev agent is running** — not on this ticket. Ticket replies are not auto-ingested; the agent will NOT resume until it receives your reply in-session.
```

### Template F — Clarification Resolved

```
## 💬 Clarification Resolved

**Original question:** See clarification comment above (`comment_id: {last_clarification_comment_id}`).

**Dev's resolution:** {one or two sentences summarising what the dev decided — verbatim quote is fine for short answers; paraphrase with attribution for longer ones}

**Applied to:** {file path(s), function name, or code region where the resolution drives behaviour}

**Implementation continues.**
```

## INSTRUCTIONS

1. **Confirm step-7 triage.** Verify the ambiguity matches a step-8 row in the decision matrix defined in `step-07-assumptions.md` `## DECISION MATRIX`. If the ambiguity matches a step-6 row (reasonable default exists), abort step 8 immediately and invoke step 7 instead. Do NOT post a clarification request for a step-6-class ambiguity. If the ambiguity matches neither set of rows cleanly, default to step 7 — the cost of asking when the agent could have decided is lower than the cost of silently deciding when the agent should have asked.

2. **Compose the clarification request.** Use Template E verbatim. Substitute the `{...}` placeholders as follows: `{task_id}` from step 1 (task-id-parser); `{task_name}` and `{task_url}` from step 2 (task-fetch); fill `{context}`, `{question}`, `{options_considered}`, `{why_clarification}`, and `{blocked_on}` with the specifics of this ambiguity. The `**Ticket:**` line substitutes `{task_url}` only; the `**Status:**` line is literal (only `{task_id}` substitutes) — do NOT rewrite either line's surrounding text. Each placeholder MUST be replaced with concrete content (no empty sections, no "TBD"). If no viable options can be enumerated, write the literal string "No reasonable default found." on a single line under `**Options considered:**`.

3. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block below, set `{clarification_count}` = `'0'`, set `{pending_clarification}` = `'true'`, skip the `addComment` call, and jump directly to step (5) — the halt + active-conversation path. Do NOT continue to the next workflow step.

   ```
   ⚠️ **Clarification comment skipped — write mode not active**

   The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to post clarification comments. The `addComment` tool is not available in the current tool list.

   **Impact:** The clarification request for task `{task_id}` ({task_name}) will not be recorded in ClickUp. Implementation is halted and the question is being asked directly in the active conversation — a reply is still required before implementation resumes.

   **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable clarification comments in future sessions. For this session, answer the question in the active conversation; consider also posting the resolution manually on the ticket if it matters for reviewers.
   ```

4. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and `comment` = the composed Template-E markdown string from step (2).

5. **Halt implementation and ask the dev.** Emit the question in the active conversation using one of these two forms, then confirm `⏸️ Implementation halted — awaiting dev reply on task {task_id}` and set `{pending_clarification}` = `'true'`:
   - **If Template E posted successfully** (step (4) returned a `comment_id`): emit a concise paraphrase of the question and append `(ticket record: comment_id {last_clarification_comment_id})`. Do not repeat the full template body — the record lives on the ticket.
   - **If Template E was skipped (write mode absent) or failed**: emit the full Template-E content verbatim in the active conversation, because no ticket record exists for the dev to refer back to.

   In both branches: do NOT proceed to any other workflow step, do NOT invoke step 5 (status transition), do NOT invoke step 6 (assumption), and do NOT fabricate a dev response.

6. **Handle `addComment` success.** If step (4) executed and `addComment` returned successfully: increment `{clarification_count}` by 1, set `{last_clarification_comment_id}` to the `comment_id` from the response, and confirm `✅ Clarification request posted (comment_id: {last_clarification_comment_id})`. Then proceed to step (5) (halt). If step (4) returned an error: emit the clarification-failed warning block below, do NOT increment `{clarification_count}` or update `{last_clarification_comment_id}`, set `{pending_clarification}` = `'true'`, and proceed to step (5) (still halt).

   ```
   ⚠️ **Clarification comment failed — halting and asking directly**

   The `clickup-dev-implement` skill called `addComment` for task `{task_id}` but received an error while posting a clarification request.

   **Impact:** This clarification will not be recorded in ClickUp. Implementation is still halted and the question is being asked directly in the active conversation — a reply is still required before implementation resumes.

   **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to comment on this task. Answer the question in the active conversation; consider also posting the resolution manually on the ticket if it matters for reviewers.
   ```

7. **Resume on dev reply.** When the dev replies in the active conversation: (a) if `{last_clarification_comment_id}` is non-empty (Template E was successfully posted), compose Template F substituting `{last_clarification_comment_id}` literally and filling `{dev_resolution}` and `{applied_to}` from the reply; call `addComment` with the Template-F markdown (non-blocking on failure — if this `addComment` call errors, emit a short warning and continue); (b) if `{last_clarification_comment_id}` is empty (Template E was never posted), skip the Template-F `addComment` call entirely and summarise the resolution in the active conversation only. In both branches, set `{pending_clarification}` = `'false'` and continue implementation with the dev's resolution applied. If the reply itself introduces a new step-7-class ambiguity, invoke step 7 again (counter increments).

## RESUME

After INSTRUCTIONS step (5) emits the halt marker, the Dev agent does not advance the workflow — no next-step invocation, no status transition, no step-6 assumption fallback. The agent waits for a dev reply in the active conversation; ticket comments are not auto-ingested and do not resume the agent.

When the dev replies, the agent applies INSTRUCTIONS step (7):

1. If `{last_clarification_comment_id}` is non-empty (Template E was successfully posted on the ticket), compose Template F with the dev's resolution and post it via `addComment`. A Template-F `addComment` failure is non-blocking — emit a short warning and continue.
2. If `{last_clarification_comment_id}` is empty (Template E was never successfully posted), skip the Template-F `addComment` call and summarise the resolution in the active conversation only.
3. Set `{pending_clarification}` = `'false'` and continue implementation with the resolution applied.

If the dev's reply itself introduces a new step-7-class ambiguity, invoke step 7 again; `{clarification_count}` increments for each cycle.
