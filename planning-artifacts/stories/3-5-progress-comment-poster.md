# Story 3.5: Implement progress-comment poster

Status: review

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Progress Comments` skeleton left by story 3.1. Adds one step file and updates one section in `workflow.md`. No TypeScript lands. The poster calls `addComment` (available only when `CLICKUP_MCP_MODE=write`) at two mandatory milestones and at the agent's discretion during implementation. Comment posting is **non-blocking** — if write mode is unavailable or a call fails, the skill continues without halting.
>
> **Depends on story 3.4 completing first.** Step 4 references context variables (`{task_id}`, `{task_name}`, `{task_url}`, `{prd_loaded}`, `{architecture_loaded}`, `{tech_spec_loaded}`, `{epic_task_id}`, `{epic_name}`) that steps 1–3 must have populated. Do not start implementation until story 3.4 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to post markdown-formatted, append-only progress comments to the ClickUp task at implementation milestones using `addComment`,
so that ClickUp reflects real-time implementation progress and humans can track what the Dev agent decided and did without inspecting the repository.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md` exists and is the canonical source of the progress-comment-poster logic. It MUST:
   - Have YAML frontmatter with exactly these runtime-population keys (all empty strings, in this order):
     ```yaml
     comment_count: ''
     last_comment_id: ''
     ```
   - Include a `# Step 4: Progress Comment Poster` H1 title.
   - Include a `## RULES` section with all five rules:
     - (a) **Append-only:** Comments are never edited or deleted. Each invocation posts a new, independent comment. The `updateTask` tool MUST NOT be used in this step.
     - (b) **Markdown-formatted:** All comment text is passed as a markdown string to the `comment` parameter of `addComment`. The `addComment` tool converts markdown to ClickUp blocks internally — do not pre-render to HTML or ClickUp doc format.
     - (c) **Write-mode soft gate:** If `addComment` is not in the current tool list (`CLICKUP_MCP_MODE` is not `write`), emit the mode-unavailable warning block (see AC #3), set `{comment_count}` = `'0'`, skip all comment-posting for this session, and **continue** — progress comments are supplemental; their absence does not block implementation.
     - (d) **Non-blocking failures:** If an `addComment` call returns an error, emit the comment-failed warning block (see AC #4) and **continue** — implementation does not halt on a comment failure.
     - (e) **Variable contract:** `{comment_count}` is incremented by 1 after each successful `addComment` call. `{last_comment_id}` is set to the `comment_id` returned by the most recent successful call. Both values persist across all invocations of this step within a session.
   - Include a `## WHEN TO POST` section with a table of milestones:

     | #   | Milestone                                                                             | Template                             |
     | --- | ------------------------------------------------------------------------------------- | ------------------------------------ |
     | M1  | Immediately after steps 1–3 complete, before any code is written                      | Template A — Implementation Start    |
     | M2  | After all implementation changes are committed and ready for review                   | Template B — Implementation Complete |
     | M3+ | At significant decision points or blockers during implementation (agent's discretion) | Template C — Discretionary           |

   - Include a `## COMMENT TEMPLATES` section with the three verbatim templates specified in AC #5, #6, and #7 below.
   - Include an `## INSTRUCTIONS` section with numbered steps exactly as specified in AC #8 below.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Progress Comments` section is updated to replace the `<!-- story 3-5 will implement: append-only, markdown-formatted comment poster via addComment -->` breadcrumb with:
   - A one-line description of what the progress-comment poster does (invoked at M1 and M2 milestones, and optionally at M3+ decision points; posts markdown comments via `addComment`; non-blocking if write mode is unavailable or `addComment` fails).
   - `See: [./steps/step-04-progress-comment-poster.md](./steps/step-04-progress-comment-poster.md)`
   - An inline statement: "`{comment_count}` and `{last_comment_id}` are available to downstream steps after this step's first invocation. `{comment_count}` is `'0'` if write mode was unavailable; `''` (empty) if write mode was active but no comment was successfully posted."

   No other sections in `workflow.md` change. The `## Input` section (from story 3.2), `## Fetch` section (from story 3.3), `## Planning Artifacts` section (from story 3.4), and breadcrumbs for stories 3.6–3.8 MUST remain intact.

3. The mode-unavailable warning block (referenced in AC #1 rule (c) and instruction step (1)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Progress comments skipped — write mode not active**

   The `clickup-dev-implement` skill requires `CLICKUP_MCP_MODE=write` to post progress comments. The `addComment` tool is not available in the current tool list.

   **Impact:** No progress comments will be posted to ClickUp task `{task_id}` during this session. Implementation will continue without ClickUp comment updates.

   **What to do (optional):** Set `CLICKUP_MCP_MODE=write` and restart the MCP server to enable progress comment posting in future sessions.
   ```

4. The comment-failed warning block (referenced in AC #1 rule (d) and instruction step (5)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Progress comment failed — continuing without posting**

   The `clickup-dev-implement` skill called `addComment` for task `{task_id}` but received an error.

   **Impact:** This milestone will not be recorded in ClickUp. Implementation continues unaffected.

   **What to do (optional):** Verify that `CLICKUP_API_KEY` has permission to comment on this task, then manually post the missed comment in ClickUp if needed.
   ```

5. Template A — Implementation Start (milestone M1) MUST be quoted verbatim in the step file (conditionals replaced with prose instructions per Dev Notes § Template A and the tech-spec conditional):

   ```
   ## 🚀 Implementation Started

   **Task:** {task_name} (`{task_id}`)

   **Context loaded:**
   - PRD: `planning-artifacts/PRD.md` — loaded
   - Architecture: `planning-artifacts/architecture.md` — loaded
   - Tech spec: `planning-artifacts/tech-spec.md` — {tech_spec_loaded == 'true' ? 'loaded' : 'not found, skipped'}
   - Epic: {epic_name non-empty ? '{epic_name} (`{epic_task_id}`)' : 'none'}

   Starting implementation now.
   ```

6. Template B — Implementation Complete (milestone M2) MUST be quoted verbatim in the step file:

   ```
   ## ✅ Implementation Complete

   **Summary:** {brief description of what was implemented}

   **Files changed:**
   - {list of created/modified/deleted files with one-line description each}

   **Next:** Status transition to In Review (step 5).
   ```

7. Template C — Discretionary (milestone M3+) MUST be quoted verbatim in the step file:

   ```
   ## 💡 {comment_topic}

   {body — context, decision, assumption, or progress update relevant to the implementation}
   ```

8. The `## INSTRUCTIONS` section MUST contain exactly these numbered steps:
   1. **Check write mode.** Verify whether `addComment` is available in the current tool list. If absent, emit the mode-unavailable warning block, set `{comment_count}` = `'0'`, and skip all comment-posting for this session. Continue to the next workflow step without posting.
   2. **Identify the milestone.** Determine which milestone (M1, M2, or M3+) applies to the current invocation.
   3. **Compose the comment.** Select the template that matches the milestone (A, B, or C). Substitute all `{...}` placeholders using step-context variables: `{task_id}` from step 1; `{task_name}`, `{task_url}`, `{epic_task_id}`, `{epic_name}` from step 2 (omit the epic line in Template A if `{epic_task_id}` is empty); `{prd_loaded}`, `{architecture_loaded}`, `{tech_spec_loaded}` from step 3. For Template B, summarise the implementation changes. For Template C, describe the decision or event.
   4. **Post the comment.** Call `addComment` with `task_id` = `{task_id}` and `comment` = the composed markdown string from step 3.
   5. **Handle success.** If `addComment` returns successfully: increment `{comment_count}` by 1, set `{last_comment_id}` to the `comment_id` from the response, and confirm `✅ Progress comment posted (comment_id: {last_comment_id})`. Continue to the next workflow step.
   6. **Handle failure.** If `addComment` returns an error: emit the comment-failed warning block, do NOT increment `{comment_count}` or update `{last_comment_id}`, and continue — do not halt implementation.

9. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`, `step-02-task-fetch.md`, and `step-03-planning-artifact-reader.md` are byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` MUST be empty.

10. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

11. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

12. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

13. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.4 (current test baseline: **234 passing**, 0 failing). Since no `.ts` lands, the expected test-count delta is zero.

14. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

15. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.

16. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring is deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Status transitions (in progress → in review) → **story 3.6**.
- Non-blocking assumption comment pattern (special comment type for surfacing assumptions) → **story 3.7**.
- Dev-facing clarification prompt → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` DS-trigger wiring → **story 3.9**.
- Editing or deleting previously posted comments — append-only is the hard constraint; future stories will not relax this.
- Posting comments via `updateTask` description field — PRD §FR #6 explicitly restricts agents to writing via comments and status only.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-04-progress-comment-poster.md` (AC: #1, #3, #4, #5, #6, #7, #8)**
  - [ ] Create the file with YAML frontmatter (`comment_count: ''`, `last_comment_id: ''` — in that order), `# Step 4: Progress Comment Poster` H1, `## RULES`, `## WHEN TO POST`, `## COMMENT TEMPLATES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1 and AC #3–#8.
  - [ ] Verify the `## RULES` section includes all five rules: append-only, markdown-formatted, write-mode soft gate, non-blocking failures, and variable contract.
  - [ ] Include the verbatim mode-unavailable warning block from AC #3.
  - [ ] Include the verbatim comment-failed warning block from AC #4.
  - [ ] Include the verbatim Template A (Implementation Start) from AC #5.
  - [ ] Include the verbatim Template B (Implementation Complete) from AC #6.
  - [ ] Include the verbatim Template C (Discretionary) from AC #7.
  - [ ] Include the `## INSTRUCTIONS` numbered steps exactly as specified in AC #8.

- [ ] **Task 2 — Update `workflow.md` Progress Comments section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [ ] Replace the single-line HTML-comment breadcrumb under `## Progress Comments` with the three-item replacement specified in AC #2 (description sentence, `See:` link, variable-availability statement).
  - [ ] Confirm no other sections in `workflow.md` are touched (breadcrumbs for stories 3.6–3.8 MUST remain unchanged).

- [ ] **Task 3 — Verify regression-free (AC: #9–#16)**
  - [ ] `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` → empty.
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [ ] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors.
  - [ ] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat.
  - [ ] `npm test` → no new failures vs. current baseline (234 passing).

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md`.
  - [ ] Commit message: `feat(custom-skills): implement progress-comment-poster step in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-04-progress-comment-poster.md defining the append-only, markdown-
    formatted comment-posting pattern for two mandatory milestones (M1:
    implementation start, M2: implementation complete) and optional discretionary
    comments during implementation. Updates workflow.md ## Progress Comments section
    with step reference and variable contract (comment_count, last_comment_id).

    addComment requires CLICKUP_MCP_MODE=write. Step 4 uses a soft gate: if
    addComment is unavailable, a warning is emitted and comment-posting is skipped
    for the session without halting the skill. addComment failures are similarly
    non-blocking.

    Out of scope (deferred): status-transition helper (3.6), non-blocking assumption
    pattern (3.7), dev-clarification prompt (3.8), bmad-agent-dev.toml wiring (3.9).

    Refs: EPIC-3, story 3-5-progress-comment-poster.
    ```

## Dev Notes

### Why `addComment` and not `updateTask`

PRD §FR #6: "Humans own ticket _description_; agents write only via _comments_ and _status_." The `addComment` tool maps directly to this constraint. `updateTask` with a description update would violate the boundary. The `updateTask` description field is intentionally excluded from this step.

### Soft gate vs. hard gate

Story 3-4's planning-artifact reader uses a hard gate for PRD and architecture (fatal if absent). Story 3-5 uses a soft gate because progress comments are supplemental to implementation — their absence reduces observability but does not impair correctness. This matches the PRD's "idempotency" NFR: implementation mode is non-destructive whether or not comments land.

The `clickup-create-story` skill (story 2.2) uses a hard gate for write mode because `createTask` is the skill's primary output — there is nothing to fall back to. For `clickup-dev-implement`, the primary output is code changes; ClickUp comments are a side channel.

### `addComment` API contract

The `addComment` tool (registered in `src/tools/clickup/src/tools/task-write-tools.ts`) accepts:

- `task_id`: **6–9 character alphanumeric string** (Zod schema: `z.string().min(6).max(9)`). Step 1 validates alphanumeric format but does not enforce length. If a task ID falls outside 6–9 characters, the Zod schema rejects it at invocation and `addComment` returns an error — rule (d)'s non-blocking path handles this. The step file should note this constraint so end-users know why a comment failed for an unusual task ID.
- `comment`: markdown string — the tool calls `convertMarkdownToClickUpBlocks()` internally. Do not pre-render to HTML or ClickUp block syntax; pass plain markdown.

It posts to `POST /api/v2/task/{task_id}/comment` with `notify_all: true`. A successful response includes `id` (comment ID), `user.username`, and `date` (Unix ms timestamp). Use `id` as `{last_comment_id}`.

`convertMarkdownToClickUpBlocks` supports the full markdown feature set confirmed by `tests/unit/formatted-comments.test.ts` (note: these are vendored tests at `src/tools/clickup/src/tests/formatted-comments.test.ts`):

- **Inline:** `**bold**`, `*italic*`, `` `code` ``, `***bold+italic***`, `[link](url)`
- **Block:** `# H1`, `## H2`, `### H3`, `> blockquote`, ` ``` ` fenced code blocks
- **Lists:** `- bullet`, `1. ordered`, `- [ ] unchecked checkbox`, `- [x] checked checkbox`, nested lists with indent levels

The Templates A, B, and C use H2 headers and bullet lists — both are fully supported. Do not use HTML tags or ClickUp-specific block format strings in the `comment` string.

### Template A and the tech-spec conditional

Template A includes a conditional line for tech spec status. In the step file, write this as a prose instruction rather than a conditional expression, e.g.:

> "For the tech-spec line: write `loaded` if `{tech_spec_loaded}` is `'true'`; write `not found, skipped` if `{tech_spec_loaded}` is `'false'`."

Similarly for the epic line: omit it entirely if `{epic_task_id}` is an empty string.

### Template B — what to include in "Files changed"

List every file the Dev agent created, modified, or deleted during the implementation session. One line per file with a brief description. This becomes the permanent ClickUp record of what changed. Be specific — "Modified `src/foo.ts` — add `bar()` method" is better than "Modified `src/foo.ts`".

### Step 4 is a milestone-driven utility, not a one-shot sequential step

Steps 1–3 run exactly once at the start of the skill. Step 4 is invoked at least twice (M1 after step 3, M2 before step 5) and optionally more during implementation. The `{comment_count}` counter accumulates across all invocations in the session. The `## WHEN TO POST` table in the step file defines when to invoke; the dev agent applies judgment for M3+ moments.

Step 3's success summary block says "Proceeding to step 4 (progress-comment poster)." — that cues the M1 invocation immediately. After M1 is posted, the dev agent begins implementation (code changes, IDE file tools). When implementation is complete, the M2 invocation runs before step 5.

### Step file naming convention for EPIC-3 (reminder)

| Step file                                | Created by story | Execution order     |
| ---------------------------------------- | ---------------- | ------------------- |
| `step-01-task-id-parser.md`              | 3.2              | 1                   |
| `step-02-task-fetch.md`                  | 3.3              | 2                   |
| `step-03-planning-artifact-reader.md`    | 3.4              | 3                   |
| **`step-04-progress-comment-poster.md`** | **3.5 (this)**   | **4 (M1, M2, M3+)** |
| `step-05-status-transition.md`           | 3.6              | 5                   |
| `step-06-assumptions.md`                 | 3.7              | 6                   |
| `step-07-dev-clarification.md`           | 3.8              | 7                   |

Story 3.6 MUST add `step-05-status-transition.md`.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` files. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### CLICKUP_MCP_MODE requirements for this step

`addComment` is registered in `src/tools/clickup/src/tools/task-write-tools.ts` and exposed only when `CLICKUP_MCP_MODE=write`. In `read-minimal` or `read` mode, `addComment` is absent from the tool list. Step 4 must check tool availability at invocation time (rule (c)) before attempting any API call.

### References

- [EPIC-3 §Stories bullet 5](../epics/EPIC-3-dev-agent-clickup.md) — "Implement progress-comment poster (append-only, markdown-formatted)".
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "Posts progress/decision comments at milestones; transitions status (in progress → in review → done)."
- [PRD §FR #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status."
- [PRD §FR #6](../PRD.md) — "Humans own ticket _description_; agents write only via _comments_ and _status_." (Mandates `addComment`, not `updateTask` description.)
- [PRD §NFR — Idempotency](../PRD.md) — "Dev agent (implementation mode) progress comments are additive, not destructive." (Mandates append-only.)
- [Story 3.1 §Acceptance Criteria #4](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Progress Comments` section created with the breadcrumb this story replaces.
- [Story 3.3 §Dev Notes: Step-context variable contract](./3-3-task-fetch-with-epic-context.md) — `{task_id}`, `{task_name}`, `{task_url}`, `{epic_task_id}`, `{epic_name}` origin.
- [Story 3.4 §Dev Notes: Content in conversation context](./3-4-planning-artifact-reader.md) — `{prd_loaded}`, `{architecture_loaded}`, `{tech_spec_loaded}` origin; "Proceeding to step 4 (progress-comment poster)" in the step 3 success summary is the M1 trigger.
- [`src/tools/clickup/src/tools/task-write-tools.ts`](../../src/tools/clickup/src/tools/task-write-tools.ts) — `addComment` registration, schema, and `convertMarkdownToClickUpBlocks` call.
- [`src/tools/clickup/src/tests/addComment.test.ts`](../../src/tools/clickup/src/tests/addComment.test.ts) — `addComment` test confirming markdown→block conversion and `notify_all: true`.
- [`src/tools/clickup/src/tests/formatted-comments.test.ts`](../../src/tools/clickup/src/tests/formatted-comments.test.ts) — full coverage of `convertMarkdownToClickUpBlocks`: headers, blockquotes, bullet/ordered/checkbox lists, fenced code blocks, inline bold/italic/code/links, nested lists, and bold+italic combined.

## Dev Agent Record

### Agent Model Used

(to be filled by implementing agent)

### Debug Log References

(to be filled by implementing agent)

### Completion Notes List

(to be filled by implementing agent)

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md` — step file with rules, milestone table, comment templates, and instructions (AC #1, #3–#8)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Progress Comments` section updated (AC #2)

**Deleted**

- (none expected)

### Review Findings

(to be filled during code review)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-3 bullet 5 via `bmad-create-story` workflow. Status → ready-for-dev. |
