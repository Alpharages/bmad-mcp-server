# EPIC-8: No-epic stories (standalone tasks)

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** `clickup-create-story` always creates the new task as a subtask of a chosen epic (`parent_task_id: {epic_id}` in step-05). Real teams have legitimate work that doesn't belong under an epic: research spikes, ad-hoc ops tasks, one-off documentation, hotfixes. The current skill blocks at the epic picker if no relevant epic exists or forces users to attach work to an unrelated epic. This epic adds an explicit "no epic" path.

## Goal

Allow `clickup-create-story` (and any successor skills built on its scaffolding, including `clickup-create-bug` from EPIC-7) to create top-level ClickUp tasks with no parent, while preserving the epic-parented flow as the default.

## Outcomes

- Epic picker (step-02) gains a "create without an epic" option presented alongside the discovered epics. Selecting it sets `{epic_id}` to a sentinel (e.g., `null` / empty string) and skips epic-context fetching.
- Step-05 (`createTask`) calls the API without `parent_task_id` when the sentinel is set. The ClickUp tool already treats `parent_task_id` as optional — verify and surface in tests.
- Description composer (step-04) handles the no-epic case: epic context is empty, `bmad-create-story` is invoked without a pre-supplied epic block, and the resulting story document does not reference a parent epic.
- Pre-creation summary in step-05 displays "no parent epic" instead of an empty/blank parent line so users can confirm intent.
- `.bmadmcp/config.toml` gains an optional flag (e.g., `[clickup_create_story].allow_no_epic = true`) — default `true`. Teams that always require epics can set it `false` to hide the no-epic option.
- Duplicate-task search still runs against the target sprint list.

## Stories (to become ClickUp subtasks under this epic)

- Update epic picker (`step-02-epic-picker.md`) to present "no epic" alongside epic choices; capture the selection in step context as `{epic_id} = null` and `{epic_name} = "(no epic)"`.
- Update description composer (`step-04-description-composer.md`) to skip the `getTaskById` epic fetch and the epic-description pre-supply when `{epic_id}` is null. Pass an empty epic block to `bmad-create-story` and document the override.
- Update task creation (`step-05-create-task.md`) to omit `parent_task_id` from the `createTask` payload when `{epic_id}` is null. Update the pre-creation summary template.
- Add `[clickup_create_story].allow_no_epic` to the config schema and `.bmadmcp/config.example.toml`. Honour it in step-02.
- Sprint-list picker (`step-03`) is unaffected — confirm via test.
- Add unit + integration tests: no-epic happy path, `allow_no_epic = false` blocks the option, mixed flow (some users pick epics, some go no-epic), confirmation summary text.
- Update `clickup-create-story/SKILL.md` and `workflow.md` to describe the no-epic option.
- Pilot quickstart: add a one-line note that "no epic" is available, with example use cases (ops tasks, spikes).

## Dependencies

- None directly. Lands cleanly without EPIC-6 or EPIC-7.
- **Unblocks EPIC-7** — bug-shaped stories rely on this epic's optional-parent change.

## Exit criteria

- A user can run `clickup-create-story`, choose "no epic", confirm the description, and end with a ClickUp task in the active sprint list with no parent.
- Existing epic-parented flow remains identical (regression test): selecting an epic still creates a subtask under that epic.
- Setting `[clickup_create_story].allow_no_epic = false` in `.bmadmcp/config.toml` hides the no-epic option from the picker.
- `bmad-create-story` content composition still works without epic context (no fabrication, no broken prompt template).

## Open questions / decisions to resolve before coding

- Sentinel for "no epic": `null`, empty string, or a literal `__NONE__` string in the picker output? Pick one and document.
- Should `allow_no_epic` default `true` (encouraging the option) or `false` (preserving strictness)? Plan favours `true`; product owner to confirm.
- When epic context is missing, should `bmad-create-story` web research / architecture analysis still run, or should the composer simplify? (Default: still runs; the only change is the empty epic block.)
- Should there be a UX hint in the picker explaining when "no epic" is appropriate (research spikes, ops, hotfixes)?
