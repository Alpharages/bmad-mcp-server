# Story 5.2: Seed pilot project's `planning-artifacts/PRD.md` and `architecture.md`

Status: review

Epic: [EPIC-5: Pilot + iterate](../epics/EPIC-5-pilot-iterate.md)

> Second story in EPIC-5. The work lands in the **pilot repo** (`Alpharages/lore` at `/Volumes/Data/project/products/alpharages/lore`), not in `bmad-mcp-server`. Three files move from `docs/` to `planning-artifacts/` inside the pilot repo — `01-prd.md` → `planning-artifacts/PRD.md`, `03-architecture.md` → `planning-artifacts/architecture.md`, `02-technical-spec.md` → `planning-artifacts/tech-spec.md` — and `docs/README.md` is rewritten to point at the new canonical locations. The bmad-mcp-server repo side of this story is narrow: the story file itself plus the `bmad-create-story` workflow's sprint-status transition. No bmad-mcp-server code, no tests, no custom-skills changes.
>
> **Why these three files.** The `clickup-create-story` skill (CS trigger, wired by story 2-7; used in story 5-4) runs `step-01-prereq-check` against the pilot repo and **aborts the skill run** if `planning-artifacts/PRD.md` or `planning-artifacts/architecture.md` is missing (see `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` lines 65–80). Story 5-4 cannot start until this story lands. The description composer (`step-04-description-composer.md`) additionally looks for `planning-artifacts/tech-spec.md` and appends a `See also:` footer pointer when present (line 104 of the composer) — seeding it now gives story 5-4 richer story descriptions at no extra cost.
>
> **Blocker before first push.** The `lore` repo's `origin` URL currently embeds a GitHub Personal Access Token (recorded as Known Risk #2 in `planning-artifacts/pilot.md`, deferred as D-1 in story 5-1's Review Findings). The pilot repo has one local bootstrap commit (`a28f2b3` — `.gitignore` + `docs/*.md`) that has never been pushed to `origin/main`; this story ships the first push with rotated credentials. The PAT **must** be rotated and `origin` rewritten to the clean URL before any push is attempted. Task 0 surfaces this prerequisite explicitly. No value of this story's content should mention the token, and no file committed here should contain it.
>
> **Human-judgment elements.** Two decisions in this story require dev-in-session input rather than a reasonable default: (a) whether the ported PRD/architecture files should be updated to remove BuildClear-era framing in favour of Lore-native framing, and (b) whether `docs/02-technical-spec.md` moves alongside PRD+architecture or stays in `docs/`. Defaults are provided for both (keep content byte-identical on the move; move the tech-spec alongside), but Task 1 uses the step-07 dev-clarification pattern if the dev disagrees.

## Story

As the **bmad-mcp-server platform maintainer acting on the Lore Platform pilot**,
I want `planning-artifacts/PRD.md`, `planning-artifacts/architecture.md`, and `planning-artifacts/tech-spec.md` to exist in the `Alpharages/lore` repo with content ported from the existing `docs/01-prd.md`, `docs/03-architecture.md`, and `docs/02-technical-spec.md` drafts,
so that story 5-3 can create the pilot epic as a ClickUp Backlog task (its description text will reference these files as the authoritative pilot context), story 5-4's invocation of the Dev agent in story-creation mode can pass `step-01-prereq-check` and compose rich story descriptions via `step-04-description-composer` without fabrication, and the repo layout in the pilot matches the pattern mandated by [PRD §Repo layout](../PRD.md) (`planning-artifacts/` + `docs/` with no `implementation-artifacts/`, no `epics/`, no `stories/`).

## Acceptance Criteria

### Pilot-repo file contract (work lands in `Alpharages/lore`)

1. Three files exist at the pilot repo's `planning-artifacts/` directory — absolute paths on the dev's machine: `/Volumes/Data/project/products/alpharages/lore/planning-artifacts/PRD.md`, `/Volumes/Data/project/products/alpharages/lore/planning-artifacts/architecture.md`, and `/Volumes/Data/project/products/alpharages/lore/planning-artifacts/tech-spec.md`. All three are new to `planning-artifacts/` — `git diff --stat -- planning-artifacts/` in the `lore` repo, run against the pre-story tree, MUST show these three files added.

