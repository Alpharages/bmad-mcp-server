# Story 5.8: Write team-facing "how to use BMAD+ClickUp" quickstart docs

Status: done

Epic: [EPIC-5: Pilot + iterate](../epics/EPIC-5-pilot-iterate.md)

> Eighth story in EPIC-5. This is the **docs-only** half of [EPIC-5 §Outcomes bullet 6](../epics/EPIC-5-pilot-iterate.md) ("Team-facing workflow documented (how to invoke Dev in story-creation mode, how to invoke Dev in implementation mode, what goes where)") and the landing point for the two `story-5-8-doc-only` entries from [`planning-artifacts/friction-log.md`](../friction-log.md) §Owner queue (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`). The work lands entirely in **markdown** in this repo: a new `docs/clickup-quickstart.md` quickstart file plus a one-line cross-link in `README.md` §Documentation plus the `sprint-status.yaml` transition. No TypeScript, no `src/custom-skills/` changes, no `_bmad/` changes, no `BMAD-METHOD/` changes, no edits to `planning-artifacts/PRD.md` / `planning-artifacts/pilot.md` / `planning-artifacts/friction-log.md` / `planning-artifacts/deferred-work.md` / `planning-artifacts/epics/`, no writes to the pilot repo (`Alpharages/lore`), no writes to ClickUp.
>
> **Why this story exists post-5-7 (docs after refinement).** The skill / config / spec refinements landed by [story 5-7](./5-7-refine-prompts-and-templates.md) shifted the contract a team-lead-in-session must follow when invoking either skill — most visibly the new `.bmad-pilot-marker` cwd-assertion at `step-01-prereq-check.md` instruction 0 (clickup-create-story) and `step-01-task-id-parser.md` instruction 0a (clickup-dev-implement), the post-5-7 documented-not-fixed Claude-Code-CLI trigger-dispatch behaviour in [`_bmad/custom/bmad-agent-dev.toml`](../../_bmad/custom/bmad-agent-dev.toml), the new `[clickup_create_story]` pinned-ID config knobs (`pinned_backlog_list_id`, `pinned_sprint_folder_id`), the broadened `step-05-status-transition.md` review-status match set, and the new `**Pull Request:** {pr_url}` field on Template B. None of these refinements help a new team-lead unless the quickstart enumerates them in operator terms. Story 5-8 closes that gap by documenting the post-5-7 state (not the byte-frozen pilot state) in a single team-facing entry point.
>
> **Why this story is markdown-only on the bmad-mcp-server side.** Per [PRD §Repo layout](../PRD.md), the team-facing docs are a planning / docs concern, not implementation. The skills and config remain byte-frozen at their post-5-7 states throughout this story — AC #11 / #12 / #13 / #14 enforce this. The friction log itself is also byte-frozen post-5-6 per [story 5-6 §Out of Scope](./5-6-capture-friction-log.md) ("Capturing friction observed AFTER this story's commit"); this story reads the log to surface the two `story-5-8-doc-only` entries plus relevant cross-cutting themes, but does NOT amend any H3 entry, severity field, or owner-bucket assignment.
>
> **Why a new `docs/clickup-quickstart.md` rather than expanding `README.md` or `src/custom-skills/README.md`.** The repo's `README.md` is a project-overview / installation document optimised for the **operator-of-the-server** audience (someone configuring the MCP server itself in their AI client). The team-facing quickstart serves a different audience: the **team-lead-in-session** who is invoking the Dev agent against a pilot project's ClickUp epic. Folding both audiences into one README would dilute both. `src/custom-skills/README.md` is currently a 5-line stub explaining the customization-boundary contract; expanding it into a full quickstart would couple the customization contract (a contributor concern) with the operator workflow (a team-lead concern). A dedicated `docs/clickup-quickstart.md` cleanly separates the audiences while sitting next to the existing `docs/architecture.md` / `docs/api-contracts.md` / `docs/development-guide.md` and the `## Documentation` section in `README.md`.
>
> **Why no second pilot run, no live verification, no skill rewrite, no new tooling.** The quickstart documents the post-5-7 contract by reading the source-of-truth files (skill steps, config, friction log, PRD, pilot.md). It does NOT re-invoke either skill against the pilot epic to verify the documented invocation works (story 5-9's retro will evaluate whether a second pilot run is warranted; this story does not pre-empt that decision). It does NOT add helper scripts, sample `.bmad-pilot-marker` templates committed to the bmad-mcp-server repo (the marker file lives in pilot repos per the [step-01 cwd-assertion contract](../../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md)), or new tests. Per CLAUDE.md §"Don't add features ... beyond what the task requires", the quickstart is text-only.

## Story

As the **bmad-mcp-server platform maintainer**,
I want a single team-facing quickstart document at `docs/clickup-quickstart.md` that enumerates every prerequisite, configuration step, and invocation path a new team-lead-in-session needs to run the Dev agent against a ClickUp-routed pilot epic — covering the two `story-5-8-doc-only` friction-log entries (`gh-auth-prerequisite-undocumented` makes `gh auth status` / `gh auth switch` a documented prereq; `multi-repo-cwd-handling-undocumented` makes the multi-repo Claude Code session shape and the `.bmad-pilot-marker` operator setup explicit) plus the post-5-7 skill / config state (cwd assertion, pinned-ID config knobs, broadened review-status match set, Template B PR field, Claude-Code-CLI trigger-dispatch documented-not-fixed behaviour) plus a "common pitfalls" cross-reference section that links each documented pitfall to its friction-log short-ID, with a one-line cross-link added to `README.md` §Documentation pointing to the new quickstart,
so that [EPIC-5 §Outcomes bullet 6](../epics/EPIC-5-pilot-iterate.md) is fully satisfied (team-facing workflow documented end-to-end), the two `story-5-8-doc-only` friction-log entries land their resolutions in the quickstart's §Prerequisites and §Multi-repo Claude Code sessions sections, story 5-9's retro can evaluate "did the friction log translate into a usable team-facing artifact" with a concrete document to grade against, and any team that picks up the post-pilot rollout (whether the same team running a second pilot or a new team adopting the flow) has a single linkable URL to start from rather than re-deriving the prereqs and invocation paths from the skill source files.

## Acceptance Criteria

### Quickstart file contract

1. A new file `docs/clickup-quickstart.md` exists at the repo-root-relative path `docs/clickup-quickstart.md`. The file is new to this story — `git diff --stat -- docs/clickup-quickstart.md` before this story shows it absent. The file lives at the same nesting level as the existing `docs/architecture.md`, `docs/api-contracts.md`, `docs/development-guide.md`, and `docs/index.md`. It is NOT placed under `planning-artifacts/` (which is bootstrap-only per [`planning-artifacts/README.md`](../README.md)) and NOT placed under `src/custom-skills/` (which is a customization-boundary contract, not a team-facing surface).

2. `docs/clickup-quickstart.md` contains, in this order:
   - `# BMAD + ClickUp Team Quickstart` (H1 title — exact text or a semantically-equivalent variant; code reviewers verify the H1 is operator-facing and names the BMAD+ClickUp scope).
   - A two-to-four-sentence intro paragraph immediately under the title stating what this file is, who the audience is (a team-lead-in-session invoking the Dev agent against a ClickUp-routed pilot epic), what reading it gets you to (a successful first invocation of either `clickup-create-story` or `clickup-dev-implement`), and a one-sentence note that the prerequisites and invocation paths reflect the post-EPIC-5 / post-story-5-7 skill state (so a reader who lands here from a future skill rev knows the doc is point-in-time).
   - `## Prerequisites` (H2 — exact text). Per AC #4 below.
   - `## Multi-repo Claude Code sessions` (H2 — exact text). Per AC #5 below.
   - `## Invoke clickup-create-story` (H2 — exact text). Per AC #6 below.
   - `## Invoke clickup-dev-implement` (H2 — exact text). Per AC #7 below.
   - `## Where things live` (H2 — exact text). Per AC #8 below.
   - `## Common pitfalls` (H2 — exact text). Per AC #9 below.
   - `## Change log` (H2 — exact text). One small table mirroring `pilot.md` §Change log: columns Date / Status / Change. Initial row dated `2026-04-28` (or whichever execution date the dev-in-session lands on; reflect the actual date) with status `ready-for-dev` and a one-sentence summary referencing this story.

3. The file MUST be Prettier-clean (`npx prettier --check docs/clickup-quickstart.md` exits 0 against the repo's `.prettierrc` / `.prettierignore`). 80-char line wrapping per the repo convention is required for prose paragraphs; tables and fenced code blocks are exempt and SHOULD be wrapped in `<!-- prettier-ignore-start -->` / `<!-- prettier-ignore-end -->` if any row or block exceeds the print width (the precedent is set by [story 5-4 §Change Log](./5-4-dev-creates-pilot-stories.md) and [story 5-6 friction-log table conventions](./5-6-capture-friction-log.md)).

### Prerequisites section content contract (`## Prerequisites`)

4. The `## Prerequisites` section MUST enumerate every prereq a team-lead must satisfy before invoking either skill. The required minimum (a code reviewer reads this section and the named friction-log entries together; missing a prereq is an AC failure):
   - **Node.js version.** Cite Node.js 22.14.0 per the repo's `.nvmrc` (the `nvm use` / `volta` / `asdf` recommendation is one short bullet — pick one, link to the repo `.nvmrc` file). The Node.js requirement is for the bmad-mcp-server runtime; the pilot repo MAY have its own Node version requirement that is independent.
   - **bmad-mcp-server installed and wired into the AI client.** One short paragraph plus a link back to the main `README.md` §Installation section. Do NOT duplicate the README's install instructions verbatim — the quickstart's contribution is the team-lead-in-session workflow, not the operator-of-the-server installation.
   - **ClickUp credentials wired into the AI client's MCP config.** Enumerate the three required env vars: `CLICKUP_API_KEY` (per-user personal token; starts with `pk_`), `CLICKUP_TEAM_ID` (workspace ID; 7–10 digits), and `CLICKUP_MCP_MODE=write` (required for `createTask` / `addComment` / `updateTask`; the skills emit a clear error and stop if `write` is not active). Cite [`README.md` §Environment Variables](../../README.md) and the `.env.example` file for canonical formats. Do NOT print any actual API key value in the quickstart; the prereq describes the variable, not its value.
   - **ClickUp workspace shape.** Name the three workspace prerequisites the skills assume: (a) a `Backlog` list exists in the chosen space and contains the pilot epic as a root-level task, (b) a sprint folder named or containing `sprint` exists in the same space and has at least one non-archived sprint list, (c) the workspace's "Tasks in Multiple Lists" ClickApp toggle is enabled IF AND ONLY IF the cross-list parent/subtask layout is in use (per [PRD §ClickUp layout](../PRD.md) post-5-7 amendment — both same-list and cross-list shapes are now supported; the toggle is required only for the cross-list shape). Cite the `cross-list-subtask-block` friction-log entry by short-ID for the toggle nuance.
   - **`gh` CLI configured with the right account.** This bullet MUST address the `gh-auth-prerequisite-undocumented` friction-log entry. Required content: (i) state that `gh` CLI must be installed and authenticated against an account with push access to the pilot repo's GitHub org, (ii) provide the verification command `gh auth status` and the switch command `gh auth switch --user <handle>` for multi-account laptops, (iii) cite the `gh-auth-wrong-account` friction-log entry by short-ID as the historical precedent (the human-only workaround that motivated this prereq), (iv) note that the `clickup-dev-implement` skill's `step-01-task-id-parser.md` instruction 0b runs a `git remote -v` PAT-prefix preflight that catches PAT-leaking remote URLs (per the post-5-7 `lore-origin-pat-preflight-gap` refinement) but does NOT verify that `gh auth` is authenticated against the right account — the `gh auth` check is the operator's responsibility.
   - **Pilot repo cloned with `.bmad-pilot-marker` placed at its root.** This bullet MUST address half of `multi-repo-cwd-handling-undocumented` (the operator-side marker setup; the multi-repo session shape is AC #5). Required content: (i) the file path is `<pilot-repo-root>/.bmad-pilot-marker`, (ii) the file is plain text whose first line begins with `bmad-pilot-marker:` followed by any non-empty value (the post-5-7 cwd-assertion contract per [`step-01-prereq-check.md` instruction 0](../../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md) and [`step-01-task-id-parser.md` instruction 0a](../../src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md)), (iii) a minimal example block showing the recommended content (`bmad-pilot-marker: 1` plus the optional `repo:` and `epic:` fields for stronger assertion), (iv) a one-sentence note that the marker file lives in the pilot repo (not in bmad-mcp-server) and SHOULD be committed (a marker file is tiny, audit-friendly, and survives clone / fork / CI), (v) a one-sentence reference to the disclosed-deviation escape hatch (absolute-path `Read` substitution as observed in stories 5-4 / 5-5; documented in both step-01 files) for sessions that genuinely cannot satisfy the cwd contract.
   - **Optional: pilot-specific config knobs in `_bmad/custom/bmad-agent-dev.toml`.** One short bullet pointing to the `[clickup_create_story]` table's `pinned_backlog_list_id` and `pinned_sprint_folder_id` keys (per the post-5-7 `two-backlog-lists-in-team-space` and `two-sprint-folders-in-team-space` refinements). State that both are optional (default unset; the picker behaves as before when unset) and that pinning is recommended only for spaces with the documented multi-list / multi-folder edge cases.

### Multi-repo Claude Code sessions section content contract (`## Multi-repo Claude Code sessions`)

5. The `## Multi-repo Claude Code sessions` section MUST address the other half of `multi-repo-cwd-handling-undocumented` — the session-shape guidance that complements AC #4's marker-file prereq. Required minimum:
   - **One short framing paragraph** explaining why this section exists: a team-lead may have both the bmad-mcp-server repo and the pilot repo open in the same Claude Code session (e.g. to develop the skill while running it, or to debug the pilot from the server side), and Claude Code's `pwd` resolution under multi-repo project configurations does not always default to the pilot repo. The cwd-assertion contract (see AC #4) catches the wrong-cwd case at runtime and emits a `❌` error block; this section explains the operator-side prevention so the error block is the exception rather than the rule.
   - **Recommended single-repo-cwd shape (default).** Open Claude Code with the pilot repo as the workspace root, `cd` into it before invoking either skill, and rely on the cwd-assertion to confirm. One short subsection or paragraph; cite `pwd-deviation-cwd-not-pilot-repo` by short-ID.
   - **Multi-repo shape with cwd guard (when single-repo is impractical).** When the team-lead must keep both repos open, the section MUST document the workflow: (i) place the `.bmad-pilot-marker` file at the pilot repo root per AC #4, (ii) `cd` to the pilot repo before invoking either skill — Claude Code's terminal and Bash tool inherit the manual `cd`, (iii) verify with `pwd` before each skill invocation (the cwd-assertion will halt the skill with a clear error block if cwd is wrong; the manual `pwd` check is the cheap pre-empt), (iv) if the dev session genuinely cannot `cd` (e.g. an in-Claude-Code-CLI session that pins cwd at the bmad-mcp-server root for tooling reasons), use the disclosed-deviation escape hatch: load the pilot repo's PRD / architecture via absolute-path `Read` calls and record the deviation in the Dev Agent Record §Agent Model Used. Cite stories 5-4 and 5-5 as the historical precedent for the absolute-path `Read` path.
   - **Anti-pattern callout.** One sentence stating that opening the bmad-mcp-server repo as the only workspace and invoking either skill against a pilot epic without the cwd guard is the failure mode the cwd-assertion was added to catch — the skills will read `bmad-mcp-server/planning-artifacts/PRD.md` instead of the pilot's PRD, producing stories grounded in the wrong project. Cite `pwd-deviation-cwd-not-pilot-repo` and `multi-repo-cwd-handling-undocumented` by short-ID.

### Skill invocation section content contracts

6. The `## Invoke clickup-create-story` section MUST cover both invocation paths and the verbatim trigger code. Required content:
   - **What this skill does.** One short paragraph summarising the skill: creates a ClickUp task as a subtask of a chosen epic in the active sprint list, with a description composed from the pilot repo's PRD + architecture + the epic's ClickUp body. Cite the SKILL.md and workflow.md files by relative link.
   - **Invocation path A — `CS` trigger via Cursor / VS Code.** Document the trigger code (`CS`) and reference [`_bmad/custom/bmad-agent-dev.toml`](../../_bmad/custom/bmad-agent-dev.toml)'s `[[agent.menu]]` entry. State that the trigger dispatches to the `clickup-create-story` skill in IDE-integrated invocations.
   - **Invocation path B — manual walk via Claude Code CLI.** This bullet MUST address the post-5-7 `ds-trigger-not-dispatched-via-toml` documented-not-fixed outcome (per the comment block at the top of `_bmad/custom/bmad-agent-dev.toml`). Required content: (i) state that in Claude Code CLI mode the agent invokes the skill steps directly (walking `src/custom-skills/clickup-create-story/steps/step-01..05`) rather than via the `CS` trigger, (ii) show the conversational invocation pattern (e.g. "Invoke the `clickup-create-story` skill against pilot epic <id>" — the agent then walks the steps), (iii) note that both invocation paths produce the same artifacts (per the post-5-7 TOML comment).
   - **Step-by-step expectations.** One short paragraph naming the five steps in order (`step-01-prereq-check` → `step-02-epic-picker` → `step-03-sprint-list-picker` → `step-04-description-composer` → `step-05-create-task`) with the verbatim permission-gate message (`✅ Permission gate passed — write mode active, token authenticated.`) called out as a checkpoint the team-lead should expect to see and capture in the Dev Agent Record (per the post-5-7 `step-01-verbatim-message-not-captured` refinement).
   - **What success looks like.** One short bullet list naming the artifacts produced by a successful run: (a) a new ClickUp subtask under the chosen epic, (b) the task's description composed from PRD + architecture + epic context, (c) the task's URL printed back in the conversation. Cite the post-5-7 `epic-picker-no-root-level-filter` refinement (subtasks are filtered out of the epic-picker so they don't surface as candidate epics in future runs) as a one-sentence safety note.

7. The `## Invoke clickup-dev-implement` section MUST cover both invocation paths and the verbatim trigger code. Required content:
   - **What this skill does.** One short paragraph: implements a ClickUp task end-to-end (fetches task + parent-epic context, reads pilot repo planning artifacts, implements code via IDE file tools, posts progress comments, transitions status to a review state). Cite the SKILL.md and workflow.md files by relative link.
   - **Invocation path A — `DS` trigger via Cursor / VS Code.** Document the trigger code (`DS`) and reference the `[[agent.menu]]` entry.
   - **Invocation path B — manual walk via Claude Code CLI.** Same documented-not-fixed framing as AC #6 path B; show the conversational invocation pattern (e.g. "Invoke the `clickup-dev-implement` skill against task <id>") and name the seven steps in order (`step-01-task-id-parser` → `step-02-task-fetch` → `step-03-planning-artifact-reader` → `step-04-progress-comment-poster` → `step-05-status-transition` → `step-06-assumptions` → `step-07-dev-clarification`).
   - **Post-5-7 contract changes the team-lead should know about.** One short subsection or bullet list naming three behaviour deltas:
     - **Step-01 PAT-prefix preflight.** The `git remote -v` scan for `ghp_|github_pat_|ghs_|ghu_|ghr_` runs before task-ID parsing; if any remote URL embeds a PAT, the skill emits a `❌` error block with a rotation-path hint (per the post-5-7 `lore-origin-pat-preflight-gap` refinement). The team-lead's pre-empt is `git remote -v` locally before invoking.
     - **Step-05 broadened review-status match set.** The skill matches `in review`, `ready for review`, `code review`, `pending review`, and `awaiting review` (case-insensitive, in priority order) against `{list_statuses}` (per the post-5-7 `step-05-in-review-literal-match-miss` and `step-05-match-set-too-narrow` refinements). If none match, the skill skips the transition with a `⚠️` warning that enumerates the full match set in the diagnostic; the team-lead's manual fallback is `updateTask({ status: "<your-list's-review-status>" })` — cite the friction-log entry by short-ID.
     - **Step-04 Template B PR field.** Template B (M2 — Implementation Complete) now renders `**Pull Request:** {pr_url}` between `**Summary:**` and `**Files changed:**` when `{pr_url}` is non-empty (per the post-5-7 `template-b-no-pr-field` refinement); the team-lead is responsible for sourcing `{pr_url}` from the `gh pr create` stdout.
   - **What success looks like.** One short bullet list: (a) M1 progress comment posted on the ClickUp task, (b) implementation commits + PR landed in the pilot repo, (c) M2 progress comment posted with the PR URL, (d) status transitioned to a review state (or a `⚠️` warning if no synonym matched).

### Where things live section content contract (`## Where things live`)

8. The `## Where things live` section MUST disambiguate the four-source-of-truth shape that confuses new team-leads. Required content (a short table OR a four-bullet list — pick whichever the dev-in-session prefers):
   - **PRD + architecture (+ tech-spec if used)** live in the **pilot repo** at `planning-artifacts/{PRD,architecture,tech-spec}.md`. Cite [`planning-artifacts/README.md`](../README.md) §"What target projects look like" for the canonical shape.
   - **Epics + stories** live in **ClickUp**. Stories MAY be subtasks of an epic in the same list (same-list layout, default; required when the workspace's "Tasks in Multiple Lists" ClickApp is OFF) OR in a different list (cross-list layout; requires the ClickApp ON). Cite the post-5-7 `prd-clickup-layout-vs-merged-state-drift` PRD amendment.
   - **Sprint state** lives in **ClickUp** — the active sprint list inside the workspace's sprint folder. Cite [pilot.md §ClickUp coordinates](../pilot.md) for the bmad-mcp-server pilot's concrete coordinates as a worked example.
   - **`bmad-mcp-server` itself** lives wherever the team-lead's MCP client is configured to launch it from (per `README.md` §Installation). The server's own `planning-artifacts/` is bootstrap-only and is NOT the source of truth for any pilot project's stories.

### Common pitfalls section content contract (`## Common pitfalls`)

9. The `## Common pitfalls` section MUST enumerate ≥5 pitfalls, each citing the friction-log short-ID(s) that motivated the warning. Required minimum coverage (the dev-in-session MAY add more):
   - **`gh auth` configured for the wrong account.** Symptom: `gh pr create` fails mid-`clickup-dev-implement` invocation with an org-access error. Pre-empt: `gh auth status` before invoking. Recovery: `gh auth switch --user <handle>`. Cite `gh-auth-wrong-account` and `gh-auth-prerequisite-undocumented` by short-ID.
   - **Wrong cwd at skill invocation.** Symptom: the cwd-assertion `❌` error block fires (or, worse, falls back to absolute-path `Read` substitution if the dev session takes the disclosed-deviation escape hatch unexamined). Pre-empt: `pwd` before invoking; place `.bmad-pilot-marker` at the pilot repo root. Cite `pwd-deviation-cwd-not-pilot-repo` and `multi-repo-cwd-handling-undocumented` by short-ID.
   - **Workspace has the "Tasks in Multiple Lists" ClickApp toggle OFF and the layout assumes cross-list.** Symptom: `createTask` returns `400 ITEM_137 Parent not child of list`. Pre-empt: confirm the toggle state before designing layout. Recovery: switch to same-list layout (the default post-5-7 PRD amendment) OR enable the toggle (workspace-admin action). Cite `cross-list-subtask-block` by short-ID.
   - **Workspace's review-status enum doesn't match the broadened match set.** Symptom: `step-05-status-transition` skips with the `⚠️` warning enumerating the full match set. Pre-empt: name the workspace's review-state status to one of the five synonyms in the match set. Recovery: manual `updateTask({ status: "<your-status>" })`. Cite `step-05-in-review-literal-match-miss` and `step-05-match-set-too-narrow` by short-ID.
   - **Multi-list / multi-folder ambiguity in `step-02-epic-picker` / `step-03-sprint-list-picker`.** Symptom: the picker requests a numbered disambiguation between two `Backlog` lists or two `sprint*` folders. Pre-empt: pin the IDs via `_bmad/custom/bmad-agent-dev.toml`'s `[clickup_create_story]` table (`pinned_backlog_list_id`, `pinned_sprint_folder_id`). Cite `two-backlog-lists-in-team-space` and `two-sprint-folders-in-team-space` by short-ID.
   - **Origin URL embeds a GitHub PAT.** Symptom: the post-5-7 `step-01-task-id-parser.md` instruction 0b PAT-prefix preflight emits a `❌` error block. Pre-empt: `git remote -v | grep -E 'ghp_|github_pat_|ghs_|ghu_|ghr_'` returns no matches before invoking. Recovery: `git remote set-url origin <clean-url>` + rotate the PAT in GitHub Settings. Cite `lore-origin-pat-preflight-gap` by short-ID.

### README.md cross-link contract

10. `README.md` §Documentation MUST gain exactly one new line linking to `docs/clickup-quickstart.md`. The link's anchor text MUST be operator-recognisable (e.g. `**[BMAD + ClickUp Team Quickstart](./docs/clickup-quickstart.md)** - Team-lead workflow for invoking the Dev agent against ClickUp epics`); the dev-in-session may rephrase as long as the link target is `./docs/clickup-quickstart.md` and the description names the team-lead audience. The new line MUST be placed in the existing `## Documentation` bullet list — adjacent to (not replacing) the existing four bullets (`Architecture`, `API Contracts`, `Development Guide`, `Release Process`). Other lines in `README.md` MUST remain byte-unchanged. `git diff -- README.md` MUST show only the additive hunk in `## Documentation`.

### bmad-mcp-server-repo regression guards (this repo)

11. No TypeScript source files (`src/**/*.ts`) are added or modified in the bmad-mcp-server repo. `git diff --stat -- 'src/**/*.ts'` MUST be empty.

12. No files under `BMAD-METHOD/`, `src/tools/clickup/`, `src/custom-skills/`, or `_bmad/` in the bmad-mcp-server repo are created, modified, or deleted. For each of those roots, `git diff --stat -- <root>` MUST be empty. In particular, `src/custom-skills/` is byte-frozen post-5-7 — observed friction with the documented invocation paths is captured in story 5-9's retro Dev Agent Record, NOT patched in this story.

13. `planning-artifacts/PRD.md`, `planning-artifacts/pilot.md`, `planning-artifacts/friction-log.md`, `planning-artifacts/deferred-work.md`, `planning-artifacts/README.md`, `planning-artifacts/epic-3-retro-2026-04-23.md`, all files under `planning-artifacts/epics/`, and all existing files under `planning-artifacts/stories/` (other than the new `5-8-team-facing-quickstart-docs.md`) are byte-unchanged. `git diff -- planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/friction-log.md planning-artifacts/deferred-work.md planning-artifacts/README.md planning-artifacts/epic-3-retro-2026-04-23.md planning-artifacts/epics/ $(git ls-files planning-artifacts/stories/ | grep -v '5-8-team-facing-quickstart-docs.md')` MUST be empty. The vendor-tree exclusions listed in story 1-1 — `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS` — remain byte-unchanged as well. The only files modified by this story are the new `docs/clickup-quickstart.md`, the additive cross-link hunk in `README.md` per AC #10, `planning-artifacts/sprint-status.yaml` (per AC #15), and `planning-artifacts/stories/5-8-team-facing-quickstart-docs.md` (this story file itself).

14. `npm run build`, `npm run lint`, and `npm test` MUST all pass cleanly after this story's hunks land. Expected baseline at the merge commit of [story 5-7](./5-7-refine-prompts-and-templates.md): **234 passing**, 0 failing — unchanged since story 3.6 because every 5-X story has shipped markdown / YAML / TOML only on this repo's side. This story is markdown-only (the new `docs/clickup-quickstart.md` plus the additive hunk in `README.md`); the expected test-count delta is therefore **zero**. **Re-verify the baseline against the actual HEAD before committing.** Do NOT run `npm run format` globally; use scoped `npx prettier --write` per stories 5-1 through 5-7 Completion Notes.

### Sprint-status transition contract

15. `planning-artifacts/sprint-status.yaml` transitions are workflow-managed: the `bmad-create-story` workflow sets `5-8-team-facing-quickstart-docs` from `backlog` → `ready-for-dev` and bumps `last_updated`. Later transitions (`ready-for-dev` → `review` after dev-story execution → `done` after the code-review pass marks the story closed; per the story 5-1 / 5-2 / 5-3 / 5-4 / 5-5 / 5-6 / 5-7 precedent, multiple transitions MAY land in successive commits within the same PR or be folded into the same commit if the dev session and the review pass share a session) happen via the dev implementing this story plus the code-review follow-up. The `epic-5: in-progress` line is already correct from prior 5-X stories and MUST remain unchanged by this story. No other key in `sprint-status.yaml` is modified.

## Out of Scope (explicitly deferred to later stories)

- **Re-invoking either skill against the pilot epic to verify the documented invocation paths work.** A second pilot pass is story 5-9's retro decision; this story documents the post-5-7 contract by reading the source-of-truth files. Live verification is out of scope.
- **Amending `planning-artifacts/friction-log.md`.** The friction log is point-in-time per [story 5-6 §Out of Scope](./5-6-capture-friction-log.md) ("Capturing friction observed AFTER this story's commit"). This story reads the log to surface the two `story-5-8-doc-only` entries plus relevant cross-cutting themes; it does NOT add, remove, or amend any H3 entry, severity field, owner-bucket assignment, or cross-cutting theme bullet. `git diff -- planning-artifacts/friction-log.md` MUST be empty after this story's commit.
- **Adding new prereqs that the friction log did not surface.** The quickstart enumerates prereqs the friction log motivates (Node.js, MCP wiring, ClickUp credentials, workspace shape, `gh auth`, `.bmad-pilot-marker`, optional pinned-IDs). Speculative future prereqs (Linear support, OAuth2 ClickUp auth, GitHub Apps replacing PATs, etc.) are out of scope; if the dev-in-session identifies a missing prereq while writing, capture it as a `## Cross-cutting themes` candidate in story 5-9's retro Dev Agent Record, NOT in the quickstart.
- **Writing operator-of-the-server install / config docs.** The `README.md` already covers MCP-client wiring, Docker deployment, env vars, and ClickUp tool surface configuration. The quickstart's audience is the team-lead-in-session invoking the Dev agent against a configured server, not the operator standing the server up. The quickstart links back to `README.md` rather than duplicating its content.
- **Writing a contributor / customization guide for `src/custom-skills/`.** That is the existing `src/custom-skills/README.md` stub's responsibility; expanding it is a separate concern from team-facing quickstart docs and is out of scope for this story. If the dev-in-session feels the stub is misleading after writing the quickstart, capture that as a follow-up note in `planning-artifacts/deferred-work.md` post-merge — but do NOT amend `src/custom-skills/README.md` in this story (per AC #12's `src/custom-skills/` byte-freeze).
- **Editing `src/custom-skills/clickup-create-story/` or `src/custom-skills/clickup-dev-implement/`.** Both skills remain byte-frozen post-5-7. Refinements landed in 5-7; story 5-9's retro decides whether further refinements are warranted. The quickstart documents the skills as they are, without amending them.
- **Editing `_bmad/custom/bmad-agent-dev.toml`.** The TOML is byte-frozen post-5-7 (the `[clickup_create_story]` pinned-ID keys and the trigger-dispatch comment block landed in 5-7). The quickstart references the TOML and documents its operator-facing knobs; it does NOT amend the file.
- **Amending `planning-artifacts/PRD.md`.** The PRD's §ClickUp layout was amended in 5-7. The quickstart cites the post-5-7 amendment but does not re-amend the PRD.
- **Re-running the bmad-mcp-server's own pilot.** The bmad-mcp-server's pilot is the EPIC-5 pilot itself; it has run once (stories 5-3 / 5-4 / 5-5). A second run is story 5-9's retro decision.
- **Pilot repo (`Alpharages/lore`) edits.** No commits, no PR amendments, no `planning-artifacts/` changes in the pilot repo. AC #12 / #13 enforce this. The quickstart references the pilot repo as a worked example for `pilot.md` §ClickUp coordinates but does NOT touch any file in the pilot repo's working tree.
- **Running `npm run format` globally.** Scoped `npx prettier --write` only, per the stories-5-1-through-5-7 precedent.

## Tasks / Subtasks

- [x] **Task 0 — Confirm working directory and branch state (AC: prereq for all)**
  - [x] `pwd` MUST print `/Volumes/Data/project/products/alpharages/bmad-mcp-server` (this story is bmad-mcp-server-repo only; no pilot-repo cwd needed). If `pwd` is anything else, `cd` here before continuing.
  - [x] Confirm working tree is clean: `git status --porcelain` returns empty (or only contains the expected uncommitted artifacts from the `bmad-create-story` workflow that drafted this story file plus its sprint-status transition — `5-8-team-facing-quickstart-docs: backlog → ready-for-dev`).
  - [x] Confirm current branch is `feat/1-2-wire-register-functions` (the running EPIC-5 branch carrying every prior 5-X commit) per the post-`aa23d9f` 5-X precedent. If on `main`, create the feature branch off `main` before continuing.

- [x] **Task 1 — Re-read inputs and draft section skeleton (AC: #1, #2, #3)**
  - [x] Read `planning-artifacts/friction-log.md` end-to-end. Re-read the two `story-5-8-doc-only` entries (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`) plus the cross-cutting themes that bear on the quickstart (the `pwd / cwd handling needs hardening` theme, the `External-tool prereqs are undocumented` theme).
  - [x] Re-read [story 5-7](./5-7-refine-prompts-and-templates.md) §Translation summary table to capture every post-5-7 contract change the quickstart must reflect: cwd-assertion (both skills), step-01 verbatim message, epic-picker root-level filter, `_bmad/custom/bmad-agent-dev.toml` pinned-ID keys + trigger-dispatch comment block, smoke harness toggle-state warning, PAT-prefix preflight, step-05 broadened match set, Template B PR field, PRD §ClickUp layout amendment, `pilot.md` `save-lesson` rename.
  - [x] Inspect the named target files: `src/custom-skills/clickup-create-story/SKILL.md` + `workflow.md` + `steps/step-01..05.md`, `src/custom-skills/clickup-dev-implement/SKILL.md` + `workflow.md` + `steps/step-01..07.md`, `_bmad/custom/bmad-agent-dev.toml`, `planning-artifacts/PRD.md` (§ClickUp layout post-5-7 state), `planning-artifacts/pilot.md` (§ClickUp coordinates as a worked example), `planning-artifacts/README.md` (§"What target projects look like" — the canonical pilot-repo shape). Extract the verbatim text the quickstart will cite (e.g. the `✅ Permission gate passed — write mode active, token authenticated.` permission-gate message; the five review-status synonyms; the recommended `.bmad-pilot-marker` content shape).
  - [x] Draft `docs/clickup-quickstart.md` with the H1 + intro paragraph + the eight required H2 sections per AC #2, in the specified order, with empty bodies. Bodies fill in Tasks 2 / 3 / 4 / 5.

- [x] **Task 2 — Populate `## Prerequisites` (AC: #4)**
  - [x] Write the Node.js bullet (cite `.nvmrc`).
  - [x] Write the bmad-mcp-server install / wiring bullet (cross-link `README.md` §Installation; do NOT duplicate).
  - [x] Write the ClickUp credentials bullet (`CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_MCP_MODE=write`; cross-link `README.md` §Environment Variables and `.env.example`; do NOT print any actual key value).
  - [x] Write the ClickUp workspace shape bullet (Backlog list, sprint folder, "Tasks in Multiple Lists" ClickApp toggle nuance; cite `cross-list-subtask-block` by short-ID).
  - [x] Write the `gh` CLI bullet addressing `gh-auth-prerequisite-undocumented` (verification command, switch command, cite `gh-auth-wrong-account` historical precedent, note that the post-5-7 PAT-prefix preflight does NOT verify auth-account correctness).
  - [x] Write the `.bmad-pilot-marker` bullet addressing half of `multi-repo-cwd-handling-undocumented` (file path, format, minimal example, commit recommendation, escape-hatch reference).
  - [x] Write the optional pilot-specific config knobs bullet (`pinned_backlog_list_id`, `pinned_sprint_folder_id`).

- [x] **Task 3 — Populate `## Multi-repo Claude Code sessions` (AC: #5)**
  - [x] Write the framing paragraph (why the section exists; cwd-assertion is the runtime safety net, this section is the operator-side prevention).
  - [x] Write the recommended single-repo-cwd shape subsection (default; cite `pwd-deviation-cwd-not-pilot-repo`).
  - [x] Write the multi-repo shape with cwd guard subsection (the four-step workflow: marker file, `cd`, `pwd` verify, escape-hatch).
  - [x] Write the anti-pattern callout (one sentence; cite both friction-log entries).

- [x] **Task 4 — Populate `## Invoke clickup-create-story` and `## Invoke clickup-dev-implement` (AC: #6, #7)**
  - [x] **Task 4a — `## Invoke clickup-create-story`.** What the skill does, both invocation paths (`CS` trigger and manual walk via Claude Code CLI), step-by-step expectations (verbatim permission-gate message), what success looks like (subtask + description + URL).
  - [x] **Task 4b — `## Invoke clickup-dev-implement`.** What the skill does, both invocation paths (`DS` trigger and manual walk), the three post-5-7 contract changes (PAT-prefix preflight, broadened match set, Template B PR field), what success looks like (M1 + M2 comments + PR + status transition).

- [x] **Task 5 — Populate `## Where things live` and `## Common pitfalls` (AC: #8, #9)**
  - [x] **Task 5a — `## Where things live`.** Four-source-of-truth table or bullet list (PRD/architecture in pilot repo; epics/stories in ClickUp; sprint state in ClickUp; bmad-mcp-server itself wherever the MCP client is wired). Cite `prd-clickup-layout-vs-merged-state-drift` post-5-7 amendment.
  - [x] **Task 5b — `## Common pitfalls`.** Six pitfalls minimum (per AC #9 enumeration), each citing friction-log short-ID(s) and the pre-empt + recovery shape.

- [x] **Task 6 — Populate `## Change log` and finalize body (AC: #2)**
  - [x] Write the initial `## Change log` row (date `2026-04-28` or actual execution date, status `ready-for-dev`, one-sentence summary referencing this story).
  - [x] Re-read the file end-to-end to verify section ordering matches AC #2; verify the H1 title is operator-facing per AC #2; verify the intro paragraph names the audience and the post-5-7 point-in-time framing.

- [x] **Task 7 — Add `README.md` cross-link (AC: #10)**
  - [x] Locate the `## Documentation` H2 in `README.md`. Add exactly one new bullet linking to `./docs/clickup-quickstart.md` with operator-recognisable anchor text per AC #10.
  - [x] Verify `git diff -- README.md` shows only the additive hunk inside `## Documentation` (no other lines mutated).

- [x] **Task 8 — Format and validate (AC: #3)**
  - [x] `npx prettier --check docs/clickup-quickstart.md README.md planning-artifacts/stories/5-8-team-facing-quickstart-docs.md planning-artifacts/sprint-status.yaml` MUST exit 0. If any file fails, run `npx prettier --write` scoped to that file (do NOT run `npm run format` globally). For long table rows or fenced code blocks that trip the 80-char wrap, wrap the affected block in `<!-- prettier-ignore-start -->` / `<!-- prettier-ignore-end -->` per the precedent in [`5-4-dev-creates-pilot-stories.md` §Change Log](./5-4-dev-creates-pilot-stories.md).
  - [x] Markdown sanity check on the new quickstart: `grep -E '^(# |## |### )' docs/clickup-quickstart.md` MUST return the heading skeleton in this order: H1 → 8×H2 (in the AC #2 order). H3 sub-headings under any H2 are allowed but not required.
  - [x] Internal-link check: every `friction-log.md` short-ID citation MUST be a working markdown link (or an inline-code reference paired with the link). Spot-check the named entries: `gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`, `pwd-deviation-cwd-not-pilot-repo`, `cross-list-subtask-block`, `step-05-in-review-literal-match-miss`, `step-05-match-set-too-narrow`, `lore-origin-pat-preflight-gap`, `template-b-no-pr-field`, `prd-clickup-layout-vs-merged-state-drift`, `two-backlog-lists-in-team-space`, `two-sprint-folders-in-team-space`, `step-01-verbatim-message-not-captured`, `epic-picker-no-root-level-filter`, `gh-auth-wrong-account`. Spot-check the named source files: skill SKILL.md + workflow.md, `_bmad/custom/bmad-agent-dev.toml`, `README.md` §Installation, `README.md` §Environment Variables, `.env.example`, `planning-artifacts/README.md`, `planning-artifacts/pilot.md`, `planning-artifacts/PRD.md`, `.nvmrc`.

- [x] **Task 9 — Verify bmad-mcp-server regression-free (AC: #11, #12, #13, #14)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty (AC #11).
  - [x] `git diff --stat -- BMAD-METHOD/` → empty (AC #12).
  - [x] `git diff --stat -- src/tools/clickup/` → empty (AC #12).
  - [x] `git diff --stat -- src/custom-skills/` → empty (AC #12).
  - [x] `git diff --stat -- _bmad/` → empty (AC #12).
  - [x] `git diff --stat -- planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/friction-log.md planning-artifacts/deferred-work.md planning-artifacts/README.md planning-artifacts/epic-3-retro-2026-04-23.md planning-artifacts/epics/` → empty (AC #13).
  - [x] For unchanged sibling story files: `for f in $(git ls-files planning-artifacts/stories/ | grep -v '5-8-team-facing-quickstart-docs.md'); do git diff --quiet -- "$f" || echo "CHANGED: $f"; done` → zero output (AC #13).
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (AC #13 vendor-tree exclusions).
  - [x] Pre-commit secret scan across every file modified by this story: `grep -REn '(ghp|ghs|ghu|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}' docs/clickup-quickstart.md README.md planning-artifacts/stories/5-8-team-facing-quickstart-docs.md` MUST return zero matches. The bracketed `{20,}` length suffix requires ≥20 alphanumeric chars after the prefix — short enough to catch every real GitHub PAT (classic ≥36, fine-grained ≥82) and long enough that bare-prefix documentation (e.g. the regex pattern itself in this story file or the PAT-prefix list in the quickstart's §Common pitfalls) does not false-positive. The quickstart MUST NOT contain any actual ClickUp `pk_...` API key value either; sanity-check `grep -E 'pk_[A-Za-z0-9]{20,}' docs/clickup-quickstart.md` returns zero matches. Capture exit code in Dev Agent Record §Debug Log References.
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors (7 pre-existing warnings in `tests/support/litellm-helper.mjs` unchanged).
  - [x] `npx prettier --write` scoped to every file modified by this story (do NOT run `npm run format` globally per stories 5-1 through 5-7 Completion Notes).
  - [x] `npm test` → 234 passing / 0 failing per AC #14.

- [x] **Task 10 — Commit (AC: all + #15)**
  - [x] Stage in this order: `docs/clickup-quickstart.md` (new), `README.md` (additive cross-link hunk per AC #10), `planning-artifacts/stories/5-8-team-facing-quickstart-docs.md` (Status `ready-for-dev` → `review` on the dev-story execution commit, `review` → `done` on the close commit after the code-review pass — per AC #15, multiple transitions MAY land in successive commits within the same PR or be folded into the same commit if the dev session and the review pass share a session), `planning-artifacts/sprint-status.yaml` (transition + `last_updated` bump).
  - [x] Commit message: `feat(planning): document team-facing BMAD+ClickUp quickstart via story 5-8`
  - [x] Body:

    ```
    Add docs/clickup-quickstart.md as the single team-facing entry
    point for invoking the Dev agent against ClickUp-routed pilot
    epics. Documents the post-5-7 contract: cwd-assertion via
    .bmad-pilot-marker, both invocation paths (CS/DS triggers via
    Cursor/VS Code; manual skill-walk via Claude Code CLI), the
    broadened step-05 review-status match set, the Template B PR
    field, the PAT-prefix preflight, and the [clickup_create_story]
    pinned-ID config knobs.

    Lands the two story-5-8-doc-only friction-log entries:
    - gh-auth-prerequisite-undocumented → §Prerequisites enumerates
      gh auth status / gh auth switch as a documented prereq, citing
      the gh-auth-wrong-account historical precedent.
    - multi-repo-cwd-handling-undocumented → §Multi-repo Claude Code
      sessions documents the operator-side .bmad-pilot-marker setup
      and the cd-then-pwd workflow that complements the runtime
      cwd-assertion in step-01-prereq-check.md and
      step-01-task-id-parser.md.

    Adds a one-line cross-link in README.md §Documentation. Skills,
    config, friction log, and PRD remain byte-frozen post-5-7
    (per ACs #11-13). Story-status transitions ready-for-dev →
    review → done; sprint-status.yaml bumped accordingly. No .ts
    changes; expected baseline 234 passing / 0 failing unchanged.
    ```

  - [x] After commit, `git status` MUST report a clean working tree.

## Dev Notes

### Why `docs/clickup-quickstart.md` and not a different path

Three paths were considered:

1. **`docs/clickup-quickstart.md`** (chosen). Sits next to `docs/architecture.md`, `docs/api-contracts.md`, `docs/development-guide.md`, and `docs/index.md`. The `docs/` directory is the existing home for end-user docs in this repo; the `## Documentation` section in `README.md` already lists those four files. Adding the quickstart there is the lowest-friction path: no new directory, consistent with the existing taxonomy, and discoverable via the already-linked `## Documentation` section.

2. **`planning-artifacts/quickstart.md`**. Rejected. `planning-artifacts/README.md` explicitly frames the directory as a **bootstrap** that gets archived once the EPIC-5 pilot retro records a go decision. Putting the team-facing quickstart there would couple a durable team-facing surface to a directory that is scheduled for archival.

3. **Expanding `src/custom-skills/README.md`**. Rejected. The current 5-line stub explains the customization-boundary contract — a contributor concern. Folding the team-lead workflow into that file would conflate two audiences (contributors modifying skills vs. team-leads invoking skills) and would couple the quickstart to a directory that the skills-as-code part of the codebase. The quickstart belongs next to the other operator docs, with `src/custom-skills/README.md` left as a minimal cross-reference if needed (out of scope for this story per §Out of Scope above).

### Why the quickstart documents post-5-7 state, not byte-frozen pilot state

Story 5-7's translation summary made several behaviour-visible changes that a team-lead-in-session must know about: the cwd-assertion at step-01 instruction 0 / 0a, the broadened review-status match set, the Template B PR field, the new pinned-ID config knobs. A quickstart that documented the byte-frozen pre-5-7 state would mislead any team-lead who reads it after 5-7 lands. The story's framing (ACs #4–#9) explicitly cites the post-5-7 refinements so the dev-in-session writes against the current source-of-truth files, not the friction log's snapshot. Story 5-9's retro will evaluate whether the quickstart's coverage of the post-5-7 state is sufficient.

### Why two friction-log entries (not more, not fewer) drive this story's content

The friction log's `## Owner queue` §`story-5-8-doc-only` bucket lists exactly two entries:

- `gh-auth-prerequisite-undocumented` (LOW, surface `docs`) — landed in §Prerequisites bullet 5 per AC #4.
- `multi-repo-cwd-handling-undocumented` (LOW, surface `docs`) — landed across §Prerequisites bullet 6 (the marker file) and §Multi-repo Claude Code sessions (the session-shape workflow) per AC #4 and AC #5.

Other friction-log entries (`gh-auth-wrong-account`, `pwd-deviation-cwd-not-pilot-repo`, `cross-list-subtask-block`, `step-05-in-review-literal-match-miss`, etc.) are cited in the quickstart's §Common pitfalls (per AC #9) and elsewhere as historical-precedent or contract-rationale references, but they are NOT this story's primary scope — they have already been addressed by their own owner buckets (`human-only`, `story-5-7-skill-fix`, etc.). A code reviewer can verify the primary-scope coverage by reading the §`story-5-8-doc-only` bucket and the AC #4 / AC #5 contracts together.

### Why no fenced examples of actual ClickUp tasks, screenshots, or workspace IDs beyond `pilot.md`'s

The quickstart's worked-example references (e.g. citing `pilot.md` §ClickUp coordinates) point to the bmad-mcp-server's own pilot decision record. That decision record names workspace `9018612026`, the `Lore > Backlog` list, and the `Sprint 1 (4/27 - 5/10)` sprint list — all already public in this repo's planning artifacts. The quickstart does NOT introduce new ClickUp workspace IDs, list IDs, or task URLs beyond what's already in `pilot.md` (single source of truth per [story 5-1](./5-1-choose-pilot-project.md)). Screenshots are out of scope for this story — they bind the quickstart to a specific ClickUp UI version, complicate the "files modified by this story" regression check, and add binary-asset review burden. If a future team finds the quickstart unclear without screenshots, that's story 5-9 retro feedback or a follow-up story, not this story's scope.

### What the dev-in-session should NOT change about post-5-7 contracts

The quickstart describes the contracts; it does not negotiate them. Specifically:

- The cwd-assertion sentinel file is `.bmad-pilot-marker` per the [step-01 cwd-assertion contract](../../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md). Do NOT propose alternative names (`.bmad-target`, `.bmad-project-root`, etc.) in the quickstart.
- The review-status match set is exactly five synonyms in priority order: `in review`, `ready for review`, `code review`, `pending review`, `awaiting review`. Do NOT extend or reorder in the quickstart.
- The pinned-ID config keys are `pinned_backlog_list_id` and `pinned_sprint_folder_id` under `[clickup_create_story]`. Do NOT propose alternative key names or table names.
- The trigger codes are `CS` and `DS` per `_bmad/custom/bmad-agent-dev.toml`. Do NOT propose alternatives.
- The PAT-prefix list is `ghp_|github_pat_|ghs_|ghu_|ghr_` per the post-5-7 `lore-origin-pat-preflight-gap` refinement. Do NOT propose adding fine-grained-PAT detection beyond `github_pat_` (the existing list already covers it).

If the dev-in-session believes any of these contracts is wrong, the right path is a follow-up story (story 5-9 retro can recommend one) — NOT a unilateral quickstart variation that drifts from the source-of-truth files.

### Reading the source-of-truth files

The quickstart cites these files; the dev-in-session reads them as the canonical contract:

- `src/custom-skills/clickup-create-story/SKILL.md` — skill metadata and frontmatter trigger
- `src/custom-skills/clickup-create-story/workflow.md` — five-step workflow overview
- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` — cwd-assertion at instruction 0; permission-gate verbatim message at instruction 1
- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md` — root-level filter (post-5-7); pinned-ID consultation
- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md` — pinned-ID consultation; sprint-window inclusive-bound hint (post-5-7)
- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md` — metadata-peeling extension (post-5-7)
- `src/custom-skills/clickup-create-story/steps/step-05-create-task.md` — terminal step
- `src/custom-skills/clickup-dev-implement/SKILL.md` — skill metadata
- `src/custom-skills/clickup-dev-implement/workflow.md` — seven-step workflow overview
- `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` — cwd-assertion at instruction 0a; PAT-prefix preflight at instruction 0b (post-5-7)
- `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md` — Template B PR field (post-5-7)
- `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md` — broadened review-status match set (post-5-7)
- `_bmad/custom/bmad-agent-dev.toml` — `CS`/`DS` triggers; trigger-dispatch comment (post-5-7); `[clickup_create_story]` pinned-ID keys (post-5-7)
- `planning-artifacts/PRD.md` §ClickUp layout — same-list / cross-list dual-shape language (post-5-7)
- `planning-artifacts/pilot.md` §ClickUp coordinates — worked-example workspace coordinates
- `planning-artifacts/README.md` §"What target projects look like" — canonical pilot-repo `planning-artifacts/` shape
- `planning-artifacts/friction-log.md` §`story-5-8-doc-only` bucket — the two entries this story addresses
- `README.md` §Installation, §Environment Variables, §Documentation — operator-facing context the quickstart cross-links rather than duplicates
- `.nvmrc` — Node.js version pin
- `.env.example` — canonical env-var list

### Suggested commit-message and PR shape

This story lands in **two commits** by precedent (stories 5-1 / 5-2 / 5-3 / 5-4 / 5-5 / 5-6 / 5-7):

1. **Dev-story execution commit.** Lands `docs/clickup-quickstart.md` (new), the `README.md` cross-link hunk, the story file with Status `ready-for-dev` → `review`, and the `sprint-status.yaml` transition `5-8-team-facing-quickstart-docs: ready-for-dev → review`. Commit message: `feat(planning): document team-facing BMAD+ClickUp quickstart via story 5-8`.

2. **Code-review close commit.** Lands the §Senior Developer Review (AI) section appended to the story file, the Status `review` → `done` transition in the story file, and the `sprint-status.yaml` transition `5-8-team-facing-quickstart-docs: review → done`. Commit message follows the precedent (e.g. `chore(planning): close story 5-8 after code review`).

Both commits land on `feat/1-2-wire-register-functions` (the running EPIC-5 branch). PR title and body land at story 5-9's discretion (the EPIC-5 epic-close PR).

## Dev Agent Record

### Implementation Plan

Markdown-only story. Read all source-of-truth files (friction-log, skill step
files, TOML config, PRD, pilot.md, planning-artifacts/README.md), then wrote
`docs/clickup-quickstart.md` with all eight required H2 sections in AC #2 order,
then added one cross-link bullet to `README.md` §Documentation.

### Completion Notes

- `docs/clickup-quickstart.md` created: H1 + 8×H2 (Prerequisites, Multi-repo
  Claude Code sessions, Invoke clickup-create-story, Invoke clickup-dev-implement,
  Where things live, Common pitfalls, Change log). All friction-log short-IDs
  cited with working relative links.
- `README.md` §Documentation: one additive bullet added linking to the quickstart.
- `planning-artifacts/sprint-status.yaml`: `5-8-team-facing-quickstart-docs`
  transitioned `backlog → review`; `last_updated` bumped.
- `planning-artifacts/stories/5-8-team-facing-quickstart-docs.md`: all tasks
  checked, Status `backlog → review`.
- No `.ts`, `src/custom-skills/`, `_bmad/`, BMAD-METHOD/, or planning-artifact
  spec files modified.
- `npm run build` → clean; `npm run lint` → 0 errors, 7 pre-existing warnings;
  `npm test` → 234 passing / 0 failing (baseline unchanged).
- `npx prettier --check docs/clickup-quickstart.md README.md` → exit 0.
- Secret scan exit code: 0 (no PAT or API-key matches).

### Debug Log References

- `npx prettier --check docs/clickup-quickstart.md README.md` — exit 0 ✅
- `npm run build` — clean ✅
- `npm run lint` — 0 errors, 7 pre-existing warnings ✅
- `npm test` — 234 passing / 0 failing ✅
- Secret scan `grep -REn '(ghp|ghs|ghu|ghr)_[A-Za-z0-9]{20,}|github_pat_...'` — exit 1 (no matches) ✅
- `grep -E 'pk_[A-Za-z0-9]{20,}' docs/clickup-quickstart.md` — exit 1 (no matches) ✅
- `git diff --stat -- 'src/**/*.ts'` — empty ✅
- `git diff --stat -- BMAD-METHOD/ src/tools/clickup/ src/custom-skills/ _bmad/ ...` — empty ✅

## File List

- `docs/clickup-quickstart.md` — new file (team-facing BMAD+ClickUp quickstart)
- `README.md` — one cross-link bullet added to §Documentation
- `planning-artifacts/stories/5-8-team-facing-quickstart-docs.md` — tasks checked, status → review
- `planning-artifacts/sprint-status.yaml` — story status → review, last_updated bumped

## Change log

| Date       | Status        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | ready-for-dev | Story drafted via `bmad-create-story` workflow. Scope: a new `docs/clickup-quickstart.md` plus a one-line cross-link in `README.md` §Documentation. Lands the two `story-5-8-doc-only` friction-log entries (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`). Documents the post-5-7 skill / config state. Sprint-status transition `5-8-team-facing-quickstart-docs: backlog → ready-for-dev` per AC #15. No `.ts`, no skill, no config, no friction-log, no PRD edits — markdown only on the bmad-mcp-server side. |
| 2026-04-28 | review        | Dev execution complete. Created `docs/clickup-quickstart.md` with all eight required H2 sections. Added cross-link to `README.md` §Documentation. All tasks checked; status `backlog → review`. Sprint-status transition `5-8-team-facing-quickstart-docs: backlog → review`. Baseline 234 passing / 0 failing unchanged.                                                                                                                                                                                                                         |
| 2026-04-28 | done          | Code-review pass complete. 0 AC violations; 4 patches applied (Completion Notes transition text corrected, task checkboxes ticked, `## Change Log` → `## Change log` heading fixed, bridging note added to quickstart §Invoke clickup-create-story Path B for `ds-trigger-not-dispatched-via-toml` citation). Sprint-status transition `5-8-team-facing-quickstart-docs: review → done`.                                                                                                                                                          |

## Senior Developer Review (AI)

**Reviewer:** Claude Sonnet 4.6 (AI code reviewer)  
**Date:** 2026-04-28  
**Story:** 5-8 team-facing BMAD+ClickUp quickstart docs  
**Verdict:** ✅ Approved — close after patches

### Review summary

Docs-only story. Three parallel review layers ran against commit `6d731cd`
(Blind Hunter, Edge Case Hunter, Acceptance Auditor). All 15 ACs passed.
Four patches applied in the code-review close commit; one pre-existing issue
deferred.

### Findings

| ID  | Source | Category | Title                                                                                                                                                                                   |
| --- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | blind  | patch    | Completion Notes claimed `ready-for-dev → in-progress → review`; actual diff showed `backlog → review` — corrected                                                                      |
| P2  | blind  | patch    | Tasks 1–10 checkboxes left unchecked despite `review` status — all ticked                                                                                                               |
| P3  | blind  | patch    | Story file used `## Change Log` (capital L); AC #2 specifies lowercase — corrected                                                                                                      |
| P4  | blind  | patch    | `ds-trigger-not-dispatched-via-toml` cited in CS-skill section with no bridging note explaining the DS-named entry governs both triggers — one-clause parenthetical added to quickstart |
| D1  | edge   | defer    | README §Installation states `Node.js 18 or later` while quickstart states `22.14.0` — pre-existing README minimum-vs-pinned tension; not introduced by this story; no action taken      |

### Acceptance criteria verdict

All 15 ACs confirmed satisfied. Quickstart content accurate against source-of-truth skill files (`step-01-prereq-check.md`, `step-01-task-id-parser.md`, `step-05-status-transition.md`, `step-04-progress-comment-poster.md`, `bmad-agent-dev.toml`). All 14 friction-log anchor links resolve. No secrets in modified files. Test baseline (234 passing / 0 failing) unaffected by markdown-only changes.
