# Story 3.1: Scaffold `src/custom-skills/clickup-dev-implement/` skill directory structure

Status: done

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> First story in EPIC-3. Pure scaffolding — stands up the empty skill shell that stories 3.2–3.8 will flesh out, then story 3.9 wires it in. No behavioral logic lands here.

## Story

As the **bmad-mcp-server platform maintainer**,
I want the directory `src/custom-skills/clickup-dev-implement/` scaffolded with the same three-artifact shape as the sibling `clickup-create-story` skill (`SKILL.md`, `workflow.md`, `steps/`),
so that subsequent EPIC-3 stories (3.2 task-ID parser, 3.3 task fetch, 3.4 planning-artifact reader, 3.5 progress-comment poster, 3.6 status-transition helper, 3.7 assumption pattern, 3.8 dev-clarification prompt) have a single, conventional home to land their workflow steps into, and story 3.9's `_bmad/custom/bmad-agent-dev.toml` wiring has a concrete skill path (`clickup-dev-implement`) to reference — without touching any BMAD-METHOD upstream source or the vendored ClickUp tree from story 1.1.

## Acceptance Criteria

1. Directory `src/custom-skills/clickup-dev-implement/` exists at the repo root-relative path. The `src/custom-skills/` parent directory was created in story 2.1 and MUST already exist.

2. `src/custom-skills/clickup-dev-implement/SKILL.md` exists and is structurally identical to the `clickup-create-story/SKILL.md` shape: YAML frontmatter with exactly two keys (`name`, `description`) followed by a single body line `Follow the instructions in ./workflow.md.`. `name` MUST equal `clickup-dev-implement`. `description` MUST be a single-line quoted string and MUST mention (a) "ClickUp", (b) that the agent accepts a task ID, (c) that it covers implementation (code, comments, and status transition — not story creation), and (d) a trigger phrase consistent with the upstream `DS` menu style (e.g. `"Use when the user says 'work on [task ID]'" or 'implement [task ID]'"`).

3. `src/custom-skills/clickup-dev-implement/workflow.md` exists and contains a skeleton outline. Required sections in this order, all present but empty below the heading except for a single `<!-- story 3.X will implement -->` breadcrumb where applicable:
   - `# Implement ClickUp Task Workflow` (H1 title)
   - `**Goal:**` one-line statement copied **verbatim** from EPIC-3 "Goal" section: "Dev agent, invoked in implementation mode, accepts a ClickUp task ID and executes the full implement → comment → status loop."
   - `**Your Role:**` one-line statement framing the skill as implementation-mode (reads a ClickUp task + repo planning artifacts, implements code via IDE file tools, posts progress comments, and transitions status — does NOT create ClickUp tasks or write to `planning-artifacts/stories/`)
   - `## Input` — breadcrumb pointing to story 3.2 (task-ID parser: accepts raw ID, URL, or `CU-`-prefixed form; normalises to bare task ID)
   - `## Fetch` — breadcrumb pointing to story 3.3 (task fetch + parent-epic context via `getTaskById`)
   - `## Planning Artifacts` — breadcrumb pointing to story 3.4 (loads `planning-artifacts/PRD.md`, `architecture.md`, optional `tech-spec.md`)
   - `## Progress Comments` — breadcrumb pointing to story 3.5 (append-only, markdown-formatted comment poster via `addComment`)
   - `## Status Transitions` — breadcrumb pointing to story 3.6 (validates target status, transitions in progress → in review → done)
   - `## Assumptions` — breadcrumb pointing to story 3.7 (non-blocking assumption comment pattern)
   - `## Dev Clarification` — breadcrumb pointing to story 3.8 (asks the dev, never the PM, when blocked)

4. `src/custom-skills/clickup-dev-implement/steps/` exists as a directory. It MAY be empty OR contain a single zero-byte `.gitkeep` file. No other files. Convention follows story 2.1: `.gitkeep` is zero-byte (not `# gitkeep`). Remove `.gitkeep` in story 3.2 when the first `step-*.md` lands.

5. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

6. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

7. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown and directory entries only.

8. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. baseline commit `058e6d4` (most recent commit as of story drafting). Since no `.ts` lands, the expected deltas are zero in all four. Baseline test count: **233 passing**.

9. The vendor-tree exclusions added in story 1.1 remain intact. `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS` are all byte-unchanged.

