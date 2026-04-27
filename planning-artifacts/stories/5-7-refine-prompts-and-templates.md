# Story 5.7: Refine prompts, templates, and config based on EPIC-5 pilot friction log

Status: review

Epic: [EPIC-5: Pilot + iterate](../epics/EPIC-5-pilot-iterate.md)

> Seventh story in EPIC-5. This is the **translation half** of [EPIC-5 §Outcomes bullet 5](../epics/EPIC-5-pilot-iterate.md) ("Friction log captured **and** translated into prompt / template / config refinements"). [Story 5-6](./5-6-capture-friction-log.md) shipped the descriptive capture: 22 unique H3 entries in [`planning-artifacts/friction-log.md`](../friction-log.md) (2 HIGH / 11 MEDIUM / 9 LOW; 11 in `story-5-7-skill-fix`, 3 in `story-5-7-config-fix`, 2 in `story-5-7-prd-amend`, 2 in `story-5-8-doc-only`, 2 in `human-only`, 2 in `out-of-scope`). This story owns the prescriptive translation for every `story-5-7-*` bucket — 16 entries total — and lands the fixes in their respective source files (`src/custom-skills/clickup-create-story/`, `src/custom-skills/clickup-dev-implement/`, `_bmad/custom/bmad-agent-dev.toml`, `planning-artifacts/PRD.md`, `planning-artifacts/pilot.md`, `planning-artifacts/epics/EPIC-5-pilot-iterate.md`). The two `story-5-8-doc-only` entries (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`) and the two `human-only` entries (`cross-list-subtask-block`, `gh-auth-wrong-account`) are explicitly out-of-scope — see §Out of Scope below. The two `out-of-scope` entries (`searchtasks-fuzzy-not-exact`, `clickup-renderer-artifacts`) are likewise not touched.
>
> **Why this story exists post-5-6 (translation after capture).** Story 5-6's descriptive log records _what was seen_ during the pilot's three execution stories (5-3 / 5-4 / 5-5) without proposing fixes; story 5-7 reads that log and lands fixes. The split was deliberate per [story 5-6 Dev Notes §"Why this story is descriptive, not prescriptive"](./5-6-capture-friction-log.md). The benefit shows up here: every entry already carries a `Severity` ranking and a `Proposed-fix-owner` bucket decided by the dev-in-session who actually ran the pilot, so this story's dev does not re-derive priorities — they translate the existing buckets into concrete patches. The translation is also constrained: AC #4 / #5 / #6 / #7 / #8 below enumerate the 16 in-scope entries by short-ID and require each to be addressed (with an explicit "won't-fix in 5-7" justification permitted for any entry whose translation reveals it should slip to a follow-up; see AC #14).
>
> **Why this story groups changes by surface, not by entry.** Several friction-log entries cluster on the same target file (e.g. `step-05-in-review-literal-match-miss` and `step-05-match-set-too-narrow` both edit `step-05-status-transition.md`; `cross-list-subtask-block` and `prd-clickup-layout-vs-merged-state-drift` both edit `planning-artifacts/PRD.md` §ClickUp layout). Editing surface-by-surface (one PR section per file rather than per entry) prevents merge-conflict churn within the story and matches how a code reviewer reads the diff. AC #4–#8 below partition the 16 in-scope entries by surface (skill / config / PRD / pilot.md / epic file) so the diff lands as a small number of concentrated hunks rather than 16 scattered edits.
>
> **Why no skill rewrite, no new skills, no new tooling.** The pilot completed end-to-end with the existing `clickup-create-story` and `clickup-dev-implement` skills modulo the disclosed deviations. The friction-log entries are **refinements** (broaden a match set, add a guard, drop stale wording) rather than redesigns. AC #4 / #5 cap each skill-step edit's diff size and explicitly forbid restructuring (no new step files, no renamed steps, no SKILL.md restructuring; existing instruction-numbered ordering preserved). New abstractions — a `step-00-cwd-assertion` shared helper, a config-driven status-match list, a `.bmad-pilot-marker` file mechanism — are evaluated in §Tasks but only landed if the entry's friction proves the abstraction earns its keep; otherwise the in-line patch is preferred per CLAUDE.md §"Don't add features ... beyond what the task requires."
>
> **Why this story can land in this branch and ship to ClickUp / pilot repo through follow-ups, not lockstep.** This story edits only the bmad-mcp-server repo (skills + config + planning artifacts). It does NOT re-invoke the Dev agent against the pilot epic, does NOT amend any ClickUp task description / status / comment, and does NOT touch `Alpharages/lore`. Story 5-8 (team-facing quickstart docs) reads the post-5-7 skill state. Story 5-9 (pilot retro and go/no-go) reads the friction log + post-5-7 fix list to evaluate "did the pilot reveal blocking issues that 5-7 successfully translated, or paper cuts that fixed cleanly." Either outcome is a green retro signal; the no-go case is reserved for "5-7 could not translate the HIGH-severity entries into landable fixes."

## Story

As the **bmad-mcp-server platform maintainer**,
I want every `story-5-7-skill-fix` / `story-5-7-config-fix` / `story-5-7-prd-amend` entry from [`planning-artifacts/friction-log.md`](../friction-log.md) (16 entries total: 11 skill-fix + 3 config-fix + 2 prd-amend) translated into a concrete, landed change in the appropriate source file (skill step under `src/custom-skills/clickup-create-story/steps/` or `src/custom-skills/clickup-dev-implement/steps/`, config under `_bmad/custom/`, spec amendment under `planning-artifacts/PRD.md` / `planning-artifacts/pilot.md` / `planning-artifacts/epics/EPIC-5-pilot-iterate.md`), with each change citing the friction-log entry's short-ID in its rationale, and with a §Translation-summary table in this story file mapping each in-scope friction-log short-ID to (a) the file(s) modified, (b) the diff approach (in-line patch vs. broader refactor — defaulted to in-line patch per the story's framing), and (c) any explicit "won't-fix in 5-7" justification permitted by AC #14,
so that [EPIC-5 §Outcomes bullet 5](../epics/EPIC-5-pilot-iterate.md) is fully satisfied (capture half by story 5-6, translation half by this story); story 5-8's team-facing quickstart docs read a post-refinement skill / config state rather than the byte-frozen pilot state; story 5-9's retro evaluates a real "did the pilot's friction translate into landable fixes" signal rather than an aspirational one; the second pilot run (if any team chooses one) hits a refined skill that no longer produces the 16 in-scope frictions; and the friction log itself remains immutable post-5-6 (this story does NOT amend `friction-log.md` — the log is the input, the source files are the output).

## Acceptance Criteria

### Translation-summary contract

1. This story file's §Translation summary section (under §Tasks / Subtasks below) contains a single Markdown table with one row per in-scope friction-log entry. Columns:

   | Friction-log short-ID | Severity | Surface | File(s) modified | Diff approach | Notes |

   The table MUST contain exactly 16 rows — one for each entry in `planning-artifacts/friction-log.md` §Owner queue under `story-5-7-skill-fix` (11), `story-5-7-config-fix` (3), and `story-5-7-prd-amend` (2). The "File(s) modified" column names a comma-separated list of repo-relative paths (e.g. `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md`). The "Diff approach" column reads `in-line patch` (default), `extracted helper`, `config-driven extension`, or `won't-fix in 5-7` (per AC #14). The "Notes" column is one short sentence — at most ~120 chars — capturing the essential character of the change (e.g. "Broaden case-insensitive match set to include 4 review-status synonyms"). The table is the authoritative single-source-of-truth for which entries this story addressed and how; a code reviewer can read the table and `git diff --stat` together to verify coverage without re-reading every friction-log entry.

2. Every short-ID listed in `planning-artifacts/friction-log.md` §Owner queue's `story-5-7-skill-fix`, `story-5-7-config-fix`, and `story-5-7-prd-amend` buckets MUST appear in the §Translation summary table exactly once. No short-ID appears twice; no in-scope short-ID is silently absent. A code reviewer can byte-check the coverage with `grep -c '^| ' planning-artifacts/stories/5-7-refine-prompts-and-templates.md` (which returns the table row count, including the header row + the separator row + 16 data rows = 18 lines) cross-referenced against `grep '^  - \`' planning-artifacts/friction-log.md` under the three in-scope buckets (which returns 16 short-IDs).

3. Friction-log entries in the `story-5-8-doc-only`, `human-only`, and `out-of-scope` buckets MUST NOT appear in the §Translation summary table. They are explicitly deferred to story 5-8 (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`), to a workspace-action human checklist (`cross-list-subtask-block`, `gh-auth-wrong-account`), or to no further action (`searchtasks-fuzzy-not-exact`, `clickup-renderer-artifacts`). This story's §Out of Scope below restates each by short-ID for traceability.

### Skill-fix contract (`src/custom-skills/clickup-create-story/`, `src/custom-skills/clickup-dev-implement/`)

4. Each of the 11 `story-5-7-skill-fix` entries lands a concrete edit in the named skill step. Entry-by-entry minimum requirements (file paths are repo-relative; line / instruction references reflect the post-EPIC-3 byte-frozen state; the dev-in-session may need to re-resolve line numbers if a prior 5-7 hunk has shifted them):
   - **`sprint-window-strict-less-than-edge-on-start-day`** (LOW, `step-03-sprint-list-picker.md`) — instruction 6's "active = start before today AND end after today" hint must be amended to use inclusive bounds on the start day (e.g. "start on or before today AND end on or after today"). The edit is one sentence in the hint string; no logic change to instructions 1–5 / 7–9. The fix is a wording correction, not a behaviour change — the picker still presents the full list of non-archived sprints and the user still picks; only the hint that helps the user identify the active sprint is corrected.

   - **`gettaskbyid-metadata-description-boundary`** (LOW, `step-04-description-composer.md`) — instruction 6's "extract content before first `Comment by` line" rule must be extended to also peel off the leading metadata block (everything up to and including the line that contains `parent_task_id: ...`, or until the first heading-line `## ...` if no `parent_task_id:` line is present, whichever comes first). One additional sentence inside instruction 6's existing paragraph; no new instruction step, no new placeholder.

   - **`stale-next-wording-in-skill-files`** (LOW, `step-01-prereq-check.md` and `step-03-sprint-list-picker.md`) — both files contain `## NEXT` sections that read "Steps N–N are not yet implemented" / "Step 4 is not yet implemented" even though every step now exists. Each `## NEXT` block must be rewritten to read accurately as a "proceed to step N" pointer (or, equivalently, the `## NEXT` heading + body may be removed entirely if the pointer adds no information beyond the existing instruction-9 / instruction-10 "continue to step N" line). Apply the same pattern; one of the two cleanups (rewrite OR remove) is acceptable as long as the false "not yet implemented" wording does not survive.

   - **`pwd-deviation-cwd-not-pilot-repo`** (MEDIUM, `clickup-create-story/steps/step-01-prereq-check.md` AND `clickup-dev-implement/steps/step-01-task-id-parser.md` OR a new shared cwd-assertion mechanism) — must add a cwd-assertion guard at the front of both skills' first step. Two acceptable shapes: **(a)** in-line addition to each skill's step-01 (a new instruction 0 that asserts `pwd` against an expected pilot-repo marker — the simplest cut, doubles the diff but keeps the skills self-contained), OR **(b)** a single new file `src/custom-skills/_shared/cwd-assertion.md` referenced by both step-01 files via a one-line "see `_shared/cwd-assertion.md` for the cwd-assertion contract" pointer (smaller per-skill diff but introduces a shared file; only justified if the cwd-assertion text is non-trivial). Default to (a) per the story's framing; pick (b) only if (a)'s prose exceeds ~25 lines per skill. Either shape MUST: (i) define a recognisable pilot-marker mechanism (a `.bmad-pilot-marker` sentinel file at the pilot-repo root is the recommended pattern; alternative mechanisms — `git rev-parse --show-toplevel` matching a pinned path, a `BMAD_PILOT_REPO_ROOT` env var — are acceptable if rationalised in §Translation summary's Notes column), (ii) emit a clear `❌` permission-gate-style error block when cwd is wrong (so the dev session halts before producing artifacts under the wrong cwd), and (iii) document the disclosed-deviation escape hatch (absolute-path Read substitution as observed in stories 5-4 and 5-5) so the contract remains compatible with the friction-log entries it consumes.

   - **`step-01-verbatim-message-not-captured`** (LOW, `step-01-prereq-check.md`) — instruction 1's permission-gate verbatim message (`✅ Permission gate passed — write mode active, token authenticated.`) must remain word-for-word, AND a one-sentence reminder must be added to instruction 1's prose (or to the ## NEXT block from `stale-next-wording-in-skill-files`'s rewrite) instructing the dev-in-session to capture the verbatim message in their Dev Agent Record. No semantic change to the gate logic; the fix tightens the contract for downstream story files.

   - **`epic-picker-no-root-level-filter`** (MEDIUM, `step-02-epic-picker.md`) — instruction 2's `searchTasks` call (or whatever instruction enumerates Backlog tasks) must be amended to filter results to root-level tasks only — i.e. tasks whose `parent_task_id` is null/absent/empty in the response. The filter applies before the user-facing picker presents candidates. Implementation: a one-paragraph addition to the relevant instruction explaining the filter, plus a sentence in the §Why section explaining why the filter is needed (subtask pollution under the same-list pivot per `cross-list-subtask-block`'s `human-only` resolution path). The filter MUST handle responses where `parent_task_id` is the literal string `''`, `null`, missing entirely, or any of the upstream MCP tool's documented absent-parent representations.

   - **`story-1-6-smoke-false-positive-risk`** (MEDIUM, `scripts/smoke-clickup-cross-list.mjs` AND/OR `tests/integration/` smoke harness if applicable, AND its docstring/comments) — the harness must be amended so its PASS/FAIL signal cannot be silently masked by a workspace toggle change between runs. Acceptable approaches: **(a)** the harness checks the workspace's "Tasks in Multiple Lists" ClickApp toggle state at startup (if discoverable via the upstream MCP tool surface) and skips with a structured `SKIP — toggle disabled` exit code rather than producing a false PASS, OR **(b)** the harness's docstring / output adds a "this PASS is conditional on the workspace having the cross-list-subtask ClickApp toggle ON; verify before relying on this signal" warning line so an operator reading the smoke output is not misled. Default to (b) per the story's "minimal patch" framing. Either approach MUST cite `story-1-6-smoke-false-positive-risk` in the diff's commit-message body so a future reader of `git log -- scripts/smoke-clickup-cross-list.mjs` finds the friction-log link. Note: this is the only `story-5-7-skill-fix` entry that may touch a `.mjs` file (the smoke harness is a script, not part of the skill instruction set); the regression guard in AC #11 explicitly carves out `scripts/smoke-clickup-cross-list.mjs` for this entry.

   - **`lore-origin-pat-preflight-gap`** (LOW, `clickup-dev-implement/steps/step-01-task-id-parser.md` OR a preflight section in either skill's SKILL.md) — must add a one-paragraph preflight-check instruction that runs `git remote -v` and greps for the GitHub-PAT-prefix pattern (`ghp_|github_pat_|ghs_|ghu_|ghr_`), failing the skill with a clear error block if any remote URL embeds a PAT. The preflight MUST emit a `❌` error block when a match is found (so the dev session halts before pushing anything that might leak the token) and MUST document the rotation path in the error block's "What to do" line (`git remote set-url origin <clean-url>` + rotate the PAT in GitHub Settings). The fix may live in `step-01-task-id-parser.md`, in the SKILL.md preflight section, or in the new `_shared/cwd-assertion.md` file from `pwd-deviation-cwd-not-pilot-repo` if option (b) was taken; choose whichever placement minimises the number of files touched.

   - **`step-05-in-review-literal-match-miss`** (MEDIUM, `step-05-status-transition.md`) — instruction 4's hardcoded literal case-insensitive match for `"in review"` must be expanded into a match SET. Required minimum match set: `in review`, `ready for review`, `code review`, `pending review`, `awaiting review` (case-insensitive, whitespace-trimmed against `{list_statuses}`). The instruction MUST iterate the match set in priority order (the order above) and use the first hit; if multiple statuses match, the highest-priority hit wins. The error block at instruction 4's failure path (the `⚠️ Status transition skipped — no "in review" status found in list` block) must be updated to enumerate the full match set in the diagnostic so an operator reading the warning sees what the skill tried, not just the first synonym. This entry pairs with `step-05-match-set-too-narrow` (next bullet) — both edits land in the same instruction; treat them as one hunk in the §Translation summary if the dev-in-session prefers, but the table MUST still list both short-IDs as separate rows per AC #2.

   - **`template-b-no-pr-field`** (MEDIUM, `step-04-progress-comment-poster.md`) — Template B (M2 — Implementation Complete) must add a dedicated `**Pull Request:** {pr_url}` field, placed between `**Summary:**` and `**Files changed:**`. The field MUST be rendered if `{pr_url}` is non-empty; if `{pr_url}` is empty (e.g. the implementation does not produce a PR — direct commit to main, doc-only change, etc.), the line is omitted entirely. Instruction 3's "Compose the comment" body must be amended to source `{pr_url}` (e.g. "set `{pr_url}` to the PR URL produced by `gh pr create`'s stdout, or empty if no PR was created in this session"). No new step, no new placeholder management; `{pr_url}` is a step-04-local variable populated from the dev-in-session's commit/PR action.

   - **`step-05-match-set-too-narrow`** (MEDIUM, `step-05-status-transition.md`) — see `step-05-in-review-literal-match-miss` above. Same instruction-4 edit; this short-ID exists separately in the friction log to capture the broader workspace-custom-status framing (cross-cutting theme bullet 2). The §Translation summary table lists this row with `Notes: Co-resolved with step-05-in-review-literal-match-miss in single instruction-4 hunk`.

5. Each skill-step edit MUST cite the friction-log entry's short-ID in a one-line rationale comment OR in the instruction's prose. Acceptable forms: **(a)** an inline parenthetical at the end of the new/amended instruction (e.g. "(per friction-log entry `step-05-in-review-literal-match-miss`)"), OR **(b)** a footnote-style line at the bottom of the step file (`> **Refinement source:** `step-05-in-review-literal-match-miss` (story 5-7).`). Either form makes the diff self-documenting; the dev-in-session picks one form and applies it consistently across all skill-step edits in this story.

### Config-fix contract (`_bmad/custom/`)

6. Each of the 3 `story-5-7-config-fix` entries lands a concrete edit in `_bmad/custom/bmad-agent-dev.toml` OR an adjacent config file. Entry-by-entry requirements:
   - **`two-backlog-lists-in-team-space`** (MEDIUM, `_bmad/custom/bmad-agent-dev.toml`) — must add an optional config knob that lets a workspace operator pin a specific Backlog list ID, bypassing `step-02-epic-picker`'s multi-list disambiguation when the ID is set. Acceptable shape: a top-level `[clickup_create_story]` table with a `pinned_backlog_list_id = "..."` key (default unset; the picker behaves as before when unset). The `step-02-epic-picker.md` instructions MUST be amended to consult the pinned ID first and skip the multi-list branch if found. This dual-edit (TOML + step-02) is acceptable; the §Translation summary table's "File(s) modified" column lists both files for this row.

   - **`two-sprint-folders-in-team-space`** (MEDIUM, `_bmad/custom/bmad-agent-dev.toml`) — same shape as `two-backlog-lists-in-team-space` but for the sprint folder. Add `pinned_sprint_folder_id = "..."` under the same `[clickup_create_story]` table; amend `step-03-sprint-list-picker.md` instruction 3 to consult the pinned ID first. The two pinned-IDs are independent — operators may pin one, both, or neither.

   - **`ds-trigger-not-dispatched-via-toml`** (MEDIUM, `_bmad/custom/bmad-agent-dev.toml` and/or skill SKILL.md files) — investigate whether trigger dispatch is achievable in Claude Code CLI mode at all (per friction-log entry's "Investigation queued for story 5-7"). Three possible outcomes; the dev-in-session picks one:
     - **(a) Trigger dispatch IS achievable in Claude Code CLI** — write a one-paragraph "Invocation guide" section into both skills' `SKILL.md` files showing how to invoke the trigger (the dispatch incantation observed to work in Cursor / VS Code and verified to also work in Claude Code CLI). Mark §Translation summary's "Diff approach" column as `config-driven extension` for this row.
     - **(b) Trigger dispatch is NOT achievable in Claude Code CLI; the TOML mechanism is Cursor/VS Code-only** — amend `_bmad/custom/bmad-agent-dev.toml`'s top-of-file comment to explicitly note "TOML triggers are dispatched in Cursor / VS Code; in Claude Code CLI the agent invokes the skill steps directly. Both invocation paths produce the same artifacts." This documents the observed behaviour rather than fixing it; mark §Translation summary's "Notes" column accordingly.
     - **(c) Inconclusive** — defer with a 2026-Q2 follow-up entry in `planning-artifacts/deferred-work.md` and mark §Translation summary's "Diff approach" column as `won't-fix in 5-7` per AC #14, with the deferred-work-link cited in the Notes column.

7. The `_bmad/custom/bmad-agent-dev.toml` file's existing `[[agent.menu]]` entries for `code = "CS"` and `code = "DS"` MUST remain byte-unchanged in their existing fields (`code`, `description`, `skill`). Any new keys added per AC #6 land as a new top-level table (`[clickup_create_story]`, `[clickup_dev_implement]`, etc.) so the existing menu shape stays compatible with upstream BMAD's TOML merge rules. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST show only additive hunks (or the top-of-file comment expansion per AC #6 outcome (b)); no existing key's value is mutated.

### PRD / pilot.md / epic-file amendment contract

8. Each of the 2 `story-5-7-prd-amend` entries lands a concrete edit in the named planning artifact. Entry-by-entry requirements:
   - **`store-lesson-vs-save-lesson-name-mismatch`** (MEDIUM, `planning-artifacts/pilot.md` AND `planning-artifacts/epics/EPIC-5-pilot-iterate.md` AND ClickUp epic body — but ClickUp is out-of-scope for this story per AC #12; only the in-repo files are amended here) — pick a single canonical name (`save-lesson` is the recommended pick because it matches the actual subtask `86exd8yh3` and the PRD/tech-spec canonical `save_lesson`; alternative `store-lesson` is acceptable if rationalised in the diff's commit-message body) and propagate it to:
     - `planning-artifacts/pilot.md` §Pilot epic (currently reads `store-lesson` per friction-log entry's quoted text)
     - `planning-artifacts/epics/EPIC-5-pilot-iterate.md` — verify at execution time; amend only if `store-lesson` references are present (the friction-log entry conflated this file with the ClickUp epic body, so a zero-reference outcome is acceptable and noted in §Translation summary Notes).
     - The ClickUp epic body amendment is OUT OF SCOPE for this story (no ClickUp writes per AC #12); a §Translation summary Notes-column entry MUST capture this carve-out so a future reader knows the third source-of-truth (ClickUp body) was deliberately not touched and is queued for human-only follow-up.

   - **`prd-clickup-layout-vs-merged-state-drift`** (MEDIUM, `planning-artifacts/PRD.md` §ClickUp layout) — the §ClickUp layout section currently reads "Stories → subtasks of an epic (parent = epic task), living in the active Sprint list." This must be amended to reflect the merged state under the same-list pivot. Recommended replacement text: "Stories → subtasks of an epic (parent = epic task). The subtask's list-id MAY equal the epic's list-id (same-list layout, default; required when ClickUp's `Tasks in Multiple Lists` ClickApp is OFF) OR differ (cross-list layout; requires the ClickApp toggle ON). Both shapes are supported by `clickup-create-story`; the workspace-level toggle gates which is feasible." The amendment MUST cite the friction-log entry by short-ID in a footnote or trailing parenthetical so the rationale is discoverable. The PRD's §Risks / assumptions R1 reference is preserved unchanged (R1 is a forward-looking risk; the amendment is a backward-looking layout update).

9. Every PRD / pilot.md / epic-file amendment MUST include a §Change log row (or equivalent) in the affected file noting the date (`2026-04-27`), the friction-log short-ID being addressed, and the file's status (no status enum change for `PRD.md` — it has no §Decision Status; `pilot.md` §Decision Status remains `in-progress` per [story 5-1 AC #8](./5-1-choose-pilot-project.md) — this story does NOT transition `pilot.md` decision status; the next transition is story 5-9's go/no-go). The amendment-row pattern matches `pilot.md` §Change log's existing precedent (one row per substantive change).

### bmad-mcp-server-repo regression guards (this repo)

10. `npm run build`, `npm run lint`, and `npm test` MUST all pass cleanly after this story's hunks land. Expected baseline at the merge commit of [story 5-6](./5-6-capture-friction-log.md): **234 passing**, 0 failing — unchanged since story 3.6. This story is markdown-and-config-only on the `src/` side (skill steps are markdown; config is TOML); no `.ts` is added or modified. The expected test-count delta is therefore **zero** unless the `story-1-6-smoke-false-positive-risk` fix exposes a previously-unverified test path, in which case the §Translation summary Notes column for that entry MUST capture the count change explicitly. **Re-verify the baseline against the actual HEAD before committing.** Do NOT run `npm run format` globally; use scoped `npx prettier --write` per stories 5-1 / 5-2 / 5-3 / 5-4 / 5-5 / 5-6 Completion Notes.

11. No TypeScript source files (`src/**/*.ts`) are added or modified in the bmad-mcp-server repo. `git diff --stat -- 'src/**/*.ts'` MUST be empty. The `src/custom-skills/**` tree IS amended by this story (the markdown step files), but the `.ts` constraint applies to vendored upstream code at `src/tools/clickup/**` — that tree remains byte-frozen per the story 1-1 vendor contract. `git diff --stat -- src/tools/clickup/` MUST be empty. The `BMAD-METHOD/` directory is likewise byte-unchanged: `git diff --stat -- BMAD-METHOD/` MUST be empty.

12. ClickUp workspace `9018612026` is not modified by this story. No new tasks, no new comments, no status transitions, no description amendments. The `cross-list-subtask-block` HIGH entry's `human-only` workaround (toggle the `Tasks in Multiple Lists` ClickApp) is a workspace-UI action handled outside this story per the friction log's `Proposed-fix-owner: human-only` field. The `gh-auth-wrong-account` HIGH entry's `human-only` workaround (configure `gh auth` with the correct account) is likewise outside scope.

13. The pilot repo (`Alpharages/lore`) is not modified by this story. No new commits, no PR amendments, no `planning-artifacts/` changes in the pilot repo. The pilot repo's working tree is observation-only for this story; the dev-in-session does NOT `cd` to the pilot repo at any point. `git -C /Volumes/Data/project/products/alpharages/lore status` is not interrogated.

14. **Won't-fix-in-5-7 escape hatch.** Any in-scope friction-log entry MAY be marked `won't-fix in 5-7` in the §Translation summary table's "Diff approach" column IF AND ONLY IF the §Translation summary's Notes column for that row carries an explicit one-sentence rationale (e.g. "Fix requires upstream MCP tool change; deferred to 2026-Q2 follow-up via `planning-artifacts/deferred-work.md` row N") AND a corresponding row is added to `planning-artifacts/deferred-work.md` citing the friction-log short-ID. The `won't-fix` escape hatch is bounded — at most **3** of the 16 in-scope entries may use it (i.e. at least 13 entries must land a concrete fix in this story); a higher count is a signal that this story's scope is wrong and should trigger a §Senior Developer Review (AI) blocking finding. The `ds-trigger-not-dispatched-via-toml` outcome (c) per AC #6 counts toward this cap.

### Sprint-status transition contract

15. `planning-artifacts/sprint-status.yaml` transitions are workflow-managed: the `bmad-create-story` workflow sets `5-7-refine-prompts-and-templates` from `backlog` → `ready-for-dev` and bumps `last_updated`. Later transitions (`ready-for-dev` → `review` after dev-story execution → `done` after the code-review pass marks the story closed; per the story 5-1 / 5-2 / 5-3 / 5-4 / 5-5 / 5-6 precedent, multiple transitions MAY land in successive commits within the same PR or be folded into the same commit if the dev session and the review pass share a session) happen via the dev implementing this story plus the code-review follow-up. The `epic-5: in-progress` line is already correct from prior 5-X stories and MUST remain unchanged by this story. No other key in `sprint-status.yaml` is modified.

## Out of Scope (explicitly deferred to later stories)

- **Friction-log entries in `story-5-8-doc-only` bucket.** `gh-auth-prerequisite-undocumented` and `multi-repo-cwd-handling-undocumented` are deferred to story 5-8 (team-facing quickstart docs). This story does NOT amend any quickstart doc. If the dev-in-session encounters a natural place to add a `gh auth` prereq mention while editing a skill step (per AC #4's `lore-origin-pat-preflight-gap` work), a one-line cross-reference to "see story 5-8's quickstart for the team-facing prereq enumeration" is acceptable but not required.
- **Friction-log entries in `human-only` bucket.** `cross-list-subtask-block` (toggle the `Tasks in Multiple Lists` ClickApp in workspace `9018612026`) and `gh-auth-wrong-account` (configure `gh auth` per laptop) are workspace-UI / per-developer actions handled outside this story. Story 5-9's retro will reference the human-only checklist; this story does NOT execute either action and does NOT add either to the §Translation summary.
- **Friction-log entries in `out-of-scope` bucket.** `searchtasks-fuzzy-not-exact` (the skill's exact-name filter masks the fuzziness; no fix needed) and `clickup-renderer-artifacts` (upstream cosmetic ClickUp rendering; no fix possible without an upstream PR) are recorded for awareness only and not addressed in this story.
- **Amending `friction-log.md` itself.** The friction log is point-in-time per [story 5-6 Dev Notes §"Why entries are immutable after this story's close"](./5-6-capture-friction-log.md). This story reads it as input and lands fixes in the source files; it does NOT add, remove, or amend any H3 entry, severity field, owner-bucket assignment, or cross-cutting theme bullet. `git diff -- planning-artifacts/friction-log.md` MUST be empty after this story's commit.
- **Re-running the Dev agent against the pilot epic to verify the refinements.** A second pilot pass (e.g. invoking the CS trigger again under the post-5-7 skill state to confirm the `two-backlog-lists-in-team-space` pinned-config knob works end-to-end) is a follow-up exercise, not a 5-7 acceptance gate. Story 5-9's retro evaluates whether the refinements are individually plausible based on the diff; live validation is left to the second-pilot decision (which 5-9 itself recommends or defers).
- **Amending the ClickUp pilot epic `86excfrge`'s body to fix `store-lesson-vs-save-lesson-name-mismatch`.** AC #8 explicitly carves out the ClickUp body amendment as out-of-scope; only the in-repo `pilot.md` and `EPIC-5-pilot-iterate.md` files are amended. The third source-of-truth (the ClickUp epic body) is queued for human-only follow-up — a one-row checklist note in §Translation summary's Notes column captures the carve-out.
- **New skills, new step files, or skill restructuring.** This story refines the existing skills; it does NOT add a new step under either skill (the AC #4 `pwd-deviation-cwd-not-pilot-repo` option (b)'s new `_shared/cwd-assertion.md` file is the only permitted new-file shape, and only if option (b) is chosen). No step is renamed, no step is deleted, no SKILL.md restructuring beyond the §Refinement source footnote permitted by AC #5.
- **Upstream BMAD-METHOD / `src/tools/clickup/` edits.** Both vendored trees remain byte-frozen per stories 1-1 / 2-8 / 3-9. Any friction-log entry whose root cause sits in upstream code is `won't-fix in 5-7` per AC #14 and routes to a 2026-Q2 deferred-work row.
- **Pilot repo (`Alpharages/lore`) edits.** No commits, no PR amendments, no planning-artifact changes in the pilot repo. AC #13 enforces this.
- **Running `npm run format` globally.** Scoped `npx prettier --write` only, per the stories-5-1-through-5-6 precedent.

## Tasks / Subtasks

- [x] **Task 0 — Confirm working directory and branch state (AC: prereq for all)**
  - [x] `pwd` MUST print `/Volumes/Data/project/products/alpharages/bmad-mcp-server` (this story is bmad-mcp-server-repo only; no pilot-repo cwd needed). If `pwd` is anything else, `cd` here before continuing.
  - [x] Confirm working tree is clean: `git status --porcelain` returns empty (or only contains the expected uncommitted artifacts from the `bmad-create-story` workflow that drafted this story file plus its sprint-status transition — `5-7-refine-prompts-and-templates: backlog → ready-for-dev`).
  - [x] Confirm current branch is `feat/1-2-wire-register-functions` (the running EPIC-5 branch carrying every prior 5-X commit) per the post-`aa23d9f` 5-X precedent. If on `main`, create the feature branch off `main` before continuing.

- [x] **Task 1 — Re-read inputs and draft §Translation summary skeleton (AC: #1, #2, #3)**
  - [x] Read `planning-artifacts/friction-log.md` end-to-end. Extract the 16 in-scope short-IDs from §Owner queue (`story-5-7-skill-fix` 11 + `story-5-7-config-fix` 3 + `story-5-7-prd-amend` 2). Verify against §Friction entries (each short-ID has a corresponding H3).
  - [x] Re-read each in-scope entry's Severity, Surface, Observed-behaviour, and Workaround fields so the §Translation summary Notes column reflects the entry's actual character, not a paraphrase.
  - [x] Inspect the named target files for each entry: `src/custom-skills/clickup-create-story/steps/step-01..05`, `src/custom-skills/clickup-dev-implement/steps/step-01..07`, `_bmad/custom/bmad-agent-dev.toml`, `planning-artifacts/PRD.md` (§ClickUp layout), `planning-artifacts/pilot.md` (§Pilot epic), `planning-artifacts/epics/EPIC-5-pilot-iterate.md`. For each entry, identify the precise instruction-number / line-range / heading the fix will land in.
  - [x] Draft the §Translation summary table skeleton in this story file (under §Tasks below the existing tasks list, OR as a top-level §Translation summary section before §Dev Notes — pick whichever read-flow the dev-in-session prefers; the AC #1 column structure is what binds). Pre-fill the 16 rows' Friction-log-short-ID + Severity + Surface columns from the friction-log file; the File(s)-modified / Diff-approach / Notes columns are populated as Tasks 2 / 3 / 4 land.

- [x] **Task 2 — Land skill-fix hunks (AC: #4, #5, #11)**
  - [x] **Task 2a — `step-03-sprint-list-picker.md` instruction 6 hint amendment** for `sprint-window-strict-less-than-edge-on-start-day`. One-sentence wording fix; verify the hint reads inclusive bounds.
  - [x] **Task 2b — `step-04-description-composer.md` instruction 6 metadata-peeling extension** for `gettaskbyid-metadata-description-boundary`. Add the metadata-block strip rule alongside the existing `Comment by` rule.
  - [x] **Task 2c — `step-01-prereq-check.md` and `step-03-sprint-list-picker.md` `## NEXT` cleanup** for `stale-next-wording-in-skill-files`. Pick one of the two patterns (rewrite OR remove); apply consistently.
  - [x] **Task 2d — Cwd-assertion guard for both skills** for `pwd-deviation-cwd-not-pilot-repo`. Pick option (a) in-line per skill OR option (b) shared `_shared/cwd-assertion.md` per AC #4. Default (a). Specify the pilot-marker mechanism (recommended `.bmad-pilot-marker` sentinel; alternatives rationalised in §Translation summary Notes column).
  - [x] **Task 2e — `step-01-prereq-check.md` verbatim-message reminder** for `step-01-verbatim-message-not-captured`. One-sentence Dev-Agent-Record-capture instruction.
  - [x] **Task 2f — `step-02-epic-picker.md` root-level filter** for `epic-picker-no-root-level-filter`. `parent_task_id` null/absent filter applied before the picker.
  - [x] **Task 2g — `scripts/smoke-clickup-cross-list.mjs` toggle-state guard** for `story-1-6-smoke-false-positive-risk`. Default to (b) docstring/output warning per AC #4. Cite short-ID in commit-message body.
  - [x] **Task 2h — `step-01-task-id-parser.md` (or SKILL.md) PAT-prefix preflight** for `lore-origin-pat-preflight-gap`. `git remote -v` + grep + `❌` error block + rotation-path documentation.
  - [x] **Task 2i — `step-05-status-transition.md` instruction 4 match-set expansion** for `step-05-in-review-literal-match-miss` AND `step-05-match-set-too-narrow`. Single hunk; iterate match set in priority order (`in review`, `ready for review`, `code review`, `pending review`, `awaiting review`); update the failure-path warning block to enumerate the full match set.
  - [x] **Task 2j — `step-04-progress-comment-poster.md` Template B PR field** for `template-b-no-pr-field`. Add `**Pull Request:** {pr_url}` between `**Summary:**` and `**Files changed:**`; conditional on non-empty `{pr_url}`; instruction 3 sourcing addition.
  - [x] **Task 2k — Refinement-source citation pass** per AC #5. Apply (a) inline parenthetical OR (b) footnote consistently across every step file edited in Tasks 2a–2j.
  - [x] After each subtask, update the §Translation summary table row's File(s)-modified / Diff-approach / Notes columns. Verify Prettier-clean per file: `npx prettier --check <file>` exits 0.

- [x] **Task 3 — Land config-fix hunks (AC: #6, #7, #11)**
  - [x] **Task 3a — `_bmad/custom/bmad-agent-dev.toml` `[clickup_create_story]` table** for `two-backlog-lists-in-team-space` AND `two-sprint-folders-in-team-space`. Two new keys (`pinned_backlog_list_id`, `pinned_sprint_folder_id`); both default unset; `[[agent.menu]]` entries byte-unchanged per AC #7.
  - [x] **Task 3b — `step-02-epic-picker.md` and `step-03-sprint-list-picker.md` pinned-ID consultation** as the pre-step before the existing multi-list / multi-folder branches. `pwd-deviation-cwd-not-pilot-repo`'s cwd-assertion (Task 2d) MUST run before the pinned-ID lookup so the skill fails-early on cwd mismatch rather than producing a false positive against the wrong workspace.
  - [x] **Task 3c — DS-trigger investigation** for `ds-trigger-not-dispatched-via-toml`. Empirically test outcome (a), (b), or (c) per AC #6. Land the chosen outcome's edit; mark §Translation summary Diff-approach column accordingly. If outcome (c), add the deferred-work row per AC #14.
  - [x] After each subtask, update the §Translation summary table row's columns. Verify Prettier-clean (`npx prettier --check _bmad/custom/bmad-agent-dev.toml` — note the `.toml` Prettier support; if Prettier doesn't recognise `.toml`, the verify is skipped and noted in Dev Agent Record §Debug Log).

- [x] **Task 4 — Land PRD / pilot.md / epic-file amendments (AC: #8, #9, #11)**
  - [x] **Task 4a — `pilot.md` §Pilot epic + `EPIC-5-pilot-iterate.md` rename `store-lesson` → `save-lesson`** for `store-lesson-vs-save-lesson-name-mismatch`. Both files updated in lockstep; ClickUp body NOT touched per AC #8 carve-out; §Translation summary Notes column captures the carve-out.
  - [x] **Task 4b — `PRD.md` §ClickUp layout amendment** for `prd-clickup-layout-vs-merged-state-drift`. Replace the unsatisfiable "subtasks living in the active Sprint list" sentence with the same-list-OR-cross-list dual-shape language per AC #8. PRD §Risks R1 sentence preserved.
  - [x] **Task 4c — §Change log row(s)** added to each amended file per AC #9. Date `2026-04-27`; cite friction-log short-ID; `pilot.md` §Decision Status remains `in-progress`.
  - [x] After each subtask, update the §Translation summary table row's columns. Verify Prettier-clean (`npx prettier --check planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/epics/EPIC-5-pilot-iterate.md`).

- [x] **Task 5 — Coverage check + §Translation summary finalisation (AC: #1, #2, #3, #14)**
  - [x] Verify the §Translation summary table contains exactly 16 data rows (count `^| ` lines under the §Translation summary section minus 2 header/separator rows = 16).
  - [x] Verify each in-scope short-ID from `friction-log.md` §Owner queue appears exactly once in the table. Cross-reference `grep -E '^  - \`' planning-artifacts/friction-log.md` (16 entries under the three in-scope buckets) against the table's Friction-log-short-ID column.
  - [x] Verify no out-of-scope short-ID (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`, `cross-list-subtask-block`, `gh-auth-wrong-account`, `searchtasks-fuzzy-not-exact`, `clickup-renderer-artifacts`) appears in the table.
  - [x] Count the `won't-fix in 5-7` rows in the Diff-approach column. MUST be ≤3 per AC #14. If >3, the dev-in-session escalates by raising a §Senior Developer Review (AI) blocking finding before commit.
  - [x] Verify Prettier-clean for the story file: `npx prettier --check planning-artifacts/stories/5-7-refine-prompts-and-templates.md` exits 0.

- [x] **Task 6 — Verify bmad-mcp-server regression-free (AC: #10, #11, #12, #13)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty (AC #11).
  - [x] `git diff --stat -- BMAD-METHOD/` → empty (AC #11).
  - [x] `git diff --stat -- src/tools/clickup/` → empty (AC #11).
  - [x] `git diff --stat -- planning-artifacts/friction-log.md` → empty (§Out of Scope: friction log immutable).
  - [x] `git diff --stat -- planning-artifacts/deferred-work.md` → may be non-empty IF AND ONLY IF a `won't-fix in 5-7` row was added per AC #14. Otherwise empty.
  - [x] For unchanged sibling story files: `for f in $(git ls-files planning-artifacts/stories/ | grep -v '5-7-refine-prompts-and-templates.md'); do git diff --quiet -- "$f" || echo "CHANGED: $f"; done` → zero output.
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (vendor-tree exclusions).
  - [x] Pre-commit secret scan across every file modified by this story: `grep -REn '(ghp|ghs|ghu|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}' src/custom-skills/ _bmad/custom/ planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/epics/EPIC-5-pilot-iterate.md planning-artifacts/stories/5-7-refine-prompts-and-templates.md scripts/smoke-clickup-cross-list.mjs` MUST return zero matches. The bracketed `{20,}` length suffix requires ≥20 alphanumeric chars after the prefix — short enough to catch every real GitHub PAT (classic ≥36, fine-grained ≥82) and long enough that bare-prefix documentation (e.g. the regex pattern itself in this story file or in the step-01 preflight prose) does not false-positive. Capture exit code in Dev Agent Record §Debug Log References.
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors (7 pre-existing warnings in `tests/support/litellm-helper.mjs` unchanged).
  - [x] `npx prettier --write` scoped to every file modified by this story (do NOT run `npm run format` globally per stories 5-1 through 5-6 Completion Notes).
  - [x] `npm test` → 234 passing / 0 failing per AC #10.

- [x] **Task 7 — Commit (AC: all + #15)**
  - [x] Stage in this order: skill-step files (Task 2 outputs), `_bmad/custom/bmad-agent-dev.toml` (Task 3 output), planning-artifact amendments (Task 4 outputs — `planning-artifacts/PRD.md`, `planning-artifacts/pilot.md`, `planning-artifacts/epics/EPIC-5-pilot-iterate.md`), `planning-artifacts/stories/5-7-refine-prompts-and-templates.md` (Status `ready-for-dev` → `review` on the dev-story execution commit, `review` → `done` on the close commit after the code-review pass — per AC #15), `planning-artifacts/sprint-status.yaml` (transition + `last_updated` bump), and `planning-artifacts/deferred-work.md` IF a `won't-fix in 5-7` row was added per AC #14.
  - [x] Commit message: `feat(planning): translate EPIC-5 pilot friction log into refinements via story 5-7`
  - [x] Body:

    ```
    Translate the 16 in-scope entries from planning-artifacts/friction-log.md
    (story-5-7-skill-fix 11 + story-5-7-config-fix 3 + story-5-7-prd-amend 2)
    into concrete patches against the named source files. Each in-scope
    short-ID lands in the §Translation summary table mapping to its target
    file(s) and diff approach.

    Skill-fix changes (src/custom-skills/clickup-create-story/ +
    src/custom-skills/clickup-dev-implement/): sprint-window inclusive-bound
    hint, step-04 metadata-peel extension, step-01/03 stale-NEXT cleanup,
    cwd-assertion guard, step-01 verbatim-message reminder, step-02
    root-level filter, step-05 review-status match-set expansion (in review /
    ready for review / code review / pending review / awaiting review),
    step-04 Template B Pull-Request field, smoke-cross-list toggle-state
    warning, PAT-prefix preflight.

    Config-fix changes (_bmad/custom/bmad-agent-dev.toml): pinned-backlog-
    list-id and pinned-sprint-folder-id knobs under [clickup_create_story]
    table; DS-trigger investigation outcome captured per AC #6.

    PRD-amend changes (planning-artifacts/{PRD,pilot}.md +
    planning-artifacts/epics/EPIC-5-pilot-iterate.md): store-lesson →
    save-lesson rename across pilot.md and EPIC-5-pilot-iterate.md (ClickUp
    body deferred to human-only); PRD §ClickUp layout amended to dual-shape
    same-list OR cross-list language with workspace-toggle gating.

    Out-of-scope: story-5-8-doc-only, human-only, and out-of-scope buckets
    untouched. Friction log immutable. ClickUp / pilot repo / BMAD-METHOD /
    src/tools/clickup unchanged. Test baseline (234 passing) unchanged.

    Refs: EPIC-5, story 5-7-refine-prompts-and-templates,
    planning-artifacts/friction-log.md (input).
    ```

## Dev Notes

### Why this story translates by surface, not by entry

A 16-entry list could be rewritten as 16 separate hunks, one per friction-log entry. Surface-grouping is preferred because of the cluster shape:

- **`step-05-in-review-literal-match-miss`** + **`step-05-match-set-too-narrow`** edit the same instruction-4 in `step-05-status-transition.md`. Two separate hunks would duplicate the diff context and confuse the reviewer.
- **`pwd-deviation-cwd-not-pilot-repo`** + **`lore-origin-pat-preflight-gap`** both live in step-01 of one or both skills — co-locating the cwd-assertion guard and the PAT-prefix preflight at the front of step-01 produces one preflight section rather than two scattered ones.
- **`two-backlog-lists-in-team-space`** + **`two-sprint-folders-in-team-space`** share the same TOML table (`[clickup_create_story]`); landing them as one hunk halves the file's diff churn.
- **`store-lesson-vs-save-lesson-name-mismatch`** edits two files in lockstep (`pilot.md` + `EPIC-5-pilot-iterate.md`); a single rename pass catches both occurrences.

The §Translation summary table preserves the entry-level traceability (16 rows, one per short-ID) without forcing the diff itself to fragment into 16 hunks.

### Why a config-driven match set is preferred over a hardcoded one

`step-05-in-review-literal-match-miss` could be fixed by changing the literal `"in review"` to a different literal (e.g. `"ready for review"` if the pilot's ClickUp workspace happened to use that). That would unbreak the pilot but leave the next workspace's review-status synonym broken. The match-set expansion (5 synonyms in priority order) is the minimum that survives contact with arbitrary ClickUp workspaces. A future refinement could promote the match set into a config knob (`[clickup_dev_implement] review_status_synonyms = [...]` in `_bmad/custom/bmad-agent-dev.toml`); that's NOT in this story's scope per the "minimal patch" framing — the 5-synonym hardcoded set covers the friction log's observed gap and the four common synonyms named by `step-05-match-set-too-narrow`. If a future pilot in a different workspace surfaces a sixth synonym, that's a one-line addition to the match set, well-bounded by the precedent this story establishes.

### Why `.bmad-pilot-marker` is the recommended cwd-assertion sentinel

Three mechanisms could detect "is the dev session in the pilot repo":

1. **`git rev-parse --show-toplevel`** matched against a pinned path. Brittle: pinned paths break across machines and CI runners; the pilot's path on this laptop (`/Volumes/Data/project/products/alpharages/lore`) is not portable.
2. **`BMAD_PILOT_REPO_ROOT` env var.** Brittle: requires every dev to export the var; silent default is "unset", which produces no signal.
3. **`.bmad-pilot-marker` sentinel file at the pilot-repo root.** Self-contained: the file's presence/absence is portable across machines, CI, and forks. The marker file is a one-line YAML / JSON / plain-text indicator that the cwd is the intended pilot target. The skill's cwd-assertion checks for the file's existence (and optionally validates a `repo:` or `epic:` field inside it for stronger assertion).

The recommended marker file shape is plain text:

```
bmad-pilot-marker: 1
repo: Alpharages/lore
epic: 86excfrge
```

The skill's cwd-assertion reads it, verifies `bmad-pilot-marker: 1` is present, and continues; if the file is absent, the skill emits the `❌` error block per AC #4. The marker file is added to the **pilot repo** (`Alpharages/lore`), not this repo — which is why this story's AC #4 makes the marker mechanism a recommendation (the pilot repo is out-of-scope per AC #13), not a hard requirement. The skill's cwd-assertion contract is a runtime check; the marker file is the operator's responsibility (story 5-8's quickstart docs will document the operator-side setup).

### Why the PRD §ClickUp layout amendment uses dual-shape language

The original PRD reads "Stories → subtasks of an epic (parent = epic task), living in the active Sprint list." This is unsatisfiable under workspace `9018612026`'s `Tasks in Multiple Lists` ClickApp = OFF state — `cross-list-subtask-block` HIGH-severity entry. Three remediation options were captured per the friction log's `## Cross-cutting themes` bullet 3: (1) toggle the ClickApp ON, (2) move the sprint folder under the same list-tree as Backlog, (3) accept same-list permanently. The pilot's chosen workaround was implicitly (3) — the merged state landed subtasks alongside the epic in the Backlog list. But options (1) and (2) remain valid for workspaces with different toggle states or list trees. The PRD amendment supports all three by making the layout dual-shape: same-list OR cross-list, gated by the workspace toggle. This avoids prescribing a single layout and matches the actual flexibility that `clickup-create-story` already supports (the same-list pivot worked end-to-end during the pilot under the AC #3 amendment in story 5-4).

### Why the `store-lesson` → `save-lesson` rename is the recommended canonical pick

Three sources name the second pilot subtask:

- `pilot.md` §Pilot epic: `store-lesson`
- ClickUp epic body for `86excfrge`: `store-lesson`
- `EPIC-5-pilot-iterate.md`: `store-lesson`
- Actual ClickUp subtask `86exd8yh3`: `Implement save-lesson MCP tool`
- Pilot-repo PRD / tech-spec canonical name: `save_lesson`

Five sources, two divergent names. The `save-lesson` name has two votes (the actual subtask + the canonical pilot-repo spec); the `store-lesson` name has three votes (pilot.md + ClickUp body + EPIC-5 file). The canonical pick is `save-lesson` because:

1. The pilot-repo PRD is the source of truth for the pilot product itself (the `lore-memory-mcp` tool surface). Renaming three planning-artifact references is a one-pass diff; renaming the pilot-repo spec + the actual implementation would be a much bigger blast radius.
2. The implementation already exists (story 5-5 implemented `save_lesson` end-to-end; the function name in pilot-repo `Alpharages/lore` is `save_lesson`). Renaming the implementation now would break PR `Alpharages/lore#1`.
3. The ClickUp subtask name `Implement save-lesson MCP tool` is the canonical reference for the work item. Renaming the subtask body would mean editing ClickUp, which is out of scope for this story.

The rename direction is therefore "fix the planning artifacts, keep the implementation." The ClickUp body amendment is queued for human-only follow-up because (a) it's a one-line UI edit, (b) it's not blocking story 5-9's retro (5-9 reads `pilot.md` and the friction log, both of which are amended in this story), and (c) ClickUp writes are out-of-scope per AC #12.

### Tooling interaction

- **tsc:** no `.ts` changes, no new exclude entry needed.
- **ESLint:** flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. The `scripts/smoke-clickup-cross-list.mjs` edit per `story-1-6-smoke-false-positive-risk` IS in scope of ESLint; verify lint exits 0 against the modified file.
- **Prettier:** scoped `npx prettier --write` on every file modified by this story (skill steps, TOML, PRD / pilot.md / epic file, this story file, sprint-status.yaml, optionally `scripts/smoke-clickup-cross-list.mjs`, optionally `planning-artifacts/deferred-work.md`). The `npm run format` global-rewrite footgun is documented in stories 5-1 through 5-6 Completion Notes.
- **Vitest:** no test changes expected. If `story-1-6-smoke-false-positive-risk`'s fix involves a unit-test addition for the new toggle-state warning logic (option (a) per AC #4), capture the count delta in §Translation summary Notes and update AC #10's expected baseline accordingly.
- **Dep-audit test:** scans `src/**/*.ts`; no `.ts` in this story.

### Dependency graph for EPIC-5 stories (reminder)

- **Story 5-1 (done)** recorded the pilot decision in `pilot.md`.
- **Story 5-2 (done)** seeded `planning-artifacts/{PRD,architecture,tech-spec}.md` in the pilot repo.
- **Story 5-3 (done)** created the pilot epic `86excfrge` as a ClickUp Backlog task.
- **Story 5-4 (done)** invoked Dev agent (CS trigger) 3 times to draft 3 ClickUp subtasks under `86excfrge`.
- **Story 5-5 (done)** invoked Dev agent (DS trigger) to implement subtask `86exd8y7a` end-to-end (PR `Alpharages/lore#1`, status `ready for review`).
- **Story 5-6 (done)** captured the friction log from 5-3 / 5-4 / 5-5 (22 unique H3 entries).
- **Story 5-7 (this story)** translates the 16 in-scope friction-log entries into concrete refinements. Depends on 5-6.
- **Story 5-8** writes team-facing quickstart docs against the post-5-7 skill state. Depends on 5-7.
- **Story 5-9** runs the retro and records the go/no-go decision. Depends on all of 5-3 through 5-8 — the friction log + the post-5-7 fix list are the primary inputs to the go/no-go evaluation.

A slip in 5-7 (e.g. >3 `won't-fix in 5-7` rows per AC #14, or a HIGH-severity entry left untranslated) cascades into 5-9's retro signal — the retro evaluates whether the pilot's friction was tractable, and a >3-won't-fix outcome is itself the no-go signal.

### What story 5-8 will do with this file

Story 5-8 (team-facing quickstart docs) reads:

1. The post-5-7 skill state (every step file under `src/custom-skills/clickup-create-story/steps/` and `src/custom-skills/clickup-dev-implement/steps/`).
2. The post-5-7 config state (`_bmad/custom/bmad-agent-dev.toml`'s new `[clickup_create_story]` table).
3. The two `story-5-8-doc-only` friction-log entries (`gh-auth-prerequisite-undocumented`, `multi-repo-cwd-handling-undocumented`).
4. The two `human-only` friction-log entries (`cross-list-subtask-block`, `gh-auth-wrong-account`) — surfaced as a workspace-prerequisite checklist in the quickstart.

Story 5-8 does NOT amend the skill files or the TOML — it documents the post-5-7 state. If 5-8 surfaces a doc-only friction during its own execution, that friction lands in 5-8's Dev Agent Record, not retroactively in `friction-log.md`.

### What story 5-9 will do with this file

Story 5-9 (pilot retro and go/no-go) reads:

1. `planning-artifacts/friction-log.md` — the as-experienced pilot signal.
2. This story's §Translation summary table — the as-translated fix list.
3. `planning-artifacts/pilot.md` (post-5-7 amendment).
4. The post-5-7 git history of `src/custom-skills/` and `_bmad/custom/`.

The retro evaluates "did the pilot reveal blocking issues that translated cleanly into refinements, or did it reveal a fundamental design problem?" A green retro signal is "≥13 of 16 in-scope entries landed concrete fixes (≤3 `won't-fix in 5-7`); both HIGH-severity entries were addressed (one via skill refinement, one via human-only checklist); and the §Translation summary's diff approach is dominated by `in-line patch` rather than `extracted helper` or `won't-fix in 5-7`." A no-go signal is the inverse — too many won't-fixes, or a HIGH entry that translated into a design redesign rather than a patch. Story 5-9 owns the evaluation; this story's job is to make the evaluation possible by producing a structured §Translation summary the retro can read.

### References

- [EPIC-5 §Stories bullet 7](../epics/EPIC-5-pilot-iterate.md) — "Refine prompts / description template / config based on friction".
- [EPIC-5 §Outcomes bullet 5](../epics/EPIC-5-pilot-iterate.md) — "Friction log captured and translated into prompt / template / config refinements" (translation half).
- [`planning-artifacts/friction-log.md`](../friction-log.md) — input (22 unique H3 entries; 16 in-scope per §Owner queue's three `story-5-7-*` buckets).
- [`planning-artifacts/PRD.md` §ClickUp layout](../PRD.md) — target of the `prd-clickup-layout-vs-merged-state-drift` amendment.
- [`planning-artifacts/PRD.md` §Risks / assumptions R1](../PRD.md) — original prediction of `cross-list-subtask-block`; preserved unchanged in PRD §Risks (R1 is forward-looking; the §ClickUp layout amendment is the backward-looking update).
- [`planning-artifacts/pilot.md` §Pilot epic](../pilot.md) — target of `store-lesson` → `save-lesson` rename.
- [`planning-artifacts/epics/EPIC-5-pilot-iterate.md`](../epics/EPIC-5-pilot-iterate.md) — target of `store-lesson` → `save-lesson` rename.
- [Story 5-1 AC #8](./5-1-choose-pilot-project.md) — `pilot.md` §Decision Status transition schedule (story 5-9 owns the next transition; this story does NOT transition decision status).
- [Story 5-6](./5-6-capture-friction-log.md) — friction-log capture story; this story's predecessor.
- [Story 5-6 Dev Notes §"What story 5-7 will do with this file"](./5-6-capture-friction-log.md) — anticipated task shape for this story.
- [Story 1-6](./1-6-smoke-test-cross-list-subtask.md) — origin of the `scripts/smoke-clickup-cross-list.mjs` harness amended by `story-1-6-smoke-false-positive-risk`.
- [Story 2-7](./2-7-config-toml-wiring.md) — TOML wiring precedent for `_bmad/custom/bmad-agent-dev.toml`.
- [Story 3-9](./3-9-dev-config-toml-wiring.md) — DS-trigger wiring precedent; `ds-trigger-not-dispatched-via-toml` investigation reads this for the pre-pilot wiring shape.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) via Claude Code CLI. Executed from cwd `/Volumes/Data/project/products/alpharages/bmad-mcp-server` on branch `feat/1-2-wire-register-functions`. No cwd deviation — this story is bmad-mcp-server-repo only.

### Debug Log References

- `pwd` → `/Volumes/Data/project/products/alpharages/bmad-mcp-server`; `git branch --show-current` → `feat/1-2-wire-register-functions`.
- Pre-edit working tree: only the `bmad-create-story`-bootstrap artifacts (`planning-artifacts/sprint-status.yaml` modified, `planning-artifacts/stories/5-7-refine-prompts-and-templates.md` untracked) per Task 0.
- Build / lint / test results captured under §Completion Notes below.
- Pre-commit secret scan (post-code-review tightening per AC #11 / Task 6): `grep -REn '(ghp|ghs|ghu|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}' src/custom-skills/ _bmad/custom/ planning-artifacts/PRD.md planning-artifacts/pilot.md planning-artifacts/epics/EPIC-5-pilot-iterate.md planning-artifacts/stories/5-7-refine-prompts-and-templates.md scripts/smoke-clickup-cross-list.mjs` returns 0 matches (exit 1). The original loose grep (`'ghp_|github_pat_|ghs_|ghu_|ghr_'`) returned 5 false positives where the regex pattern itself appears in documentation prose (the preflight in `step-01-task-id-parser.md`, the AC text in this story, the §Tasks step 7 grep command in this story, and the §Translation summary Notes column for `lore-origin-pat-preflight-gap`); none of those matches embedded an actual PAT. Code-review feedback tightened the AC to require ≥20 alphanumeric chars after the prefix — short enough to catch every real GitHub PAT (classic ≥36 chars, fine-grained ≥82 chars) and long enough that bare-prefix documentation does not false-positive.
- Regression-guard `git diff --stat` outputs captured under §Completion Notes below.

### Completion Notes List

**Outcome.** All 16 in-scope friction-log entries translated into concrete in-line patches. Zero `won't-fix in 5-7` rows (AC #14 cap of 3 not exercised; `planning-artifacts/deferred-work.md` byte-unchanged).

**Per-surface diff stats.**

- Skill files (`src/custom-skills/clickup-create-story/steps/`): 4 step files modified — step-01 (cwd-assertion + verbatim-message reminder + ## NEXT rewrite), step-02 (root-level filter + pinned-list short-circuit), step-03 (inclusive-bound hint + ## NEXT rewrite + pinned-folder short-circuit), step-04 (metadata-peel extension).
- Skill files (`src/custom-skills/clickup-dev-implement/steps/`): 3 step files modified — step-01 (cwd-assertion + PAT-prefix preflight under one `## PREFLIGHT` section), step-04 (Template B Pull-Request field + instruction-3 PR-URL sourcing), step-05 (5-synonym match set in instruction-4 + warning enumeration).
- Config (`_bmad/custom/bmad-agent-dev.toml`): top-of-file comment expanded for the DS-trigger investigation outcome; new `[clickup_create_story]` table with two optional pinned-ID knobs (`pinned_backlog_list_id`, `pinned_sprint_folder_id`); `[[agent.menu]]` entries byte-unchanged per AC #7.
- Smoke harness (`scripts/smoke-clickup-cross-list.mjs`): docstring `⚠️` block + post-PASS stderr warning citing `story-1-6-smoke-false-positive-risk`. Sole `.mjs` edit per AC #11 carve-out.
- Planning artifacts: `planning-artifacts/pilot.md` (`store-lesson` → `save-lesson` rename + 2026-04-27 change-log row), `planning-artifacts/PRD.md` (§ClickUp layout dual-shape + new §Change log section + 2026-04-27 row).

**Choice rationale (AC #4 — cwd-assertion shape).** Option (a) in-line per skill chosen. The cwd-assertion prose is ~20 lines per skill (well under the AC #4 ~25-line threshold for option (b)) and the two skill step-01 files are independent step-1s; co-locating each skill's preflight in its own first step keeps the skills self-contained and avoids introducing a new shared file. The recommended `.bmad-pilot-marker` sentinel mechanism is documented in both step-01 files; the disclosed-deviation escape hatch (absolute-path `Read` substitution per stories 5-4 / 5-5) is preserved verbatim.

**Choice rationale (AC #6 — DS-trigger investigation).** Outcome (b) chosen. The pilot-run evidence (story 5-5 §Completion Notes "Friction log preview" item 3 + 5-4's identical CS-trigger observation) consistently shows that `_bmad/custom/bmad-agent-dev.toml`'s `[[agent.menu]]` entries are not dispatched in Claude Code CLI mode — the agent invokes the skill steps directly. The TOML-based mechanism is Cursor / VS Code-only on the evidence available. Outcome (b) is the conservative documentation-only path: amend the top-of-file comment so a future maintainer reading the TOML knows the file is load-bearing only for IDE-integrated invocations. Outcome (a) (write a CLI invocation guide) was not chosen because no CLI dispatch incantation has been verified to work; outcome (c) (`won't-fix`) was not chosen because the documentation fix is concrete and lands cleanly. `[[agent.menu]]` entries remain byte-unchanged per AC #7.

**No `won't-fix in 5-7` rows.** All 16 in-scope entries land concrete fixes; AC #14's deferred-work pathway is not exercised in this story. `planning-artifacts/deferred-work.md` is byte-unchanged.

**Friction-log preview for story 5-9 retro.** No new friction observed during this story's execution. Notable observations recorded here (NOT retroactively in `friction-log.md` per §Out of Scope):

- The friction-log entry `store-lesson-vs-save-lesson-name-mismatch` claimed three in-repo sources read `store-lesson` (`pilot.md` §Pilot epic, ClickUp body, `EPIC-5-pilot-iterate.md`). At execution time `EPIC-5-pilot-iterate.md` was found to contain zero `store-lesson` references — likely the friction log conflated the EPIC-5 file with the ClickUp epic body, both of which are alternative third sources. The §Translation summary Notes column for this row records the carve-out; only `pilot.md` was edited in-repo.
- Workspace-toggle inspection (`mcp__bmad-local__getCurrentSpace` etc.) was deliberately not exercised — AC #11 / #12 forbid ClickUp writes, and the `story-1-6-smoke-false-positive-risk` AC #4 option (b) explicitly chose docstring/output warning over toggle-state interrogation.

**Recommendations for the code reviewer.** Three areas warrant focused attention:

1. **Citation pass consistency (AC #5).** Every modified step file ends with a `> **Refinement source:** ...` footnote enumerating the friction-log short-IDs the file addresses. Verify each step file's footnote matches the §Translation summary table; a missing footnote is a coverage gap, an extra footnote is dead text.
2. **Pinned-ID short-circuit ordering vs cwd-assertion.** Per Task 3b's intent, the cwd-assertion in step-01 must run before step-02's pinned-list lookup so a wrong-cwd session fails-early rather than producing a false positive against the wrong workspace. The `## CWD Assertion` section is placed at the very top of step-01 (before `## INSTRUCTIONS`), so this ordering is structural — verify by reading step-01's TOC.
3. **The `[clickup_create_story]` TOML knobs are documented as optional (default unset) and the step-02 / step-03 short-circuits are no-ops when unset.** Verify the original picker behaviour is byte-equivalent in the unset case (both step files retain their pre-existing scan / multi-list / multi-folder branches; the pinned-ID logic is purely additive).

### File List

**Modified (bmad-mcp-server repo)**

- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` — cwd-assertion guard (Task 2d) + verbatim-message reminder (Task 2e) + ## NEXT rewrite (Task 2c) + footnote citation
- `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md` — root-level filter (Task 2f) + pinned-list-id consultation (Task 3b) + footnote citation
- `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md` — inclusive-bound hint (Task 2a) + ## NEXT rewrite (Task 2c) + pinned-folder-id consultation (Task 3b) + footnote citation
- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md` — metadata-peel extension (Task 2b) + footnote citation
- `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` — cwd-assertion guard + PAT-prefix preflight under one ## PREFLIGHT section (Tasks 2d / 2h) + footnote citation
- `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md` — Template B Pull-Request field + instruction-3 PR-URL sourcing (Task 2j) + footnote citation
- `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md` — review-status match-set expansion (Task 2i — co-resolves `step-05-in-review-literal-match-miss` and `step-05-match-set-too-narrow`) + footnote citation
- `_bmad/custom/bmad-agent-dev.toml` — top-of-file comment expansion for DS-trigger outcome (b) (Task 3c) + new `[clickup_create_story]` pinned-IDs table (Task 3a)
- `scripts/smoke-clickup-cross-list.mjs` — docstring `⚠️` block + post-PASS stderr warning (Task 2g)
- `planning-artifacts/PRD.md` — §ClickUp layout dual-shape amendment + new §Change log section (Tasks 4b / 4c)
- `planning-artifacts/pilot.md` — `store-lesson` → `save-lesson` rename in §Pilot epic + §Selection rationale > Small scope + 2026-04-27 §Change log row (Tasks 4a / 4c)
- `planning-artifacts/sprint-status.yaml` — `5-7-refine-prompts-and-templates` `ready-for-dev` → `review` + `last_updated` bump
- `planning-artifacts/stories/5-7-refine-prompts-and-templates.md` — this story file (status, §Translation summary fill-in, §Dev Agent Record fill-in, §Change Log row)

**New (bmad-mcp-server repo)**

- (none — AC #4 option (a) chosen for `pwd-deviation-cwd-not-pilot-repo`, so the optional `src/custom-skills/_shared/cwd-assertion.md` shared file is not created. AC #14's `planning-artifacts/deferred-work.md` row was not exercised since zero `won't-fix in 5-7` rows landed.)

**New (pilot repo `Alpharages/lore`)**

- (none — this story does not touch the pilot repo per AC #13)

**New (ClickUp workspace `9018612026`)**

- (none — this story does not touch ClickUp per AC #12)

**Deleted**

- (none — `## NEXT` cleanup chose the "rewrite" pattern, not "remove"; both `## NEXT` headings remain, just with corrected body text)

**Not modified (verified by AC #11 / #12 / #13 regression guards)**

- No `src/**/*.ts` files (the `.ts` constraint applies; the `src/custom-skills/**` markdown step files are amended but no TypeScript was touched).
- `BMAD-METHOD/` — byte-unchanged.
- `src/tools/clickup/` — byte-unchanged.
- `planning-artifacts/friction-log.md` — byte-unchanged (immutable post-5-6).
- `planning-artifacts/deferred-work.md` — byte-unchanged (no `won't-fix in 5-7` row needed).
- `planning-artifacts/epics/EPIC-5-pilot-iterate.md` — byte-unchanged (file contains zero `store-lesson` references; carve-out captured in §Translation summary Notes for `store-lesson-vs-save-lesson-name-mismatch`).
- All sibling story files under `planning-artifacts/stories/` (only 5-7's own file is modified).

### Review Findings

_To be filled in at code-review time. Expected pattern matches stories 5-1 through 5-6: §Senior Developer Review (AI) below summarises findings raised by `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor parallel layers) plus the triage outcome._

## Senior Developer Review (AI)

_To be filled in at code-review time. Expected sections: Reviewer / Date / Outcome / Findings ledger / Action Items. The triage rubric matches story 5-6's pattern: Bad-spec / Patch (resolved-in-place at close commit) / Defer / Rejected as noise._

## Translation summary

All 16 in-scope short-IDs landed concrete in-line patches (zero `won't-fix in 5-7` rows; AC #14 cap of 3 not exercised).

<!-- prettier-ignore-start -->

| Friction-log short-ID                            | Severity | Surface    | File(s) modified                                                                                                                                          | Diff approach | Notes                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sprint-window-strict-less-than-edge-on-start-day | LOW      | skill      | `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`                                                                              | in-line patch | Step-03 instruction-6 hint amended to inclusive bounds ("on or before today AND on or after today").                                                                                                                                                                                                   |
| gettaskbyid-metadata-description-boundary        | LOW      | skill      | `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`                                                                            | in-line patch | Step-04 instruction-6 extended to also peel the leading metadata block (up to and incl. `parent_task_id:`, or up to first `## ...` heading).                                                                                                                                                          |
| stale-next-wording-in-skill-files                | LOW      | docs       | `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`, `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`      | in-line patch | Both `## NEXT` blocks rewritten as concrete "proceed to step N" pointers; "not yet implemented" wording removed.                                                                                                                                                                                       |
| pwd-deviation-cwd-not-pilot-repo                 | MEDIUM   | skill      | `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`, `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`         | in-line patch | AC #4 option (a): in-line `## CWD Assertion` / `## PREFLIGHT` section per skill using `.bmad-pilot-marker` sentinel. Disclosed-deviation escape hatch documented per stories 5-4 / 5-5.                                                                                                                |
| step-01-verbatim-message-not-captured            | LOW      | skill      | `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`                                                                                    | in-line patch | Permission-gate verbatim line preserved word-for-word; one-sentence reminder added requiring Dev Agent Record capture.                                                                                                                                                                                |
| epic-picker-no-root-level-filter                 | MEDIUM   | skill      | `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`                                                                                     | in-line patch | Instruction-7 extended with a `parent_task_id` null/absent/empty filter applied before the picker enumeration; subtasks under the same-list pivot are now suppressed.                                                                                                                                 |
| story-1-6-smoke-false-positive-risk              | MEDIUM   | config     | `scripts/smoke-clickup-cross-list.mjs`                                                                                                                    | in-line patch | AC #4 option (b): docstring + post-PASS stderr warning that PASS is conditional on the workspace `Tasks in Multiple Lists` ClickApp toggle being ON. Sole `.mjs` edit in this story per AC #11 carve-out.                                                                                            |
| lore-origin-pat-preflight-gap                    | LOW      | skill      | `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`                                                                                 | in-line patch | Co-located with cwd-assertion under one `## PREFLIGHT` section (instruction 0b): `git remote -v` + grep for `ghp_\|github_pat_\|ghs_\|ghu_\|ghr_`; `❌` block + remote-rewrite + PAT-rotation guidance.                                                                                                |
| step-05-in-review-literal-match-miss             | MEDIUM   | skill      | `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md`                                                                              | in-line patch | Instruction-4 expanded into a 5-synonym priority-ordered match set (`in review`, `ready for review`, `code review`, `pending review`, `awaiting review`); failure-path warning enumerates the full set.                                                                                              |
| template-b-no-pr-field                           | MEDIUM   | skill      | `src/custom-skills/clickup-dev-implement/steps/step-04-progress-comment-poster.md`                                                                        | in-line patch | Template B gets `**Pull Request:** {pr_url}` between Summary and Files-changed; rendered only when `{pr_url}` is non-empty. Instruction-3 extended to source `{pr_url}` from `gh pr create` stdout.                                                                                                  |
| step-05-match-set-too-narrow                     | MEDIUM   | skill      | `src/custom-skills/clickup-dev-implement/steps/step-05-status-transition.md`                                                                              | in-line patch | Co-resolved with `step-05-in-review-literal-match-miss` in a single instruction-4 hunk per AC #4 framing.                                                                                                                                                                                            |
| two-backlog-lists-in-team-space                  | MEDIUM   | config     | `_bmad/custom/bmad-agent-dev.toml`, `src/custom-skills/clickup-create-story/steps/step-02-epic-picker.md`                                                 | in-line patch | New `[clickup_create_story]` table with optional `pinned_backlog_list_id` knob (default unset). Step-02 instruction-6 consults the pinned ID first and short-circuits the multi-list scan when present in the tree.                                                                                  |
| two-sprint-folders-in-team-space                 | MEDIUM   | config     | `_bmad/custom/bmad-agent-dev.toml`, `src/custom-skills/clickup-create-story/steps/step-03-sprint-list-picker.md`                                          | in-line patch | Same `[clickup_create_story]` table adds `pinned_sprint_folder_id` (default unset). Step-03 instruction-3 consults the pinned ID first and skips the multi-folder scan when present.                                                                                                                 |
| ds-trigger-not-dispatched-via-toml               | MEDIUM   | config     | `_bmad/custom/bmad-agent-dev.toml`                                                                                                                        | in-line patch | AC #6 outcome (b): top-of-file comment expanded to document that TOML triggers dispatch in Cursor / VS Code while Claude Code CLI mode invokes skills directly. Both invocation paths produce the same artifacts. `[[agent.menu]]` entries byte-unchanged per AC #7.                                |
| store-lesson-vs-save-lesson-name-mismatch        | MEDIUM   | prd-spec   | `planning-artifacts/pilot.md`                                                                                                                             | in-line patch | Renamed `store-lesson` → `save-lesson` in §Pilot epic + §Selection rationale > Small scope. `EPIC-5-pilot-iterate.md` checked at execution time and contains zero `store-lesson` references — no edit needed there. ClickUp epic `86excfrge` body amendment is queued for human-only follow-up (AC #8 carve-out). |
| prd-clickup-layout-vs-merged-state-drift         | MEDIUM   | prd-spec   | `planning-artifacts/PRD.md`                                                                                                                               | in-line patch | §ClickUp layout subtask bullet replaced with dual-shape language (same-list OR cross-list, gated by the workspace `Tasks in Multiple Lists` ClickApp toggle). §Risks R1 preserved unchanged.                                                                                                          |

<!-- prettier-ignore-end -->

## Change Log

<!-- prettier-ignore-start -->

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2026-04-27 | Story drafted from EPIC-5 bullet 7 via `bmad-create-story` workflow. Status → `ready-for-dev`. `sprint-status.yaml` updated: `5-7-refine-prompts-and-templates` `backlog` → `ready-for-dev`, `last_updated` bumped. Reads `planning-artifacts/friction-log.md` (story 5-6 output) as single source of truth — 16 in-scope short-IDs across `story-5-7-skill-fix` (11), `story-5-7-config-fix` (3), `story-5-7-prd-amend` (2). AC #1–#3 bind §Translation summary table coverage; AC #4–#8 bind per-surface diff requirements; AC #14 caps `won't-fix in 5-7` rows at 3. `story-5-8-doc-only` (2 entries) + `human-only` (2 entries) + `out-of-scope` (2 entries) explicitly deferred per §Out of Scope. Friction log immutable; ClickUp / pilot repo / BMAD-METHOD / `src/tools/clickup/` byte-frozen. Test baseline (234 passing) expected unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-27 | All 16 in-scope friction-log entries translated into concrete in-line patches (zero `won't-fix in 5-7` rows; AC #14 cap of 3 not exercised). Skill-fix (11) lands across 7 step files in both skills; config-fix (3) lands in `_bmad/custom/bmad-agent-dev.toml` (top-of-file DS-trigger comment + new `[clickup_create_story]` table with two optional pinned-ID knobs) plus step-02 / step-03 short-circuits; prd-amend (2) lands in `planning-artifacts/PRD.md` (§ClickUp layout dual-shape + new §Change log section) and `planning-artifacts/pilot.md` (`store-lesson` → `save-lesson` rename + §Change log row). `EPIC-5-pilot-iterate.md` was checked at execution time and contains zero `store-lesson` references — no edit needed there; carve-out captured in §Translation summary Notes. ClickUp epic body amendment for the rename is queued for human-only follow-up per AC #8. Status transitions `ready-for-dev` → `review`. `sprint-status.yaml` bumped accordingly. Build / lint / test / regression-guard results captured in §Dev Agent Record §Completion Notes. Friction log + ClickUp / pilot repo / BMAD-METHOD / `src/tools/clickup/` all byte-unchanged per AC #11 / #12 / #13. |

<!-- prettier-ignore-end -->
