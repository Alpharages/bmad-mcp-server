# EPIC-5 Pilot Friction Log

This file is the durable, single-file friction log for the EPIC-5 pilot. It
synthesises every friction-preview entry already captured inline in the
execution stories (5-3 epic creation, 5-4 Dev story-creation mode, 5-5 Dev
implementation mode) into one severity-ranked, deduplicated, descriptive
record. The date range covered is 2026-04-25 → 2026-04-27 per
[`pilot.md` §Change log](./pilot.md). It is the single source of truth
consumed by stories 5-7 (prompt / template / config refinements), 5-8
(team-facing quickstart docs), and 5-9 (pilot retro and go/no-go decision).
Entries are descriptive only — no prescriptive fixes; story 5-7 owns the
translation half of [EPIC-5 §Outcomes bullet 5](./epics/EPIC-5-pilot-iterate.md).

## How to read this file

Each H3 entry under `## Friction entries` is one friction observation. The
H3 heading is a kebab-case short ID other planning artifacts can cite by
name; the body carries six fixed fields per [story 5-6 AC #5](./stories/5-6-capture-friction-log.md):
**Severity**, **Source story**, **Surface**, **Observed behaviour**,
**Source-story citation**, **Workaround applied**, **Proposed-fix-owner**.
Severity uses three levels:

- **HIGH** — Blocked the flow at execution time and required a workaround
  OR a visible AC amendment to proceed. Examples in this pilot:
  `cross-list-subtask-block` (5-4) and `gh-auth-wrong-account` (5-5).
- **MEDIUM** — Did not block execution but degraded the contract OR
  required disclosed deviation in the Dev Agent Record (escape-hatch path
  taken instead of canonical path). Examples in this pilot:
  `pwd-deviation-cwd-not-pilot-repo` (5-4 / 5-5) and
  `step-05-in-review-literal-match-miss` (5-5).
- **LOW** — Cosmetic, ergonomic, or documentation-only — neither blocked
  execution nor required deviation, but is friction worth recording so
  story 5-7 can decide whether to invest. Examples in this pilot:
  `clickup-renderer-artifacts` (5-4), `stale-next-wording-in-skill-files`
  (5-4), `sprint-window-strict-less-than-edge-on-start-day` (5-4).

The **Surface** field tags where the friction lives:
`skill` (custom skill instructions under
`src/custom-skills/clickup-create-story/` or
`src/custom-skills/clickup-dev-implement/`), `config` (`_bmad/custom/`,
`bmad/`), `docs` (team-facing quickstart docs or stale skill wording),
`workspace` (ClickUp workspace UI / config), `external-tool`
(ClickUp API behaviour, `gh` CLI, GitHub auth), `prd-spec`
(`planning-artifacts/PRD.md` or sibling spec files), `pilot-repo`
(`Alpharages/lore` working tree). The **Proposed-fix-owner** field is
metadata for `## Owner queue` grouping only — the proposed fix itself is
NOT named in this file (story 5-7 owns the prescriptive translation).

## Friction entries

### cross-list-subtask-block

- **Severity:** HIGH
- **Source story:** 5-4
- **Surface:** external-tool
- **Observed behaviour:** First
  `createTask({list_id: "901817647951", parent_task_id: "86excfrge", ...})`
  call against workspace `9018612026` rejected with
  `400 Bad Request — {"err":"Parent not child of list","ECODE":"ITEM_137"}`.
  ClickUp's `Tasks in Multiple Lists` ClickApp toggle gates whether a
  subtask's `list_id` may differ from its parent task's `list_id`. The
  prior PRD §ClickUp-layout shape (epic in Backlog, subtasks in the active
  Sprint list) is unsatisfiable in this workspace under the current
  toggle state.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 1](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** AC #3 amended in-line at execution time;
  subtasks landed in `Backlog (901817647947)` alongside the epic
  (same-list pivot). Three remediation paths captured for story 5-7's
  evaluation; see `## Cross-cutting themes` bullet 3.
- **Proposed-fix-owner:** human-only

### two-backlog-lists-in-team-space

- **Severity:** MEDIUM
- **Source story:** 5-4
- **Surface:** skill
- **Observed behaviour:**
  `step-02-epic-picker.md` instruction 6's edge case ("multiple lists
  named `Backlog`") fired at execution time. `Team Space` contains both
  `HG Mobile > Backlog` and `Lore > Backlog` (`901817647947`). The skill
  cannot disambiguate without runtime user input or a configuration
  pin.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 2](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** Dev-in-session manually selected
  `Lore > Backlog (901817647947)` based on `pilot.md` §ClickUp
  coordinates; no skill change.
- **Proposed-fix-owner:** story-5-7-config-fix

### two-sprint-folders-in-team-space

- **Severity:** MEDIUM
- **Source story:** 5-4
- **Surface:** skill
- **Observed behaviour:** Had `step-03-sprint-list-picker` executed
  (it was bypassed under the same-list pivot), instruction 3's "More
  than one folder whose name contains `sprint`" branch would have
  required a numbered runtime pick. Same disambiguation gap as
  `two-backlog-lists-in-team-space`.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 3](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — friction observed but execution
  unblocked (step-03 not run under the AC #3 same-list pivot).
- **Proposed-fix-owner:** story-5-7-config-fix

### sprint-window-strict-less-than-edge-on-start-day

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** skill
- **Observed behaviour:** 2026-04-27 was the Sprint 1 start day.
  `step-03-sprint-list-picker.md` instruction 6's hint reads
  "active sprint = start before today AND end after today", which
  evaluates false on the start day itself; the picker's hint would
  not flag the only valid list as active.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 4](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — step-03 bypassed under the same-list
  pivot; the friction never materialised in this run, but the
  matcher's strict `<` semantics remain.
- **Proposed-fix-owner:** story-5-7-skill-fix

### searchtasks-fuzzy-not-exact

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** external-tool
- **Observed behaviour:** AC #8's "MUST return exactly one task" reads
  strictly, but ClickUp's `searchTasks` returns fuzzy substring hits.
  For the two `Implement * MCP tool` titles
  (`Implement save-lesson MCP tool`,
  `Implement query-lessons MCP tool`), both ranked above the
  similarity threshold for either query. Skill step-05 rule (c) handles
  this correctly via exact-name filtering downstream.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 5](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — skill's exact-name filter masks the
  fuzziness; AC #8 reads correctly when interpreted via the skill's
  filter, not via raw `searchTasks` output.
- **Proposed-fix-owner:** out-of-scope

### clickup-renderer-artifacts

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** external-tool
- **Observed behaviour:** ClickUp's renderer normalised the posted
  description: `---` separators converted to `* * *`, and italic
  markers adjacent to backticks gained space-padding (e.g.
  `_..._ _\`code\`\_`). All required H2 sections preserved; cosmetic
  only.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 6](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — cosmetic upstream behaviour; AC
  validation reads the logical content, not the byte-exact rendered
  form.
- **Proposed-fix-owner:** out-of-scope

### gettaskbyid-metadata-description-boundary

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** skill
- **Observed behaviour:** `getTaskById` response concatenates
  `parent_task_id: 86excfrge## Epic: ...` with no separator between
  the metadata block and the description content.
  `step-04-description-composer.md` instruction 6's "extract content
  before first `Comment by`" rule peels off comments but does not
  also peel off the leading metadata block.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 7](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** Dev-in-session hand-trimmed the metadata
  prefix when composing each subtask's `## Epic:` section; no skill
  change.
- **Proposed-fix-owner:** story-5-7-skill-fix

### stale-next-wording-in-skill-files

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** docs
- **Observed behaviour:** `step-01-prereq-check.md` and
  `step-03-sprint-list-picker.md` still read "Steps N–N are not yet
  implemented" / "Step 4 is not yet implemented" even though the
  entire `clickup-create-story` skill exists post-EPIC-2.
- **Source-story citation:** [story 5-4 §Completion Notes "Friction log preview" item 8](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — friction observed but execution
  unblocked.
- **Proposed-fix-owner:** story-5-7-skill-fix

### pwd-deviation-cwd-not-pilot-repo

- **Severity:** MEDIUM
- **Source story:** 5-4 / 5-5
- **Surface:** skill
- **Observed behaviour:** Both 5-4 and 5-5 dev sessions reported `pwd`
  as `/Volumes/Data/project/products/alpharages/bmad-mcp-server`
  rather than the pilot repo
  `/Volumes/Data/project/products/alpharages/lore`. The skill's
  contract (read planning artifacts from cwd) was met via the
  absolute-path Read escape hatch; both stories disclosed the
  deviation per AC #14 (5-4) / AC #20 (5-5) and amended the AC text
  in the same commit.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md) +
  [story 5-5 §Completion Notes "Friction log preview for story 5-6" item 3](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** Absolute-path `Read` against pilot-repo
  files (`/Volumes/Data/project/products/alpharages/lore/planning-artifacts/PRD.md`
  etc.) substituted for the canonical relative-path read; deviation
  recorded in each story's Dev Agent Record §Agent Model Used.
- **Proposed-fix-owner:** story-5-7-skill-fix

### step-01-verbatim-message-not-captured

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** skill
- **Observed behaviour:**
  `step-01-prereq-check`'s permission-gate verbatim message
  (`✅ Permission gate passed — write mode active, token
authenticated.`) was not landed in the Dev Agent Record.
  Functional equivalents (`pickSpace` returns 3 spaces; write-mode
  tools present) were captured instead.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** Disclosure-only: the deviation was noted in
  story 5-4's Dev Agent Record §Task 3 entry; no functional impact.
- **Proposed-fix-owner:** story-5-7-skill-fix

### store-lesson-vs-save-lesson-name-mismatch

- **Severity:** MEDIUM
- **Source story:** 5-4
- **Surface:** prd-spec
- **Observed behaviour:** Three sources of truth diverge on the
  second pilot subtask's name:
  [`pilot.md` §Pilot epic](./pilot.md) reads `store-lesson`; epic
  `86excfrge`'s ClickUp body reads `store-lesson`;
  [`EPIC-5-pilot-iterate.md`](./epics/EPIC-5-pilot-iterate.md) reads
  `store-lesson`. But the actual ClickUp subtask
  `86exd8yh3` is `Implement save-lesson MCP tool` (matching the PRD
  / tech-spec canonical name `save_lesson`). Story 5-9's retro reads
  pilot.md and the epic body, so the mismatch must be reconciled
  before then.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None at execution time; flagged for story
  5-7's reconciliation pass. AC #4 of story 5-4 explicitly allowed
  the divergence in this pilot.
- **Proposed-fix-owner:** story-5-7-prd-amend

### epic-picker-no-root-level-filter

- **Severity:** MEDIUM
- **Source story:** 5-4
- **Surface:** skill
- **Observed behaviour:**
  `step-02-epic-picker` enumerates Backlog tasks without filtering
  to root-level epics (`parent_task_id` null/absent). Under the AC
  #3 same-list pivot, subtasks created by 5-4 (`86exd8y7a`,
  `86exd8yh3`, `86exd8yrh`) now live in the same Backlog list as
  their parent epic — a future pilot run would surface these as
  candidate epics.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — first-pilot replay risk only;
  current pilot completed before any candidate-list pollution
  affected the workflow.
- **Proposed-fix-owner:** story-5-7-skill-fix

### prd-clickup-layout-vs-merged-state-drift

- **Severity:** MEDIUM
- **Source story:** 5-4
- **Surface:** prd-spec
- **Observed behaviour:**
  [PRD §ClickUp layout](./PRD.md) reads "Stories → subtasks of an
  epic, living in the active Sprint list", but the merged state
  under the AC #3 same-list pivot lands subtasks in
  `Backlog (901817647947)` alongside the epic. The PRD currently
  describes an unsatisfiable shape for this workspace.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None at execution time; story 5-4 explicitly
  deferred the PRD amendment to story 5-7's lockstep update with
  whichever durable-fix path 5-7 chooses for
  `cross-list-subtask-block`.
- **Proposed-fix-owner:** story-5-7-prd-amend

### story-1-6-smoke-false-positive-risk

- **Severity:** MEDIUM
- **Source story:** 5-4
- **Surface:** config
- **Observed behaviour:** Story 1-6's smoke harness PASSED in
  workspace `9018612026` while story 5-4's same-shape `createTask`
  FAILED in the same workspace. Without root-cause investigation
  (workspace toggle change between runs? different list pair?
  smoke creates lists ad-hoc?), the smoke harness can re-PASS
  tomorrow against an ad-hoc list pair and produce another
  false-positive R1 signal for the next pilot.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** None — the smoke result remains in the
  test suite; story 5-4 added the gap to story 5-7's fourth
  evaluation criterion.
- **Proposed-fix-owner:** story-5-7-skill-fix

### lore-origin-pat-preflight-gap

- **Severity:** LOW
- **Source story:** 5-4
- **Surface:** pilot-repo
- **Observed behaviour:** Story 5-4's preflight did not gate
  `git remote -v` against the GitHub-PAT prefix regex used elsewhere
  in this workspace's secret scans; the pre-existing risk per
  [`pilot.md` §Known risks bullet 2](./pilot.md) was not enforced.
  Resolved at story 5-5 execution time (origin is now SSH
  `git@github.com:Alpharages/lore.git`), but the preflight gap
  itself persists for future stories.
- **Source-story citation:** [story 5-4 §Senior Developer Review (AI) §Action Items](./stories/5-4-dev-creates-pilot-stories.md)
- **Workaround applied:** Story 5-5 added a `git remote -v` /
  GitHub-PAT-prefix grep zero-match preflight to its AC #18; no
  further deviation needed once origin was SSH.
- **Proposed-fix-owner:** story-5-7-skill-fix

### step-05-in-review-literal-match-miss

- **Severity:** MEDIUM
- **Source story:** 5-5
- **Surface:** skill
- **Observed behaviour:**
  `step-05-status-transition`'s hardcoded literal case-insensitive
  match for `"in review"` (per its instruction 4) found no match in
  Backlog list `901817647947`'s 11-status enum (closest:
  `ready for review`). The skill's path (b) non-blocking failure
  triggered (`{transition_target} = ''`). Subtask `86exd8y7a`
  status would have remained `backlog`, which is actively
  misleading once the PR is open.
- **Source-story citation:** [story 5-5 §Completion Notes "Friction log preview for story 5-6" item 1](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** Manual `updateTask` call with
  `status: "ready for review"` executed as a documented deviation
  from the strict skill contract; final ClickUp status post-step-05
  is `ready for review`.
- **Proposed-fix-owner:** story-5-7-skill-fix

### gh-auth-wrong-account

- **Severity:** HIGH
- **Source story:** 5-5
- **Surface:** external-tool
- **Observed behaviour:** `gh pr create` failed mid-session against
  `Alpharages/lore` because the active `gh auth` account was
  `AsimSabirDev`, which has no Alpharages org access. The PR step
  blocked until the user manually re-authenticated `gh` to the
  `khakanali` account.
- **Source-story citation:** [story 5-5 §Completion Notes "Friction log preview for story 5-6" item 2](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** User-in-session ran `gh auth switch` (or
  re-login) to the `khakanali` account before retrying
  `gh pr create`; PR `Alpharages/lore#1` opened on the second
  attempt.
- **Proposed-fix-owner:** human-only

### template-b-no-pr-field

- **Severity:** MEDIUM
- **Source story:** 5-5
- **Surface:** skill
- **Observed behaviour:**
  `step-04-progress-comment-poster.md` Template B (M2 —
  Implementation Complete) has no dedicated
  `**Pull Request:** <url>` field. The PR URL had to be embedded
  inside the `**Summary:**` paragraph, which obscures it for
  reviewers scanning the comment for the PR link.
- **Source-story citation:** [story 5-5 §Completion Notes "Friction log preview for story 5-6" item 4](./stories/5-5-dev-implements-pilot-story.md) +
  [story 5-5 §Review Findings + §Senior Developer Review (AI) §Action Items](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** PR URL embedded in the
  `**Summary:**` paragraph of the M2 ClickUp comment
  (`90180214335882` on `86exd8y7a`); no skill change.
- **Proposed-fix-owner:** story-5-7-skill-fix

### ds-trigger-not-dispatched-via-toml

- **Severity:** MEDIUM
- **Source story:** 5-5
- **Surface:** config
- **Observed behaviour:** In Claude Code CLI mode, the `DS` trigger
  was not dispatched via `_bmad/custom/bmad-agent-dev.toml`; the
  agent walked the seven `clickup-dev-implement` skill steps
  directly. Same pattern as story 5-4's CS-trigger observation. It
  is not yet established whether trigger dispatch is achievable in
  Claude Code CLI mode at all, or whether the TOML-based trigger
  model is a Cursor / VS Code-only mechanism.
- **Source-story citation:** [story 5-5 §Review Findings + §Senior Developer Review (AI) §Action Items](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** Direct skill-step walk substituted for the
  TOML-dispatched trigger; skill produced the contracted artifacts
  (M1 / M2 comments, status transition modulo
  `step-05-in-review-literal-match-miss`).
- **Proposed-fix-owner:** story-5-7-config-fix

### step-05-match-set-too-narrow

- **Severity:** MEDIUM
- **Source story:** 5-5
- **Surface:** skill
- **Observed behaviour:** Beyond the literal `"in review"` miss
  observed at execution (see
  `step-05-in-review-literal-match-miss`), the broader gap is that
  `step-05-status-transition`'s match set fails against any
  workspace-custom review status. Synonyms commonly seen across
  ClickUp workspaces — `ready for review`, `code review`,
  `pending review`, `awaiting review` — all miss the literal
  matcher today.
- **Source-story citation:** [story 5-5 §Senior Developer Review (AI) §Action Items](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** None — captured as a forward-looking
  refinement scope for story 5-7. The current pilot's run hit only
  the `ready for review` synonym, which was bypassed via manual
  `updateTask` (see `step-05-in-review-literal-match-miss`).
- **Proposed-fix-owner:** story-5-7-skill-fix

### gh-auth-prerequisite-undocumented

- **Severity:** LOW
- **Source story:** 5-5
- **Surface:** docs
- **Observed behaviour:** No quickstart or skill doc currently
  mentions that `gh auth` must be configured with a token that has
  access to the target org before invoking `clickup-dev-implement`.
  Future invocations against multi-org laptops will hit the same
  `gh-auth-wrong-account` surprise.
- **Source-story citation:** [story 5-5 §Senior Developer Review (AI) §Action Items](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** None — friction observed but execution
  unblocked once `gh auth` was switched (see
  `gh-auth-wrong-account`).
- **Proposed-fix-owner:** story-5-8-doc-only

### multi-repo-cwd-handling-undocumented

- **Severity:** LOW
- **Source story:** 5-5
- **Surface:** docs
- **Observed behaviour:** `clickup-dev-implement` assumes a
  single-repo cwd. The multi-repo Claude Code project
  configuration (bmad-mcp-server + pilot repo open in the same
  Claude Code session) is undocumented; the dev-in-session falls
  back to absolute-path Read substitution as the disclosed escape
  hatch (see `pwd-deviation-cwd-not-pilot-repo`).
- **Source-story citation:** [story 5-5 §Senior Developer Review (AI) §Action Items](./stories/5-5-dev-implements-pilot-story.md)
- **Workaround applied:** None — friction observed; the absolute-path
  Read substitution is the workaround for the underlying cwd
  deviation, not a docs fix.
- **Proposed-fix-owner:** story-5-8-doc-only

## Cross-cutting themes

- **`pwd` / cwd handling needs hardening across both skills.**
  `pwd-deviation-cwd-not-pilot-repo` surfaced in both 5-4 and 5-5,
  and `multi-repo-cwd-handling-undocumented` shows the underlying
  multi-repo Claude Code session shape is unsupported by the
  current skill contracts. Story 5-7 needs a `step-01-prereq-check`
  cwd-assertion guard (or a `.bmad-pilot-marker` mechanism); story
  5-8 needs the matching quickstart doc.
- **Workspace-custom status enums break literal matchers.**
  `step-05-in-review-literal-match-miss` (the executed observation)
  and `step-05-match-set-too-narrow` (the broader gap) form a
  single root-cause cluster — `step-05-status-transition`'s
  hardcoded literal `"in review"` match cannot survive contact
  with any workspace whose review-state status is named
  differently. Story 5-7 needs to either expand the match set
  (`ready for review`, `code review`, `pending review`,
  `awaiting review`) or make it config-driven.
- **PRD §ClickUp layout drifted from merged state.**
  `cross-list-subtask-block`, `prd-clickup-layout-vs-merged-state-drift`,
  and `story-1-6-smoke-false-positive-risk` form a single cluster
  — the spec describes a cross-list shape that the workspace
  rejects, the merged state pivoted to same-list, and the smoke
  harness produced a false-positive R1 signal that masked the
  block. Story 5-7's three-remediation-options evaluation
  (toggle ClickApp / move sprint folder / accept same-list
  permanently) must address all three together, with PRD
  amendment in lockstep.
- **Skill files have stale future-tense docs and prescriptive-fix
  collapses.** `stale-next-wording-in-skill-files` is the obvious
  symptom; `template-b-no-pr-field` collapses the observation
  (5-5 §Completion Notes) with the prescriptive fix candidate
  (`template-b-pr-field-fix` from 5-5 §Senior Developer Review
  (AI) §Action Items) into one entry, mirroring the spec-vs-fix
  duality the friction log captures by design. Story 5-7 cleanup
  pass.
- **Three-way name reconciliation is needed.**
  `store-lesson-vs-save-lesson-name-mismatch` is a 3-source-of-truth
  divergence (`pilot.md` §Pilot epic, epic `86excfrge`'s ClickUp
  body, `EPIC-5-pilot-iterate.md`) versus the actual subtask
  `86exd8yh3`. Story 5-7 must pick a single canonical name and
  propagate before story 5-9's retro reads pilot.md and the epic
  body.
- **External-tool prereqs are undocumented.**
  `gh-auth-wrong-account`, `gh-auth-prerequisite-undocumented`,
  and `lore-origin-pat-preflight-gap` form a cluster — `gh` CLI
  auth, ClickUp API key / team ID, and origin-URL PAT scanning
  are all assumed-configured by the skills with no preflight
  enumeration. Story 5-8 quickstart docs should list these
  prereqs explicitly; story 5-7 may add a preflight step.
- **Story 5-3 surfaced no execution-time friction.** The direct
  `createTask` path (no skill invocation) sidestepped every skill-
  level edge case. The §Senior Developer Review (AI) findings on
  story 5-3 are audit-trail gaps about the story file itself
  rather than pilot-flow friction, so they are not represented
  in `## Friction entries` per
  [story 5-6 AC #6.1](./stories/5-6-capture-friction-log.md). The
  practical implication: skills materialise friction; direct API
  calls do not.

## Severity totals

<!-- prettier-ignore-start -->

| Severity | from 5-3 | from 5-4 | from 5-5 | Total |
| -------- | -------- | -------- | -------- | ----- |
| HIGH     | 0        | 1        | 1        | 2     |
| MEDIUM   | 0        | 7        | 5        | 11    |
| LOW      | 0        | 7        | 2        | 9     |
| Total    | 0        | 15       | 8        | 22    |

<!-- prettier-ignore-end -->

The "from 5-X" columns count entries whose `Source story` field starts
with that story; `pwd-deviation-cwd-not-pilot-repo`'s
`Source story: 5-4 / 5-5` counts toward both 5-4 and 5-5 columns but
once in the Total column. Total entry count = 22 unique H3 entries.

## Owner queue

- **`story-5-7-skill-fix` (11 entries):**
  - `sprint-window-strict-less-than-edge-on-start-day`
  - `gettaskbyid-metadata-description-boundary`
  - `stale-next-wording-in-skill-files`
  - `pwd-deviation-cwd-not-pilot-repo`
  - `step-01-verbatim-message-not-captured`
  - `epic-picker-no-root-level-filter`
  - `story-1-6-smoke-false-positive-risk`
  - `lore-origin-pat-preflight-gap`
  - `step-05-in-review-literal-match-miss`
  - `template-b-no-pr-field`
  - `step-05-match-set-too-narrow`
- **`story-5-7-config-fix` (3 entries):**
  - `two-backlog-lists-in-team-space`
  - `two-sprint-folders-in-team-space`
  - `ds-trigger-not-dispatched-via-toml`
- **`story-5-7-prd-amend` (2 entries):**
  - `store-lesson-vs-save-lesson-name-mismatch`
  - `prd-clickup-layout-vs-merged-state-drift`
- **`story-5-8-doc-only` (2 entries):**
  - `gh-auth-prerequisite-undocumented`
  - `multi-repo-cwd-handling-undocumented`
- **`human-only` (2 entries):**
  - `cross-list-subtask-block`
  - `gh-auth-wrong-account`
- **`out-of-scope` (2 entries):**
  - `searchtasks-fuzzy-not-exact`
  - `clickup-renderer-artifacts`

Bucket counts sum to 22, matching the H3 entry count under
`## Friction entries`. No bucket is silently empty; no entry appears
in two buckets.

## Change log

<!-- prettier-ignore-start -->

| Date       | Status | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-27 | review | Friction log file created via story 5-6 dev-story execution. 22 unique H3 entries synthesised from stories 5-3 / 5-4 / 5-5 (8+7+4+3 = 22 after dedup of `pwd-deviation-cwd-not-pilot-repo` across 5-4 / 5-5 and collapse of `template-b-no-pr-field` ↔ `template-b-pr-field-fix`). Severity distribution: 2 HIGH, 11 MEDIUM, 9 LOW. Owner-queue distribution: 11 `story-5-7-skill-fix`, 3 `story-5-7-config-fix`, 2 `story-5-7-prd-amend`, 2 `story-5-8-doc-only`, 2 `human-only`, 2 `out-of-scope`. Status: `ready-for-dev` → `review` per story 5-6 AC #14. File is the single source of truth consumed by stories 5-7 / 5-8 / 5-9. |

<!-- prettier-ignore-end -->
