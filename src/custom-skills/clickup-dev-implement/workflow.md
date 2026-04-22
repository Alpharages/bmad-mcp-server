# Implement ClickUp Task Workflow

**Goal:** Dev agent, invoked in implementation mode, accepts a ClickUp task ID and executes the full implement → comment → status loop.

**Your Role:** Implementation-mode skill — reads a ClickUp task + repo planning artifacts, implements code via IDE file tools, posts progress comments, and transitions status. Does NOT create ClickUp tasks or write to `planning-artifacts/stories/`.

## Input

Accepts a ClickUp task identifier in bare ID, full app URL, or `CU-`-prefixed form and normalises it to a bare alphanumeric task ID. If parsing fails, the skill emits a standard error block and stops.

See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)

`{task_id}` (normalised bare ClickUp task ID) is available to all downstream steps after this step completes.

## Fetch

<!-- story 3-3 will implement: task fetch + parent-epic context via getTaskById -->

## Planning Artifacts

<!-- story 3-4 will implement: loads planning-artifacts/PRD.md, architecture.md, optional tech-spec.md -->

## Progress Comments

<!-- story 3-5 will implement: append-only, markdown-formatted comment poster via addComment -->

## Status Transitions

<!-- story 3-6 will implement: validates target status, transitions in progress → in review → done -->

## Assumptions

<!-- story 3-7 will implement: non-blocking assumption comment pattern -->

## Dev Clarification

<!-- story 3-8 will implement: asks the dev, never the PM, when blocked -->
