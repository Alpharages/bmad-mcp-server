# Create ClickUp Epic Workflow

**Goal:** Publish an already-planned epic to ClickUp — create a root-level ClickUp task (epic) in the Backlog list of the active space, with a description composed from the PRD, the architecture doc, and the selected epic's own content. Does not write any local files and does not plan the epic: `bmad-create-epics-and-stories`, `bmad-prd`, or a human author it; this workflow publishes it.

**Your Role:** You are ClickUp-authoritative. You do not write to the planning-artifacts directory or create any local YAML. ClickUp is the single source of truth.

## Prerequisites

Before proceeding, the skill resolves the PRD, architecture, and epics paths **client-side** through the 3-layer doc-path cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default), then verifies all three exist at their resolved paths. An explicitly configured `epics_path` wins over everything else. All three inputs are required for epic creation; the skill aborts with an error naming each resolved path and its cascade layer if any is missing.

The epics input may be a **directory** of per-epic BMAD 6.11 files (the resolver default, `epics/`) or a **single combined artifact** — both are supported. When the configured directory does not exist, the skill also checks for a sibling `epics-and-stories.md` or `epics.md` before failing.

Before checking project files, step 1 verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails.

See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)

## Backlog List Picker

Presents the user with their ClickUp spaces, finds the Backlog list in the selected space, and stores it as `{backlog_list_id}` and `{space_name}`.

See: [./steps/step-02-backlog-list-picker.md](./steps/step-02-backlog-list-picker.md)

`{space_id}`, `{space_name}`, and `{backlog_list_id}` are available to downstream steps after this step completes.

## Epic Picker

Parses the epics loaded in step 1 — recognising `## Epic N:`, `# Epic N —`, and `# EPIC-N:` heading forms across both the directory and single-file layouts — and presents them as a pick-list so the user selects which epic to publish to ClickUp. The pick-list is always shown, even for a single parsed epic, so the user confirms before any write. When two entries collide on number or title (e.g. a per-epic file plus a combined artifact), every candidate is listed with its source file and the user must choose; the skill never resolves ambiguity silently.

See: [./steps/step-03-local-epic-picker.md](./steps/step-03-local-epic-picker.md)

`{epic_number}`, `{epic_title}`, and `{epic_raw_content}` are available to downstream steps after this step completes.

Step 3 MUST complete with non-empty `{epic_title}` before the workflow proceeds to step 4.

## Description Composer

Synthesizes PRD + architecture + local epic content into a structured Markdown description, presents it for user review (Y/n/edit), and stores the confirmed text in `{epic_description}` for the task-creation step.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{epic_description}` before the workflow proceeds to step 5.

## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for a duplicate epic name in the Backlog list, presents a pre-creation summary for user confirmation, calls `createTask({ list_id: {backlog_list_id}, name: {epic_title}, description: {epic_description} })` with no `parent_task_id` (epics are root-level), and stores the created task's `{created_task_id}` and `{created_task_url}`.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently.
