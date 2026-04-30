# Story 7.1: Decide skill shape — new `clickup-create-bug` vs `kind` parameter on `clickup-create-story`

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> **Decision story.** EPIC-7 adds first-class bug support to the ClickUp skill surface. Before
> any code is written, the team must pick one of two architecturally distinct shapes:
>
> - **Option A — New sibling skill:** `src/custom-skills/clickup-create-bug/` lives alongside
>   `clickup-create-story`, with its own `SKILL.md`, `workflow.md`, and step files. Bug and
>   feature flows are fully independent.
>
> - **Option B — `kind` parameter on `clickup-create-story`:** A single skill routes to a
>   feature branch or a bug branch based on a `kind: bug | feature` argument (or detected
>   intent). Step files grow conditional logic; prereq checks split at step 1; description
>   composition diverges completely at step 4.
>
> The choice drives the scaffold in story 7-2 and all downstream stories in EPIC-7. Getting
> it wrong early is expensive: swapping shapes after 7-3 onward would mean renaming files,
> rewriting step conditional blocks, or deleting and recreating the skill directory. This story
> exists solely to surface the trade-offs and record the decision before any code lands.
>
> **No code changes in this story.**

## Story

As a **skill author** preparing to implement EPIC-7,
I want a clear, documented decision on whether bug-intent should live in a new
`clickup-create-bug` skill or as a `kind` parameter on `clickup-create-story`,
so that story 7-2 can scaffold the correct shape immediately, without ambiguity or rework.

## Acceptance Criteria

### Trade-off analysis documented

1. **The Dev Agent Record MUST document the trade-off analysis** covering at minimum these
   four dimensions for each option:

   - **Route stability** — how stable is the trigger path over time? Does adding bug support
     risk destabilising the existing feature flow?
   - **Prompt complexity** — how many conditional branches do the step files accumulate? Is
     a reader of step-02-epic-picker.md (for example) still able to understand it without
     holding the `kind` value in working memory throughout?
   - **Upstream-merge surface** — when the upstream `bmad-create-story` workflow (delegated
     from `clickup-create-story` step 4) is updated, how many skill files need a manual
     merge review?
   - **Prereq-check complexity** — PRD + architecture are *required* for feature stories but
     *optional* for bug reports. How much branching does that add to step 1 under each option?

2. **The analysis MUST state which option is chosen and give a one-paragraph rationale.**

3. **The chosen direction MUST be unambiguous enough that story 7-2 can scaffold the correct
   directory and file set without additional design discussion.**

### sprint-status.yaml updated

4. **`epic-7` MUST transition from `backlog` → `in-progress`** in
   `planning-artifacts/sprint-status.yaml` (first story in the epic is being created).

5. **`7-1-decide-skill-shape-vs-kind-param` MUST transition from `backlog` → `done`** in
   `planning-artifacts/sprint-status.yaml` once this story is complete.

### No code changes

6. **No TypeScript files are created or modified.** `git diff --stat -- src/` MUST be empty.

7. **No test files are created or modified.** `git diff --stat -- tests/` MUST be empty.

