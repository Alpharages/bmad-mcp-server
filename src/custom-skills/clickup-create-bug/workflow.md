# Create ClickUp Bug Workflow

**Goal:** Allow users to create ClickUp bug tickets from a free-form bug report, with a bug-shaped description (repro / expected / actual / impact / suspected area), without requiring PRD or architecture, and without forcing an epic parent.

**Your Role:** You are ClickUp-authoritative. You do not write to `planning-artifacts/stories/`.

## Prerequisites

Step 1 first verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails.

After the permission gate passes, the skill calls `bmad({ operation: 'resolve-doc-paths' })` to determine PRD, architecture, and epics paths via the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default). Unlike `clickup-create-story`, these files are **optional** for bug creation — the skill warns if any file is missing but **does not abort**.

See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)

## Target-list Picker

Presents the user with their ClickUp spaces and lists so they can choose where the bug ticket should be created. The target list can be a dedicated bugs list or the active sprint list, governed by `.bmadmcp/config.toml` `[clickup_create_bug].target_list_id`.

See: [./steps/step-02-list-picker.md](./steps/step-02-list-picker.md)

`{target_list_id}` and `{target_list_name}` are available to downstream steps after this step completes.

## [Optional] Epic Picker

Presents the user with epics in the chosen space so they can optionally attach the bug to an epic parent. This step is **skippable** — bugs do not require an epic parent. Full implementation depends on EPIC-8.

See: [./steps/step-03-epic-picker.md](./steps/step-03-epic-picker.md)

`{epic_id}` and `{epic_name}` are available to downstream steps if the user chooses an epic; otherwise the bug is created without a parent.

## Description Composer

Parses the user's free-form bug report into a bug-shaped description template:

- **Summary** — one-line coerced title
- **Steps to reproduce**
- **Expected behaviour**
- **Actual behaviour**
- **Impact / severity**
- **Suspected area**
- **Environment**
- **Related links**

No `bmad-create-story` delegation — the composer extracts these sections directly from the user's report.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with non-empty `{bug_title}` and `{bug_description}` before the workflow proceeds to step 5.

## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for duplicate task names in the target list, presents a pre-creation summary for user confirmation, calls `createTask` with bug defaults (`bug` tag, priority inferred from severity), and stores the created task's `{created_task_id}` and `{created_task_url}`.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently.
