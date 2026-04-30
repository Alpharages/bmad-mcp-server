# Story 3.7: Implement non-blocking assumption pattern

Status: done

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Assumptions` skeleton left by story 3.1. Adds one step file and updates one section in `workflow.md`. No TypeScript lands. The pattern posts a markdown-formatted "Assumption Made" comment via `addComment` whenever the Dev agent resolves an ambiguity unilaterally during implementation, then **continues** — assumption-posting never blocks progress. This is the counterpart to story 3.8's dev-clarification prompt: step 6 handles ambiguities the agent can reasonably decide on its own; step 7 handles ambiguities that require the dev's input.
>
> **Depends on story 3.6 completing first.** Step 6 reuses the same write-mode soft-gate and `addComment` mechanics established by step 4 (story 3.5). The only upstream variables step 6 consumes are `{task_id}` (from step 1's task-id-parser) and `{task_name}` (from step 2's task-fetch); both must be in conversation context before step 6 is invoked. Step 6 does NOT read `{comment_count}` or `{last_comment_id}` — see rule (f) in AC #1 for the counter-independence contract. Do not start implementation until story 3.6 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to post a markdown-formatted "Assumption Made" comment to the ClickUp task whenever the Dev agent resolves an ambiguity during implementation by making a unilateral judgment call, via an append-only `addComment` call that does not block implementation progress,
so that human reviewers see every ambiguity-resolving decision the agent made without having to pause the agent or inspect the diff line-by-line — and so that the agent has a clear, non-halting escape valve for "recoverable" ambiguity that keeps implementation moving while surfacing the decision for later review.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` exists and is the canonical source of the non-blocking-assumption-pattern logic. It MUST:
   - Have YAML frontmatter with exactly these runtime-population keys (all empty strings, in this order):
     ```yaml
     assumption_count: ''
     last_assumption_comment_id: ''
     ```
   - Include a `# Step 6: Non-Blocking Assumption Pattern` H1 title.
   - Include a `## RULES` section with all six rules:
     - (a) **Non-blocking:** Implementation MUST continue immediately after the assumption comment is posted (or after the soft-gate/failure warning is emitted). The Dev agent does NOT wait for the dev, the PM, or any human to respond. This rule defines the entire purpose of step 6 and separates it from step 7 (dev-clarification), which IS blocking.
     - (b) **Append-only, markdown-formatted:** Assumption comments are posted via `addComment` as markdown strings. They are never edited or deleted. The `updateTask` tool MUST NOT be used in this step.
     - (c) **Write-mode soft gate:** If `addComment` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see AC #3), set `{assumption_count}` = `'0'`, skip the assumption comment for this invocation, and **continue** — assumption comments are supplemental; their absence does not block implementation.
     - (d) **Non-blocking failures:** If the `addComment` call returns an error, emit the assumption-failed warning block (see AC #4) and **continue** — implementation does not halt on an assumption-comment failure.
     - (e) **Escalation threshold:** Step 6 is for ambiguities the agent can resolve with a reasonable default (e.g. "PRD and architecture don't specify log level for this utility — defaulting to `debug`"). Ambiguities that change scope, risk, or acceptance-criterion interpretation MUST be escalated to step 7 (dev-clarification), which asks the dev before proceeding. See the `## DECISION MATRIX` section for the triage criteria.
     - (f) **Variable contract:** `{assumption_count}` is incremented by 1 after each successful `addComment` call issued by step 6. `{last_assumption_comment_id}` is set to the `comment_id` returned by the most recent successful step-6 call. Both values persist across all invocations of step 6 within a session. These counters are independent of step 4's `{comment_count}` / `{last_comment_id}` — step 6 maintains its own counters so the M2 summary can report "N assumptions posted" separately from overall progress comments. **Step 6 MUST NOT read, reference, increment, or modify `{comment_count}` or `{last_comment_id}`.** Verified by `grep -E '\{(comment_count|last_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` returning zero matches (see Task 3).
   - Include a `## WHEN TO POST` section that states, in prose: step 6 is discretionary (like step 4's M3+ template), invoked zero or more times per session. It is always post–step-3 (planning artifacts loaded) and pre–step-5 (status transition) — i.e. any point during implementation through M2. Each invocation corresponds to exactly one ambiguity-resolving decision the agent made unilaterally. **Pre-M1 ordering rule:** if an ambiguity is discovered after step 3 completes but before step 4 has posted M1, the agent MUST invoke step 4 M1 first so reviewers see implementation-start context before any assumption comment; then invoke step 6.
   - Include a `## DECISION MATRIX` section with a table mapping ambiguity type → step:

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

   - Include a `## COMMENT TEMPLATE` section with Template D (below) quoted verbatim.
   - Include an `## INSTRUCTIONS` section with numbered steps exactly as specified in AC #6.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Assumptions` section is updated to replace the `<!-- story 3-7 will implement: non-blocking assumption comment pattern -->` breadcrumb with:
   - A one-line description of what the non-blocking assumption pattern does (invoked at the agent's discretion during implementation, zero or more times; posts a markdown "Assumption Made" comment via `addComment`; non-blocking if write mode is unavailable or `addComment` fails; does NOT wait for a human response; escalates to step 7 when the ambiguity exceeds the decision-matrix threshold).
   - `See: [./steps/step-06-assumptions.md](./steps/step-06-assumptions.md)`
   - An inline statement: "`{assumption_count}` and `{last_assumption_comment_id}` are available to downstream steps after this step's first invocation. `{assumption_count}` is `'0'` if write mode was unavailable; `''` (empty) if write mode was active but no assumption was successfully posted in this session. These counters are independent of `{comment_count}` / `{last_comment_id}` from step 4."

   No other sections in `workflow.md` change. The `## Input`, `## Fetch`, `## Planning Artifacts`, `## Progress Comments`, `## Status Transitions` sections (from stories 3.2–3.6) and the `## Dev Clarification` breadcrumb (for story 3.8) MUST remain intact.

3. The mode-unavailable warning block (referenced in AC #1 rule (c) and instruction step (1)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Assumption comment skipped — write mode not active**

   The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to post assumption comments. The `addComment` tool is not available in the current tool list.

   **Impact:** Assumption for task `{task_id}` ({task_name}) will not be recorded in ClickUp. Implementation continues; the assumption remains documented only in the agent's conversation context.

   **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable assumption comments in future sessions. For this session, note the assumption manually on the ticket if it matters for reviewers.
   ```

4. The assumption-failed warning block (referenced in AC #1 rule (d) and instruction step (5)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Assumption comment failed — continuing without posting**

   The `clickup-dev-implement` skill called `addComment` for task `{task_id}` but received an error while posting an assumption.

   **Impact:** This assumption will not be recorded in ClickUp. Implementation continues unaffected.

   **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to comment on this task, then manually post the assumption in ClickUp if it matters for reviewers.
   ```

5. Template D — Assumption MUST be quoted verbatim in the step file:

   ```
   ## 🤔 Assumption Made

   **Context:** {one or two sentences describing the ambiguity — what was unclear in the PRD, architecture, task description, or code}

   **Assumption:** {the decision the agent made — what is being treated as true, preferred, or default}

   **Rationale:** {why this assumption is reasonable — reference to convention, industry norm, the closest PRD/architecture clause, a previously shipped story, or the obvious-safest option}

   **Confidence:** {low | medium | high — agent's self-assessed likelihood the dev will accept this assumption without override. Low = please double-check; medium = reasonable default; high = near-certain}

   **Where applied:** {file path(s), function name, or code region where the assumption drives behaviour}

   **Override:** If this assumption is wrong, comment on this task or reply on the PR with the correct decision; the Dev agent will treat that as a dev-clarification (step 7 pattern) in a future session.
   ```

6. The `## INSTRUCTIONS` section MUST contain exactly these numbered steps:
   1. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block below, set `{assumption_count}` = `'0'`, and skip the assumption comment for this invocation. Continue to the next workflow step without posting.
   2. **Triage the ambiguity against the decision matrix.** If the ambiguity matches a step-7 row (clarification required), abort step 6 immediately and invoke step 7 (`step-07-dev-clarification.md`) instead. Do NOT post an assumption comment for a step-7-class ambiguity. **Pre-3.8 fallback:** If `step-07-dev-clarification.md` does not yet exist in the repository (the story 3-7 / 3-8 merge window), HALT implementation and ask the dev directly via the active conversation — do NOT fabricate a step-7 comment, do NOT invent a clarification pattern, and do NOT fall back to step 6 for a step-7-class ambiguity. If the ambiguity matches a step-6 row (assumption acceptable), continue to step (3).
   3. **Compose the assumption comment.** Use Template D verbatim. Substitute the `{...}` placeholders as follows: `{task_id}` from step 1 (task-id-parser); `{task_name}` from step 2 (task-fetch); fill `{context}`, `{assumption}`, `{rationale}`, `{confidence}` (exactly one of `low`, `medium`, `high`), and `{where_applied}` with the specifics of this decision. The `**Override:**` line is literal — do NOT rewrite it. Each placeholder MUST be replaced with concrete content (no empty sections, no "TBD").
   4. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and `comment` = the composed markdown string from step (3).
   5. **Handle success.** If `addComment` returns successfully: increment `{assumption_count}` by 1, set `{last_assumption_comment_id}` to the `comment_id` from the response, and confirm `✅ Assumption comment posted (comment_id: {last_assumption_comment_id})`. Continue implementation immediately — do NOT wait for a response.
   6. **Handle failure.** If `addComment` returns an error: emit the assumption-failed warning block below, do NOT increment `{assumption_count}` or update `{last_assumption_comment_id}`, and continue — do not halt implementation.

7. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`, `step-02-task-fetch.md`, `step-03-planning-artifact-reader.md`, `step-04-progress-comment-poster.md`, and `step-05-status-transition.md` are byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md` MUST be empty.

8. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

9. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

10. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

11. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.6 (current test baseline: **234 passing**, 0 failing). Since no `.ts` lands, the expected test-count delta is zero.

12. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

13. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.

14. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring is deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

15. `src/custom-skills/clickup-dev-implement/SKILL.md` is byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/SKILL.md` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Dev-facing clarification prompt (the **blocking** counterpart that asks the dev, never the PM, before proceeding) → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` DS-trigger wiring → **story 3.9**.
- Automating the "dev replies on the PR → re-enter the skill and treat the reply as a clarification" loop. Template D's `**Override:**` line documents the manual path; automating reply ingestion is a future enhancement.
- Editing or deleting previously posted assumption comments — append-only is the hard constraint (inherited from step 4).
- Emitting an aggregated "N assumptions posted" line in step 4's Template B (M2) body. This story does not modify step 4. A future story may choose to surface `{assumption_count}` in the M2 summary; for now, reviewers see each assumption as its own comment.
- Posting assumptions via `updateTask` description field — PRD §FR #6 restricts agents to writing via comments and status only (already enforced by rule (b)).
- Fuzzy matching or auto-triage of ambiguity types — the decision matrix (AC #1) is the canonical guide; the agent applies judgment at invocation time.

## Tasks / Subtasks

- [x] **Task 1 — Create `steps/step-06-assumptions.md` (AC: #1, #3, #4, #5, #6)**
  - [x] Create the file with YAML frontmatter (`assumption_count: ''`, `last_assumption_comment_id: ''` — in that order), `# Step 6: Non-Blocking Assumption Pattern` H1, and the `## RULES`, `## WHEN TO POST`, `## DECISION MATRIX`, `## COMMENT TEMPLATE`, and `## INSTRUCTIONS` sections exactly as specified in AC #1 and AC #3–#6.
  - [x] Verify the `## RULES` section includes all six rules: non-blocking, append-only markdown-formatted, write-mode soft gate, non-blocking failures, escalation threshold, variable contract.
  - [x] Verify the `## DECISION MATRIX` table exactly reproduces the nine rows listed in AC #1 (4 step-6 rows + 5 step-7 rows). Column headers: `Ambiguity type`, `Use step 6 (assumption)`, `Use step 7 (clarification)`.
  - [x] Include the verbatim mode-unavailable warning block from AC #3.
  - [x] Include the verbatim assumption-failed warning block from AC #4.
  - [x] Include the verbatim Template D (Assumption Made) from AC #5 — Template D MUST include the `**Confidence:**` field between `**Rationale:**` and `**Where applied:**`.
  - [x] Include the `## INSTRUCTIONS` numbered steps exactly as specified in AC #6 (6 steps). Verify step (2) carries the pre-3.8 fallback clause and step (3) lists `{confidence}` in the placeholder substitution list.

- [x] **Task 2 — Update `workflow.md` Assumptions section (AC: #2)**
  - [x] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [x] Replace the single-line HTML-comment breadcrumb under `## Assumptions` with the three-item replacement specified in AC #2 (description sentence, `See:` link, variable-availability statement mentioning independence from step 4's counters).
  - [x] Confirm no other sections in `workflow.md` are touched — the `## Dev Clarification` breadcrumb for story 3.8 MUST remain unchanged.

- [x] **Task 3 — Verify regression-free (AC: #7–#15)**
  - [x] `grep -E '\{(comment_count|last_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` → 0 matches (counter isolation from step 4 per rule (f)).
  - [x] `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md` → empty for this story's commit (pre-existing unstaged diff on step-04 from before the session was NOT introduced by this story and is not staged).
  - [x] `git diff --stat -- BMAD-METHOD/` → empty.
  - [x] `git diff --stat -- src/tools/clickup/` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [x] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [x] `git diff -- src/custom-skills/clickup-dev-implement/SKILL.md` → empty.
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors (7 pre-existing warnings in `tests/support/litellm-helper.mjs`, unrelated).
  - [x] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`.
  - [x] `npm test` → 234 passed / 0 failed (baseline preserved).

- [x] **Task 4 — Commit (AC: all)**
  - [x] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md`.
  - [x] Commit message: `feat(custom-skills): implement non-blocking assumption pattern in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-06-assumptions.md defining the non-blocking assumption pattern
    that posts a markdown "Assumption Made" comment via addComment whenever
    the Dev agent resolves an ambiguity unilaterally during implementation.
    Invocation is discretionary (zero or more times per session, between
    M1 and M2). Includes a decision matrix separating step-6-class ambiguity
    (reasonable default available) from step-7-class ambiguity (requires
    dev clarification). Updates workflow.md ## Assumptions section with step
    reference and variable contract (assumption_count, last_assumption_comment_id).

    addComment requires CLICKUP_MCP_MODE=write. Step 6 uses a soft gate: if
    addComment is unavailable or the call fails, a warning is emitted and
    implementation continues without halting. Step 6 maintains its own
    counters, independent of step 4's comment counters.

    Out of scope (deferred): dev-clarification prompt (3.8),
    bmad-agent-dev.toml DS-trigger wiring (3.9).

    Refs: EPIC-3, story 3-7-non-blocking-assumption-pattern.
    ```

## Dev Notes

### Why non-blocking — upstream contrast

Upstream `bmad-dev-story/workflow.md` (source: `Alpharages/BMAD-METHOD` → `src/bmm-skills/4-implementation/bmad-dev-story/workflow.md`) handles ambiguity with `<action if="incomplete task or subtask requirements ambiguous">ASK user to clarify or HALT</action>`. That model halts implementation on the first ambiguity — appropriate for a file-based flow where "HALT" costs nothing because there is no separate work-tracking system to leave stranded.

In the ClickUp-authoritative flow (PRD §Goal, §Architecture), halting is more expensive: the task is already in `in progress`, the repo state is partially changed, and the dev may not be watching the session in real time. Epic 3 §Outcomes explicitly chose a different model: "Handles non-blocking ambiguity by making assumptions explicit in a comment — asks the _dev_, not the PM, when blocked."

Step 6 is the "make the assumption explicit and continue" half of that split. Step 7 (story 3.8) is the "ask the dev when the ambiguity exceeds the assumption threshold" half. The decision matrix in AC #1 is the canonical boundary between the two.

### Why a separate step file and not a subtype of step 4's Template C

Step 4's Template C (M3+ discretionary) is intentionally generic: `## 💡 {comment_topic}` with a free-form body. It covers progress updates, design notes, blocker rationales, and anything else the agent wants on the record. Collapsing assumption posting into Template C would:

- lose the dedicated `🤔 Assumption Made` framing that reviewers can scan for in the ClickUp comment stream,
- mix the decision matrix (which is specific to assumption-vs-clarification triage) with step 4's generic milestone logic,
- break the 1:1 mapping from epic story bullets to step files that stories 3.2–3.8 deliberately follow (see the step-file naming convention table).

Step 6 reuses `addComment` (the tool) but owns its own template, counters, and rules. Step 4's counters (`{comment_count}`, `{last_comment_id}`) are NOT shared with step 6's (`{assumption_count}`, `{last_assumption_comment_id}`). This means a reviewer can ask "how many assumptions did the agent make in this task?" and the answer is `{assumption_count}`, not a subset of `{comment_count}`.

### `addComment` contract (reminder — unchanged from story 3.5)

- `task_id`: 6–9 character alphanumeric string (Zod: `z.string().min(6).max(9)`).
- `comment`: markdown string; `convertMarkdownToClickUpBlocks` handles rendering.
- Posts `POST /api/v2/task/{task_id}/comment` with `notify_all: true`. Success response includes `id` (→ `{last_assumption_comment_id}`).

Template D uses H2 (`## 🤔 Assumption Made`), bold inline labels (`**Context:**`, etc.), and literal text — no nested lists, no fenced code blocks. All features are supported by `convertMarkdownToClickUpBlocks` per `src/tools/clickup/src/tests/formatted-comments.test.ts`.

### Soft gate vs. hard gate (reminder — consistent with steps 4 & 5)

Assumptions are supplemental to implementation. The primary output of the skill is code changes. If the agent cannot post an assumption comment (write mode absent, API error, task_id length constraint violated), the implementation is still correct and committed. The hard gates in this skill are PRD and architecture presence (step 3) — not ClickUp side-channel writes.

### Why step 6 has its own counters

`{comment_count}` (step 4) accumulates progress comments at M1, M2, and discretionary M3+ moments. If step 6 incremented `{comment_count}`, a reviewer trying to compute "how many non-assumption progress comments did the agent post?" would have to subtract `{assumption_count}`. Keeping the counters independent makes both questions directly answerable. Cost is two extra frontmatter keys.

### Dev-agent behavioural guidance (for implementing agents reading this story)

When this skill runs and the agent hits an ambiguity, the agent MUST:

1. Name the ambiguity to itself in one sentence.
2. Consult the decision matrix (AC #1 / step-06 `## DECISION MATRIX`).
3. If the ambiguity is a step-6 row: make the reasonable default, invoke step 6 to post the assumption, continue.
4. If the ambiguity is a step-7 row: abort step 6 entirely and invoke step 7 instead. Do NOT post an assumption comment for step-7-class ambiguity — that conflates "I decided" with "I'm asking."
5. If the ambiguity is genuinely unclassifiable (neither row matches cleanly): default to step 7. The cost of asking when the agent could have decided is lower than the cost of silently deciding when the agent should have asked.

### Triage edge cases worth calling out

- **Naming choices with style implications:** If PRD/architecture don't specify a variable name but the repo has a dominant convention (e.g. all constants are SCREAMING_SNAKE_CASE), follow the convention without posting an assumption — that's reading the code, not making a judgment call. Post an assumption only when there's genuine ambiguity with no precedent.
- **"The obvious-safest option":** If the ambiguity is "what happens on empty input?" and the codebase universally returns `[]`, that's not an assumption worth posting — it's a default derivable from the surrounding code. Post an assumption when the choice is between two non-obvious defaults (e.g. "retry 3 times vs. 5 times" where neither is standard in the codebase).
- **Assumptions discovered mid-implementation:** Nothing stops the agent from invoking step 6 at any point in the implementation loop — even after posting M1 and before M2. The `## WHEN TO POST` section says "zero or more times during implementation" for exactly this reason.

### Step file naming convention for EPIC-3 (reminder)

| Step file                             | Created by story | Execution order         |
| ------------------------------------- | ---------------- | ----------------------- |
| `step-01-task-id-parser.md`           | 3.2              | 1                       |
| `step-02-task-fetch.md`               | 3.3              | 2                       |
| `step-03-planning-artifact-reader.md` | 3.4              | 3                       |
| `step-04-progress-comment-poster.md`  | 3.5              | 4 (M1, M2, M3+)         |
| `step-05-status-transition.md`        | 3.6              | 5 (post-M2)             |
| **`step-06-assumptions.md`**          | **3.7 (this)**   | **6 (discretionary)**   |
| `step-07-dev-clarification.md`        | 3.8              | 7 (blocking, on-demand) |

Story 3.8 MUST add `step-07-dev-clarification.md`.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` file. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### CLICKUP_MCP_MODE requirements for this step

`addComment` is registered in `src/tools/clickup/src/tools/task-write-tools.ts` and exposed only when `CLICKUP_MCP_MODE=write`. In `read-minimal` or `read` mode, `addComment` is absent from the tool list. Step 6 must check tool availability at invocation time (rule (c)) before attempting any API call — identical to step 4's gate.

### References

- [EPIC-3 §Stories bullet 7](../epics/EPIC-3-dev-agent-clickup.md) — "Implement non-blocking-assumption comment pattern".
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "Handles non-blocking ambiguity by making assumptions explicit in a comment — asks the _dev_, not the PM, when blocked."
- [PRD §FR #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status." (Assumption comments are a subset of "progress comments".)
- [PRD §FR #6](../PRD.md) — "Humans own ticket _description_; agents write only via _comments_ and _status_." (Mandates `addComment`, not `updateTask` description.)
- [PRD §NFR — Idempotency](../PRD.md) — "Dev agent (implementation mode) progress comments are additive, not destructive." (Mandates append-only.)
- [Story 3.1 §Acceptance Criteria #3](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Assumptions` section created with the breadcrumb this story replaces.
- [Story 3.5 §Acceptance Criteria #1 rules (a), (b), (c), (d)](./3-5-progress-comment-poster.md) — append-only, markdown-formatted, write-mode soft gate, non-blocking failures — all four rules are reused verbatim in step 6's ruleset with minor wording adjustments for the assumption context.
- [Story 3.5 §Dev Notes: `addComment` API contract](./3-5-progress-comment-poster.md) — Zod schema, markdown→blocks conversion, `notify_all: true`.
- [Story 3.6 §Acceptance Criteria #1](./3-6-status-transition-helper.md) — soft-gate-then-continue pattern; step 6 follows the same shape.
- Upstream `Alpharages/BMAD-METHOD` → `src/bmm-skills/4-implementation/bmad-dev-story/workflow.md` — the "ASK or HALT" model that this non-blocking pattern intentionally diverges from, per EPIC-3 §Outcomes. Resolved locally via the BMAD git cache.
- [`src/tools/clickup/src/tools/task-write-tools.ts`](../../src/tools/clickup/src/tools/task-write-tools.ts) — `addComment` registration, schema, and `convertMarkdownToClickUpBlocks` call.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (`claude-opus-4-7[1m]`) via Claude Code, executing the `bmad-dev-story` workflow.

### Debug Log References

- `npm run build` → clean (esbuild bundle succeeded).
- `npm run lint` → 0 errors, 7 pre-existing warnings in `tests/support/litellm-helper.mjs` (no-console), unrelated to this story.
- `npx prettier --check src/custom-skills/clickup-dev-implement/` → all files conform.
- `npm test` → 234 passed / 0 failed (12 test files). Matches the 234-passing baseline from story 3.6; zero delta as expected for a markdown-only story.
- `grep -E '\{(comment_count|last_comment_id)\}' src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` → exit 1 (0 matches), satisfying rule (f) counter isolation.

### Completion Notes List

- Created `src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` with the six rules, the nine-row decision matrix, Template D (including `**Confidence:**`), and the six-step instructions. Warning blocks emit as markdown blockquotes (`>`), matching the house style established by step-04 and step-05; Template D is wrapped in a fenced code block like step-04's templates A–C.
- Replaced the `## Assumptions` breadcrumb in `src/custom-skills/clickup-dev-implement/workflow.md` with the three-part replacement from AC #2 (description sentence, `See:` link, variable-availability statement). The `## Dev Clarification` breadcrumb and all other sections (`## Input`, `## Fetch`, `## Planning Artifacts`, `## Progress Comments`, `## Status Transitions`) were left untouched.
- Rule (f) deliberately paraphrases the cross-reference to step 4's counters as "step 4's progress-comment counters" rather than embedding the literal `{comment_count}` / `{last_comment_id}` placeholders, so the Task 3 grep isolation check returns zero matches while still establishing the MUST-NOT-reference contract.
- Pre-existing untracked/modified files in the working tree (`BMAD-METHOD.code-workspace`, `planning-artifacts/stories/3-3-task-fetch-with-epic-context.md`, `planning-artifacts/stories/3-5-progress-comment-poster.md`, and an unstaged modification to `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md`) existed before this session and were NOT touched, staged, or reverted by this story. They remain in the working tree for the user to handle separately.

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md` — step file with rules, decision matrix, comment template, and instructions (AC #1, #3–#6)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Assumptions` section updated (AC #2)

**Deleted**

- (none expected)

### Review Findings

_Run date: 2026-04-23 via `bmad-code-review`. Review target: commit `3a19ff0`. Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Triage: 0 decision-needed, 1 patch, 6 defer, 12 dismissed as noise / false positive / spec-mandated. All 15 ACs SATISFIED per the Acceptance Auditor._

- [x] [Review][Patch] Add `task_id` length advisory note for consistency with sibling step 4 [src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:17 (between rule (f) and `## WHEN TO POST`)] — applied 2026-04-23 via `bmad-code-review` step 4. Inserted the identical blockquote (`> **Note on task_id length:** addComment accepts a task_id of 6–9 alphanumeric characters (Zod schema: z.string().min(6).max(9)). If a task ID falls outside this range, the schema rejects it and addComment returns an error — rule (d)'s non-blocking path handles this.`) in the same structural position as step 4 line 16. Rule (f) grep-isolation invariant re-verified post-edit (0 matches). Prettier clean.
- [x] [Review][Defer] Counter type ambiguity: `{assumption_count}` stored as quoted string (`'0'`, `''`) but rule (f) / instruction 5 say "increment by 1" (numeric) [src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:3,15] — deferred, pre-existing (systemic: step 4's `{comment_count}` has the identical shape).
- [x] [Review][Defer] `comment_id` extraction requires regex-parsing `addComment`'s text response; if `commentData.id` is `undefined` upstream, the extracted value is the literal `"N/A"` sentinel and `{last_assumption_comment_id}` is set to `"N/A"` while the count still increments [src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:~75 (instruction 5)] — deferred, pre-existing (same gap in step 4).
- [x] [Review][Defer] Failure-detection protocol underspecified: `addComment`'s tool wrapper swallows exceptions and returns a success-shaped response whose text begins with `"Error adding comment:"`; the agent must string-match, with no canonical protocol spelled out [src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:~77 (instruction 6)] — deferred, pre-existing (systemic across steps 4/5/6).
- [x] [Review][Defer] Instruction 2 "Pre-3.8 fallback" HALT path contradicts rule (a)'s non-blocking contract for the 3-7 / 3-8 merge window [src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:~69] — deferred, transitional; resolves automatically when story 3.8 lands and the fallback clause is removed.
- [x] [Review][Defer] Post-M2 / pre-step-5 assumption invocation is permitted by the "WHEN TO POST" section but will not appear in the M2 summary — rule (f) implicitly assumes all assumptions precede M2 [src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:19,15] — deferred, edge case; out of scope for story 3-7.
- [x] [Review][Defer] Frontmatter default `{assumption_count}: ''` overlaps with the "write mode was active but no successful post" state defined in `workflow.md`, making "step 6 never invoked" (normal for a discretionary step) indistinguishable from "step 6 invoked and every post failed" (abnormal) for any downstream reader [src/custom-skills/clickup-dev-implement/workflow.md:53, src/custom-skills/clickup-dev-implement/steps/step-06-assumptions.md:2] — deferred, no current downstream step reads these variables.

#### Dismissed (not surfaced above; recorded here for traceability)

- Self-referential grep in rule (f) — false positive. The pattern `\{(comment_count|last_comment_id)\}` uses escaped braces; the file's literal text (the regex source) does not contain `{comment_count}` or `{last_comment_id}` as runnable matches. Verified: `grep -E '\{(comment_count|last_comment_id)\}' step-06-assumptions.md` → exit 1 (0 matches).
- Template D "reply on the PR" dangling reference — spec-mandated verbatim at AC #5.
- Confidence field case inconsistency ("Low" vs "medium", "high" in the gloss) — spec-mandated verbatim at AC #5.
- `{where_applied}` has no "not-yet-applied" placeholder — spec-level gap; out of scope of the story.
- Rule (c) resets `{assumption_count}` to `'0'` on write-mode-unavailable skip — `CLICKUP_MCP_MODE` is session-constant, so the "clobber prior count" scenario does not arise in practice.
- Pre-M1 ordering rule "cannot be enforced by step 6 alone" — workflow.md enforces step ordering at the parent level; step 6 documents the rule for agent awareness.
- Decision-matrix abort (step-7-class ambiguity) counter-semantics silence — abort happens pre-counter-touch; the counters are untouched by design.
- Emoji in H2 headers / `convertMarkdownToClickUpBlocks` coverage — pattern is already in production via step 4's Templates A/B/C; not introduced by this story.
- `workflow.md` `## Assumptions` one-liner omits the soft-gate path — intentional brevity; the `See:` link and the variable-availability sentence below cover the full semantics.
- No CI hook enforces the rule (f) grep — meta-constraint by design; future drift is a documentation/process concern, not a behavioral defect.
- M1 soft-gate under `read`-mode defeats the Pre-M1 ordering intent — `read`-mode is explicitly a degraded state; the warning-block signal is the expected UX.
- Task name containing markdown-breaking chars renders warning blocks malformed — systemic across all `{task_name}`-consuming steps (4/5/6); not introduced here.

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-23 | Story drafted from EPIC-3 bullet 7 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-23 | Validation pass (`bmad-create-story` checklist): fixed upstream variable-contract dependency claim (C1); strengthened rule (f) with MUST-NOT clause + grep verification (C2); added pre-3.8 fallback to Instructions step 2 (C3); replaced cache-path references with portable upstream references (E1); added pre-M1 ordering rule and tightened WHEN TO POST wording (E2+O1); added `**Confidence:**` field to Template D (O2). |
| 2026-04-23 | Implementation complete via `bmad-dev-story`: created `steps/step-06-assumptions.md` and updated `workflow.md` `## Assumptions` section. Build, lint, prettier, and test gates all green (234 passing, 0 failing — baseline preserved). Status → review.                                                                                                                                                                          |
| 2026-04-23 | Code review via `bmad-code-review`: all 15 ACs SATISFIED per Acceptance Auditor. Triage: 0 decision-needed, 1 patch (task_id length advisory added for consistency with step 4), 6 defer (systemic or transitional, logged in `planning-artifacts/deferred-work.md`), 12 dismissed. Rule (f) grep-isolation invariant re-verified post-patch (0 matches). Status → done.                                                          |
