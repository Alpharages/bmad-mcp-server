# EPIC-9: README freshness pass

> **Note:** Bootstrap file. Will migrate to ClickUp once EPIC-1 completes.
>
> **Context:** The top-level `README.md` is the primary onboarding surface for users adopting `bmad-mcp-server`. It already covers install, walkthrough, ClickUp integration, custom skills, self-hosting, and configuration (910 lines). However, it currently bakes in the assumption that planning artifacts live in `planning-artifacts/`, lists only the four existing custom skills, and predates the work landing in EPIC-6/7/8. As those epics ship, the README will silently drift unless updates are scheduled alongside them. This epic is the explicit slot for that documentation refresh, plus a focused audit of stale or missing information that already exists today.

## Goal

Bring `README.md` up to date so that a new user landing on the repo for the first time can — without reading the planning artifacts — understand: (a) what skills exist, (b) where to put planning artifacts (including the new cascade), (c) every config knob, and (d) how to file bugs vs stories vs no-epic tasks.

## Outcomes

- New `README.md` section (or expanded existing one) documenting the doc-path cascade landed in EPIC-6: the 3-layer order, the `[docs]` table schema, and one worked example for a non-default project layout.
- `Custom Skills` section updated with any skill added by EPIC-7 (bug flow) and a no-epic note on `clickup-create-story` from EPIC-8.
- `Configuration reference` table expanded with the new keys (`[docs].prd_path`, `[docs].architecture_path`, `[docs].epics_path`, `[docs].planning_dir`, `[clickup_create_story].allow_no_epic`, plus any `[clickup_create_bug]` keys).
- Walkthrough steps that hardcode `planning-artifacts/` (steps 4, 8, 9, 10) reviewed and either updated or annotated to point at the cascade.
- One-pass audit of the existing README for staleness: agent count, workflow count, env-var list against `CLAUDE.md`, and any broken or moved links.
- New "Common patterns" or FAQ-style section (3–5 entries) covering: "my docs aren't in `planning-artifacts/`", "I want to file a bug", "this work doesn't fit under any epic", "I need to share credentials per-team via HTTP", "how do I pin space/list IDs to skip pickers".

## Stories (to become ClickUp subtasks under this epic)

- Audit current README for staleness (agent/workflow counts, env-var coverage vs `CLAUDE.md`, broken anchors, dead links). Output: a punch list committed to the epic before edits start.
- Document the doc-path cascade introduced in EPIC-6 (3 layers, per-key fallback, worked example). Lands after EPIC-6 stories 6-3 and 6-8.
- Update the `Custom Skills` section with the bug-creation skill from EPIC-7 once its shape is decided (story 7-1). Lands after EPIC-7 ships.
- Add a no-epic note to the `clickup-create-story` skill description and walkthrough step 10. Lands with or after EPIC-8.
- Expand the `Configuration reference` table with all new `.bmadmcp/config.toml` keys introduced by EPIC-6/7/8.
- Reword walkthrough steps 4, 8, 9, 10 to avoid hardcoding `planning-artifacts/` where it would now mislead users with custom layouts.
- Add a short "Common patterns" / FAQ subsection with the entries listed in Outcomes.
- Verify all internal anchor links still resolve after section additions/renames; update the top-of-file nav row.
- Verify all external links (`Alpharages/BMAD-METHOD`, npm badge, MCP docs, `claude_desktop_config.json` example path) are still live and correct.
- Cross-check `docs/architecture.md`, `docs/clickup-quickstart.md`, `docs/development-guide.md`, `docs/api-contracts.md`, and `docs/index.md` for the same drift; update or note as out-of-scope.

## Dependencies

- **EPIC-6** — cascade documentation cannot land until the resolver and config schema exist.
- **EPIC-7** — bug-skill section cannot land until the skill shape is decided.
- **EPIC-8** — no-epic note cannot land until the option is implemented.
- This epic can be partially executed independently: the staleness audit + walkthrough rewording + link verification + FAQ scaffolding do not block on EPIC-6/7/8 and can land first.

## Exit criteria

- A new user following the README end-to-end can complete the walkthrough on a project whose docs do **not** live in `planning-artifacts/` by setting `[docs].prd_path` and `[docs].architecture_path`.
- A new user can find, in the README, a one-paragraph answer to: "how do I create a bug ticket?" and "how do I create a task that isn't part of any epic?".
- Every `.bmadmcp/config.toml` key referenced anywhere in the codebase appears in the `Configuration reference` table.
- No anchor link or internal cross-reference in the README is broken.
- Agent count, workflow count, and env-var list match the current state of `src/` and `CLAUDE.md`.

## Open questions / decisions to resolve before coding

- Single-shot rewrite vs incremental updates riding alongside each upstream epic. Plan favours incremental: ride EPIC-6/7/8 with their respective README updates, plus one standalone PR for the staleness audit and FAQ scaffolding.
- Whether to split the README into multiple files (e.g., move ClickUp content to `docs/clickup-quickstart.md` since it already exists). Defer unless the audit shows redundancy is severe.
- Whether the `docs/` directory needs the same cascade documentation as the README, or just a pointer back to the README.
- Whether to add a screenshot / asciinema recording of the walkthrough. Probably defer — nice-to-have, not blocking.
