# EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** BMAD removed the SM agent; the Dev agent (Amelia) now owns both story creation (`CS` trigger) and sprint planning (`SP` trigger). This epic covers the _implementation_ flow (task-ID-driven fetch → implement → comment → status). Story-creation mode is covered by EPIC-2. Same agent, distinct skills, distinct prereqs.

## Goal

Dev agent, invoked in implementation mode, accepts a ClickUp task ID and executes the full implement → comment → status loop.

## Outcomes

- New custom skill `src/custom-skills/clickup-dev-implement/` as the dev agent's ClickUp-mode entry point.
- Accepts a ClickUp task ID (+ optional steering notes from the dev).
- Fetches task description, comments, status, and parent epic (for additional context).
- Reads repo `planning-artifacts/*` via IDE file tools (no BMAD install needed).
- Implements code in repo using the IDE's file/edit tools.
- Posts progress/decision comments at milestones; transitions status (in progress → in review → done).
- Handles non-blocking ambiguity by making assumptions explicit in a comment — asks the _dev_, not the PM, when blocked.
- Upstream dev workflow untouched.

## Stories (to become ClickUp subtasks under this epic)

- Scaffold `src/custom-skills/clickup-dev-implement/` skill directory structure
- Implement task-ID parser (accept raw ID, URL, or prefixed form like `CU-1234`)
- Implement task fetch including parent-epic context
- Implement planning-artifact reader (loads PRD + architecture + tech-spec if present)
- Implement progress-comment poster (append-only, markdown-formatted)
- Implement status-transition helper (validates target status against list's allowed statuses)
- Implement non-blocking-assumption comment pattern
- Define dev-facing clarification prompt (asks the dev, never the PM)
- Wire `config.toml` override to route Dev agent's implementation-mode invocation to the new skill when ClickUp mode is configured

## Dependencies

- EPIC-1 (needs ClickUp tools).
- Independent of EPIC-2 — dev agent can run against any ClickUp task (including human-created ones).

## Exit criteria

- Dev agent completes a real story end-to-end: fetches, implements, comments progress, transitions status.
- Upstream dev workflow unchanged.
- No BMAD-METHOD source files edited.
