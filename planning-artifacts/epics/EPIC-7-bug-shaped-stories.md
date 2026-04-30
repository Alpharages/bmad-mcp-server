# EPIC-7: Bug-shaped stories in ClickUp

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** `clickup-create-story` is feature-story-shaped: it forces PRD + architecture, requires an epic parent, and delegates description composition to `bmad-create-story` (BDD acceptance criteria, architecture guardrails, web research on latest tech). When a user pastes a bug report and asks for a ClickUp task, the current skill either aborts on prereqs or fabricates a feature-shaped description that doesn't fit a bug. This epic adds first-class bug support without bending the feature flow.

## Goal

Allow users to create ClickUp bug tickets through the Dev-agent skill surface with a bug-shaped description (repro / expected / actual / impact / suspected area), without requiring PRD or architecture, and without forcing an epic parent.

## Outcomes

- Bug intent is detected explicitly — either a new sibling skill `src/custom-skills/clickup-create-bug/` or a `kind: bug` parameter routed by `clickup-create-story`. Decision lands in story 7-1.
- Bug-shaped description template replaces the `bmad-create-story` invocation when intent is bug. Sections: Summary, Steps to reproduce, Expected behaviour, Actual behaviour, Impact / severity, Suspected area, Environment, Related links.
- PRD + architecture become optional for bug intent (skill warns if missing but does not abort). The cascade from EPIC-6 is reused so any present artifacts can still inform the description.
- Epic parent becomes optional (depends on EPIC-8 landing first).
- Sensible ClickUp defaults for bugs: `bug` tag, priority defaulting to `high` for severity ≥ medium, status `backlog` (or list-default).
- Title coercion: bug titles are derived from a one-line summary if the user pastes a long report.
- Duplicate-task search still runs (reuses step-05 logic from `clickup-create-story`).

## Stories (to become ClickUp subtasks under this epic)

- Decide skill shape: new `clickup-create-bug` skill vs `kind` parameter on `clickup-create-story`. Document trade-offs (route stability, prompt complexity, upstream-merge surface) and pick one.
- Scaffold the chosen skill shape (directory, `SKILL.md`, `workflow.md`, steps/) and add a Dev-agent trigger that surfaces it.
- Implement bug-intent prereq check (PRD/architecture optional, ClickUp permission gate identical to story flow). Reuses EPIC-6 resolver.
- Implement bug-shaped description composer: parse user's free-form bug report into the templated sections. No `bmad-create-story` delegation, no fabrication, no architecture guardrails.
- Implement bug-list / sprint-list picker: should bugs go to the active sprint, a separate bugs list, or wherever the user picks? Pin via `.bmadmcp/config.toml` `[clickup_create_bug]` table.
- Wire `tags`, `priority`, and severity inference into `createTask`.
- Make epic parent optional (depends on EPIC-8) — bugs can be created with or without `parent_task_id`.
- Regression check: confirm `clickup-create-story` feature flow is unchanged.
- Add fixtures and tests covering: paste-a-bug-report, missing PRD, missing architecture, no epic, severity inference.
- Documentation: pilot quickstart entry for "report a bug to ClickUp", error-block wording for partially-loaded artifacts.

## Dependencies

- **EPIC-8 (no-epic stories)** — bugs frequently don't belong to an epic, so the optional-parent capability must land first or co-land.
- **EPIC-6 (configurable doc-path resolution)** — soft dependency. Bugs work without it, but bug intent benefits from soft-loading PRD/architecture when paths are non-default.

## Exit criteria

- A user can paste a bug report and end with a ClickUp task whose description matches the bug template, in the configured bugs/sprint list, with `bug` tag and priority set.
- Bug creation succeeds with no PRD, no architecture, and no epic parent.
- Feature `clickup-create-story` flow remains identical (regression test).
- `.bmadmcp/config.toml` schema documents the bug-related keys (target list, default priority, default tags).

## Open questions / decisions to resolve before coding

- Skill shape: new skill vs `kind` parameter (story 7-1 resolves this).
- Severity-to-priority mapping table.
- Whether bugs default to the active sprint list or a dedicated bugs list.
- Should bug descriptions support attachments (screenshots, logs)? ClickUp `createTask` does not accept attachments; capture the question and defer if unsupported.
