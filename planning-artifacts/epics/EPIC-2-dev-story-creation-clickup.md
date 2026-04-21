# EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** BMAD removed the SM agent; story creation (`CS` trigger) and sprint planning (`SP` trigger) now live on the Dev agent (Amelia). This epic covers wiring the `CS` trigger's skill to ClickUp. Implementation mode (the other Dev-agent flow) is covered by EPIC-3. Same agent, distinct skills, distinct prereqs.

## Goal

Dev agent, invoked in story-creation mode (`CS` trigger), produces ClickUp tasks instead of story files, without modifying upstream BMAD source.

## Outcomes

- New custom skill `src/custom-skills/clickup-create-story/` (mirrors shape of the upstream story-creation skill — verify exact upstream skill name against current BMAD-METHOD source during implementation, since the previous `bmad-create-story` name assumed the now-removed SM agent).
- `config.toml` routes the Dev agent's `CS` invocation to the new skill.
- Prereq check: refuses without `planning-artifacts/PRD.md` + `architecture.md` in the target project.
- Interactive pickers for: epic (lists Backlog tasks), sprint list (flags active sprint).
- Story created as subtask of selected epic (`parent = epic ID`), in active sprint list, with rich description composed from PRD + architecture + epic context.
- Upstream story-creation skill remains untouched and still works for file-based mode.

## Stories (to become ClickUp subtasks under this epic)

- Verify the exact upstream skill name behind Dev's `CS` trigger in current BMAD-METHOD source
- Scaffold `src/custom-skills/clickup-create-story/` skill directory structure (`SKILL.md`, `workflow.md`, steps/)
- Implement prereq-file check (PRD.md + architecture.md)
- Implement epic picker: list tasks in Backlog list, present, parse selection
- Implement sprint-list picker: list sprint lists in sprint folder, flag active by date range, present, parse
- Implement story description composer (pulls from PRD + architecture + epic task description)
- Create ClickUp task via vendored tool with `parent` + target list
- Wire `config.toml` override to route the Dev agent's `CS` trigger to the new skill
- Verify upstream story-creation skill still works in isolation (regression check)
- Gate invocation to users whose ClickUp token has create-task permission on the space (natural gating via token)

## Dependencies

- EPIC-1 (needs ClickUp tools + env wiring).

## Exit criteria

- Dev agent in story-creation mode creates a ClickUp subtask with a rich description end-to-end.
- Upstream story-creation skill unchanged.
- No BMAD-METHOD source files edited.
