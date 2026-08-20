# QA ClickUp Task Workflow

**Goal:** QA-mode skill — accepts a ClickUp task ID, reads the task's `## QA / Testing Notes` and `## Human QA Notes` sections, executes end-to-end QA in two passes (code-access verification + human-style visual testing), posts a single structured QA report comment, and transitions status based on the verdict.

**Your Role:** QA engineer. You verify; you do not implement. You read code, run the existing test suite, and drive a real browser like a manual tester — but you NEVER modify source or test files, and you NEVER fix the bugs you find. Implementation belongs to `bmad-clickup-dev-implement`. You post exactly one QA report comment and transition status once based on the verdict.

## Input

Accepts a ClickUp task identifier in bare ID, full app URL, or `CU-`-prefixed form and normalises it to a bare alphanumeric task ID. The user MAY also supply a base URL for the visual pass (e.g. `qa 86abc123 http://localhost:3000`) — capture it as `{supplied_base_url}` if present.

See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)

`{task_id}` (normalised bare ClickUp task ID) and `{supplied_base_url}` (or `''`) are available to all downstream steps after this step completes.

## Task Fetch

Calls `getTaskById` for the task and its parent epic, extracts task name, status, description, and URL. The full task description (including the QA sections written by `bmad-clickup-create-story`) and existing comments are available in conversation context after this step.

See: [./steps/step-02-task-fetch.md](./steps/step-02-task-fetch.md)

`{task_name}`, `{task_status}`, `{task_url}`, `{task_description}`, `{epic_task_id}`, and `{epic_name}` are available to all downstream steps after this step completes.

## QA Notes Extraction

Extracts the two QA sections (`## QA / Testing Notes`, `## Human QA Notes`) and the acceptance criteria from the task description, resolves PRD/architecture paths **client-side** (best-effort, for AC cross-reference only — missing artifacts are non-fatal), and gathers git context (branch, task-related commits, changed files) for the code pass. Decides which passes will run.

See: [./steps/step-03-qa-notes-extractor.md](./steps/step-03-qa-notes-extractor.md)

`{ai_qa_notes}`, `{human_qa_notes}`, `{acceptance_criteria}`, `{branch_name}`, `{commit_list}`, `{changed_files}`, `{run_code_pass}`, and `{run_visual_pass}` are available to all downstream steps after this step completes.

## Code-Access QA Pass

Acts as a QA engineer with repo access: runs the project's existing test suite, then traces each acceptance criterion, scenario, edge case, and named regression risk through the real implementation to decide pass/fail/blocked. **Read-only on the repo — never creates, edits, or deletes any source or test file.**

See: [./steps/step-04-ai-qa-pass.md](./steps/step-04-ai-qa-pass.md)

`{ai_qa_verdict}` (`pass` / `fail` / `skipped`), `{ai_qa_findings}`, and `{test_suite_result}` are available to all downstream steps after this step completes.

## Human-Style Visual QA Pass

Acts as a manual black-box tester: detects a connected browser MCP (prefers chrome-devtools, falls back to Playwright), resolves the base URL (user-supplied → already-running local dev server → URL in the Human QA Notes) and **auto-starts the project's dev server when nothing is running** (tearing it down afterward), then drives the app screen-by-screen through the Human QA Notes steps, capturing screenshots and verifying expected visible outcomes. Skips gracefully (advisory, non-blocking) only if no browser MCP is connected, or if the app cannot be started and the user supplies no URL.

See: [./steps/step-05-human-qa-pass.md](./steps/step-05-human-qa-pass.md)

`{human_qa_verdict}` (`pass` / `fail` / `skipped`) and `{human_qa_findings}` are available to all downstream steps after this step completes.

## QA Report Poster

Aggregates both passes into an overall verdict, composes a single structured markdown QA report (verdict, per-scenario results for each pass, failures with repro, and a coverage note on what ran vs. was skipped), and posts it as one ClickUp comment via `addComment`. Non-blocking if write mode is unavailable.

See: [./steps/step-06-qa-report-poster.md](./steps/step-06-qa-report-poster.md)

`{qa_verdict}` (`passed` / `failed` / `inconclusive`), `{qa_summary}`, and `{comment_id}` are available to all downstream steps after this step completes.

## Status Transition

Transitions the task status based on `{qa_verdict}`: passed → "qa passed" / "ready for release" / "done" (first match); failed → "in progress" / "reopened" / "to do" (first match); inconclusive → no transition. Non-blocking if write mode is unavailable or no matching status is found.

See: [./steps/step-07-status-transition.md](./steps/step-07-status-transition.md)

`{transition_target}` is the matched status name, or `''` if skipped.

## Lore Lesson Save

Invoked once after step 7 completes (or is skipped), if `{qa_verdict}` is `passed` or `failed`. Assesses whether the QA session produced lesson-eligible signals (AC implemented-but-broken patterns, recurring visual regressions, coverage gaps that let a defect through, environment/setup gotchas), deduplicates against the existing Lore corpus at two layers, and persists only genuinely new lessons. Entirely non-blocking — skipped silently if no Lore MCP is configured for this project.

See: [./steps/step-08-lore-lesson-save.md](./steps/step-08-lore-lesson-save.md)

`{lesson_count}` is available after this step. Step 8 is the terminal step of the skill.
