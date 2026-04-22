# Implement ClickUp Task Workflow

**Goal:** Dev agent, invoked in implementation mode, accepts a ClickUp task ID and executes the full implement → comment → status loop.

**Your Role:** Implementation-mode skill — reads a ClickUp task + repo planning artifacts, implements code via IDE file tools, posts progress comments, and transitions status. Does NOT create ClickUp tasks or write to `planning-artifacts/stories/`.

## Input

Accepts a ClickUp task identifier in bare ID, full app URL, or `CU-`-prefixed form and normalises it to a bare alphanumeric task ID. If parsing fails, the skill emits a standard error block and stops.

See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)

`{task_id}` (normalised bare ClickUp task ID) is available to all downstream steps after this step completes.

## Fetch

Calls `getTaskById` for the task and its parent epic, extracts task name, status, URL, and epic context.

See: [./steps/step-02-task-fetch.md](./steps/step-02-task-fetch.md)

`{task_name}`, `{task_status}`, `{task_url}`, `{epic_task_id}`, and `{epic_name}` are available to all downstream steps after this step completes. `{epic_task_id}` and `{epic_name}` are empty strings if the task has no parent epic or the parent fetch failed.

## Planning Artifacts

Uses the IDE Read file tool to load `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md`, with optional `planning-artifacts/tech-spec.md`; stops with a fatal error if either required file is absent.

See: [./steps/step-03-planning-artifact-reader.md](./steps/step-03-planning-artifact-reader.md)

`{prd_loaded}` and `{architecture_loaded}` are `'true'` after this step completes. `{tech_spec_loaded}` is `'true'` if `planning-artifacts/tech-spec.md` was found, `'false'` otherwise. PRD, architecture, and (when present) tech-spec content are available in conversation context to all downstream steps after this step completes.

## Progress Comments

<!-- story 3-5 will implement: append-only, markdown-formatted comment poster via addComment -->

## Status Transitions

<!-- story 3-6 will implement: validates target status, transitions in progress → in review → done -->

## Assumptions

<!-- story 3-7 will implement: non-blocking assumption comment pattern -->

## Dev Clarification

<!-- story 3-8 will implement: asks the dev, never the PM, when blocked -->
