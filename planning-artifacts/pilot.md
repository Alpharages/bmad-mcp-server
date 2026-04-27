# Pilot Decision Record

This file records the EPIC-5 pilot selection for the bmad-mcp-server project: which project the pilot runs on, which epic is piloted, and the ClickUp coordinates where work is tracked. It is the single source of truth consumed by stories 5-2 through 5-9 (planning-artifact seeding, ClickUp epic creation, Dev-agent story creation and implementation, friction log, refinements, quickstart docs, and go/no-go retro). Every field below is a concrete value — no placeholders — because downstream stories read these values verbatim.

## Pilot project

- **Name:** Lore Platform
- **Repository:** https://github.com/Alpharages/lore.git
- **Default branch:** main
- **Primary language / stack:** TypeScript / Node.js 18+ / PostgreSQL + pgvector / Docker / MCP
- **Active maintainers:** Khakan Ali (email: khakan.ali@alpharages.com)

## Pilot epic

- **Epic name:** lore-memory-mcp: DB schema, Docker, basic MCP tools
- **Epic goal:** Stand up the `lore-memory-mcp` server with a Postgres + pgvector schema, a Docker compose for local dev, and the minimal MCP tool surface (save-lesson, query-lessons) so the remainder of the Lore Platform build-order has a working memory backend to target.
- **Estimated story count:** ≥3
- **Estimated duration:** 2 weeks (aligned to Sprint 1 window 2026-04-27 → 2026-05-10)

## ClickUp coordinates

- **Workspace (team) ID:** 9018612026
- **Space name:** Team Space
- **Backlog list name:** Backlog (path: `Team Space > Lore > Backlog`)
- **Sprint folder name:** sprint-1 (active list: `Sprint 1 (4/27 - 5/10)`)
- **Pilot epic task ID:** 86excfrge
- **Pilot epic task URL:** https://app.clickup.com/t/86excfrge

`CLICKUP_API_KEY` is intentionally not recorded in this file — it is a per-user personal token per PRD §"Non-functional requirements" (Auth bullet). `CLICKUP_TEAM_ID` (recorded above) is team-shared and safe to version.

## Selection rationale

### Small scope

The pilot epic is scoped to a single component of the Lore Platform (`lore-memory-mcp`) with a bounded deliverable: a Postgres + pgvector schema, a Docker compose for local dev, and two MCP tools (`save-lesson`, `query-lessons`). Estimated at ≥3 stories over the 2-week Sprint 1 window (2026-04-27 → 2026-05-10), which matches EPIC-5's "at least 3 stories in one epic" outcome and sits inside the "≤~6 stories / ≤~2 weeks" guardrail in this story's Dev Notes.

### Low risk

The `Alpharages/lore` repository has zero commits pushed to `main` and no production users — a botched pilot affects no customer-facing surface area, and a full revert is deletion of the untracked working tree plus a force-push rollback. The pilot epic targets an isolated component (`lore-memory-mcp`); because no other Lore Platform components exist yet, a failure cannot cascade into any running system.

### Active

Pilot window is defined as 2026-04-27 → 2026-05-10, backed by the ClickUp active-sprint list `Sprint 1 (4/27 - 5/10)` created on 2026-04-24 inside `Team Space > sprint-1`. Team lead Khakan Ali (also the bmad-mcp-server maintainer) has committed to drive the pilot during this window, and the `lore` repo kickoff (first commits + first epic + first stories) is itself the pilot's work. Framing: "Active" evidence is prospective availability plus a dated sprint list rather than historical commit activity, since the project is pre-first-commit.

## Known risks

- **Risk:** The `lore` repo has zero commits, so the "Active" signal is prospective (team-lead availability + sprint dates) rather than historical; friction during the pilot may be indistinguishable from ordinary project-kickoff friction. **Mitigation:** Team lead posts weekly async check-ins into the friction log (story 5-6); the 2-week Sprint 1 window gives a hard retro deadline (story 5-9) so staleness cannot masquerade as absence of pilot signal.
- **Risk:** The `lore` repo's `origin` remote URL currently embeds a GitHub Personal Access Token, exposing the token to anyone with local-clone access. Any pilot artifact referencing the repo must use the clean URL, and the leaked token must be rotated. **Mitigation:** Rotate the PAT and rewrite `origin` to `https://github.com/Alpharages/lore.git` (HTTPS) or `git@github.com:Alpharages/lore.git` (SSH) before story 5-3 runs; audit any scripts or CI that consumed the old URL.
- **Risk:** PRD §"Risks / assumptions" R1 — the ClickUp cross-list-subtask quirk may surface in story 5-4 when pilot stories are created as subtasks of the pilot epic (living in the `Backlog` list) while executing under the active sprint list (`Sprint 1 (4/27 - 5/10)` inside `sprint-1` folder). **Mitigation:** Accept the quirk as an expected friction-log entry for story 5-6; do not patch mid-pilot. Story 5-7 evaluates whether a refinement to `clickup-create-story` is warranted.

## Decision

- **Decider(s):** Khakan Ali (bmad-mcp-server maintainer; Lore Platform team lead — dual role)
- **Decision date:** 2026-04-24
- **Status:** in-progress

## Change log

| Date       | Status      | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-24 | approved    | Initial pilot selection recorded via story 5-1. Lore Platform chosen; Sprint 1 window 2026-04-27 → 2026-05-10.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-25 | in-progress | ClickUp pilot epic created via story 5-3: https://app.clickup.com/t/86excfrge (`86excfrge`). Status advances to `in-progress` per story 5-1 AC #8. §ClickUp coordinates space name corrected `AlphaRages` → `Team Space` to match actual workspace layout; §Selection rationale > Active path fragment corrected accordingly (Option-A freshness fix per Task 0, relaxes AC #14 by one §Selection rationale hunk). Stories 5-4 / 5-5 can now run against a real Backlog epic.                                                                                              |
| 2026-04-27 | in-progress | §Pilot epic + §Selection rationale > Small scope: renamed `store-lesson` → `save-lesson` to align with the actual ClickUp subtask `86exd8yh3` (`Implement save-lesson MCP tool`) and the pilot-repo PRD/tech-spec canonical name `save_lesson`. Per `store-lesson-vs-save-lesson-name-mismatch` in `planning-artifacts/friction-log.md`; story 5-7 amendment. ClickUp epic `86excfrge` body amendment is queued for human-only follow-up (out-of-scope for story 5-7 per AC #8 carve-out). §Decision Status remains `in-progress` (next transition is story 5-9 go/no-go). |