2. The contents of the three new files are byte-equivalent to the source files in `docs/` modulo an optional leading H1 + metadata block rewrite (AC #5). The default and expected behaviour is a verbatim `git mv` that preserves full git-blame continuity across the rename; any deviation from byte-identical content MUST be justified in Completion Notes and limited to the first ≤10 lines of each file (title, version, status, date, author metadata). The body sections (problem, goals, requirements, architecture components, DB DDL, tool schemas, etc.) are byte-unchanged. This is enforced by:
   - `git diff --find-renames=90% HEAD -- docs/01-prd.md planning-artifacts/PRD.md` MUST detect a rename (similarity ≥ 90%).
   - `git diff --find-renames=90% HEAD -- docs/03-architecture.md planning-artifacts/architecture.md` MUST detect a rename (similarity ≥ 90%).
   - `git diff --find-renames=90% HEAD -- docs/02-technical-spec.md planning-artifacts/tech-spec.md` MUST detect a rename (similarity ≥ 90%).

3. The corresponding source paths `docs/01-prd.md`, `docs/03-architecture.md`, and `docs/02-technical-spec.md` no longer exist in the pilot repo's working tree. `ls docs/` in the pilot repo post-story MUST show exactly one file: `README.md` (updated per AC #4).

4. `docs/README.md` is rewritten to reflect the new canonical locations. The updated file MUST:
   - Keep the H1 title `# Lore Platform — Documentation` unchanged.
   - Replace the intro paragraph with a two-to-four-sentence paragraph stating that authoritative PRD / architecture / tech-spec content now lives in `planning-artifacts/` (consumed by BMAD agents via the `bmad-mcp-server` ClickUp integration) and that `docs/` remains the location for narrative / onboarding / diagram-heavy team reference material.
   - Replace the `## Documents` table to point at the three new paths (`../planning-artifacts/PRD.md`, `../planning-artifacts/architecture.md`, `../planning-artifacts/tech-spec.md`). The table columns (`File | Document | Description`) are preserved; only the link targets change.
   - Preserve the `## What Is Lore Platform?`, `## Key Design Decisions`, `## Build Order (When Implementing)`, and `## Related` sections byte-for-byte. (These are framing text, not links that the move broke.)

5. The ported files' leading metadata blocks MAY be normalised in a **single diff hunk per file** limited to the first ≤10 lines. Permitted normalisations: dropping the legacy `Author: BuildClear Product Team` line from `planning-artifacts/PRD.md` (pilot context is Alpharages / Lore Platform, not BuildClear); updating the `Date:` field to `2026-04-24` or leaving the original `March 2026` intact; updating `Status: Draft` to `Status: Pilot` or leaving `Draft` intact. No other content edits are permitted in this story; substantive content revision is explicitly deferred to story 5-7 (refinements after friction capture).

6. After the move, the pilot repo's `planning-artifacts/` directory contains **exactly three files** — no sub-directories, no index file, no sprint-status.yaml, no epics or stories. Per [bmad-mcp-server PRD §Repo layout](../PRD.md), pilot projects ship `planning-artifacts/` with PRD / architecture / optional UX / optional tech-spec only; epics and stories live in ClickUp. `ls -1 planning-artifacts/` in the pilot repo MUST print exactly:

   ```
   PRD.md
   architecture.md
   tech-spec.md
   ```

7. `planning-artifacts/PRD.md` in the pilot repo contains the section headings required by `clickup-create-story`'s `step-04-description-composer` (line 56 of that file): a `## Problem` (or `§2. Problem Statement` equivalent), a `## Goal` (or `§3. Vision` / `§4.1 Goals` equivalent), and a clearly-identifiable "Functional requirements" section (the existing `§7. Feature Requirements` with `FR-01` through `FR-48` bullets satisfies this). These section headings are ALREADY present in `docs/01-prd.md`; AC #5's single-hunk-per-file constraint preserves them. Verify by running `grep -E '^## ' planning-artifacts/PRD.md` in the pilot repo and confirming the presence of sections covering problem, goal/vision, and feature requirements.

8. `planning-artifacts/architecture.md` in the pilot repo contains the section headings required by the description composer's "Technical Context" bullet (tech stack, key patterns, constraints): a clearly-identifiable architecture-overview section, a component / structure section, and a data-model or deployment section. The existing `§1. Architecture Overview`, `§3. Component Architecture`, and downstream sections in `docs/03-architecture.md` satisfy this. Verify by running `grep -E '^## ' planning-artifacts/architecture.md` and confirming at least one overview, one component-structure, and one data/deployment section is present.

### Pilot-repo secret-hygiene guards

9. The pilot repo's `origin` remote URL MUST NOT embed any GitHub Personal Access Token before any push attempted by this story. `git -C /Volumes/Data/project/products/alpharages/lore remote -v` MUST print a URL in one of these exact forms: `https://github.com/Alpharages/lore.git` (HTTPS, no credentials), `git@github.com:Alpharages/lore.git` (SSH), or an equivalent form with no embedded secret. The string `ghp_` (GitHub PAT prefix) MUST NOT appear in the output. If the `origin` URL still embeds a PAT at Task 0 check time, the story HALTS until the PAT is rotated (on github.com) and `origin` is rewritten locally.

10. No file committed by this story in the pilot repo may contain the literal string `ghp_` or any other credential prefix (`github_pat_`, `ghs_`, `ghu_`, `ghr_`, `sk-`, `pk_`). Confirm by running `git diff --cached | grep -Ei 'ghp_|github_pat_|ghs_|ghu_|ghr_|sk-[A-Za-z0-9]{20}|pk_[A-Za-z0-9]{20}'` against the staged tree before committing — the command MUST return zero matches. (The bmad-mcp-server side of this story — see AC #12–#17 — does not touch secret material; this guard is a belt-and-suspenders check against accidental paste during porting.)

11. The `bmad-mcp-server` repo's `planning-artifacts/pilot.md` §Known risks bullet #2 ("PAT embedded in `origin` URL") has its mitigation enacted as part of this story's Task 0. If Task 0 cannot confirm the rotation (e.g. the dev does not have the github.com web UI open and credentials on hand), the story HALTS — story 5-2 does not push un-rotated credentials, and story 5-3 (which needs a working push path) cannot proceed until the rotation is done. No amendment to `pilot.md` is required by this story — the risk bullet stays in place for the record; story 5-9's retro will evaluate whether it should be retroactively marked as mitigated.

### Pilot-repo commit contract

12. The pilot repo's `main` branch is the push target. Pre-story state is "`main` has exactly one bootstrap commit `a28f2b3` tracking `.gitignore`, `docs/README.md`, `docs/01-prd.md`, `docs/02-technical-spec.md`, and `docs/03-architecture.md` — and `origin/main` is not yet published (upstream is gone)" (confirmed by `git -C /Volumes/Data/project/products/alpharages/lore log --oneline` showing a single SHA and `git -C ... status` reporting "upstream is gone"). Post-story state is "`main` has exactly two commits — `a28f2b3` + this story's single atomic Task 2 commit — and `main` is published to `origin/main`." The commit MUST be pushed to `origin/main` (first publish), and the push MUST succeed with the rotated credentials from AC #9–#11. If the dev opens a PR against `main` instead of pushing directly, that is acceptable only if the PR is merged as part of this story's execution — story 5-3 cannot start with a pending PR, because it needs to reference the pilot repo URL and the merged canonical `planning-artifacts/` paths in the ClickUp epic description.

13. The pilot repo's Task 2 commit message MUST follow Conventional Commits format (matching bmad-mcp-server's own convention since Khakan Ali is dual-role): `chore(docs): seed planning-artifacts from docs for BMAD pilot` or a close equivalent. The commit body MUST reference: (a) the source paths moved (`docs/01-prd.md`, `docs/02-technical-spec.md`, `docs/03-architecture.md`), (b) the target paths (`planning-artifacts/PRD.md`, `planning-artifacts/tech-spec.md`, `planning-artifacts/architecture.md`), (c) a pointer to bmad-mcp-server's `planning-artifacts/pilot.md` for pilot context, and (d) an explicit statement that `docs/README.md` was rewritten to point at the new locations.

### bmad-mcp-server-repo regression guards (this repo)

14. No TypeScript source files are added or modified in the bmad-mcp-server repo. `git diff --stat -- 'src/**/*.ts'` MUST be empty.

15. No files under `BMAD-METHOD/`, `src/tools/clickup/`, `src/custom-skills/`, or `_bmad/` in the bmad-mcp-server repo are created, modified, or deleted. For each of those roots, `git diff --stat -- <root>` MUST be empty.

16. `planning-artifacts/PRD.md`, `planning-artifacts/pilot.md`, `planning-artifacts/deferred-work.md`, `planning-artifacts/README.md`, `planning-artifacts/epic-3-retro-2026-04-23.md`, all files under `planning-artifacts/epics/`, and all existing files under `planning-artifacts/stories/` (other than the new `5-2-seed-pilot-planning-artifacts.md`) are byte-unchanged in the bmad-mcp-server repo. `git diff -- planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/deferred-work.md planning-artifacts/README.md planning-artifacts/epic-3-retro-2026-04-23.md planning-artifacts/epics/ $(git ls-files planning-artifacts/stories/ | grep -v '5-2-seed-pilot-planning-artifacts.md')` MUST be empty. The vendor-tree exclusions listed in story 1-1 — `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS` — remain byte-unchanged as well.

17. `npm run build`, `npm run lint`, `npm run format`, and `npm test` pass in the bmad-mcp-server repo with no new failures vs. the merge commit of story 5-1 (expected test baseline: **234 passing**, 0 failing — unchanged since story 3.6 because 3-7 through 3-9 and 5-1 all shipped markdown/TOML only). Since no `.ts` lands in this story in this repo either, the expected test-count delta is zero. **Re-verify the baseline against the actual HEAD before committing** — if anything unexpected landed between 5-1 and this story, update the baseline in the commit message accordingly.

18. `planning-artifacts/sprint-status.yaml` transitions are workflow-managed: the `bmad-create-story` workflow sets `5-2-seed-pilot-planning-artifacts` from `backlog` → `ready-for-dev` and bumps `last_updated`. The `epic-5: in-progress` line is already correct from story 5-1 and is unchanged by this story. Later transitions (`ready-for-dev` → `review` → `done`) happen via the dev implementing this story; this story's `bmad-create-story` run is responsible for the first `backlog` → `ready-for-dev` transition only.

## Out of Scope (explicitly deferred to later stories)

- Creating the pilot epic as a ClickUp Backlog task — **story 5-3**. That story reads `planning-artifacts/pilot.md` (the pilot decision record from 5-1) and the files seeded here, and creates the ClickUp task. This story does not touch ClickUp.
- Invoking the Dev agent in story-creation mode (CS trigger) to draft pilot stories as ClickUp subtasks — **story 5-4**. That story will be the first real end-to-end exercise of the CS skill against the pilot repo; this story merely makes that exercise possible by satisfying `step-01-prereq-check`.
- Invoking the Dev agent in implementation mode (DS trigger) to land a pilot story end-to-end — **story 5-5**.
- Substantive content revision of the ported PRD / architecture / tech-spec files. The docs are draft quality and contain BuildClear-era framing in places; rewriting them to be Lore-native-only is deferred to **story 5-7** (refinements after friction capture). This story ports the content as-is (AC #5 permits only a narrow single-hunk-per-file metadata normalisation).
- Creating `planning-artifacts/ux-design.md` in the pilot repo. UX is not in scope for the `lore-memory-mcp` pilot epic (backend DB schema + Docker + MCP tools only). Per [bmad-mcp-server PRD §Repo layout](../PRD.md), `ux-design.md` is conditional ("if UX in scope") — not required.
- Creating any epic / story / sprint file in the pilot repo. ClickUp is authoritative for work-tracking state in the pilot repo per [bmad-mcp-server PRD §Goal](../PRD.md). The pilot's `planning-artifacts/` directory ships exactly three files and no other structure.
- Updating `_bmad/` configuration in the pilot repo. The pilot repo does not install BMAD — per [bmad-mcp-server PRD §Goal](../PRD.md) "zero BMAD installation in each project". All BMAD interaction is via the MCP server at runtime.
- Adding a `CLAUDE.md`, `.bmad/`, `.cursor/`, or any other agent-config file to the pilot repo. The pilot exercises BMAD via the central `bmad-mcp-server`; no per-project install.
- Updating `planning-artifacts/pilot.md` in bmad-mcp-server. The Known Risk bullet about the PAT stays as recorded; story 5-9's retro evaluates whether it should be marked mitigated. This story performs the mitigation but does not edit the record.
- Writing team-facing "how to use BMAD+ClickUp" quickstart docs — **story 5-8**. A pilot README or onboarding doc is not part of this story; the `docs/README.md` rewrite is scoped to repairing broken paths after the move, not producing new team-facing content.

## Tasks / Subtasks

- [ ] **Task 0 — Pre-push secret hygiene (AC: #9, #10, #11)**
  - [ ] Run `git -C /Volumes/Data/project/products/alpharages/lore remote -v` and inspect the printed URLs.
  - [ ] If the URL contains `ghp_` or any other credential prefix, HALT and complete the rotation out-of-band before proceeding: (a) revoke the leaked PAT at https://github.com/settings/tokens, (b) generate a replacement PAT only if the team still needs token-based access (SSH is preferred), (c) rewrite the remote: `git -C /Volumes/Data/project/products/alpharages/lore remote set-url origin git@github.com:Alpharages/lore.git` (or the HTTPS clean form), (d) verify with `git -C … remote -v` that no credential remains in the printed URLs, (e) confirm the rotated PAT has been revoked (not just replaced in the URL) on github.com.
  - [ ] If the URL is already clean (no credential prefix), record that in the Dev Agent Record § Debug Log References with the exact output of `git remote -v`.
  - [ ] Do NOT record the old or new PAT value anywhere — commit, comment, log, or this story file.
  - [ ] Confirm to the dev-in-session that secret hygiene is green before proceeding to Task 1.

- [ ] **Task 1 — Confirm porting decisions in-session (AC: #5, step-07 clarification pattern)**
  - [ ] Default: move `docs/01-prd.md` → `planning-artifacts/PRD.md`, `docs/02-technical-spec.md` → `planning-artifacts/tech-spec.md`, `docs/03-architecture.md` → `planning-artifacts/architecture.md` with byte-identical content (no metadata normalisation). If the dev accepts the default, proceed directly to Task 2.
  - [ ] If the dev wants AC #5 metadata normalisation (drop BuildClear author line, bump dates, change status label), ask the dev-in-session explicitly which of the three files the normalisation applies to and what the replacement lines should be. Use the step-07 dev-clarification pattern from EPIC-3 (block, ask one targeted question, wait for reply) rather than guessing.
  - [ ] Confirm with the dev that tech-spec moves alongside the other two files. If the dev prefers to leave `docs/02-technical-spec.md` in place (i.e. only move PRD and architecture), document the deviation in Completion Notes — AC #1, #2, #3, #6 would then cover two files instead of three, and AC #6's exact-file-list reduces to `PRD.md, architecture.md`. Default is to move all three.
  - [ ] Record the decision in the Dev Agent Record § Completion Notes before starting Task 2.

- [ ] **Task 2 — Move the files, rewrite `docs/README.md`, and commit in the pilot repo (AC: #1–#8, #12, #13)**
  - [ ] From the pilot repo root (`cd /Volumes/Data/project/products/alpharages/lore`), run the three moves using `git mv` (NOT `mv` + `git add` — `git mv` is required to preserve similarity detection for AC #2's rename threshold):
    - `git mv docs/01-prd.md planning-artifacts/PRD.md`
    - `git mv docs/02-technical-spec.md planning-artifacts/tech-spec.md` (skip if dev chose to keep tech-spec in docs/ per Task 1)
    - `git mv docs/03-architecture.md planning-artifacts/architecture.md`
  - [ ] If Task 1 chose AC #5 metadata normalisation, apply the single-hunk edit to each affected file NOW (after the `git mv` but before staging). Keep the edit to ≤10 lines at the top of the file; do not touch body content. Stage the edit with `git add`.
  - [ ] Rewrite `docs/README.md` per AC #4: keep H1; replace intro paragraph; update the `## Documents` table link targets to `../planning-artifacts/PRD.md`, `../planning-artifacts/architecture.md`, `../planning-artifacts/tech-spec.md` (the description column also updates to match each document's nature — "Goals, user stories, feature requirements, success metrics" for PRD, "API contracts, tool schemas, algorithms, data models" for tech-spec, "System diagrams, component structure, DB DDL, deployment" for architecture); preserve the other four sections byte-for-byte.
  - [ ] Verify: `ls -1 docs/` prints exactly `README.md`; `ls -1 planning-artifacts/` prints exactly `PRD.md`, `architecture.md`, `tech-spec.md` (sorted); `git status` shows three renames plus one modification (`docs/README.md`).
  - [ ] Run `git diff --cached | grep -Ei 'ghp_|github_pat_|ghs_|ghu_|ghr_|sk-[A-Za-z0-9]{20}|pk_[A-Za-z0-9]{20}'` and confirm zero matches (AC #10).
  - [ ] Verify rename detection: `git diff --find-renames=90% --cached --stat` MUST show three renamed entries, not three delete + three add. If any of the three is reported as delete+add, the similarity fell below 90% — re-check whether the content was altered beyond the AC #5 budget and revert any over-reach.
  - [ ] Commit with the message from AC #13: `chore(docs): seed planning-artifacts from docs for BMAD pilot`. Commit body MUST reference source paths, target paths, a pointer to `Alpharages/bmad-mcp-server:planning-artifacts/pilot.md`, and the `docs/README.md` rewrite.
  - [ ] Push to `origin/main` (first commit to the branch): `git push -u origin main`. Confirm the push succeeds.
  - [ ] Capture `git -C /Volumes/Data/project/products/alpharages/lore log --oneline main` post-push and record in Dev Agent Record § Debug Log References.

- [ ] **Task 3 — Verify bmad-mcp-server regression-free (AC: #14–#17)**
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty (AC #14).
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty (AC #15).
  - [ ] `git diff --stat -- src/tools/clickup/` → empty (AC #15).
  - [ ] `git diff --stat -- src/custom-skills/` → empty (AC #15).
  - [ ] `git diff --stat -- _bmad/` → empty (AC #15).
  - [ ] `git diff -- planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/deferred-work.md planning-artifacts/README.md planning-artifacts/epic-3-retro-2026-04-23.md planning-artifacts/epics/` → empty (AC #16).
  - [ ] For `planning-artifacts/stories/`, run `for f in $(git ls-files planning-artifacts/stories/ | grep -v '5-2-seed-pilot-planning-artifacts.md'); do git diff --quiet -- "$f" || echo "CHANGED: $f"; done` and confirm zero output (AC #16).
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (AC #16 vendor-tree exclusions).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors (7 pre-existing warnings in `tests/support/litellm-helper.mjs` unchanged).
  - [ ] `npx prettier --write planning-artifacts/stories/5-2-seed-pilot-planning-artifacts.md planning-artifacts/sprint-status.yaml` (scoped — the project-level `npm run format` is `prettier --write .` which would rewrite pre-existing drift in `planning-artifacts/stories/3-7-non-blocking-assumption-pattern.md`, `planning-artifacts/stories/3-9-dev-config-toml-wiring.md`, and `planning-artifacts/epic-3-retro-2026-04-23.md`, violating AC #16 — see story 5-1's Completion Notes for the same guardrail).
  - [ ] `npm test` → 234 passing / 0 failing, matches AC #17 baseline exactly.

- [ ] **Task 4 — Commit the bmad-mcp-server side (AC: all)**
  - [ ] Stage in this order: `planning-artifacts/stories/5-2-seed-pilot-planning-artifacts.md` (this story file's status transition: `ready-for-dev` → `review` on first commit, `done` after code review, matching stories 3-7/3-8/5-1), `planning-artifacts/sprint-status.yaml`.
  - [ ] Commit message: `feat(planning): seed pilot planning-artifacts via story 5-2`
  - [ ] Body:

    ```
    Port docs/{01-prd,02-technical-spec,03-architecture}.md →
    planning-artifacts/{PRD,tech-spec,architecture}.md in the pilot repo
    (Alpharages/lore). Three git-renamed files (similarity ≥ 90%) plus a
    docs/README.md rewrite to point at the new canonical locations.

    Unblocks story 5-3 (create pilot epic in ClickUp Backlog) and story 5-4
    (Dev agent story-creation mode — the clickup-create-story skill's
    step-01-prereq-check requires planning-artifacts/PRD.md and
    architecture.md, and the description composer in step-04 uses
    tech-spec.md as a See also: footer pointer when present).

    The pilot repo side of this story enacts pilot.md §Known risks bullet 2:
    the origin URL's embedded GitHub PAT was rotated and the remote rewritten
    to the clean form before any push. The PAT is not recorded in any commit,
    comment, or log.

    The bmad-mcp-server side of this story is narrow: this story file plus
    the sprint-status.yaml transition for 5-2-seed-pilot-planning-artifacts.
    No TypeScript, no custom-skills, no _bmad/, no BMAD-METHOD/ changes.
    Test baseline (234 passing) unchanged.

    Refs: EPIC-5, story 5-2-seed-pilot-planning-artifacts.
    ```

## Dev Notes

### Why this is a story with structural (not content) ACs

Story 5-1's ACs enforced an exact schema (7 H2 sections, named bullets) because stories 5-3 through 5-9 programmatically consume `pilot.md` fields — the schema is the contract. This story inherits that philosophy but with a twist: the content of `planning-artifacts/PRD.md` and `architecture.md` in the pilot repo is **consumed by an LLM** (the Dev agent running `clickup-create-story` in story 5-4), not by a deterministic parser. Which means:

- Byte-exact section titles are not required — the description composer's §"Business Context" and §"Technical Context" bullets are synthesized by the LLM from any PRD / architecture content it can read.
- But section presence matters — AC #7 and AC #8 require Problem, Goal, Functional requirements, architecture overview, component structure, and data-model/deployment sections exist so the LLM has signal to synthesize from.
- And content discipline matters — AC #5 caps the metadata normalisation at ≤10 lines per file and forbids body edits; substantive revision is deferred to story 5-7 after friction is observed. Rewriting the PRD now (pre-pilot) would mean rewriting it again post-pilot when story 5-7 applies refinements, which is wasted work.

The ACs are intentionally structural ("these files exist with these sections, byte-equivalent to these sources") rather than prescriptive ("write a PRD that says X"). The content already exists in `docs/`; the work is transplanting it.

### Why move, not copy

Three reasons:

1. **Single source of truth.** `docs/01-prd.md` and `planning-artifacts/PRD.md` would drift immediately if both existed. The whole pilot premise ([bmad-mcp-server PRD §Problem](../PRD.md)) is that two sources of truth generate distrust.
2. **Git-blame continuity.** `git mv` preserves rename detection at ≥90% similarity, so `git log --follow planning-artifacts/PRD.md` still shows the pre-move history from when the file lived in `docs/`. This matters because the PRD's draft lineage (March 2026 → pilot) is itself context for story 5-9's retro — if the PRD was authored three months before the pilot started and never revised, that is a friction signal.
3. **Canonicalisation signal.** Moving the file signals "this is the version the agents read"; a copy would signal "this is a snapshot; refer to docs/ for the live version" — which is the opposite of what the pilot needs.

The only tradeoff is that `docs/README.md` now points at files in a sibling directory. AC #4 handles that by rewriting the link targets; no other breakage.

### Why tech-spec moves alongside (but is a Task 1 discussion point)

`clickup-create-story`'s `step-04-description-composer.md` line 104: "check whether `planning-artifacts/ux-design.md` or `planning-artifacts/tech-spec.md` exists. If either exists, append a single line to the footer: 'See also: `planning-artifacts/tech-spec.md`.' (or `ux-design.md` as appropriate)."

Seeding `tech-spec.md` gives story 5-4's composed story descriptions an extra breadcrumb for the dev who later picks up the story — a "See also" footer is cheap signal. And `docs/02-technical-spec.md` is already draft quality (902 lines, same draft lineage as the PRD), so the cost is zero — `git mv` + `docs/README.md` link update.

The counter-argument: `tech-spec.md` is conditional per bmad-mcp-server PRD §Repo layout ("tech-spec.md (if needed)"); if the team decides it is not needed for the Lore pilot, leave it in `docs/` and story 5-4's composer just omits the footer. Task 1 surfaces this as a dev-in-session decision with a default of "move it" but respects a "keep in docs/" override.

### Why the pilot repo cannot have a PAT in origin before this story

Three layers of reason:

1. **Push authentication at all.** A PAT in `origin` URL form is how the first `git push` authenticates. If the PAT is rotated (invalidated) before the push, the push fails and this story halts.
2. **Post-rotation leak exposure.** If the rotated PAT is still in `.git/config`, anyone with local filesystem access can recover it (even after github.com revocation, it gets committed if someone ever screenshots terminal output, pastes `git remote -v` into a bug report, etc.). The rotation MUST be followed by a `git remote set-url origin <clean-url>` — AC #9 makes this explicit.
3. **Chain-of-trust for story 5-3.** Story 5-3 creates the ClickUp epic and may reference the pilot repo URL in the epic description. If the URL at the time of epic creation still contained the PAT, the PAT ends up in ClickUp task history (which is not rotated by revoking the GitHub token — it persists in ClickUp's audit log). AC #9's requirement that the remote be clean **before** story 5-2's push (not just before story 5-3) is a belt-and-suspenders guard against accidental paste-from-shell.

Story 5-1's pilot.md §Known risks bullet 2 and Review Findings D-1 both framed the PAT rotation as "before story 5-3". This story tightens that to "before story 5-2's push" because the first push is the first operational interaction with the leaked token, and the cleanup should happen at the earliest operational touchpoint. The one-story slip from 5-3 to 5-2 is defensive, not a contradiction.

### Dependency graph for EPIC-5 stories (reminder from 5-1 §"What stories 5-2 through 5-9 will consume")

- **Story 5-2 (this story)** writes `planning-artifacts/{PRD,architecture,tech-spec}.md` in the pilot repo. Depends on 5-1 merged (pilot.md names the repo). Unblocks 5-3 and 5-4.
- **Story 5-3** creates the pilot epic as a ClickUp Backlog task using the epic name + goal from `planning-artifacts/pilot.md` and the PRD content from this story. Depends on 5-1 and 5-2 merged.
- **Story 5-4** invokes Dev agent (CS trigger) to draft ≥3 ClickUp subtasks under the pilot epic. `step-01-prereq-check` reads `planning-artifacts/PRD.md` and `architecture.md` (seeded by this story). Depends on 5-1, 5-2, 5-3 merged.
- **Story 5-5** invokes Dev agent (DS trigger) to implement one pilot story end-to-end. Depends on 5-4 merged and EPIC-3 merged (confirmed: 3-9 done 2026-04-24).

If story 5-2 slips, stories 5-3 through 5-5 all slip in lockstep — this is the narrowest-timeline story in EPIC-5's critical path.

### What "byte-equivalent" means in AC #2

`git mv A B` with no subsequent edit produces a rename where the new file's contents are byte-for-byte the old file's contents. `git diff --find-renames=90%` detects this as a rename (similarity 100%). If AC #5 metadata normalisation is applied, similarity drops below 100% but should stay ≥ 90% for the ≤10-line diff budget; AC #2 gates on that threshold.

The dev can verify the rename detection worked by running `git diff --find-renames=90% --cached --stat` after staging — the output should show three `R` lines (rename), not three `D` + three `A` lines (delete + add). If the diff reports delete + add for any file, it means (a) the content changed too much for similarity detection, or (b) `git mv` was bypassed in favour of `mv` + `git add`. Either way, back out and redo: `git reset --mixed HEAD` then `git mv` from scratch.

### What bmad-mcp-server's `planning-artifacts/stories/` must NOT look like

Per [bmad-mcp-server PRD §Repo layout](../PRD.md), the pilot repo ships `planning-artifacts/` + `docs/`, with no `implementation-artifacts/`, no `epics/`, no `stories/`, no `sprint-status.yaml`. This story deliberately does not propagate the bmad-mcp-server's own bootstrap layout (epics file, stories directory, sprint-status yaml) into the pilot repo. The pilot's work-tracking state lives entirely in ClickUp once 5-3 creates the epic task.

This is load-bearing: the pilot's success criterion (EPIC-5 outcome bullet 1) is "One pilot project has PRD + architecture in `planning-artifacts/`", not "One pilot project has a full BMAD install." Story 5-2 is the minimum-viable seeding that unblocks the ClickUp-authoritative flow. Any drift toward "let's also add epics.md / stories/ / sprint-status.yaml" would violate [bmad-mcp-server PRD §Success criteria](../PRD.md) bullet 1 ("Zero story/sprint files created in the repo during this flow") and is explicitly listed in this story's Out of Scope.

### CLICKUP_MCP_MODE and other runtime gates — unchanged

This story does not exercise any CS or DS skill step. `clickup-create-story`'s permission gates (`step-01-prereq-check` lines 14–43) run in story 5-4, not here. No `CLICKUP_MCP_MODE` value is required for this story — the work is entirely file-system and git operations on the pilot repo plus markdown additions on this repo. `CLICKUP_API_KEY` is not needed.

### Tooling interaction on the bmad-mcp-server side

- **tsc:** no `.ts` changes, no new exclude entry needed.
- **ESLint:** flat config targets `**/*.{ts,tsx,js,mjs,cjs}`; markdown is out of scope.
- **Prettier:** per Task 3, use scoped `npx prettier --write` on the two files this story touches. Story 5-1's Completion Notes documented the same guardrail after the `npm run format` global rewrite footgun.
- **Vitest:** no test changes, count unchanged at 234.
- **Dep-audit test:** scans `src/**/*.ts`; no `.ts` in this story on either side.

### Tooling interaction on the pilot repo side

The pilot repo (`Alpharages/lore`) has `.idea/` and `docs/` pre-commit. No `package.json`, no test suite, no lint config is present yet. There is no CI workflow to run. The pilot repo's first-commit state after Task 2 is "`.idea/` untracked (ignored or kept local), `docs/README.md` (updated), `planning-artifacts/{PRD,architecture,tech-spec}.md` (new)." Verify `.idea/` is either in a gitignore or intentionally left untracked — if it would be caught by `git add -A`, exclude it from the commit explicitly.

### Why no new unit test

This story adds no TypeScript. The bmad-mcp-server repo's existing tests (234 passing) already cover the CS skill's prereq check and description composer. Story 5-4 will be the first end-to-end exercise of those paths against a real seeded pilot repo; any new test coverage belongs there (or in story 5-7 after friction is observed).

### References

- [EPIC-5 §Stories bullet 2](../epics/EPIC-5-pilot-iterate.md) — "Seed pilot project's `planning-artifacts/PRD.md` and `architecture.md`."
- [EPIC-5 §Outcomes](../epics/EPIC-5-pilot-iterate.md) — "One pilot project has PRD + architecture in `planning-artifacts/`."
- [Story 5-1 §Out of Scope](./5-1-choose-pilot-project.md) — explicitly defers pilot-repo `planning-artifacts/` seeding to this story.
- [Story 5-1 §Dev Notes "What stories 5-2 through 5-9 will consume from this file"](./5-1-choose-pilot-project.md) — "Story 5-2 reads the `## Pilot project` bullets to know which repo to clone and which `planning-artifacts/` directory to seed with PRD + architecture."
- [`planning-artifacts/pilot.md` §Pilot project](../pilot.md) — repo URL, default branch, maintainer — consumed by this story's Task 0 and Task 2.
- [`planning-artifacts/pilot.md` §Known risks bullet 2](../pilot.md) — PAT in origin URL; mitigation enacted by this story's Task 0.
- [PRD §Repo layout](../PRD.md) — `planning-artifacts/` + `docs/` pattern with no `implementation-artifacts/` / `epics/` / `stories/`.
- [PRD §Goal](../PRD.md) — "zero BMAD installation in each project."
- [PRD §Success criteria bullet 1](../PRD.md) — "Zero story/sprint files created in the repo during this flow."
- [`src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`](../../src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md) — `planning-artifacts/PRD.md` + `architecture.md` presence check that this story's output must satisfy.
- [`src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`](../../src/custom-skills/clickup-create-story/steps/step-04-description-composer.md) — §Business Context, §Technical Context, and `See also:` footer consumption that AC #7, #8 trace back to.
- [Story 3-7](./3-7-non-blocking-assumption-pattern.md) §"Non-blocking assumption pattern" — available to the dev during Task 1 if a minor field is underspecified (e.g. whether metadata normalisation applies).
- [Story 3-8](./3-8-dev-clarification-prompt.md) §"Dev clarification pattern" — used by Task 1 when the dev needs to choose between the default (verbatim move) and a normalisation variant. Blocking pattern, not the non-blocking assumption pattern.
- Pilot repo `docs/01-prd.md` (pre-move) — source for `planning-artifacts/PRD.md` content; 472 lines, draft status, March 2026.
- Pilot repo `docs/02-technical-spec.md` (pre-move) — source for `planning-artifacts/tech-spec.md` content; 902 lines.
- Pilot repo `docs/03-architecture.md` (pre-move) — source for `planning-artifacts/architecture.md` content; 723 lines.

## Dev Agent Record

### Agent Model Used

Amelia (BMAD Senior Software Engineer persona) on Claude Opus 4.7 (1M context).

### Debug Log References

Pre-rotation (Task 0, AC #9): `git -C /Volumes/Data/project/products/alpharages/lore remote -v` printed a URL with a `ghp_`-prefixed credential embedded in the HTTPS URL for both `(fetch)` and `(push)`. HALT per AC #9–#11. The old PAT was revoked on github.com by the dev out-of-band; a separate SSH identity (`~/.ssh/github_work_alpharages`) was authorised against the Alpharages organisation. The local `.git/config` was rewritten via `git remote set-url origin git@github.com:Alpharages/lore.git`, and a matching `~/.ssh/config` `Host github.com` entry was created on the dev's machine to route `github.com` through that key (no secret material in either file). The actual PAT string is NOT recorded here, in the commit message, in the pilot repo, or in any log — per AC #10 and the Task 0 "Do NOT record" checkbox.

Post-rotation (Task 0, AC #9 re-verification):

```
$ git -C /Volumes/Data/project/products/alpharages/lore remote -v
origin	git@github.com:Alpharages/lore.git (fetch)
origin	git@github.com:Alpharages/lore.git (push)
```

Pilot-repo rename verification (Task 2, AC #2):

```
$ git diff --find-renames=90% --cached --stat
 docs/README.md                                            | 15 ++++++++++-----
 docs/01-prd.md => planning-artifacts/PRD.md               |  1 -
 docs/03-architecture.md => planning-artifacts/architecture.md |  0
 docs/02-technical-spec.md => planning-artifacts/tech-spec.md  |  0
 4 files changed, 10 insertions(+), 6 deletions(-)
```

Per-file similarity in the commit output: `PRD.md 99%`, `architecture.md 100%`, `tech-spec.md 100%` — the PRD 1% delta is the single-line `Author:` drop permitted by AC #5.

Pilot-repo secret scan (Task 2, AC #10):

```
$ git diff --cached | grep -Ei 'ghp_|github_pat_|ghs_|ghu_|ghr_|sk-[A-Za-z0-9]{20}|pk_[A-Za-z0-9]{20}'
# (zero matches; grep exit code 1)
```

Pilot-repo post-push state (Task 2, AC #12):

```
$ git log --oneline main
4fcaf9b chore(docs): seed planning-artifacts from docs for BMAD pilot
a28f2b3 Add `.gitignore` for common development artifacts and initial product documentation (`docs/01-prd.md`, `docs/02-technical-spec.md`).
$ git status -uno
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit
```

bmad-mcp-server regression checks (Task 3, AC #14–#17): `git diff --stat` against `src/**/*.ts`, `BMAD-METHOD/`, `src/tools/clickup/`, `src/custom-skills/`, `_bmad/` all empty; diff against the AC #16 protected `planning-artifacts/*` files empty; every story file other than `5-2-seed-pilot-planning-artifacts.md` byte-unchanged; vendor-tree exclusions (`.gitignore`, `.eslintignore`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`, `tests/unit/dependency-audit.test.ts`) byte-unchanged. `npm run build` clean. `npm run lint` 0 errors + 7 pre-existing warnings in `tests/support/litellm-helper.mjs` (unchanged). `npm test` 234 passed / 0 failed — exact baseline match per AC #17.

### Completion Notes List

- **Task 0 secret hygiene (AC #9–#11).** Pre-story `origin` URL embedded a GitHub PAT (`ghp_…`) in the HTTPS form — the Known Risk #2 from story 5-1's `pilot.md`. The dev revoked the leaked PAT on github.com out-of-band and switched the Alpharages organisation to SSH with a dedicated key (`github_work_alpharages`). I rewrote the local `origin` to `git@github.com:Alpharages/lore.git` via `git remote set-url`. No edit was made to `pilot.md` (the Known Risk bullet stays as-is for story 5-9's retro to evaluate, per Out of Scope). AC #11 is mitigated but the record is deliberately preserved.
- **Task 1 porting decisions (AC #5).** Dev chose: (Q1) apply the single-line metadata normalisation only to `planning-artifacts/PRD.md` — drop the legacy `Author: BuildClear Product Team` line; leave `Date: March 2026` and `Status: Draft` intact. The normalisation was NOT applied to `architecture.md` or `tech-spec.md` (neither file had the offending author line; their leading metadata blocks are byte-unchanged). (Q2) Move all three files as the default — PRD, tech-spec, architecture. No deviation from the "move all three" path.
- **Task 2 rename detection (AC #2).** PRD reported 99% similarity (one line dropped), architecture and tech-spec reported 100%. Well above the 90% threshold; `git diff --stat` shows three `rename` entries (not six `delete + add` entries), confirming AC #2 is satisfied and `git log --follow` continuity across the move is preserved.
- **Task 2 README rewrite (AC #4).** H1 preserved byte-for-byte. Intro paragraph replaced with a four-sentence paragraph that names `planning-artifacts/` as the authoritative source for PRD / architecture / tech-spec, names `bmad-mcp-server` + ClickUp integration as the consumer, and frames `docs/` as the home for narrative / onboarding / diagram-heavy team reference material. The `## Documents` table preserves the three-column `File | Document | Description` shape; only link targets (now `../planning-artifacts/*.md`) and column widths changed — description text is byte-unchanged. The four preserved sections (`## What Is Lore Platform?`, `## Key Design Decisions`, `## Build Order (When Implementing)`, `## Related`) are byte-unchanged.
- **Task 2 push auth (AC #12).** First `git push -u origin main` hit `Permission denied (publickey)` because SSH had no default identity and the custom key `~/.ssh/github_work_alpharages` was not in any `~/.ssh/config` host entry. The dev added the SSH config routing and keychain-unlocked the key; retry succeeded immediately (`Everything up-to-date` on the second attempt because the commit landed between the re-push and the status check). Local `main` and `origin/main` both at `4fcaf9b`, tracking configured.
- **Task 3 prettier scope (AC #16).** Per story 5-1's Completion Notes guardrail, I ran `npx prettier --write` scoped to the two files this story touches (`planning-artifacts/stories/5-2-seed-pilot-planning-artifacts.md` and `planning-artifacts/sprint-status.yaml`) rather than the project-level `npm run format` — which is `prettier --write .` and would sweep pre-existing drift in other stories that would violate AC #16's "byte-unchanged" clause.
- **`BMAD-METHOD.code-workspace` left unstaged.** This file was modified locally before this story started (appeared as `M BMAD-METHOD.code-workspace` in the initial git status). Task 4 scopes the commit to the story file + sprint-status.yaml only, and this file is not under any AC-protected path, so it is intentionally NOT staged by this commit. It stays in the working tree as pre-existing local drift.
- **Test baseline (AC #17).** 234 passing / 0 failing, matching the baseline. Delta vs. story 5-1 is zero — expected, since both 5-1 and this story landed markdown/yaml only.

### File List

**New (bmad-mcp-server repo)**

- (none beyond this story file)

**Modified (bmad-mcp-server repo)**

- `planning-artifacts/sprint-status.yaml` — `5-2-seed-pilot-planning-artifacts` transitioned `backlog` → `ready-for-dev` (this run) → `review` (after dev implementation) → `done` (after code review); `last_updated` bumped.
- `planning-artifacts/stories/5-2-seed-pilot-planning-artifacts.md` — this story file; Status transitions `ready-for-dev` → `review` → `done`; Dev Agent Record sections filled during implementation.

**New (pilot repo `Alpharages/lore`)**

- `planning-artifacts/PRD.md` — moved from `docs/01-prd.md` (AC #1–#3, #7).
- `planning-artifacts/architecture.md` — moved from `docs/03-architecture.md` (AC #1–#3, #8).
- `planning-artifacts/tech-spec.md` — moved from `docs/02-technical-spec.md` (AC #1–#3); optional per Task 1.

**Modified (pilot repo `Alpharages/lore`)**

- `docs/README.md` — intro paragraph replaced; `## Documents` table link targets updated to point at `../planning-artifacts/*.md`; other sections byte-unchanged (AC #4).
- `.git/config` (NOT committed) — `origin` remote URL rewritten from PAT-embedded HTTPS to clean HTTPS or SSH form (AC #9).

**Deleted (pilot repo `Alpharages/lore`)**

- (none — all three `docs/*.md` files are renamed, not deleted)

### Review Findings

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-24 | Story drafted from EPIC-5 bullet 2 via `bmad-create-story` workflow. Status → ready-for-dev. `sprint-status.yaml` updated: `5-2-seed-pilot-planning-artifacts` backlog → ready-for-dev, `last_updated` bumped. Work-site is the pilot repo (`Alpharages/lore`); bmad-mcp-server side is markdown + yaml only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-04-24 | Story implemented. Pilot repo (`Alpharages/lore`): PAT rotated out-of-band and `origin` switched to SSH (`git@github.com:Alpharages/lore.git`); three `git mv` renames `docs/{01-prd,02-technical-spec,03-architecture}.md` → `planning-artifacts/{PRD,tech-spec,architecture}.md` with rename similarity 99% / 100% / 100%; `planning-artifacts/PRD.md` normalised per AC #5 — dropped the legacy `Author: BuildClear Product Team` line only; `docs/README.md` rewritten per AC #4 (intro replaced, `## Documents` link targets updated, other four sections byte-unchanged); committed as `4fcaf9b chore(docs): seed planning-artifacts from docs for BMAD pilot` and pushed to `origin/main`. bmad-mcp-server side: this story file's status `ready-for-dev` → `review`, Dev Agent Record filled, `sprint-status.yaml` transitioned 5-2 to `review` and bumped `last_updated`. Test baseline unchanged at 234 passing / 0 failing. |
