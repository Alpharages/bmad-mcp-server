# Code Review ClickUp Task Workflow

**Goal:** Review-mode skill — accepts a ClickUp task ID, reads task requirements and acceptance criteria, reads the code diff, performs a structured review, posts findings as a ClickUp comment, and transitions status based on outcome.

**Your Role:** Code-review mode — reads, never writes files. Posts exactly one review comment to ClickUp. Transitions status once based on review outcome.

## Input

Accepts a ClickUp task identifier in bare ID, full app URL, or `CU-`-prefixed form and normalises it to a bare alphanumeric task ID.

See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)

`{task_id}` (normalised bare ClickUp task ID) is available to all downstream steps after this step completes.

## Task Fetch

Calls `getTaskById` for the task and its parent epic, extracts task name, status, description, acceptance criteria, and URL.

See: [./steps/step-02-task-fetch.md](./steps/step-02-task-fetch.md)

`{task_name}`, `{task_status}`, `{task_url}`, `{task_description}`, `{epic_task_id}`, and `{epic_name}` are available to all downstream steps after this step completes.

## Code Reader

Reads git log to locate commits related to this task, reads the diff of changed files, and loads `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` for acceptance context.

See: [./steps/step-03-code-reader.md](./steps/step-03-code-reader.md)

`{branch_name}`, `{commit_list}`, `{changed_files}`, and `{diff_loaded}` are available to all downstream steps after this step completes.

## Review Execution

Delegates the actual review to the `bmad-code-review` workflow (adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor + triage). Pre-supplies the ClickUp task description and planning artifacts as the spec so `bmad-code-review` does not need to ask the user for context. Captures the verdict and findings from the `bmad-code-review` output.

See: [./steps/step-04-review-execution.md](./steps/step-04-review-execution.md)

`{review_verdict}` (`approved` or `changes_requested`), `{review_summary}`, and `{review_findings}` are available to all downstream steps after this step completes.

## Review Comment Poster

Posts a single structured markdown review comment to the ClickUp task via `addComment`. Non-blocking if write mode is unavailable.

See: [./steps/step-05-review-comment-poster.md](./steps/step-05-review-comment-poster.md)

`{comment_id}` is available to downstream steps after this step completes. `{comment_id}` is `''` if write mode was unavailable or the post failed.

## Status Transition

Transitions the task status based on `{review_verdict}`: approved → "approved" / "ready for qa" / "done" (first match); changes requested → "in progress" / "to do" (first match). Non-blocking if write mode is unavailable or no matching status is found.

See: [./steps/step-06-status-transition.md](./steps/step-06-status-transition.md)

`{transition_target}` is the matched status name, or `''` if skipped.