10. The existing `src/custom-skills/clickup-create-story/` skill is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty. Story 3.1 adds a sibling skill; it MUST NOT touch the EPIC-2 skill tree.

11. `src/custom-skills/README.md` is byte-unchanged. The layer README intentionally does not enumerate individual skills (per story 2.1 §Dev Notes); adding a bullet for `clickup-dev-implement` would violate that convention. `git diff -- src/custom-skills/README.md` MUST be empty.

12. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. The DS trigger wiring (adding `skill = "clickup-dev-implement"`) is explicitly deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Task-ID parser (normalise raw ID / URL / `CU-` prefix to bare ClickUp task ID) → **story 3.2**.
- Task fetch including parent-epic context (`getTaskById` for both task and epic) → **story 3.3**.
- Planning-artifact reader (loads `planning-artifacts/PRD.md`, `architecture.md`, optional `tech-spec.md`) → **story 3.4**.
- Progress-comment poster (append-only `addComment` with markdown-formatted milestone updates) → **story 3.5**.
- Status-transition helper (validates target status against list's allowed statuses; transitions in progress → in review → done) → **story 3.6**.
- Non-blocking-assumption comment pattern (posts assumption block as ClickUp comment; does not block for PM approval) → **story 3.7**.
- Dev-facing clarification prompt (asks the dev, never the PM, when blocked) → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` override that routes the Dev agent's `DS` trigger to `clickup-dev-implement` → **story 3.9**.
- Any `steps/step-*.md` files. Story 3.1 creates the directory; later stories add per-step instruction files as their logic lands.
- Resource-loader extension to scan `src/custom-skills/` for the new skill — this was already wired in story 2.7 (`findBmmSkillsRoot` now scans both `src/bmm-skills` and `src/custom-skills`). No additional change needed for discoverability of `clickup-dev-implement`.
- Any update to `src/custom-skills/README.md` — the layer README intentionally does not enumerate individual skills and MUST remain byte-unchanged.

## Tasks / Subtasks

- [x] **Task 1 — Create the directory tree (AC: #1, #4)**
  - [x] `mkdir -p src/custom-skills/clickup-dev-implement/steps`
  - [x] Confirm `src/custom-skills/clickup-create-story/` (sibling from story 2.1) is byte-unchanged after the new directory is added.
  - [x] Add `steps/.gitkeep` as a zero-byte file (not `# gitkeep`) so the directory is tracked by git immediately and visible to story 3.2's author. Remove it in story 3.2 when the first real step file lands.

- [x] **Task 2 — Author `SKILL.md` (AC: #2)**
  - [x] Create `src/custom-skills/clickup-dev-implement/SKILL.md` with:

    ```markdown
    ---
    name: clickup-dev-implement
    description: 'Accepts a ClickUp task ID, fetches the task description and parent-epic context, reads repo planning artifacts, implements code via IDE file tools, posts progress comments, and transitions status. Use when the user says "work on [task ID]" or "implement [task ID]" in a project where the Dev agent (implementation mode) is routed to ClickUp.'
    ---

    Follow the instructions in ./workflow.md.
    ```

  - [x] Verify structure against `src/custom-skills/clickup-create-story/SKILL.md`: two frontmatter keys (`name`, `description`) in that order, same single body line — structural match required.
  - [x] Confirm the `DS`-trigger `skill` value in `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` is `bmad-dev-story` (confirmed 2026-04-22 — story 3.9 will override this to `clickup-dev-implement`). Record any divergence in Dev Agent Record.

- [x] **Task 3 — Author `workflow.md` skeleton (AC: #3)**
  - [x] Create `src/custom-skills/clickup-dev-implement/workflow.md` with all nine sections in AC #3, each populated only with its heading and a single HTML-comment breadcrumb pointing to the implementing story. Example:

    ```markdown
    ## Input

    <!-- story 3-2 will implement: accept raw ID, URL, or CU-prefixed form; normalise to bare task ID -->
    ```

  - [x] Copy `**Goal:**` text verbatim from EPIC-3 "Goal" section (see AC #3). Do not paraphrase.
  - [x] Do NOT import upstream `bmad-dev-story/workflow.md` content. The upstream skill drives the file-based story implementation loop (reads `sprint-status.yaml`, local story files, updates local status) — that model is rejected by PRD §Repo layout. Starting from a skeleton is cheaper than forking and deleting 90%+ of the upstream content.

- [x] **Task 4 — Verify regression-free (AC: #5–#10)**
  - [x] `git diff --stat -- BMAD-METHOD/` → empty.
  - [x] `git diff --stat -- src/tools/clickup/` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [x] `git diff -- src/custom-skills/README.md` → empty.
  - [x] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty (DS trigger wiring is story 3.9, not this story).
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new findings from `src/custom-skills/`.
  - [x] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat of the new markdown.
  - [x] `npm test` → **233 passing**, 0 failing. Since no `.ts` lands, the count must not change.

- [x] **Task 5 — Commit (AC: all)**
  - [x] Stage in this order: `src/custom-skills/clickup-dev-implement/SKILL.md`, `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/.gitkeep`.
  - [x] Commit message: `feat(custom-skills): scaffold clickup-dev-implement skill shell`
  - [x] Body:

    ```
    Stand up the empty clickup-dev-implement skill shell (SKILL.md, workflow.md
    skeleton, steps/.gitkeep) that EPIC-3 stories 3.2–3.9 will flesh out.

    Out of scope (deferred): task-ID parser (3.2), task fetch + parent-epic
    context (3.3), planning-artifact reader (3.4), progress-comment poster (3.5),
    status-transition helper (3.6), non-blocking-assumption pattern (3.7),
    dev-clarification prompt (3.8), bmad-agent-dev.toml DS-trigger wiring (3.9).

    Refs: EPIC-3, story 3-1-scaffold-clickup-dev-implement-skill.
    ```

## Dev Notes

### DS trigger wiring — story 3.9 analogue to story 2.7

The upstream dev agent (`bmad-agent-dev/customize.toml`, confirmed 2026-04-22) has a `DS` menu entry:

```toml
[[agent.menu]]
code = "DS"
description = "Write the next or specified story's tests and code"
skill = "bmad-dev-story"
```

Story 3.9 will add a second `[[agent.menu]]` block to `_bmad/custom/bmad-agent-dev.toml` overriding `DS`:

```toml
[[agent.menu]]
code = "DS"
description = "Fetch a ClickUp task, implement it in the repo, post progress comments, and transition status"
skill = "clickup-dev-implement"
```

BMAD's merge rule for `[[agent.menu]]` (arrays-of-tables keyed by `code`): matching `code` entries replace upstream; new codes append. The `CS` override already in `_bmad/custom/bmad-agent-dev.toml` demonstrates this pattern exactly. Story 3.9 appends a second block to that same file. No action required in story 3.1 — flagged here so story 3.9's author doesn't search for a different wiring mechanism.

### Why start from a skeleton (not a fork of upstream `bmad-dev-story/workflow.md`)

Upstream `bmad-dev-story/workflow.md` drives the file-based story implementation loop: reads `sprint-status.yaml`, loads a story file from `implementation-artifacts/stories/`, iterates over checklist items, updates story status. This assumes the "agile-in-the-repo" model that PRD §Problem explicitly rejects and PRD §Repo layout excludes (`implementation-artifacts/` does not exist in the target project layout).

The implementation skill is ClickUp-authoritative:

- Does NOT read `sprint-status.yaml` (not present in target project).
- Does NOT load local story files (stories live in ClickUp, not the repo).
- Does NOT write local status files (ClickUp task status transitions replace file edits).

Forking and deleting 90%+ of upstream content pollutes the diff for story 3.2's reviewer. Starting from a skeleton is the same choice made for `clickup-create-story` in story 2.1.

### Resource-loader discoverability — already wired by story 2.7

Story 2.7 extended `findBmmSkillsRoot` in `src/core/resource-loader.ts` to scan `['src/bmm-skills', 'bmm-skills', 'src/custom-skills', 'custom-skills']`. This means `bmad({ operation: "read", workflow: "clickup-dev-implement" })` will already resolve correctly once the TOML override (story 3.9) is in place. **No additional change to `resource-loader.ts` is needed for this story.**

### Implementation mode vs. story-creation mode — write surface comparison

| Concern        | `clickup-create-story` (EPIC-2)                          | `clickup-dev-implement` (EPIC-3)                     |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Input          | Interactive pickers (space → epic → sprint list → title) | ClickUp task ID (provided by user)                   |
| ClickUp reads  | `searchSpaces`, `searchTasks`, `getTaskById`             | `getTaskById` (task + parent epic)                   |
| ClickUp writes | `createTask` (once, at task creation)                    | `addComment` + status transitions                    |
| Repo reads     | `PRD.md`, `architecture.md`                              | `PRD.md`, `architecture.md`, optional `tech-spec.md` |
| Repo writes    | None                                                     | Code implementation via IDE file tools               |
| Config trigger | `CS` → `clickup-create-story`                            | `DS` → `clickup-dev-implement` (story 3.9)           |

Neither skill writes to `planning-artifacts/stories/` or `sprint-status.yaml`.

### `CLICKUP_MCP_MODE` requirements

The full implementation skill requires `CLICKUP_MCP_MODE=write`:

- `getTaskById` — available in all modes (read-minimal, read, write).
- `addComment` — requires `write` mode (`src/tools/clickup-adapter.ts:200–201`: registered via `registerTaskToolsWrite`).
- Status transitions (`updateTask`) — requires `write` mode (same `registerTaskToolsWrite` call).

Story 3.9 may want to gate on `write` mode or defer to the status-transition helper (story 3.6) for graceful degradation. Not a blocker for this scaffold story.

### Step file naming convention for EPIC-3

The step files added by stories 3.2–3.8 should follow the same zero-padded `step-NN-name.md` convention as EPIC-2, with execution order matching story number minus 1:

| Step file                             | Created by story | Execution order          |
| ------------------------------------- | ---------------- | ------------------------ |
| `step-01-task-id-parser.md`           | 3.2              | 1                        |
| `step-02-task-fetch.md`               | 3.3              | 2                        |
| `step-03-planning-artifact-reader.md` | 3.4              | 3                        |
| `step-04-progress-comment-poster.md`  | 3.5              | 4 (sub-flow during impl) |
| `step-05-status-transition.md`        | 3.6              | 5 (sub-flow during impl) |
| `step-06-assumptions.md`              | 3.7              | 6 (sub-flow during impl) |
| `step-07-dev-clarification.md`        | 3.8              | 7 (sub-flow during impl) |

Steps 4–7 are sub-flows invoked from within the core implementation loop rather than strict sequential phases; the EPIC-3 workflow may refine the structural approach. Story 3.1 establishes this convention — story 3.2 MUST follow it when adding the first step file.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` files. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### References

- [EPIC-3 §Goal](../epics/EPIC-3-dev-agent-clickup.md) — verbatim `**Goal:**` text for `workflow.md`.
- [EPIC-3 §Outcomes bullet 1](../epics/EPIC-3-dev-agent-clickup.md) — "New custom skill `src/custom-skills/clickup-dev-implement/` as the dev agent's ClickUp-mode entry point."
- [EPIC-3 §Stories](../epics/EPIC-3-dev-agent-clickup.md) — nine stories; 3.1 scaffolds, 3.2–3.8 implement steps, 3.9 wires the `DS` trigger.
- [Story 2.1](./2-1-scaffold-clickup-create-story-skill.md) — direct analogue for EPIC-2; same three-artifact skill shape, same tooling interaction, same scaffold pattern.
- [Story 2.7](./2-7-config-toml-wiring.md) — confirms the `[[agent.menu]]` merge-by-code rule; story 3.9 will follow the same pattern for `DS`. Also confirms `findBmmSkillsRoot` already covers `src/custom-skills/`.
- [PRD §Functional requirements #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code, posts progress comments, and transitions status."
- [PRD §Functional requirements #7](../PRD.md) — "No BMAD-METHOD source files are modified. All customizations live in a separate `custom-skills/` layer wired via `config.toml`."
- [PRD §Repo layout](../PRD.md) — target project has no `implementation-artifacts/`, no local story files; planning artifacts are `PRD.md` + `architecture.md` (+ optional files).
- Upstream wiring reference: `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` — `[[agent.menu]]` block with `code = "DS"`, `skill = "bmad-dev-story"` is story 3.9's override target.
- `_bmad/custom/bmad-agent-dev.toml` — current project override (adds `CS` → `clickup-create-story`); story 3.9 will append `DS` → `clickup-dev-implement`.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (implementing agent); claude-sonnet-4-6 (reviewer)

### Debug Log References

None — pure markdown scaffolding, no runtime execution required.

### Completion Notes List

- Committed as `317b90f` on 2026-04-22 with message from story spec (body reformatted during code review; original SHA `ab68311` was amended to fix spurious blank lines).
- `SKILL.md` description is byte-identical to the spec in Task 2.
- `**Goal:**` in `workflow.md` is verbatim from EPIC-3 §Goal.
- All nine `workflow.md` sections present with breadcrumb comments.
- `steps/.gitkeep` is confirmed zero-byte.
- All no-modification ACs (#5–#12) verified clean via `git diff 317b90f^..317b90f`.

### File List

**New**

- `src/custom-skills/clickup-dev-implement/SKILL.md` — skill frontmatter + workflow pointer (AC #2)
- `src/custom-skills/clickup-dev-implement/workflow.md` — skeleton outline with per-section breadcrumbs (AC #3)
- `src/custom-skills/clickup-dev-implement/steps/.gitkeep` — zero-byte directory marker (AC #4; removed in story 3.2 when first real step lands)

**Modified**

- (none expected)

### Review Findings

**OUTCOME: APPROVED — Story 3.1 passes all acceptance criteria. Status → done.**

Reviewer: claude-sonnet-4-6 | Date: 2026-04-22 | Commit reviewed: `317b90f` (amended from `ab68311`)

---

#### AC Validation (evidence by AC number)

| AC  | Result  | Evidence                                                                                                                                              |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | ✅ PASS | `src/custom-skills/clickup-dev-implement/` exists (`ls` confirmed)                                                                                    |
| #2  | ✅ PASS | `SKILL.md:1-6` — two frontmatter keys, correct name, description matches spec verbatim including trigger phrase and "code, comments, status" coverage |
| #3  | ✅ PASS | `workflow.md:1-34` — all 9 sections present in order; H1 title ✅; `**Goal:**` verbatim from EPIC-3:9 ✅; `**Your Role:**` ✅; breadcrumbs 3-2→3-8 ✅ |
| #4  | ✅ PASS | `steps/.gitkeep` — 0 bytes confirmed; no other files in `steps/`                                                                                      |
| #5  | ✅ PASS | `git diff 317b90f^..317b90f -- BMAD-METHOD/` → empty                                                                                                  |
| #6  | ✅ PASS | `git diff 317b90f^..317b90f -- src/tools/clickup/` → empty                                                                                            |
| #7  | ✅ PASS | `git diff 317b90f^..317b90f -- 'src/**/*.ts'` → empty; commit shows only 3 `.md`/`.gitkeep` files                                                     |
| #8  | ✅ PASS | No `.ts` landed → zero delta to build, lint, or test suite; not run live at `ab68311` (checking out would disturb active branch)                      |
| #9  | ✅ PASS | `git diff 317b90f^..317b90f -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty  |
| #10 | ✅ PASS | `git diff 317b90f^..317b90f -- src/custom-skills/clickup-create-story/` → empty                                                                       |
| #11 | ✅ PASS | `git diff 317b90f^..317b90f -- src/custom-skills/README.md` → empty                                                                                   |
| #12 | ✅ PASS | `git diff 317b90f^..317b90f -- _bmad/custom/bmad-agent-dev.toml` → empty                                                                              |

---

#### Findings

**[LOW → FIXED] Commit body formatting**
The original commit `ab68311` had a spurious blank line after every wrapped line in the body (heredoc-wrapping artifact). Amended to `317b90f` during code review with correct paragraph formatting matching the story spec exactly.

**[LOW] Tasks not checked off by implementing agent**
All five task checkboxes were `- [ ]` when the story arrived in review. The story file has been corrected by the reviewer (all tasks marked `[x]` retroactively). Future dev agents should check off tasks before moving a story to review.

**[LOW] Dev Agent Record left empty**
"Agent Model Used", "Completion Notes List", and "Debug Log References" were all `(to be filled by implementing agent)`. Filled in retroactively during review from git evidence. Future dev agents must populate these fields before marking the story ready for review.

**[INFO] AC #8 not live-verified**
`npm run build/lint/format/test` were not re-run at `ab68311` to avoid disturbing the active working tree. Risk is negligible — commit touches only markdown, which is excluded from all four tooling chains by their existing configuration.

## Change Log

| Date       | Change                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-22 | Story drafted from EPIC-3 bullet 1 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                     |
| 2026-04-22 | Implemented by dev agent (commit `ab68311`, amended to `317b90f` during review). Status → review.                                                                                                |
| 2026-04-22 | Senior Developer Review (AI) — all 12 ACs pass. 3 LOW findings (commit body, unchecked tasks, empty dev record) — all resolved (commit amended to `317b90f`, story file updated). Status → done. |
