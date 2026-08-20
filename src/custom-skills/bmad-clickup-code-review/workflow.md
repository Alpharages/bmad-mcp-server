# Code Review ClickUp Task Workflow

**Goal:** Review-mode skill — accepts a ClickUp task ID, reads task requirements and acceptance criteria, reads the code diff, performs a structured review, posts findings as a ClickUp comment, and transitions status based on outcome.

**Your Role:** Code-review mode — reads, never writes files. Posts exactly one review comment to ClickUp. Transitions status at most once, based on review outcome.

## Read-only invariant

This workflow is **report-only**, and that is a hard contract, not a default. Across every step it MUST NOT: apply a patch, edit source or tests, stage, commit, stash, create or switch branches, or write to any BMAD artifact — including story files, a spec file's review-findings section, `deferred-work.md`, and `sprint-status.yaml`. It delegates to BMAD 6.11 `bmad-code-review` for the review itself, but runs only that workflow's gather / review / triage stages; its present-and-act stage, which applies patches and writes findings to disk, is never run.

The only writes this workflow performs are to ClickUp: exactly one comment, and at most one status transition.

## Input

Accepts a ClickUp task identifier in bare ID, full app URL, or `CU-`-prefixed form and normalises it to a bare alphanumeric task ID.

See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)

`{task_id}` (normalised bare ClickUp task ID) is available to all downstream steps after this step completes.

## Task Fetch

Calls `getTaskById` for the task and its parent epic, extracts task name, status, description, acceptance criteria, and URL.

See: [./steps/step-02-task-fetch.md](./steps/step-02-task-fetch.md)

`{task_name}`, `{task_status}`, `{task_url}`, `{task_description}`, `{epic_task_id}`, and `{epic_name}` are available to all downstream steps after this step completes.

## Code Reader

Reads git log to locate commits related to this task, reads the diff of changed files, and resolves PRD and architecture paths **client-side** (the AI runs the 3-layer cascade against the client project root — `.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default — rather than calling a server tool, since the MCP server may be remote and cannot see the project's files). Missing planning artifacts are non-fatal — the review continues with task-description context only.

See: [./steps/step-03-code-reader.md](./steps/step-03-code-reader.md)

`{branch_name}`, `{commit_list}`, `{changed_files}`, and `{diff_loaded}` are available to all downstream steps after this step completes.

## Review Execution

Delegates the actual review to the BMAD 6.11 `bmad-code-review` workflow — its adversarial layers, per-finding verification, severity assignment, and triage routing. Pre-supplies the ClickUp task description and planning artifacts as the spec (and no spec-file path) so `bmad-code-review` does not need to ask the user for context and has nothing to write findings into. Runs the gather / review / triage stages only; the present-and-act stage is never run.

The step consumes BMAD 6.11 finding actions directly — `decision_needed`, `patch`, `defer`, plus dismissed findings and their disposal reasons — each with an upstream-assigned severity of `high`, `medium`, or `low`. It also captures the verification-gap layer's output: claims the change makes that its evidence does not actually verify. A structured internal finding set is built **before** any ClickUp comment is rendered.

**Verdict contract** — evaluated in order, first match wins:

| Evidence                                            | Verdict               |
| --------------------------------------------------- | --------------------- |
| Reviewer execution failed                           | `inconclusive`        |
| Diff, specification, or test evidence unavailable   | `inconclusive`        |
| Unresolved High/Medium `patch` finding              | `changes_requested`   |
| Unresolved High/Medium `decision_needed` finding    | `changes_requested`   |
| Only Low findings, or explicitly accepted deferrals | `approved` with notes |
| No findings and verification passed                 | `approved`            |

There is no rule that approves because an expected output section was absent: unparseable or empty reviewer output is `inconclusive`, never `approved`. A clean result from a partially failed review is also `inconclusive`.

See: [./steps/step-04-review-execution.md](./steps/step-04-review-execution.md)

`{review_verdict}` (`approved`, `changes_requested`, or `inconclusive`), `{review_summary}`, `{review_findings}`, `{verification_gaps}`, and `{review_inconclusive_reason}` are available to all downstream steps after this step completes.

## Review Comment Poster

Posts exactly one structured markdown review comment to the ClickUp task via `addComment`, on every verdict including `inconclusive`. The comment renders findings grouped by action with their severities, plus the verification gaps; an inconclusive comment states the reason and that the status was deliberately left unchanged. Non-blocking if write mode is unavailable, and never retried — a retry risks a duplicate comment.

See: [./steps/step-05-review-comment-poster.md](./steps/step-05-review-comment-poster.md)

`{comment_id}` is available to downstream steps after this step completes. `{comment_id}` is `''` if write mode was unavailable or the post failed.

## Status Transition

Transitions the task status based on `{review_verdict}`: approved → "approved" / "ready for qa" / "done" (first match); changes requested → "in progress" / "to do" (first match). **Inconclusive performs no ClickUp write at all** — it does not even call `getListInfo` — because an inconclusive review is not evidence in either direction. `updateTask` is called at most once and is never retried. Non-blocking if write mode is unavailable or no matching status is found.

See: [./steps/step-06-status-transition.md](./steps/step-06-status-transition.md)

`{transition_target}` is the matched status name, or `''` if skipped.

## Lore Lesson Save

Invoked once after step 6 completes (or is skipped), if `{review_verdict}` is non-empty. Assesses whether the review findings contain lesson-eligible signals (recurring anti-patterns, AC gaps, security issues, architecture violations, non-obvious test gaps), deduplicates candidates against the existing Lore corpus at two layers (task-level via `query_lessons_for_task`, semantic-level via `search_similar` at ≥ 0.88 similarity), and persists only genuinely new lessons framed as prevention patterns. Entirely non-blocking — skipped silently if no Lore MCP is configured for this project.

See: [./steps/step-07-lore-lesson-save.md](./steps/step-07-lore-lesson-save.md)

`{lesson_count}` is available after this step. Step 7 is the terminal step of the skill.
