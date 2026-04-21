# PRD: BMAD-ClickUp Integration

## Problem

BMAD-METHOD's current "agile-in-the-repo" model stores stories, sprints, and status as markdown files in the project. This works for solo devs but is invisible to teams that already run their work in ClickUp. Two sources of truth emerge, drift immediately, and the team stops trusting both.

## Goal

Let the team run the full BMAD agent flow (PM → Architect → Dev) while keeping **ClickUp as the single source of truth for stories, sprints, epics, and status**, with zero BMAD installation in each project.

## Non-goals

- Syncing BMAD files _into_ ClickUp (no bidirectional sync — ClickUp is authoritative for work-tracking).
- Migrating historical stories/sprints out of past projects.
- Building custom ClickUp fields or views in this phase.
- Replacing ClickUp as the PM tool.
- Supporting tools other than ClickUp in this phase (Jira, Linear, etc. — out of scope).

## Stakeholders

- **Team lead / PM** — creates epics in ClickUp, reviews Dev-drafted stories, gates story creation.
- **Developers** — consume ClickUp stories, implement, comment progress back.
- **Platform (internal)** — maintains `bmad-mcp-server`.

## Functional requirements

1. `bmad-mcp-server` exposes ClickUp tools (task CRUD, comments, status, list/folder/space navigation) alongside BMAD agent/workflow tools, as one MCP server.
2. Dev agent, invoked in story-creation mode (`CS` trigger), creates ClickUp tasks with rich, PRD+architecture-derived descriptions. Refuses if `planning-artifacts/PRD.md` + `architecture.md` are missing.
3. Dev agent (story-creation mode) uses interactive pickers (not raw IDs) to let the user choose epic, sprint list, and space.
4. Stories are created as **subtasks of the epic task** (`parent = epic ID`), landing in the active Sprint list.
5. Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status.
6. Humans own ticket _description_; agents write only via _comments_ and _status_.
7. No BMAD-METHOD source files are modified. All customizations live in a separate `custom-skills/` layer wired via `config.toml`.

## Non-functional requirements

- **Auth:** per-user ClickUp token via `CLICKUP_API_KEY` env var; team-shared `CLICKUP_TEAM_ID`. Space asked interactively per session.
- **Upstream independence:** BMAD-METHOD and vendored ClickUp MCP can be updated without touching our custom code.
- **License compliance:** MIT LICENSE files from vendored `hauptsacheNet/clickup-mcp` preserved; upstream SHA tracked in `VENDOR.md`.
- **Idempotency:** Dev agent (story-creation mode) does not create duplicate stories; Dev agent (implementation mode) progress comments are additive, not destructive.

## Success criteria

- End-to-end: PM writes PRD → team lead creates epic in ClickUp → team lead invokes Dev agent in story-creation mode (`CS`) → rich story appears in ClickUp → dev invokes Dev agent in implementation mode with "work on CU-X" → code lands with a PR linked back in a ClickUp comment and status set to In Review. Zero story/sprint files created in the repo during this flow.
- `git pull` on BMAD-METHOD upstream merges cleanly.
- One pilot project completes one epic end-to-end without falling back to file-based stories.

## Repo layout (zero BMAD install)

```
<project-root>/
├── planning-artifacts/
│   ├── PRD.md
│   ├── architecture.md
│   ├── ux-design.md      (if UX in scope)
│   └── tech-spec.md      (if needed)
├── docs/                 (team reference)
└── (no implementation-artifacts/, no epics/, no stories/)
```

## ClickUp layout

- **Backlog list** per space → humans create **epics** here as tasks.
- **Sprint folder** → ClickUp's native Sprints feature, lists per sprint.
- **Stories** → subtasks of an epic (parent = epic task), living in the active Sprint list.
- **Write channels:** humans own _description_; agents write only via _comments_ and _status_.

## Architecture

- **Hosted `bmad-mcp-server`** = BMAD runtime + vendored ClickUp tools (one MCP server).
- **IDE (local)** = LLM + file access to the repo.
- **ClickUp** = single source of truth for epics, stories, sprints, status.

## Customization boundary

- BMAD-METHOD is upstream, read-only to us. Pull updates, never edit.
- All customizations live in `bmad-mcp-server/src/custom-skills/` and are wired via BMAD's `config.toml` override system.
- If a hard-coded BMAD hook blocks override, preference is an upstream PR over a long-lived fork.

## Risks / assumptions

- **R1:** ClickUp may not support cross-list subtasks (story in sprint list, parent in backlog list) without quirks. _Mitigation:_ Phase 1 smoke test gates Phase 2.
- **R2:** BMAD may have hard-coded calls that bypass `config.toml` override. _Mitigation:_ upstream PR rather than fork.
- **R3:** `hauptsacheNet/clickup-mcp` lacks explicit Sprint tooling. _Mitigation:_ sprint navigation handled by the Dev agent's story-creation skill on top of list/folder tools.
- **A1:** Team lead will consistently create epics in the Backlog list (naming/location discipline is a human process, not enforced).

## Env vars

```
CLICKUP_API_KEY    # per-user personal token (required)
CLICKUP_TEAM_ID    # workspace ID, team-shared (required)
```

Space, sprint folder, and backlog list are discovered at runtime via interactive pickers.

## Out of scope (this phase)

- Jira / Linear / Asana integrations
- Custom ClickUp fields or automations
- Bidirectional sync
- Migration of historical file-based stories
- Granular per-agent permissions beyond ClickUp token scopes
