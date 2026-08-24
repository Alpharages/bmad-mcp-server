# Create ClickUp Story Workflow

**Goal:** Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp tasks instead of story files, without modifying upstream BMAD source. Supports both epic-parented tasks (default) and standalone top-level tasks via the no-epic path.

**Your Role:** You are ClickUp-authoritative. You do not write to `planning-artifacts/stories/`.

## Prerequisites

Before proceeding, the skill resolves PRD, architecture, and epics paths **client-side** (the AI runs the 3-layer cascade against the client project root — `.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default — rather than calling a server tool, since the MCP server may be remote and cannot see the project's files), then attempts to load each file. Missing planning docs are **warnings, not errors** — the skill continues with whatever context is available. When a doc is absent, the skill falls back to code context (README, source directory structure, recent git history, project manifest) and emits a `⚠️` warning per missing file. The composed story description is prefixed with a banner listing which docs were absent and which fallback sources were used.

Before checking project files, step 1 verifies that `CLICKUP_MCP_MODE=write` (so `createTask` is registered) and that the `CLICKUP_API_KEY` token authenticates against the ClickUp API; the skill aborts with an actionable error if either check fails.

See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)

## Pickers

### Epic picker

Presents the user with their ClickUp spaces and the tasks (epics) in the selected space's Backlog list so they can choose an epic interactively. When `[clickup_create_story].allow_no_epic` is `true` (the default), a `[0] No epic — create as standalone task` entry is prepended to the picker list. Selecting `[0]` sets `{epic_id}` = `''` (the no-epic sentinel) and `{epic_name}` = `''`. If the Backlog list is empty and `allow_no_epic` is `true`, the user is offered a Y/n prompt to continue as a standalone task rather than receiving a hard-stop error. Setting `[clickup_create_story].allow_no_epic = false` in `.bmadmcp/config.toml` hides the `[0]` entry and restores the original hard-stop when the Backlog list is empty.

See: [./steps/step-02-epic-picker.md](./steps/step-02-epic-picker.md)

`{epic_id}` and `{epic_name}` are available to downstream steps after this step completes. On the no-epic path both values are `''`.

### Sprint-list picker

Discovers the sprint folder in the selected space, lists all non-archived sprint lists within it, presents the choices to the user with an active-sprint hint, and stores the selected list as `{sprint_list_id}` and `{sprint_list_name}`.

See: [./steps/step-03-sprint-list-picker.md](./steps/step-03-sprint-list-picker.md)

Step 3 MUST complete with a non-empty `{sprint_list_id}` before the workflow proceeds to step 4.

## Description Composer

Composes the ClickUp story description from BMAD 6.11 planning and specification output. The deprecated `bmad-create-story` shim is never called.

**Story source cascade** — the composer stops at the first source that yields exactly one story:

1. **Planned story in a spec folder** — matches `{story_title}` against `stories.yaml` entries produced by `bmad-spec`'s Story Breakdown, then reads the authored `stories/<id>-*.md` spec plus `SPEC.md` and its `companions:`.
2. **Planned story in the epics artifact** — matches against the story headings in the epics artifact resolved by the doc-path cascade.
3. **Ad hoc intent via `bmad-spec`** — when the story is not planned anywhere, the composer invokes `bmad-spec` **headlessly** on the user's title and scope notes and reads back the resulting `SPEC.md`, companions and `.memlog.md`. The user is never asked to run a planning workflow by hand first; the skill's existing inputs stay sufficient.

Ambiguity is never resolved silently: when several planned stories match, the candidates are listed and the user chooses. When no source yields a story and `bmad-spec` reports `insufficient_intent`, the workflow stops with an actionable message rather than inventing a task.

When `{epic_id}` is non-empty, epic context is fetched from ClickUp and used as primary scope context. When `{epic_id}` is `''` (no-epic path), `getTaskById` is skipped and the composed description contains no "Epic:" or "Parent epic:" field.

**Description contract** — whatever the source, the composed document carries the same sections it always has: user story, BDD acceptance criteria, ordered tasks/subtasks, dependencies, and dev notes with:

- **Specific file paths** — exact source files, modules, or directories to create or modify.
- **Implementation approach** — a concise exit solution explaining what to change, where to add vs. update, and the expected code structure.
- **Architecture guardrails** — relevant patterns and constraints cited with file references.
- **Previous-story intelligence** — references to established patterns or recently modified files for continuity.

**QA — two audiences, two sections:**

- `## QA / Testing Notes` — aimed at the **AI QA agent that has code access**. BDD test scenarios, code-level edge cases, regression risks citing files/modules, test data/setup, and suggested test coverage (unit / integration / e2e) with target test-file locations.
- `## Human QA Notes` — aimed at the **human QA tester who does NOT have code access**. Human QA tests the deployed ticket on the staging/dev environment _after_ the developer deploys. Section is black-box only (UI / API steps, expected visible outcomes, environment URL + accounts + flags, cross-browser/device/role checks, manual regression click-through) and explicitly states the deployment prerequisite.

A contract guardrail checks the composed content and repairs anything missing: either or both QA sections, a `## Dependencies` section, and an `## Implementation Notes` fallback if the document lacks concrete file paths or an exit solution.

See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)

Step 4 MUST complete with a non-empty `{task_description}` before the workflow proceeds to step 5.

## Task Creation

Validates all required context from steps 01–04, calls `searchTasks` to check for duplicate task names in the target sprint list, presents a pre-creation summary for user confirmation, then calls `createTask`. When `{epic_id}` is non-empty, the call includes `parent_task_id: {epic_id}`; when `{epic_id}` is `''` (no-epic path), `parent_task_id` is omitted entirely. The pre-creation summary shows `*(none — standalone task)*` (rendered as italic) as the parent-epic line when `{epic_id}` is empty, so the user can confirm intent before the API call. The created task's `{created_task_id}` and `{created_task_url}` are stored on success.

See: [./steps/step-05-create-task.md](./steps/step-05-create-task.md)

Step 5 is the terminal step of the skill. If `createTask` returns an error, the step surfaces it and stops — it does not retry silently.
