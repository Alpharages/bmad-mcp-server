---
assumption_count: ''
last_assumption_comment_id: ''
---

# Step 6: Non-Blocking Assumption Pattern

## RULES

- **(a) Non-blocking:** Implementation MUST continue immediately after the assumption comment is posted (or after the soft-gate/failure warning is emitted). The Dev agent does NOT wait for the dev, the PM, or any human to respond. This rule defines the entire purpose of step 6 and separates it from step 7 (dev-clarification), which IS blocking.
- **(b) Append-only, markdown-formatted:** Assumption comments are posted via `addComment` as markdown strings. They are never edited or deleted. The `updateTask` tool MUST NOT be used in this step.
- **(c) Write-mode soft gate:** If `addComment` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see INSTRUCTIONS step 1), set `{assumption_count}` = `'0'`, skip the assumption comment for this invocation, and **continue** — assumption comments are supplemental; their absence does not block implementation.
- **(d) Non-blocking failures:** If the `addComment` call returns an error, emit the assumption-failed warning block (see INSTRUCTIONS step 6) and **continue** — implementation does not halt on an assumption-comment failure.
- **(e) Escalation threshold:** Step 6 is for ambiguities the agent can resolve with a reasonable default (e.g. "PRD and architecture don't specify log level for this utility — defaulting to `debug`"). Ambiguities that change scope, risk, or acceptance-criterion interpretation MUST be escalated to step 7 (dev-clarification), which asks the dev before proceeding. See the `## DECISION MATRIX` section for the triage criteria.
- **(f) Variable contract:** `{assumption_count}` is incremented by 1 after each successful `addComment` call issued by step 6. `{last_assumption_comment_id}` is set to the `comment_id` returned by the most recent successful step-6 call. Both values persist across all invocations of step 6 within a session. These counters are independent of step 4's progress-comment counters — step 6 maintains its own counters so the M2 summary can report "N assumptions posted" separately from overall progress comments. **Step 6 MUST NOT read, reference, increment, or modify step 4's progress-comment counters.** Verified by `grep -E '\{(comment_count|last_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` returning zero matches.

## WHEN TO POST

Step 6 is discretionary (like step 4's M3+ template), invoked zero or more times per session. It is always post–step-3 (planning artifacts loaded) and pre–step-5 (status transition) — i.e. any point during implementation through M2. Each invocation corresponds to exactly one ambiguity-resolving decision the agent made unilaterally.

**Pre-M1 ordering rule:** if an ambiguity is discovered after step 3 completes but before step 4 has posted M1, the agent MUST invoke step 4 M1 first so reviewers see implementation-start context before any assumption comment; then invoke step 6.

## DECISION MATRIX

| Ambiguity type                                                                                         | Use step 6 (assumption) | Use step 7 (clarification) |
| ------------------------------------------------------------------------------------------------------ | :---------------------: | :------------------------: |
| Naming choice (variable, file, function) where PRD/architecture do not specify                         |           ✅            |                            |
| Minor dependency default (e.g. log level, retry count) with a reasonable industry norm                 |           ✅            |                            |
| Which of two equivalent refactor shapes to pick when both satisfy acceptance criteria                  |           ✅            |                            |
| Edge case not covered by acceptance criteria, where the obvious-safest behaviour is clearly derivable  |           ✅            |                            |
| A requirement or acceptance criterion appears self-contradictory                                       |                         |             ✅             |
| Two PRD or architecture clauses conflict on the same decision                                          |                         |             ✅             |
| Implementing the literal AC would break a previously shipped story                                     |                         |             ✅             |
| The fix requires adding a dependency, schema change, or breaking API change not mentioned in the story |                         |             ✅             |
| The agent cannot find a reasonable default and any guess has material risk of rework                   |                         |             ✅             |

## COMMENT TEMPLATE

### Template D — Assumption

```
## 🤔 Assumption Made

**Context:** {one or two sentences describing the ambiguity — what was unclear in the PRD, architecture, task description, or code}

**Assumption:** {the decision the agent made — what is being treated as true, preferred, or default}

**Rationale:** {why this assumption is reasonable — reference to convention, industry norm, the closest PRD/architecture clause, a previously shipped story, or the obvious-safest option}

**Confidence:** {low | medium | high — agent's self-assessed likelihood the dev will accept this assumption without override. Low = please double-check; medium = reasonable default; high = near-certain}

**Where applied:** {file path(s), function name, or code region where the assumption drives behaviour}

**Override:** If this assumption is wrong, comment on this task or reply on the PR with the correct decision; the Dev agent will treat that as a dev-clarification (step 7 pattern) in a future session.
```

## INSTRUCTIONS

1. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block below, set `{assumption_count}` = `'0'`, and skip the assumption comment for this invocation. Continue to the next workflow step without posting.

   > ⚠️ **Assumption comment skipped — write mode not active**
   >
   > The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to post assumption comments. The `addComment` tool is not available in the current tool list.
   >
   > **Impact:** Assumption for task `{task_id}` ({task_name}) will not be recorded in ClickUp. Implementation continues; the assumption remains documented only in the agent's conversation context.
   >
   > **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable assumption comments in future sessions. For this session, note the assumption manually on the ticket if it matters for reviewers.

2. **Triage the ambiguity against the decision matrix.** If the ambiguity matches a step-7 row (clarification required), abort step 6 immediately and invoke step 7 (`step-07-dev-clarification.md`) instead. Do NOT post an assumption comment for a step-7-class ambiguity. **Pre-3.8 fallback:** If `step-07-dev-clarification.md` does not yet exist in the repository (the story 3-7 / 3-8 merge window), HALT implementation and ask the dev directly via the active conversation — do NOT fabricate a step-7 comment, do NOT invent a clarification pattern, and do NOT fall back to step 6 for a step-7-class ambiguity. If the ambiguity matches a step-6 row (assumption acceptable), continue to step (3).

3. **Compose the assumption comment.** Use Template D verbatim. Substitute the `{...}` placeholders as follows: `{task_id}` from step 1 (task-id-parser); `{task_name}` from step 2 (task-fetch); fill `{context}`, `{assumption}`, `{rationale}`, `{confidence}` (exactly one of `low`, `medium`, `high`), and `{where_applied}` with the specifics of this decision. The `**Override:**` line is literal — do NOT rewrite it. Each placeholder MUST be replaced with concrete content (no empty sections, no "TBD").

4. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and `comment` = the composed markdown string from step (3).

5. **Handle success.** If `addComment` returns successfully: increment `{assumption_count}` by 1, set `{last_assumption_comment_id}` to the `comment_id` from the response, and confirm `✅ Assumption comment posted (comment_id: {last_assumption_comment_id})`. Continue implementation immediately — do NOT wait for a response.

6. **Handle failure.** If `addComment` returns an error: emit the assumption-failed warning block below, do NOT increment `{assumption_count}` or update `{last_assumption_comment_id}`, and continue — do not halt implementation.

   > ⚠️ **Assumption comment failed — continuing without posting**
   >
   > The `clickup-dev-implement` skill called `addComment` for task `{task_id}` but received an error while posting an assumption.
   >
   > **Impact:** This assumption will not be recorded in ClickUp. Implementation continues unaffected.
   >
   > **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to comment on this task, then manually post the assumption in ClickUp if it matters for reviewers.
