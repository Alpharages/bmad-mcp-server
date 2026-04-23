# Story 3.8: Define dev-facing clarification prompt

Status: ready-for-dev

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Dev Clarification` skeleton left by story 3.1. Adds one step file and updates one section in `workflow.md`. No TypeScript lands. The pattern posts a markdown-formatted "Dev Clarification Needed" comment via `addComment` whenever the Dev agent hits an ambiguity it cannot responsibly resolve on its own, then **halts implementation** until the dev replies in the active conversation. This is the blocking counterpart to story 3.7's non-blocking assumption pattern: step 6 resolves ambiguities with a reasonable default; step 7 stops and asks when no reasonable default exists. Critically, the question goes to the **dev** (the human in the active session), never to the PM — ClickUp is the write channel for the record, not the question's destination.
>
> **Depends on story 3.7 completing first.** Step 7 consumes the decision matrix defined in step 6 as its triage contract: an ambiguity reaches step 7 only if it matches a step-7 row in that matrix. `workflow.md`'s `## Assumptions` section must be in its post-3.7 state (see story 3.7 AC #2) before this story touches `workflow.md`, so the two edits don't collide. The only upstream variables step 7 consumes are `{task_id}` (from step 1's task-id-parser), `{task_name}` (from step 2's task-fetch), and `{task_url}` (from step 2); all must be in conversation context before step 7 is invoked. Step 7 does NOT read `{comment_count}`, `{last_comment_id}`, `{assumption_count}`, or `{last_assumption_comment_id}` — see rule (g) in AC #1 for the counter-independence contract. Do not start implementation until story 3.7 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to halt implementation and post a markdown-formatted "Dev Clarification Needed" comment to the ClickUp task whenever the Dev agent hits an ambiguity that exceeds the step-6 decision-matrix threshold, via an append-only `addComment` call, and to resume implementation only after the dev replies in the active conversation,
so that scope-changing, AC-contradicting, cross-story-breaking, or materially-risky ambiguities get a direct answer from the dev who invoked the skill (not a silent judgment call from the agent and not a request routed to the PM) — and so that reviewers see the full lifecycle of every blocking question in the ClickUp comment stream, paired with its resolution, instead of discovering it buried in a PR diff.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-07-dev-clarification.md` exists and is the canonical source of the dev-facing clarification-prompt logic. It MUST:
   - Have YAML frontmatter with exactly these runtime-population keys (all empty strings, in this order):
     ```yaml
     clarification_count: ''
     last_clarification_comment_id: ''
     pending_clarification: ''
     ```
   - Include a `# Step 7: Dev Clarification Prompt` H1 title.
   - Include a `## RULES` section with all seven rules:
     - (a) **Blocking:** Implementation MUST halt immediately after the clarification request is composed. The Dev agent does NOT resume implementation, continue to the next workflow step, or invoke any other step until the dev replies in the active conversation (see rule (f) for the resume contract). This rule defines the entire purpose of step 7 and separates it from step 6 (assumption pattern), which is explicitly non-blocking.
     - (b) **Asks the dev, never the PM:** The clarification is directed at the **human in the active session** (the dev who invoked `clickup-dev-implement`). The ClickUp `addComment` call is a record for reviewers, not the question's destination. The Dev agent MUST NOT tag, mention, or otherwise route the clarification to the PM, architect, or any other role. If the dev is unavailable, the agent stays halted — it does NOT escalate elsewhere or fall back to an assumption.
     - (c) **Append-only, markdown-formatted:** Clarification comments (request and resolution) are posted via `addComment` as markdown strings. They are never edited or deleted. The `updateTask` tool MUST NOT be used in this step.
     - (d) **Write-mode soft gate — still halts:** If `addComment` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see AC #3), set `{clarification_count}` = `'0'`, set `{pending_clarification}` = `'true'`, skip the ClickUp comment for this invocation, and **still halt implementation** — ask the dev directly in the active conversation using Template E's content (minus the ClickUp-side-channel framing). The blocking contract (rule (a)) is preserved regardless of write-mode availability. This is the key semantic divergence from step 6, which continues without blocking when write mode is unavailable.
     - (e) **Blocking on post-failure:** If the `addComment` call returns an error, emit the clarification-failed warning block (see AC #4), set `{pending_clarification}` = `'true'`, do NOT increment `{clarification_count}`, and **still halt implementation** — ask the dev directly in the active conversation. As with rule (d), the blocking contract is preserved; only the ClickUp side-channel record is lost.
     - (f) **Resume contract:** Implementation resumes ONLY when the dev replies in the active conversation. The reply can take any form (prose answer, file pointer, acceptance-criterion clarification, "proceed with option B", etc.). Upon receiving the reply, the Dev agent MUST: (1) record the resolution by composing Template F and posting it via `addComment` if and only if the original request was successfully posted (i.e., `{last_clarification_comment_id}` is non-empty); (2) set `{pending_clarification}` = `'false'`; (3) continue implementation applying the dev's resolution. If the dev's reply introduces a new ambiguity that itself matches a step-7 row, invoke step 7 again (the counter increments for each cycle).
     - (g) **Variable contract:** `{clarification_count}` is incremented by 1 after each successful `addComment` call that posts a Template E (request) from step 7. `{last_clarification_comment_id}` is set to the `comment_id` returned by the most recent successful Template-E `addComment` call. `{pending_clarification}` is `'true'` while step 7 is blocking and `'false'` otherwise. All three values persist across all invocations of step 7 within a session. These counters are independent of step 4's `{comment_count}` / `{last_comment_id}` and step 6's `{assumption_count}` / `{last_assumption_comment_id}` — step 7 maintains its own counters so the M2 summary and future reporting can report "N clarifications requested" separately from progress comments and assumption comments. **Step 7 MUST NOT read, reference, increment, or modify any of these four variables: `{comment_count}`, `{last_comment_id}`, `{assumption_count}`, `{last_assumption_comment_id}`.** Verified by `grep -E '\{(comment_count|last_comment_id|assumption_count|last_assumption_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-07-dev-clarification.md` returning zero matches (see Task 3).
   - Include a `## WHEN TO INVOKE` section that states, in prose: step 7 is discretionary but gated by the step-6 decision matrix — invoked zero or more times per session, only when the triage determines the ambiguity matches a step-7 row. It is always post–step-3 (planning artifacts loaded) and pre–step-5 (status transition) — i.e. any point during implementation through M2. Each invocation corresponds to exactly one blocking clarification request. **Pre-M1 ordering rule:** if a step-7-class ambiguity is discovered after step 3 completes but before step 4 has posted M1, the agent MUST invoke step 4 M1 first (so reviewers see implementation-start context before any clarification comment), then invoke step 7. **Explicit delegation to step 6:** step 7 does NOT re-implement the decision matrix; it assumes the matrix in step 6 has already been consulted and has escalated the ambiguity to step 7.
   - Include a `## TRIAGE` section that restates, as a reminder (not a duplicate definition), that the canonical decision matrix lives in `step-06-assumptions.md` `## DECISION MATRIX`. List the five step-7 rows inline as a bullet list for quick reference:
     - A requirement or acceptance criterion appears self-contradictory
     - Two PRD or architecture clauses conflict on the same decision
     - Implementing the literal AC would break a previously shipped story
     - The fix requires adding a dependency, schema change, or breaking API change not mentioned in the story
     - The agent cannot find a reasonable default and any guess has material risk of rework

     Follow the bullet list with this sentence (verbatim): "If an ambiguity matches none of these rows, use step 6 (assumption pattern) instead — this step is for ambiguities where no reasonable default exists."
   - Include a `## COMMENT TEMPLATES` section with Template E (request) and Template F (resolution), both quoted verbatim (see AC #5 and AC #6).
   - Include an `## INSTRUCTIONS` section with numbered steps exactly as specified in AC #7.
   - Include a `## RESUME` section summarising the resume contract from rule (f) in prose: the agent halts after step (5) of INSTRUCTIONS; resumes only on a dev reply in the active conversation; records resolution via Template F only if the original request was successfully posted; then continues implementation with the resolution applied.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Dev Clarification` section is updated to replace the `<!-- story 3-8 will implement: asks the dev, never the PM, when blocked -->` breadcrumb with:
   - A one-line description of what the dev-clarification prompt does (invoked at the agent's discretion during implementation, zero or more times; posts a markdown "Dev Clarification Needed" comment via `addComment`; **halts implementation** until the dev replies in the active conversation; asks the dev, never the PM; blocking contract preserved even when write mode is unavailable or `addComment` fails).
   - `See: [./steps/step-07-dev-clarification.md](./steps/step-07-dev-clarification.md)`
   - An inline statement: "`{clarification_count}`, `{last_clarification_comment_id}`, and `{pending_clarification}` are available to downstream steps after this step's first invocation. `{clarification_count}` is `'0'` if write mode was unavailable; `''` (empty) if write mode was active but no clarification was successfully posted in this session. `{pending_clarification}` is `'true'` whenever the agent is awaiting a dev reply. These counters are independent of `{comment_count}` / `{last_comment_id}` (step 4) and `{assumption_count}` / `{last_assumption_comment_id}` (step 6)."

   No other sections in `workflow.md` change. The `## Input`, `## Fetch`, `## Planning Artifacts`, `## Progress Comments`, `## Status Transitions`, and `## Assumptions` sections (from stories 3.2–3.7) MUST remain intact. In particular, the `## Assumptions` section MUST be in its post-3.7 state (three lines: description, `See:` link, variable-availability statement) — this story does NOT modify it.

3. The mode-unavailable warning block (referenced in AC #1 rule (d) and instruction step (3)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Clarification comment skipped — write mode not active**

   The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to post clarification comments. The `addComment` tool is not available in the current tool list.

   **Impact:** The clarification request for task `{task_id}` ({task_name}) will not be recorded in ClickUp. Implementation is halted and the question is being asked directly in the active conversation — a reply is still required before implementation resumes.

   **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable clarification comments in future sessions. For this session, answer the question in the active conversation; consider also posting the resolution manually on the ticket if it matters for reviewers.
   ```

4. The clarification-failed warning block (referenced in AC #1 rule (e) and instruction step (6)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Clarification comment failed — halting and asking directly**

   The `clickup-dev-implement` skill called `addComment` for task `{task_id}` but received an error while posting a clarification request.

   **Impact:** This clarification will not be recorded in ClickUp. Implementation is still halted and the question is being asked directly in the active conversation — a reply is still required before implementation resumes.

   **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to comment on this task. Answer the question in the active conversation; consider also posting the resolution manually on the ticket if it matters for reviewers.
   ```

5. Template E — Dev Clarification Needed MUST be quoted verbatim in the step file:

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

6. Template F — Clarification Resolved MUST be quoted verbatim in the step file:

   ```
   ## 💬 Clarification Resolved

   **Original question:** See clarification comment above (`comment_id: {last_clarification_comment_id}`).

   **Dev's resolution:** {one or two sentences summarising what the dev decided — verbatim quote is fine for short answers; paraphrase with attribution for longer ones}

   **Applied to:** {file path(s), function name, or code region where the resolution drives behaviour}

   **Implementation continues.**
   ```

7. The `## INSTRUCTIONS` section MUST contain exactly these numbered steps:
   1. **Confirm step-7 triage.** Verify the ambiguity matches a step-7 row in the decision matrix defined in `step-06-assumptions.md` `## DECISION MATRIX`. If the ambiguity matches a step-6 row (reasonable default exists), abort step 7 immediately and invoke step 6 instead. Do NOT post a clarification request for a step-6-class ambiguity. If the ambiguity matches neither set of rows cleanly, default to step 7 — the cost of asking when the agent could have decided is lower than the cost of silently deciding when the agent should have asked.
   2. **Compose the clarification request.** Use Template E verbatim. Substitute the `{...}` placeholders as follows: `{task_id}` from step 1 (task-id-parser); `{task_name}` and `{task_url}` from step 2 (task-fetch); fill `{context}`, `{question}`, `{options_considered}`, `{why_clarification}`, and `{blocked_on}` with the specifics of this ambiguity. The `**Ticket:**` line substitutes `{task_url}` only; the `**Status:**` line is literal (only `{task_id}` substitutes) — do NOT rewrite either line's surrounding text. Each placeholder MUST be replaced with concrete content (no empty sections, no "TBD"). If no viable options can be enumerated, write the literal string "No reasonable default found." on a single line under `**Options considered:**`.
   3. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block below, set `{clarification_count}` = `'0'`, set `{pending_clarification}` = `'true'`, skip the `addComment` call, and jump directly to step (5) — the halt + active-conversation path. Do NOT continue to the next workflow step.
   4. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and `comment` = the composed Template-E markdown string from step (2).
   5. **Halt implementation and ask the dev.** Emit the question in the active conversation using one of these two forms, then confirm `⏸️ Implementation halted — awaiting dev reply on task {task_id}` and set `{pending_clarification}` = `'true'`:
      - **If Template E posted successfully** (step (4) returned a `comment_id`): emit a concise paraphrase of the question and append `(ticket record: comment_id {last_clarification_comment_id})`. Do not repeat the full template body — the record lives on the ticket.
      - **If Template E was skipped (write mode absent) or failed**: emit the full Template-E content verbatim in the active conversation, because no ticket record exists for the dev to refer back to.

      In both branches: do NOT proceed to any other workflow step, do NOT invoke step 5 (status transition), do NOT invoke step 6 (assumption), and do NOT fabricate a dev response.
   6. **Handle `addComment` success.** If step (4) executed and `addComment` returned successfully: increment `{clarification_count}` by 1, set `{last_clarification_comment_id}` to the `comment_id` from the response, and confirm `✅ Clarification request posted (comment_id: {last_clarification_comment_id})`. Then proceed to step (5) (halt). If step (4) returned an error: emit the clarification-failed warning block below, do NOT increment `{clarification_count}` or update `{last_clarification_comment_id}`, set `{pending_clarification}` = `'true'`, and proceed to step (5) (still halt).
   7. **Resume on dev reply.** When the dev replies in the active conversation: (a) if `{last_clarification_comment_id}` is non-empty (Template E was successfully posted), compose Template F substituting `{last_clarification_comment_id}` literally and filling `{dev_resolution}` and `{applied_to}` from the reply; call `addComment` with the Template-F markdown (non-blocking on failure — if this `addComment` call errors, emit a short warning and continue); (b) if `{last_clarification_comment_id}` is empty (Template E was never posted), skip the Template-F `addComment` call entirely and summarise the resolution in the active conversation only. In both branches, set `{pending_clarification}` = `'false'` and continue implementation with the dev's resolution applied. If the reply itself introduces a new step-7-class ambiguity, invoke step 7 again (counter increments).

8. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`, `step-02-task-fetch.md`, `step-03-planning-artifact-reader.md`, `step-04-progress-comment-poster.md`, `step-05-status-transition.md`, and `step-06-assumptions.md` are byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` MUST be empty.

9. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

10. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

11. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

12. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.7 (current test baseline: **234 passing**, 0 failing — unchanged from story 3.6 because 3.7 also ships markdown only). Since no `.ts` lands, the expected test-count delta is zero. **Re-verify the baseline against the merge commit of story 3.7 before committing** — if 3.7 landed with an unexpected test-count change, update this baseline in the commit message accordingly; the delta from 3.7 → 3.8 should still be zero.

13. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

14. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.

15. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring is deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

16. `src/custom-skills/clickup-dev-implement/SKILL.md` is byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/SKILL.md` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- `_bmad/custom/bmad-agent-dev.toml` DS-trigger wiring → **story 3.9**.
- Automating ingestion of dev replies posted on ClickUp (rather than in the active conversation). Template E's `**Status:**` line asks for a reply in the active session; automating a poll of the ClickUp comment stream for a reply is a future enhancement. If the dev chooses to answer on the ticket instead of in the session, the agent still halts — the dev must re-engage the session (or a new session referencing the same `task_id`) and state the resolution there.
- Editing or deleting previously posted clarification comments — append-only is the hard constraint (inherited from step 4).
- Emitting an aggregated "N clarifications requested" line in step 4's Template B (M2) body. This story does not modify step 4. A future story may choose to surface `{clarification_count}` in the M2 summary.
- Timeout / auto-escalation behaviour for long-halted clarifications. Step 7 halts indefinitely by design; if the dev never replies, the session simply stays halted. Introducing a wall-clock timeout would require agent-host integration beyond this skill's scope.
- PM-facing escalation for clarifications the dev cannot resolve. Rule (b) mandates that step 7 asks the dev and only the dev; if the dev needs to loop in the PM, that is a human-process step outside the skill's execution.
- Fuzzy matching or auto-triage of ambiguity types — the decision matrix in `step-06-assumptions.md` is the canonical triage contract; step 7 delegates to it and does not re-implement it.
- Re-invoking step 5 (status transition) for tasks that were halted mid-session and never resumed. The halt contract means step 5 simply does not run for unresolved sessions.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-07-dev-clarification.md` (AC: #1, #3, #4, #5, #6, #7)**
  - [ ] Create the file with YAML frontmatter (`clarification_count: ''`, `last_clarification_comment_id: ''`, `pending_clarification: ''` — in that order), `# Step 7: Dev Clarification Prompt` H1, and the `## RULES`, `## WHEN TO INVOKE`, `## TRIAGE`, `## COMMENT TEMPLATES`, `## INSTRUCTIONS`, and `## RESUME` sections exactly as specified in AC #1 and AC #3–#7.
  - [ ] Verify the `## RULES` section includes all seven rules: blocking, asks-the-dev-never-the-PM, append-only markdown-formatted, write-mode soft gate (still halts), blocking on post-failure, resume contract, variable contract.
  - [ ] Verify the `## TRIAGE` section lists the five step-7 rows verbatim and includes the sentence "If an ambiguity matches none of these rows, use step 6 (assumption pattern) instead — this step is for ambiguities where no reasonable default exists."
  - [ ] Include the verbatim mode-unavailable warning block from AC #3.
  - [ ] Include the verbatim clarification-failed warning block from AC #4.
  - [ ] Include the verbatim Template E (Dev Clarification Needed) from AC #5 — Template E MUST include the `**Status:**` line verbatim.
  - [ ] Include the verbatim Template F (Clarification Resolved) from AC #6.
  - [ ] Include the `## INSTRUCTIONS` numbered steps exactly as specified in AC #7 (7 steps). Verify step (1) delegates triage to `step-06-assumptions.md`'s decision matrix; step (3) carries the jump-to-step-5 fallback for write-mode-absent; step (5) carries the explicit "do NOT fabricate a dev response" guard; step (7) branches on `{last_clarification_comment_id}` being empty vs non-empty.

- [ ] **Task 2 — Update `workflow.md` Dev Clarification section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [ ] Replace the single-line HTML-comment breadcrumb under `## Dev Clarification` with the three-item replacement specified in AC #2 (description sentence, `See:` link, variable-availability statement mentioning independence from step 4's and step 6's counters).
  - [ ] Confirm no other sections in `workflow.md` are touched — in particular, the `## Assumptions` section (populated by story 3.7) MUST remain byte-unchanged.

- [ ] **Task 3 — Verify regression-free (AC: #8–#16)**
  - [ ] `grep -E '\{(comment_count|last_comment_id|assumption_count|last_assumption_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-07-dev-clarification.md` → 0 matches (counter isolation from steps 4 and 6 per rule (g)).
  - [ ] `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` → empty.
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [ ] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [ ] `git diff -- src/custom-skills/clickup-dev-implement/SKILL.md` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [ ] Confirm the `## Assumptions` section of `workflow.md` is byte-unchanged relative to the merge commit of story 3.7 (manual inspection + `git diff` of that section's lines).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors.
  - [ ] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat.
  - [ ] `npm test` → no new failures vs. current baseline (234 passing).

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-07-dev-clarification.md`.
  - [ ] Commit message: `feat(custom-skills): implement dev-clarification prompt in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-07-dev-clarification.md defining the blocking dev-clarification
    pattern that posts a markdown "Dev Clarification Needed" comment via
    addComment whenever the Dev agent hits an ambiguity that exceeds the
    step-6 decision-matrix threshold, then halts implementation until the
    dev replies in the active conversation. The question is always directed
    at the dev in the active session — never the PM. ClickUp is the write
    channel for the record, not the question's destination. Resolution is
    recorded via a paired Template-F "Clarification Resolved" comment when
    the original request was successfully posted.

    addComment requires CLICKUP_MCP_MODE=write. Step 7 uses a soft gate for
    the ClickUp record but a hard block on implementation: if addComment is
    unavailable or the call fails, a warning is emitted and the question is
    asked directly in the active conversation — the agent still halts.
    Step 7 maintains its own counters (clarification_count,
    last_clarification_comment_id, pending_clarification), independent of
    step 4's and step 6's counters.

    Triage is delegated to step 6's decision matrix; step 7 does not
    re-implement it and only handles ambiguities the matrix routes here.

    Updates workflow.md ## Dev Clarification section with step reference and
    variable contract.

    Out of scope (deferred): bmad-agent-dev.toml DS-trigger wiring (3.9).

    Refs: EPIC-3, story 3-8-dev-clarification-prompt.
    ```

## Dev Notes

### Why blocking — contrast to step 6 and to upstream BMAD

Story 3.7 (step 6) introduced the non-blocking assumption pattern as a deliberate divergence from upstream `bmad-dev-story/workflow.md`'s "ASK or HALT" model — ambiguities the agent can reasonably decide on its own should never halt implementation, because halting an in-progress ClickUp task is expensive (ticket sits in `in progress`, repo state is partially changed, dev may not be watching). Step 6 is the "decide and document" half.

Step 7 is the "halt and ask" half — but with two critical refinements relative to upstream:

1. **The question goes to the dev, not the PM.** Upstream BMAD treats ambiguity as a PM-routing signal (the PM wrote the story; the PM owns clarification). In the ClickUp-authoritative flow, the **dev** invoked the implementation skill and is the human in the active session — they are the closest human to the ambiguity and the fastest path to resolution. Routing to the PM would introduce the same problem the non-blocking pattern was designed to avoid: a halted ticket waiting on an asynchronous human who isn't in the session. See EPIC-3 §Outcomes: "asks the _dev_, not the PM, when blocked."
2. **The halt is semantically narrow, not workflow-wide.** Only the implementation continues after step 7 resumes; step 5 (status transition) still happens at the end. Step 7 does not "fail" the task or transition it to a blocked status — it simply pauses the dev-agent loop until the dev replies.

Step 6's decision matrix is the canonical boundary: if the ambiguity matches a step-6 row (reasonable default derivable), step 6 owns it; if it matches a step-7 row (scope change, AC contradiction, cross-story break, undocumented dependency, or material rework risk), step 7 owns it. Step 7 delegates triage entirely to step 6 — this avoids duplication and guarantees the two steps stay in sync (one source of truth for the matrix).

### Why a separate step file and not a subtype of step 4's Template C or step 6's Template D

Step 4's Template C (M3+ discretionary progress) is free-form; step 6's Template D (assumption made) is non-blocking. Neither captures the blocking contract that is the whole point of step 7. Additionally, Template E needs its own distinct emoji (❓) so reviewers scanning the ClickUp comment stream can distinguish a blocking question from a progress update or an assumption. Collapsing clarifications into one of the existing templates would:

- lose the dedicated `❓ Dev Clarification Needed` framing that reviewers can scan for,
- hide the halt semantics inside a generic template (the block contract is behavioural, not just textual — it must be owned by a step file that can state the rule),
- break the 1:1 mapping from epic story bullets to step files that stories 3.2–3.8 deliberately follow (see the step-file naming convention table below).

Step 7 reuses `addComment` (the tool) but owns its own templates, counters, rules, and — crucially — the blocking contract. Step 4's counters (`{comment_count}`, `{last_comment_id}`), step 6's counters (`{assumption_count}`, `{last_assumption_comment_id}`), and step 7's counters (`{clarification_count}`, `{last_clarification_comment_id}`, `{pending_clarification}`) are all independent. A reviewer asking "how many blocking clarifications did the agent request in this task?" gets a direct answer from `{clarification_count}` without subtracting other counters.

### `addComment` contract (reminder — unchanged from stories 3.5 and 3.7)

- `task_id`: 6–9 character alphanumeric string (Zod: `z.string().min(6).max(9)`).
- `comment`: markdown string; `convertMarkdownToClickUpBlocks` handles rendering.
- Posts `POST /api/v2/task/{task_id}/comment` with `notify_all: true`. Success response includes `id` (→ `{last_clarification_comment_id}` for Template E; not persisted for Template F since Template F references the original `{last_clarification_comment_id}` in its body).

**Note on `notify_all: true` and rule (b).** `addComment` hard-codes `notify_all: true` (see `src/tools/clickup/src/tools/task-write-tools.ts`), so posting Template E pings every ClickUp subscriber of the task — which may include the PM. Rule (b) ("Asks the dev, never the PM") governs where the agent **routes the question** (always the dev in the active session), not ClickUp's notification fan-out. A PM receiving a ClickUp notification about a clarification comment does not violate rule (b) — the question is not being asked of them, and the agent will not process a PM reply as a resolution.

Templates E and F use H2 (`## ❓ ...`, `## 💬 ...`), bold inline labels (`**Context:**`, `**Question:**`, etc.), and literal text — no nested lists, no fenced code blocks. The only list-like structure is the numbered "Options considered" under Template E, which is a single-level ordered list and is supported by `convertMarkdownToClickUpBlocks` per `src/tools/clickup/src/tests/formatted-comments.test.ts`.

### Soft gate semantics — where step 7 diverges from steps 4, 5, and 6

Steps 4, 5, and 6 all use a **soft gate that continues**: if write mode is unavailable or the call fails, the skill emits a warning and proceeds to the next step. Implementation is never halted by a ClickUp-side-channel failure.

Step 7 uses a **soft gate on the ClickUp record combined with a hard block on implementation**. If `addComment` is unavailable or fails:

- The ClickUp-side-channel record is lost (same as steps 4/5/6 — a warning is emitted).
- **But implementation still halts.** The question is asked directly in the active conversation. The dev must still reply before the agent proceeds.

This is intentional: the blocking contract is about the agent's internal state (it needs a dev resolution to proceed safely), not about the ClickUp side channel (which is a convenience for reviewers). Losing the ClickUp record degrades observability; it does not remove the ambiguity that forced the halt.

### Why step 7 has its own counters

`{comment_count}` (step 4) accumulates progress comments at M1, M2, and discretionary M3+ moments. `{assumption_count}` (step 6) accumulates non-blocking assumption comments. `{clarification_count}` (step 7) accumulates blocking clarification requests. If step 7 incremented `{comment_count}` or `{assumption_count}`, a reviewer trying to distinguish "how many progress updates / assumptions / blocking clarifications did this task involve?" would have to manually subtract. Keeping all three counters independent means each question is directly answerable. Cost is three extra frontmatter keys (plus the `{pending_clarification}` boolean for the halt-state flag).

### Dev-agent behavioural guidance (for implementing agents reading this story)

When the Dev agent hits an ambiguity during implementation, the agent MUST:

1. Name the ambiguity to itself in one sentence.
2. Consult the decision matrix in `step-06-assumptions.md` `## DECISION MATRIX`.
3. If the ambiguity is a step-6 row: invoke step 6. Do NOT invoke step 7 for a step-6-class ambiguity — that conflates "I decided" with "I'm asking" and unnecessarily halts implementation.
4. If the ambiguity is a step-7 row: invoke step 7. Halt. Ask the dev. Wait for the reply. Do NOT fall back to an assumption if the dev is slow — slow is different from unavailable, and the blocking contract is by design.
5. If the ambiguity is genuinely unclassifiable (neither row matches cleanly): default to step 7. The cost of asking when the agent could have decided is lower than the cost of silently deciding when the agent should have asked. (This is the same default step 6 uses in its fallback; the two steps agree on which side of the boundary gets the benefit of the doubt.)

When the dev replies:

- Apply the resolution to the in-progress implementation.
- Post Template F (if `{last_clarification_comment_id}` is non-empty) so the ClickUp stream shows the question → answer lifecycle.
- Set `{pending_clarification}` = `'false'` and continue to the next implementation action.
- If the reply itself contains a new step-7-class ambiguity, invoke step 7 again; do not try to interpret the ambiguous reply on behalf of the dev.

Never fabricate a dev response. Never treat no-response as implicit approval. Never fall back to step 6 when step 7 has already committed to asking.

### Triage edge cases worth calling out

- **Dev answers with a step-6-class decision.** If the dev says "just use the convention — make the assumption," the agent applies the decision, posts Template F with the dev's reply quoted, and continues. It does NOT retroactively invoke step 6 (the ambiguity is resolved; no additional record is needed beyond Template F).
- **Dev defers to the PM or architect.** Rule (b) forbids step 7 from routing the clarification; if the dev wants to loop in another human, the dev does that themselves (in-session, on the ticket, on Slack, etc.). The agent stays halted until the dev returns with a resolution. Template F records the final resolution, not the handoff.
- **Multiple clarifications in one session.** Each invocation increments `{clarification_count}` independently. `{last_clarification_comment_id}` overwrites on each successful post; if the dev replies to all clarifications in one message, the agent posts a Template F per clarification (each referencing its own `comment_id`).
- **Clarification discovered mid-implementation.** Nothing stops the agent from invoking step 7 at any point in the implementation loop — even after posting M1 and before M2. The `## WHEN TO INVOKE` section allows "zero or more times during implementation" for exactly this reason. The pre-M1 ordering rule (M1 first, then step 7) applies only when the ambiguity is discovered in the narrow window between step 3 completing and M1 being posted.
- **Dev replies out of band (on the ticket, not in the session).** Per the "Out of Scope" section, automated ingestion of ticket replies is deferred. The dev must re-engage the active session (or start a new one referencing the same `task_id`) and state the resolution in-session for step 7 to resume.

### Step file naming convention for EPIC-3 (reminder)

| Step file                             | Created by story | Execution order         |
| ------------------------------------- | ---------------- | ----------------------- |
| `step-01-task-id-parser.md`           | 3.2              | 1                       |
| `step-02-task-fetch.md`               | 3.3              | 2                       |
| `step-03-planning-artifact-reader.md` | 3.4              | 3                       |
| `step-04-progress-comment-poster.md`  | 3.5              | 4 (M1, M2, M3+)         |
| `step-05-status-transition.md`        | 3.6              | 5 (post-M2)             |
| `step-06-assumptions.md`              | 3.7              | 6 (discretionary)       |
| **`step-07-dev-clarification.md`**    | **3.8 (this)**   | **7 (blocking, on-demand)** |

With story 3.8 merged, EPIC-3 steps 1–7 are complete. Story 3.9 does not add a step file — it wires the DS trigger in `_bmad/custom/bmad-agent-dev.toml` to route the Dev agent's implementation-mode invocation to this skill.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` file. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### CLICKUP_MCP_MODE requirements for this step

`addComment` is registered in `src/tools/clickup/src/tools/task-write-tools.ts` and exposed only when `CLICKUP_MCP_MODE=write`. In `read-minimal` or `read` mode, `addComment` is absent from the tool list. Step 7 must check tool availability at invocation time (rule (d), instruction step (3)) before attempting any API call — identical to steps 4 and 6's gate. The difference is the fallback: step 7 still halts even without the API call (see "Soft gate semantics" above).

### References

- [EPIC-3 §Stories bullet 8](../epics/EPIC-3-dev-agent-clickup.md) — "Define dev-facing clarification prompt (asks the dev, never the PM)".
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "Handles non-blocking ambiguity by making assumptions explicit in a comment — asks the _dev_, not the PM, when blocked."
- [PRD §FR #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status." (Clarification comments are a subset of "progress comments" in the ClickUp stream.)
- [PRD §FR #6](../PRD.md) — "Humans own ticket _description_; agents write only via _comments_ and _status_." (Mandates `addComment`, not `updateTask` description.)
- [PRD §NFR — Idempotency](../PRD.md) — "Dev agent (implementation mode) progress comments are additive, not destructive." (Mandates append-only for Templates E and F.)
- [Story 3.1 §Acceptance Criteria #3](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Dev Clarification` section created with the breadcrumb this story replaces.
- [Story 3.5 §Acceptance Criteria #1 rules (a), (b)](./3-5-progress-comment-poster.md) — append-only and markdown-formatted rules reused verbatim in step 7's ruleset.
- [Story 3.5 §Dev Notes: `addComment` API contract](./3-5-progress-comment-poster.md) — Zod schema, markdown→blocks conversion, `notify_all: true`.
- [Story 3.6 §Acceptance Criteria #1](./3-6-status-transition-helper.md) — soft-gate-then-continue pattern; step 7 inherits the gate but replaces "continue" with "still halt" for implementation.
- [Story 3.7 §Acceptance Criteria #1](./3-7-non-blocking-assumption-pattern.md) — non-blocking assumption pattern (the counterpart to this story). Step 6's `## DECISION MATRIX` is the canonical triage contract step 7 delegates to.
- [Story 3.7 §Acceptance Criteria #1 rule (e)](./3-7-non-blocking-assumption-pattern.md) — the escalation threshold that routes step-7-class ambiguities to this step.
- Upstream `Alpharages/BMAD-METHOD` → `src/bmm-skills/4-implementation/bmad-dev-story/workflow.md` — the "ASK or HALT" model that routes clarifications to the PM. Step 7 keeps the "HALT" half but reroutes the "ASK" to the dev in the active session. Resolved locally via the BMAD git cache.
- [`src/tools/clickup/src/tools/task-write-tools.ts`](../../src/tools/clickup/src/tools/task-write-tools.ts) — `addComment` registration, schema, and `convertMarkdownToClickUpBlocks` call.

## Dev Agent Record

### Agent Model Used

(to be filled by implementing agent)

### Debug Log References

(to be filled by implementing agent)

### Completion Notes List

(to be filled by implementing agent)

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-07-dev-clarification.md` — step file with rules, triage delegation, comment templates, instructions, and resume contract (AC #1, #3–#7)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Dev Clarification` section updated (AC #2)

**Deleted**

- (none expected)

### Review Findings

(to be filled during code review)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-23 | Story drafted from EPIC-3 bullet 8 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                          |
| 2026-04-23 | Validation pass (`bmad-create-story` checklist): added `{task_url}` to Template E via `**Ticket:**` line (E1); tightened Template E `**Status:**` line to route replies to the IDE session, not the ticket (E2); added `notify_all: true` / rule-(b) note under Dev Notes > addComment contract (E3); rewrote INSTRUCTIONS step (5) as two clear branches — posted-successfully vs. skipped/failed (O1); added baseline re-verification reminder to AC #12 (O2). |
