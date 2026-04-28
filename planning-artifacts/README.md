# planning-artifacts/ — self-hosting bootstrap

This directory is a **bootstrap**, not the target shape of the system.

## Contents

- `PRD.md` — product requirements for the BMAD-ClickUp integration
- `epics/` — 5 epics scoping the work (→ ClickUp once EPIC-1 lands)
- `stories/` — drafted stories under active epics (→ ClickUp once EPIC-2 lands)
- `sprint-status.yaml` — file-based story/epic status tracker (→ archived)
- `deferred-work.md` — known gaps carried forward

## Why this repo has its own `epics/` and `stories/`

The hosted `bmad-mcp-server` exposes ClickUp as the single source of truth for work tracking (PRD §Goal). But we're building that integration _here_, in this repo — so until EPIC-1 (ClickUp tools) + EPIC-2 (Dev agent story creation → ClickUp) + EPIC-3 (Dev agent implementation → ClickUp) land and the EPIC-5 pilot confirms the end-to-end flow, we track our own work the old way. This is dogfood, not the prescribed model.

## What target projects look like

Per PRD §Repo layout, consumers of the hosted server have only:

```
planning-artifacts/
├── PRD.md
├── architecture.md
├── ux-design.md   (if UX in scope)
└── tech-spec.md   (if needed)
```

No `epics/`, no `stories/`, no `sprint-status.yaml` — those live in ClickUp. Consumers point their MCP client at the hosted server with `CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` env vars (see PRD §Env vars) and invoke the Dev agent in story-creation or implementation mode.

## Archive trigger

Once EPIC-5's pilot retro records a go decision, `epics/`, `stories/`, and `sprint-status.yaml` here are archived (git history retains them). `PRD.md` stays as the product spec of record.