8. **No step files are created or modified.** The only file changes are:
   - This story file (updated Dev Agent Record and status).
   - `planning-artifacts/sprint-status.yaml` (AC #4–#5).

### Commit

9. **Commit message MUST follow Conventional Commits:**
   ```
   docs(planning): story 7-1 → done, decision: new clickup-create-bug skill
   ```
   (Replace the tail with the actual decision if Option B is chosen.)
   Body MUST state the chosen option and reference story 7.1.

## Out of Scope

- Implementing any code, step files, or `SKILL.md` (that is story 7-2).
- Deciding the severity-to-priority mapping table (story 7-6).
- Deciding whether bugs land in the active sprint list or a dedicated bugs list (story 7-5).
- Deciding whether attachments are supported (deferred per EPIC-7 open questions).
- Any changes to `clickup-create-story` files — the existing feature flow is not touched
  until story 7-8 (regression check).

## Tasks / Subtasks

- [x] **Task 1 — Analyse trade-offs** (AC: #1)
  - [x] Evaluate Option A (new sibling skill) across all four dimensions.
  - [x] Evaluate Option B (`kind` parameter) across all four dimensions.

- [x] **Task 2 — Record decision** (AC: #2–#3)
  - [x] Write the chosen option and rationale in the Dev Agent Record below.

- [x] **Task 3 — Update sprint-status.yaml** (AC: #4–#5)
  - [x] Set `epic-7: in-progress`.
  - [x] Set `7-1-decide-skill-shape-vs-kind-param: done`.

- [ ] **Task 4 — Commit** (AC: #9)
  - [ ] Stage this story file and `sprint-status.yaml`.
  - [ ] Commit with Conventional Commits header + body per AC #9.

## Dev Notes

### Current `clickup-create-story` structure (reference for trade-off analysis)

```
src/custom-skills/clickup-create-story/
├── SKILL.md                         # Trigger phrases, description
├── workflow.md                      # Step orchestration overview
└── steps/
    ├── step-01-prereq-check.md      # resolve-doc-paths → verify PRD + arch REQUIRED
    ├── step-02-epic-picker.md       # space → backlog list → epic selection
    ├── step-03-sprint-list-picker.md # sprint folder → list selection
    ├── step-04-description-composer.md # delegates to bmad-create-story (BDD, guardrails)
    └── step-05-create-task.md       # duplicate check → confirm → createTask
```

### Where the two shapes diverge

Under **Option B** (`kind` parameter), the divergence occurs at **two** steps:

- **Step 1** — prereq check: feature needs PRD + arch (hard abort if missing); bug treats
  them as optional (warn only). The step file gains a `kind`-conditional block that mirrors
  almost the entire existing prereq flow.
- **Step 4** — description composer: feature delegates to `bmad-create-story` (BDD +
  architecture guardrails + web research); bug does NOT delegate — it parses the user's
  free-form report into a fixed template (repro / expected / actual / impact / suspected
  area). These are completely different operations with no shared logic.

Steps 2, 3, and 5 are largely `kind`-agnostic (epic picker, sprint picker, and
`createTask` call), though step 5 gains `bug` tag and priority inference for the bug case.

Under **Option A** (new sibling skill), steps 1 and 4 are simply written differently in
the new skill's own files. `clickup-create-story` is unchanged. The two skills share
zero step files but may reference the same MCP tools.

### Upstream-merge surface detail

`clickup-create-story` step 4 invokes the upstream BMAD `bmad-create-story` workflow. When
upstream changes that workflow (new BDD format, updated web-research instructions, etc.),
the step file must be reviewed. Under Option B, the merged step-04 file also contains bug
branching logic that must survive the merge unscathed — a higher review burden. Under
Option A, only `clickup-create-story/steps/step-04-description-composer.md` needs review;
the bug skill's composer step is independent and unaffected.

### Sibling-skill precedent

`clickup-create-epic` is already a sibling skill to `clickup-create-story`. It shares the
same space/backlog-picker pattern (step-02) but has its own file. EPIC-7's bug skill would
follow the same precedent, reinforcing the "one skill per intent" convention already
established.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Decision

**Option A — New sibling skill (`src/custom-skills/clickup-create-bug/`).**

Bug intent lives in its own skill directory, parallel to `clickup-create-story`. The two
flows are fully independent: bug prereq-check (PRD/arch optional), bug description composer
(free-form report → template, no `bmad-create-story` delegation), and bug-specific
`createTask` defaults (tag, priority) all live in `clickup-create-bug/steps/` without
touching any `clickup-create-story` file. Route stability is highest — the existing feature
flow is unchanged and regression risk is zero. Upstream-merge surface is smallest — only
`clickup-create-story/steps/step-04-description-composer.md` needs review when upstream
`bmad-create-story` changes; the bug skill's composer is independent. Prompt complexity
stays low in both skills — no reader needs to track a `kind` value across five step files.
This also follows the existing `clickup-create-epic` / `clickup-create-story` sibling
precedent already established in the codebase.

### Completion Notes List

1. Decision recorded: Option A (new sibling skill). User confirmed choice directly.
2. `sprint-status.yaml` updated: `epic-7 → in-progress`, `7-1 → done`.

### File List

**Modified**

- `planning-artifacts/stories/7-1-decide-skill-shape-vs-kind-param.md`
- `planning-artifacts/sprint-status.yaml`

**New**

- (none)

**Deleted**

- (none)

## Change Log

| Date       | Change |
| ---------- | ------ |
| 2026-04-30 | Story drafted. Status → ready-for-dev. |
| 2026-04-30 | Decision recorded: Option A (new sibling skill). Status → done. |
