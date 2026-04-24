# Story 5.1: Choose pilot project

Status: review

Epic: [EPIC-5: Pilot + iterate](../epics/EPIC-5-pilot-iterate.md)

> First story in EPIC-5. No code lands. The deliverable is a single markdown decision record at `planning-artifacts/pilot.md` naming the pilot project, pilot epic, and ClickUp coordinates, with selection rationale against EPIC-5's "small scope, low-risk, active" criteria. Stories 5-2 through 5-9 consume this file as their stable reference.
>
> **Human-judgment story.** The selection is a human call — the bmad-mcp-server maintainer plus the pilot project's team lead. The agent's role is to scaffold the record, interview the dev-in-session for each field (using step 7's clarification pattern when no reasonable default exists), and commit. The agent MUST NOT fabricate a pilot from organizational context it does not have. Hard prereqs (EPIC-1, EPIC-2) are done; finer-grained dependency reasoning is in Dev Notes §"Dependency on EPIC-3".

## Story

As the **bmad-mcp-server platform maintainer**,
I want `planning-artifacts/pilot.md` to exist with a named pilot project, named pilot epic, ClickUp workspace + space coordinates, selection rationale mapped to EPIC-5's small/low-risk/active criteria, decider, and date,
so that EPIC-5's remaining stories (5-2 seed planning artifacts, 5-3 create pilot epic in ClickUp, 5-4 Dev creates stories, 5-5 Dev implements one story end-to-end, 5-6 friction log, 5-7 refinements, 5-8 quickstart docs, 5-9 retro go/no-go) all reference a single authoritative decision — no second-guessing the pilot target mid-epic — and the eventual retro (story 5-9) has a recorded baseline to evaluate the pilot outcome against.

## Acceptance Criteria

1. A new file `planning-artifacts/pilot.md` exists at the repo root-relative path `planning-artifacts/pilot.md`. The file is new to this story — `git diff --stat -- planning-artifacts/pilot.md` before this story shows it absent.

2. `planning-artifacts/pilot.md` contains, in this order, all of the following elements. The H1 title plus one unlabeled intro paragraph come first, then exactly seven H2 (`##`) sections — no more, no fewer. The intro paragraph between the H1 and the first H2 is required and does NOT count toward the seven-H2-sections contract. (Original draft said "eight"; amended 2026-04-24 to match the enumerated list — the enumerated list is the stable downstream contract for stories 5-2 through 5-9.)
   - `# Pilot Decision Record` (H1 title)
   - A two-to-four-sentence intro paragraph immediately under the title stating what this file is, which epic it serves (EPIC-5), and that it is the single source of truth for pilot coordinates consumed by stories 5-2 through 5-9.
   - `## Pilot project`
   - `## Pilot epic`
   - `## ClickUp coordinates`
   - `## Selection rationale`
   - `## Known risks`
   - `## Decision`
   - `## Change log`

3. `## Pilot project` MUST contain these bullets, each with a concrete (non-TBD) value:
   - **Name:** the human-readable project name
   - **Repository:** the git remote URL (or local path if the project is not yet in a remote)
   - **Default branch:** the branch stories will land on
   - **Primary language / stack:** one-line summary (e.g., "TypeScript / Node / Vitest")
   - **Active maintainers:** at least one name and contact channel (email, Slack handle, or similar)

4. `## Pilot epic` MUST contain these bullets, each with a concrete (non-TBD) value:
   - **Epic name:** the one-line epic title that will be created as a ClickUp Backlog task in story 5-3
   - **Epic goal:** one to three sentences stating the epic's outcome (what "done" looks like)
   - **Estimated story count:** a whole number ≥ 3 (matches EPIC-5's outcome "at least 3 stories"), or the literal string "≥3" if the exact count is not yet known
   - **Estimated duration:** calendar duration (e.g., "2 weeks", "1 sprint") — used by story 5-9's retro

5. `## ClickUp coordinates` MUST contain these bullets, each with a concrete (non-TBD) value:
   - **Workspace (team) ID:** the numeric ID that will be supplied via `CLICKUP_TEAM_ID`
   - **Space name:** the human-readable space where the Backlog list and Sprint folder live
   - **Backlog list name:** the list where the pilot epic will be created as a task in story 5-3
   - **Sprint folder name:** the folder whose active list will hold pilot stories as subtasks (per PRD §"ClickUp layout")

   The actual secret (`CLICKUP_API_KEY`) MUST NOT be recorded here — it is a per-user env var (per PRD §"Env vars" and the Auth bullet in §"Non-functional requirements"). If a shared service-account token is required for any pilot step, note "shared token required" as a risk under `## Known risks` and point to where it is stored (e.g., 1Password, team vault) — but do not paste the token value.

6. `## Selection rationale` MUST contain a mapping of EPIC-5's three selection criteria to evidence for the chosen project. Structured as three H3 subsections:
   - `### Small scope` — one to three sentences citing evidence (e.g., repo size, known feature count, team size). Must make a case that one epic can credibly complete end-to-end within the duration from AC #4.
   - `### Low risk` — one to three sentences citing evidence (e.g., no production customers yet, internal tool only, existing test coverage, ability to revert). Must make a case that a botched pilot will not cause customer-visible harm.
   - `### Active` — one to three sentences citing evidence (e.g., recent commit activity, maintainer availability, team capacity). Must make a case that the team lead is reachable and the project will accept PRs during the pilot window.

   Each H3 subsection MUST include at least one concrete, verifiable signal (a metric, a date, a name) — not just adjectives.

7. `## Known risks` MUST contain a bullet list of at least two identified risks and their mitigations. Acceptable risks include (but are not limited to): ClickUp permission gaps, maintainer availability overlap, upstream BMAD-METHOD changes during the pilot window, cross-list-subtask quirks (see PRD §"Risks / assumptions" R1), upstream license / compliance flags. Each bullet uses the format `**Risk:** <sentence>. **Mitigation:** <sentence>.` Minimum two risks; "no risks" is not acceptable — a workflow pilot inherently carries risk, so re-examine if the dev asserts zero.

8. `## Decision` MUST contain these bullets, each with a concrete value:
   - **Decider(s):** name(s) of the human(s) approving the selection. At minimum, both the bmad-mcp-server-maintainer role and the pilot project's team-lead role must be represented. If one person holds both roles, they may be recorded as a single decider with explicit dual-role annotation (e.g., "Jane Doe (bmad-mcp-server maintainer; Pilot team lead — dual role)").
   - **Decision date:** ISO-8601 date (YYYY-MM-DD) on which the selection was finalised
   - **Status:** one of `proposed`, `approved`, `in-progress`, `completed`, `abandoned`. When this story is merged, status MUST be `approved`. (Status transitions in later stories: `in-progress` at story 5-3 merge, `completed` or `abandoned` at story 5-9 merge.)

9. `## Change log` MUST contain a table with columns `Date`, `Status`, `Change`, and at least one row recording the initial decision (date from AC #8, status `approved`, change text e.g., "Initial pilot selection recorded via story 5-1."). This table is adapted from the `planning-artifacts/stories/*.md` Change Log convention with an added Status column — prior stories use two columns (`Date`, `Change`); `pilot.md` adds Status to track the decision lifecycle.

10. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships a single markdown file.

11. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

12. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

13. No files under `src/custom-skills/` are created, modified, or deleted. `git diff --stat -- src/custom-skills/` MUST be empty.

14. No files under `_bmad/` are created, modified, or deleted. `git diff --stat -- _bmad/` MUST be empty.

15. `planning-artifacts/PRD.md`, `planning-artifacts/deferred-work.md`, `planning-artifacts/README.md`, all files under `planning-artifacts/epics/`, and all existing files under `planning-artifacts/stories/` are byte-unchanged. `git diff -- planning-artifacts/PRD.md planning-artifacts/deferred-work.md planning-artifacts/README.md planning-artifacts/epics/ planning-artifacts/stories/` MUST be empty (excluding the sprint-status.yaml update in AC #17 and this story's own file under `stories/`). The vendor-tree exclusions listed in story 1-1 — `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS` — remain byte-unchanged as well.

16. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3-9 (expected test baseline: **234 passing**, 0 failing — unchanged since story 3.6 because 3-7, 3-8, and 3-9 all ship markdown/TOML-only). Since no `.ts` lands, the expected test-count delta is zero. **Re-verify the baseline against the actual merge commit of story 3-9 before committing this story** — if 3-9 landed with an unexpected test-count change, update this baseline in the commit message accordingly.

17. `planning-artifacts/sprint-status.yaml` transitions are workflow-managed (the `bmad-create-story` workflow sets `epic-5` → `in-progress` and `5-1-choose-pilot-project` → `ready-for-dev` and bumps `last_updated`; later story transitions → `review` → `done` also happen via workflow). The dev implementing this story MUST NOT modify sprint-status.yaml beyond these standard transitions.

## Out of Scope (explicitly deferred to later stories)

- Seeding `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` **inside the pilot project's repo** — **story 5-2**. Those are written into the pilot's own repository, not into `bmad-mcp-server`.
- Creating the pilot epic as a ClickUp Backlog task (human action, possibly assisted by manual ClickUp UI or a future scripted helper) — **story 5-3**. This story records the epic's intended name; the task's actual creation happens next.
- Invoking the Dev agent in story-creation mode (CS) to draft the first ≥3 stories as ClickUp subtasks under the pilot epic — **story 5-4**.
- Invoking the Dev agent in implementation mode (DS) to land at least one pilot story end-to-end — **story 5-5**.
- Capturing the friction log during pilot execution — **story 5-6**.
- Translating friction into prompt / template / config refinements — **story 5-7**.
- Writing the team-facing "how to use BMAD+ClickUp" quickstart — **story 5-8**.
- Running the pilot retro and recording the go/no-go decision — **story 5-9**.
- Any change to the `clickup-create-story` or `clickup-dev-implement` skill contents. Both are frozen at their post-EPIC-2 and post-EPIC-3 states respectively. This story does not tune them; tuning happens in story 5-7 after friction is captured.
- Changes to EPIC-4 audit scope. EPIC-5 recommends (does not require) EPIC-4; if the pilot surfaces a non-ClickUp agent file-write risk, that becomes a refinement under story 5-7 or a new EPIC-4 story — not this story.

## Tasks / Subtasks

- [x] **Task 1 — Gather the required fields in-session (AC: #3, #4, #5, #6, #7, #8)**
  - [x] Ask the dev-in-session for the five `## Pilot project` fields (AC #3). If any field cannot be derived from repo state or a file pointer the dev provides, use step 7's clarification pattern — do NOT guess project names, repos, or maintainers.
  - [x] Ask for the four `## Pilot epic` fields (AC #4). If the epic name and goal do not yet exist in ClickUp (they will not — story 5-3 creates the task), capture the dev's intended values verbatim; these become the source text story 5-3 pastes into ClickUp.
  - [x] Ask for the four `## ClickUp coordinates` fields (AC #5). The workspace ID (`CLICKUP_TEAM_ID`) is team-shared per the Auth bullet in PRD §"Non-functional requirements" and safe to record. The per-user API token (`CLICKUP_API_KEY`) is NEVER recorded in this file — confirm this constraint to the dev before writing the file.
  - [x] Ask for the three `## Selection rationale` subsections' evidence (AC #6). Press for at least one verifiable signal per subsection (metric, date, name). Flag weak evidence as a risk in `## Known risks` rather than silently accepting adjectives.
  - [x] Ask for at least two entries under `## Known risks` (AC #7). If the dev asserts "no risks," re-prompt — a pilot by definition carries workflow risk.
  - [x] Ask for `## Decision` fields (AC #8). Status at merge MUST be `approved`; if the dev wants to record a `proposed` state first (awaiting team-lead sign-off), that is acceptable for an intermediate commit but the story is NOT `done` until status is `approved`.

- [x] **Task 2 — Write `planning-artifacts/pilot.md` (AC: #1, #2, #3, #4, #5, #6, #7, #8, #9)**
  - [x] Create the file with the H1 title and intro paragraph (AC #2).
  - [x] Populate all eight H2 sections in the required order with the fields gathered in Task 1. (Note: enumerated sections total seven — see Completion Notes for the AC #2 "eight vs seven" spec discrepancy.)
  - [x] Add the initial `## Change log` table row recording the decision date, status, and change text (AC #9).
  - [x] Confirm no TBD placeholders remain in any field that AC #3–#8 require to be concrete. Run `grep -n -i 'TBD' planning-artifacts/pilot.md` and confirm zero matches before staging. If any field is genuinely not-yet-knowable, pause and clarify with the dev — do NOT commit a file with TBD under a required-concrete-value AC.
  - [x] Run scoped prettier: `npx prettier --write planning-artifacts/pilot.md`. Do NOT run `npm run format` globally — it would rewrite pre-existing drift in other `planning-artifacts/` files and violate AC #15. Confirm `git diff --stat` after formatting shows only `planning-artifacts/pilot.md`.

- [x] **Task 3 — Verify regression-free (AC: #10–#17)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- BMAD-METHOD/` → empty.
  - [x] `git diff --stat -- src/tools/clickup/` → empty.
  - [x] `git diff --stat -- src/custom-skills/` → empty.
  - [x] `git diff --stat -- _bmad/` → empty.
  - [x] `git diff -- planning-artifacts/PRD.md planning-artifacts/deferred-work.md planning-artifacts/README.md planning-artifacts/epics/ planning-artifacts/stories/` shows only this story's own file plus the sprint-status hop from the `bmad-create-story` workflow (no other edits).
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (vendor-tree exclusions per AC #15).
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors (7 pre-existing warnings in `tests/support/litellm-helper.mjs`, unchanged).
  - [x] `npm run format` → no diff outside this story's new file and the workflow-driven sprint-status bump. (Scoped run; see Completion Notes.)
  - [x] `npm test` → 234 passing / 0 failing, matches AC #16 baseline exactly.

- [x] **Task 4 — Commit (AC: all)**
  - [x] Stage in this order: `planning-artifacts/pilot.md`, `planning-artifacts/stories/5-1-choose-pilot-project.md` (this story file's status transition to `review` on first commit, `done` on final commit — match the convention used by stories 3-7 and 3-8), `planning-artifacts/sprint-status.yaml`.
  - [x] Commit message: `feat(planning): record pilot project decision via story 5-1`
  - [x] Body:

    ```
    Add planning-artifacts/pilot.md recording the EPIC-5 pilot selection:
    named project, repo, default branch, stack, and maintainers; named
    epic with goal, story-count estimate, and duration; ClickUp workspace
    and space coordinates; selection rationale mapping to EPIC-5's
    small-scope / low-risk / active criteria with concrete signals;
    known risks and mitigations; and the decision record (deciders,
    date, status = approved).

    Stories 5-2 through 5-9 consume this file as their single source of
    truth for pilot coordinates. CLICKUP_API_KEY is intentionally not
    recorded — it is a per-user env var per the Auth bullet in PRD
    §"Non-functional requirements".

    Depends on EPIC-1 and EPIC-2 (both done). EPIC-3 merged 2026-04-24
    (story 3-9 plus retrospective); 5-1 now unblocked to proceed.

    Refs: EPIC-5, story 5-1-choose-pilot-project.
    ```

## Dev Notes

### Why this is a story and not just a conversation

EPIC-5's value is measurable outcomes: one pilot completed end-to-end, friction captured, refinements merged, go/no-go decision recorded. Every one of those outcomes (stories 5-2 through 5-9) references a pilot project that must be named somewhere stable. Without 5-1, story 5-6's "friction log" has no object, story 5-9's "retro" has no baseline, and story 5-3's "create pilot epic in ClickUp" has no epic name to create. Making the decision an explicit, versioned markdown file — rather than a Slack thread or a line in a retro doc — gives the rest of the epic a stable reference that survives context resets, LLM-session boundaries, and personnel changes.

### Why `planning-artifacts/pilot.md` and not a ClickUp task

Per PRD §"Repo layout" and §"Goal", ClickUp is authoritative for **work-tracking state** (epics, stories, status, sprints). It is not a decision-record store. The pilot selection is a project-level commitment, recorded in the repo alongside the PRD and deferred-work log, and versioned with the code. The ClickUp counterpart is the epic task that story 5-3 will create — that task references the pilot selection, but the selection itself lives here. This matches the existing pattern where PRD.md, epic files, and deferred-work.md all live in `planning-artifacts/` rather than in ClickUp descriptions.

### Why a structured schema (eight H2 sections, exact fields) rather than free-form prose

Stories 5-2 through 5-9 will programmatically or semi-programmatically consume fields from this file — e.g., story 5-3 needs the epic name and goal verbatim to create the ClickUp task body; story 5-9's retro needs the decision date and status for the go/no-go timeline. A free-form decision memo makes those downstream reads brittle. Fixing the schema in AC #2–#9 gives later stories a stable contract: read section X, find bullet Y, consume value Z. If 5-9's retro discovers that the schema was insufficient, the remedy is a schema amendment in 5-7 (refinement) — not a retroactive rewrite of the decision record.

### Why the agent cannot pick the pilot unilaterally

The pilot selection weighs organizational signals — team-lead availability, project ownership, political appetite for a new workflow, release windows — that are not present in the bmad-mcp-server repo. The Dev agent reads the repo state; it does not read Slack, org charts, or calendars. Per EPIC-3's step 7 (dev clarification pattern), when a field cannot be derived from a reasonable default, the agent MUST halt and ask the dev rather than fabricate an answer. Task 1 makes that explicit: every field in AC #3–#8 requires either a dev-provided value or a pointer to where the value can be derived. The grep check against "TBD" in Task 2 is a final safety net against a half-filled file.

### What stories 5-2 through 5-9 will consume from this file (for schema stability)

- **Story 5-2** reads the `## Pilot project` bullets to know which repo to clone and which `planning-artifacts/` directory to seed with PRD + architecture.
- **Story 5-3** reads `## Pilot epic` (epic name + goal) and `## ClickUp coordinates` (workspace, space, backlog list) to create the ClickUp Backlog task.
- **Story 5-4** reads `## Pilot epic` (epic goal) and the pilot's seeded PRD (from 5-2) to draft ≥3 stories as subtasks.
- **Story 5-5** reads one of the subtasks from 5-4 by task-ID (passed in-session), not from this file directly.
- **Story 5-6** reads `## Known risks` as the starter template for the friction log (known → observed → translated).
- **Story 5-7** reads `## Selection rationale` to check that the refinements still align with the original pilot criteria; if the refinements would invalidate the original rationale, that is itself a friction signal for story 5-9.
- **Story 5-8** reads `## ClickUp coordinates` and the pilot's own PRD to write the team-facing quickstart's "try it on the pilot project" worked example.
- **Story 5-9** reads `## Decision` (deciders, date, status) and updates status to `completed` or `abandoned`; appends a new `## Change log` row with the go/no-go outcome.

### Status field semantics (mapped to the `## Change log` row)

- `proposed` — selection drafted, awaiting team-lead sign-off. Intermediate; story 5-1 is NOT `done` at this state.
- `approved` — all deciders have signed off; this is the target state for 5-1's `done` commit. Pilot has not started execution yet.
- `in-progress` — story 5-3 has merged (ClickUp epic exists); pilot is actively running. Transitioned by story 5-3's merge, not by this story.
- `completed` — story 5-9 has merged with a go decision. Transitioned by 5-9.
- `abandoned` — story 5-9 has merged with a no-go decision, or the pilot was halted mid-flight (in which case the `## Change log` explains why). Transitioned by 5-9 or by an explicit intervening story if the pilot is killed before 5-9.

### On not recording secrets

`CLICKUP_API_KEY` is a per-user personal token (PRD §Env vars). It MUST NEVER appear in `planning-artifacts/pilot.md`, in the commit, in a comment, or in a log. AC #5 forbids it explicitly. `CLICKUP_TEAM_ID` is team-shared and safe to record — it identifies the workspace, not a person. If the pilot requires a separate service-account token (e.g., for CI-driven story creation in a future iteration), that is out of scope here; record the requirement as a risk under `## Known risks` and point to the secret manager where the token lives.

### Dependency on EPIC-3 (clarification)

EPIC-5's header lists EPIC-1, EPIC-2, and EPIC-3 as dependencies. Strictly, that is the dependency for **running the pilot end-to-end** (stories 5-2 through 5-9). For **recording the pilot decision** (this story), only EPIC-1 and EPIC-2 must be complete — the decision can be made and committed before story 3-9 merges.

The CS trigger (story-creation mode, used by story 5-4) was wired in story 2-7 and is already operational. The DS trigger (implementation mode, first needed by story 5-5) is wired by story 3-9. So **story 5-5 is the first story in EPIC-5 that requires 3-9 to have merged**; everything upstream of 5-5 can proceed independently.

Pragmatic sequence:

1. Story 3-9 merges → DS trigger is wired → `clickup-dev-implement` is reachable end-to-end.
2. Story 5-1 merges → pilot decision is recorded.
3. Stories 5-2 and 5-3 merge → pilot project has PRD/architecture and a ClickUp epic.
4. Stories 5-4 through 5-9 run the pilot and close the epic.

Steps 1 and 2 can reorder without harm; step 4 is where both must be in place. This is not a contradiction of EPIC-5's dependency note — it is a finer-grained reading of it.

### What "small scope, low-risk, active" means in practice

- **Small scope** — one epic can credibly finish within the duration named in AC #4. If the epic needs more than ~2 weeks or more than ~6 stories, the pilot is likely too large for a first-time exercise of the ClickUp-authoritative flow; pick a smaller epic within the same project, or pick a different project.
- **Low risk** — a botched pilot does not cause customer-visible harm. Prefer internal tools, unreleased features, or bounded refactors. Avoid: production hotfixes, customer-facing API changes, anything gated by a release window.
- **Active** — the project has had commits in the last ~30 days, and the team lead confirms availability for the pilot window. A dormant project is the wrong pilot target because friction will be indistinguishable from staleness.

These are guidelines, not hard rules. The `## Selection rationale` fields force explicit evidence against each criterion; if the selected project is a marginal fit on one axis but strong on the others, record that honestly — story 5-9's retro will evaluate whether the marginal fit affected outcomes.

### References

- [EPIC-5 §Goal](../epics/EPIC-5-pilot-iterate.md) — "Run the full ClickUp-first BMAD flow on one real project and one real epic."
- [EPIC-5 §Outcomes](../epics/EPIC-5-pilot-iterate.md) — "One pilot project has PRD + architecture in planning-artifacts/." and downstream outcomes consumed by this decision record.
- [EPIC-5 §Stories bullet 1](../epics/EPIC-5-pilot-iterate.md) — "Choose pilot project (small scope, low-risk, active)."
- [EPIC-5 §Dependencies](../epics/EPIC-5-pilot-iterate.md) — EPIC-1/2/3 complete; EPIC-4 recommended.
- [PRD §Goal](../PRD.md) — ClickUp as single source of truth; zero BMAD install per project.
- [PRD §"Non-functional requirements" (Auth bullet)](../PRD.md) — per-user `CLICKUP_API_KEY`; team-shared `CLICKUP_TEAM_ID`.
- [PRD §Repo layout](../PRD.md) — `planning-artifacts/` pattern for per-project PRD, architecture, and (by extension) pilot decision records.
- [PRD §ClickUp layout](../PRD.md) — Backlog list + Sprint folder convention the pilot exercises.
- [PRD §"Risks / assumptions" (R1)](../PRD.md) — cross-list subtask quirk flagged as a residual risk the pilot may observe.
- [PRD §Success criteria](../PRD.md) — "One pilot project completes one epic end-to-end without falling back to file-based stories." This is the pilot's north star.
- [Story 3-8](./3-8-dev-clarification-prompt.md) — step 7 clarification pattern the agent uses when a pilot field cannot be derived from a reasonable default.
- [Story 3-7](./3-7-non-blocking-assumption-pattern.md) — step 6 assumption pattern; out of scope for 5-1 because every required field in AC #3–#8 must be concrete, not assumed.
- [Story 2-7](./2-7-config-toml-wiring.md) — CS trigger wiring that stories 5-4 will exercise.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) via Claude Code CLI, session dated 2026-04-24.

### Debug Log References

N/A — human-judgment story. The agent interviewed the dev-in-session for fields in AC #3–#8, scaffolded `planning-artifacts/pilot.md`, and ran the Task 3 regression guards. No code paths exercised beyond `npm run build / lint / test`.

AC #16 baseline re-verification: story 3-9 (`09faab4`) and its retrospective (`91dddef`) shipped markdown/TOML only — zero `.ts` changes — so the expected test-count delta across 3-9 → 5-1 is zero, and the 234-passing / 0-failing baseline from story 3-6 carries through unchanged. `npm test` on the 5-1 commit confirmed 234/234 matching that carry-through baseline.

### Completion Notes List

- **AC #2 spec discrepancy (resolved 2026-04-24 via code-review follow-up):** AC #2 prose originally said "exactly eight H2 (`##`) sections — no more, no fewer" but the enumerated list contained only seven (`## Pilot project`, `## Pilot epic`, `## ClickUp coordinates`, `## Selection rationale`, `## Known risks`, `## Decision`, `## Change log`). Implemented seven — the enumerated list is the authoritative field-schema spec. Resolved by amending AC #2 prose from "eight" → "seven"; `pilot.md` is unchanged (already ships seven sections matching the enumerated list).
- **PAT leak found in pilot project:** The `Alpharages/lore` repo's `origin` remote URL embeds a GitHub Personal Access Token. Recorded in `pilot.md` §"Known risks" as a risk/mitigation pair (rotate + rewrite `origin` before story 5-3). Token value itself is NOT recorded anywhere in this commit. Pilot maintainer confirmed intent to rotate the PAT after story 5-3 runs.
- **Prettier scope deviation (resolved 2026-04-24 via code-review follow-up):** Task 2 originally said "Run `npm run format`". The project-level `npm run format` script is `prettier --write .`, which when run globally rewrites pre-existing drift in `planning-artifacts/stories/3-7-non-blocking-assumption-pattern.md`, `planning-artifacts/stories/3-9-dev-config-toml-wiring.md`, and `planning-artifacts/epic-3-retro-2026-04-23.md` — a direct AC #15 violation. Used `npx prettier --write planning-artifacts/pilot.md` (scoped) instead. Resolved by amending Task 2 to require scoped prettier and explicitly forbid the global `npm run format`. The pre-existing drift in the other files is unrelated to this story and should be addressed by a separate chore commit.
- **Decider dual-role (AC #8 clarified 2026-04-24 via code-review follow-up):** Khakan Ali serves as both the bmad-mcp-server maintainer and the Lore Platform team lead. Recorded as a single named decider with "dual role" annotation — not as two fabricated names. AC #8 originally said "at minimum the bmad-mcp-server maintainer and the pilot project's team lead"; the dev read this as "both roles represented" rather than "two distinct humans". Resolved by amending AC #8 to state explicitly that dual-role annotation is acceptable when one person holds both roles — no change to `pilot.md` §Decision.
- **Repo state caveat on "Active":** The `lore` repo has zero commits pushed to `main`. "Active" evidence is therefore prospective (Sprint 1 list 2026-04-27 → 2026-05-10 + team-lead availability) rather than historical. This framing is honest per the story's §"What 'small scope, low-risk, active' means in practice" guidance — marginal fit on one axis, strong on others — and is explicitly flagged in both `## Selection rationale > ### Active` and `## Known risks` bullet #1.
- **No branch change:** Committed on the currently-checked-out branch `feat/1-2-wire-register-functions`, which has been the working branch across recent planning-artifact commits (91dddef, 09faab4, 220a3ec, etc.). Story 5-1 did not prescribe a branch; dev continued the established pattern.

### File List

**New**

- `planning-artifacts/pilot.md` — pilot decision record (AC #1–#9)

**Modified**

- `planning-artifacts/sprint-status.yaml` — `5-1-choose-pilot-project: ready-for-dev` → `review`; `last_updated` bumped (AC #17)
- `planning-artifacts/stories/5-1-choose-pilot-project.md` — `Status: ready-for-dev` → `Status: review`; task checkboxes marked; Dev Agent Record sections filled; Change Log row added

**Deleted**

- (none)

### Review Findings

Code review run 2026-04-24 via `bmad-code-review` workflow against commit `76d570a`. Three adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) produced 18 raw findings, triaged to: 0 intent-gap / 3 bad-spec / 2 patch / 5 defer / 8 rejected-as-noise.

**Bad-spec amendments applied in this follow-up commit (no change to `pilot.md`):**

- **BS-1 (AC #2 eight vs seven):** Amended AC #2 prose from "exactly eight H2 sections" → "exactly seven" to match the enumerated list, which was and remains the authoritative schema contract for downstream stories 5-2 through 5-9. Completion Note #1 updated to reflect resolution.
- **BS-2 (AC #8 decider ambiguity):** Amended AC #8 to state explicitly that dual-role annotation is acceptable when one person holds both the maintainer and team-lead roles. Resolves the ambiguity between "both roles represented" and "two distinct humans". Completion Note on dual-role updated.
- **BS-3 (Task 2 prettier scope):** Amended Task 2 final subtask to require scoped `npx prettier --write planning-artifacts/pilot.md` and explicitly forbid global `npm run format` (which would rewrite pre-existing drift in other planning-artifacts files and violate AC #15). Completion Note on prettier scope deviation updated.

**Patch fixes applied in this follow-up commit:**

- **P-1 (Task 4 Body checkbox):** Changed `- [ ] Body:` → `- [x] Body:` — the commit body was delivered; the unchecked box was stale documentation.
- **P-2 (AC #16 baseline re-verification not evidenced):** Added a line to Debug Log References documenting why the 234-passing baseline carries through from story 3-6 unchanged (stories 3-7, 3-8, 3-9, and the EPIC-3 retrospective all shipped markdown/TOML only, zero `.ts` delta).

**Deferred findings (no action on this branch):**

- **D-1 (PAT leak in `Alpharages/lore` `origin` URL):** Time-sensitive — maintainer to rotate the PAT and rewrite `origin` in the `lore` repo before story 5-3 runs, per the mitigation already recorded in `pilot.md` §Known risks bullet 2. Action lives in the pilot repo, not here.
- **D-2 ("Active" criterion is prospective, not historical):** Dev explicitly framed as marginal-fit-on-one-axis per the story's own §"What 'small scope, low-risk, active' means in practice" guidance. Story 5-9's retro is the evaluation point.
- **D-3 (Change Log 3-column schema may surprise downstream parsers):** Speculative future-story concern; AC #9 documents the deviation intentionally. Flag when stories 5-2 through 5-9 are drafted.
- **D-4 (AC #16 build/lint/format/test INDETERMINATE in-review):** Dev's 234/234 claim is plausible given the markdown-only diff; CI run or local re-run closes this.
- **D-5 (append-only Change Log pattern — 5-9 reuse risk):** Speculative; story 5-9's spec can reinforce the append-only pattern when drafted.

**Rejected as noise (8):** AC #10 "single file" misread as strict file count; AC #17 misread as disallowing the review-state transition; "zero commits vs default branch = main" false contradiction; SHA `220a3ec` actually exists in history; 2-7/3-9 near-slug is intentional; "baseline" prose quibble; sprint-status `generated` date correctly pre-story; email in `pilot.md` is permitted by AC #3.

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-23 | Story drafted from EPIC-5 bullet 1 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-23 | Validation pass (`bmad-create-story` checklist): tightened header blockquote to deliverable + human-judgment framing, cross-linking dependency reasoning to Dev Notes (L1); clarified AC #2's eight-H2 contract vs. the required intro paragraph (E2); reworded AC #7 risk-minimum (L2); reworded AC #9 Change-log convention note (E3); corrected AC #16 baseline from 3-8 to 3-9 (E1); shortened AC #17 (O1); folded AC #18 into AC #15 (O2); removed redundant out-of-scope bullet about bmad-agent-dev.toml (O3); front-loaded CS/DS trigger facts in Dev Notes §"Dependency on EPIC-3" (L3); added explicit `grep -n -i 'TBD'` command to Task 2 (L4). C1 (sprint-status `last_updated` bump) deliberately skipped: user reverted sprint-status to keep 5-1 / epic-5 at `backlog` pending 3-9 completion. |
| 2026-04-24 | `bmad-create-story` step-6 transitions applied now that story 3-9 (`09faab4`) and EPIC-3 retrospective (`91dddef`) are merged: `sprint-status.yaml` updated — `epic-5` backlog → in-progress, `5-1-choose-pilot-project` backlog → ready-for-dev, `last_updated` bumped to 2026-04-24. Story body unchanged (human-judgment fields in AC #3–#8 remain for the dev implementing this story).                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-24 | Validation pass (`bmad-create-story` checklist): fixed PRD cross-reference anchors (O1) — `§Auth` rewritten to `§"Non-functional requirements" (Auth bullet)` at AC #5, Task 1, commit body, and References; `§R1` / `§Risks R1` rewritten to `§"Risks / assumptions" (R1)` at AC #7 and References. Tightened Task 4 commit body (O2) to reflect that EPIC-3 is now merged (2026-04-24) rather than describing 3-9 as a future event. No AC, Tasks, or Dev Notes semantics changed.                                                                                                                                                                                                                                                                                                                           |
| 2026-04-24 | Implemented via Dev agent (Claude Opus 4.7, 1M context): `planning-artifacts/pilot.md` created recording Lore Platform as pilot with `lore-memory-mcp: DB schema, Docker, basic MCP tools` as the pilot epic, Sprint 1 window 2026-04-27 → 2026-05-10, decider Khakan Ali (dual role, status=approved). All Task 3 regression guards passed (234/234 tests). Status → review. See Completion Notes for AC #2 "eight vs seven" spec discrepancy and `npm run format` scope deviation.                                                                                                                                                                                                                                                                                                                           |
| 2026-04-24 | Code-review follow-up via `bmad-code-review` workflow against commit `76d570a`: applied 3 bad-spec amendments (AC #2 eight→seven, AC #8 dual-role clarification, Task 2 scoped prettier) and 2 patch fixes (Task 4 Body checkbox, AC #16 baseline re-verification note in Debug Log). `pilot.md` and `sprint-status.yaml` unchanged; only this story file edited. 5 findings deferred (D-1 through D-5), 8 rejected as noise. See Review Findings for full triage. Status remains `review` pending maintainer sign-off to transition to `done`.                                                                                                                                                                                                                                                                |
