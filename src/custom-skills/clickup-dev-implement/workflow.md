# Implement ClickUp Task Workflow

**Goal:** Dev agent, invoked in implementation mode, accepts a ClickUp task ID and executes the full implement → comment → status loop.

**Your Role:** Implementation-mode skill — reads a ClickUp task + repo planning artifacts, implements code via IDE file tools using a red-green-refactor TDD cycle, posts progress comments, and transitions status. Does NOT create ClickUp tasks or write to `planning-artifacts/stories/`.

## Critical Execution Rules

- **Never stop for milestones, "significant progress", or session boundaries.** Execute continuously until ALL tasks/subtasks are done or an explicit HALT condition fires. Only the DoD gate in step 4 decides completion.
- **Follow tasks/subtasks exactly.** Implement ONLY what is mapped to a task/subtask. No extra features, no surrounding cleanup, no premature abstractions.
- **Red-Green-Refactor.** Tests written before implementation. Always.
- **DoD gate before M2.** Validate `checklist.md` before posting the completion comment.

## Input

Accepts a ClickUp task identifier in bare ID, full app URL, or `CU-`-prefixed form and normalises it to a bare alphanumeric task ID. If parsing fails, the skill emits a standard error block and stops.

See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)

`{task_id}` is available to all downstream steps after this step completes.

## Fetch

Calls `getTaskById` for the task and its parent epic. The full task description (including Acceptance Criteria, Tasks/Subtasks, and Dev Notes sections written by `clickup-create-story`) and all task comments are available in conversation context after this step.

See: [./steps/step-02-task-fetch.md](./steps/step-02-task-fetch.md)

`{task_name}`, `{task_status}`, `{task_url}`, `{epic_task_id}`, and `{epic_name}` are available to all downstream steps.

## Context Builder

Calls `bmad({ operation: 'resolve-doc-paths' })` to determine PRD and architecture paths via the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default), then verifies the required files exist at the resolved paths. Also reads `planning-artifacts/tech-spec.md` and `project-context.md` (optional, best-effort, hardcoded paths — `tech_spec_path` cascade is deferred to a later story). The skill aborts if either required file is missing, surfacing the cascade layer and instructions for all three override layers.

See: [./steps/step-03-planning-artifact-reader.md](./steps/step-03-planning-artifact-reader.md)

`{prd_loaded}`, `{architecture_loaded}`, `{task_ac_list}`, and `{task_subtasks}` are available to all downstream steps after this step completes.

## Implementation Loop

Delegates to the `bmad-dev-story` workflow with the ClickUp task description pre-supplied as the virtual story file. `bmad-dev-story` handles everything: review-continuation detection, red-green-refactor TDD cycle, per-task DoD validation, and completion communication. File-system side-effects (sprint-status.yaml, local story file) are skipped — ClickUp is the record. When `bmad-dev-story` improves upstream, this skill inherits those improvements automatically.

See: [./steps/step-04-implementation-loop.md](./steps/step-04-implementation-loop.md)

`{implementation_complete}`, `{files_changed}`, and `{pr_url}` are available to all downstream steps after this step completes.

## Progress Comments

Invoked at M1 (before any code is written) and M2 (after all implementation changes are committed), and optionally at M3+ decision points; posts markdown-formatted, append-only comments via `addComment`; non-blocking if `CLICKUP_MCP_MODE=write` is unavailable or `addComment` fails.

See: [./steps/step-05-progress-comment-poster.md](./steps/step-05-progress-comment-poster.md)

`{comment_count}` and `{last_comment_id}` are available after first invocation.

## Status Transitions

Invoked after M2; calls `getListInfo` to validate target status, then `updateTask` to transition to "in review"; non-blocking if write mode is unavailable or `updateTask` fails.

See: [./steps/step-06-status-transition.md](./steps/step-06-status-transition.md)

`{list_id}`, `{list_statuses}`, and `{transition_target}` are available after this step.

## Assumptions

Invoked at the agent's discretion during implementation, zero or more times; posts a markdown "Assumption Made" comment via `addComment`; non-blocking; does NOT wait for a human response; escalates to step 8 when the ambiguity exceeds the decision-matrix threshold.

See: [./steps/step-07-assumptions.md](./steps/step-07-assumptions.md)

`{assumption_count}` and `{last_assumption_comment_id}` are independent of step 5's progress-comment counters.

## Dev Clarification

Invoked at the agent's discretion, zero or more times; posts a markdown "Dev Clarification Needed" comment via `addComment`; **halts implementation** until the dev replies in the active conversation; asks the dev, never the PM; blocking contract preserved even when write mode is unavailable.

See: [./steps/step-08-dev-clarification.md](./steps/step-08-dev-clarification.md)

`{clarification_count}`, `{last_clarification_comment_id}`, and `{pending_clarification}` are independent of steps 5 and 7 counters.
