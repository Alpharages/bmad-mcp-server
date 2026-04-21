# Story 2.1: Scaffold `src/custom-skills/clickup-create-story/` skill directory structure

Status: ready-for-dev

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> First story in EPIC-2. Pure scaffolding — stands up the empty skill shell that stories 2.2–2.6 will flesh out, then story 2.7 wires it in. No behavioral logic lands here.

## Story

As the **bmad-mcp-server platform maintainer**,
I want the directory `src/custom-skills/clickup-create-story/` scaffolded with the same three-artifact shape as upstream `bmad-create-story` (`SKILL.md`, `workflow.md`, `steps/`),
so that subsequent EPIC-2 stories (2.2 prereq check, 2.3 epic picker, 2.4 sprint-list picker, 2.5 description composer, 2.6 task creation) have a single, conventional home to land their workflow steps into, and story 2.7's `customize.toml` wiring has a concrete skill path (`clickup-create-story`) to reference — without touching any BMAD-METHOD upstream source or the vendored ClickUp tree from story 1.1.

## Acceptance Criteria

1. Directory `src/custom-skills/clickup-create-story/` exists at the repo root-relative path, created fresh (`src/custom-skills/` does not exist prior to this story).
2. `src/custom-skills/clickup-create-story/SKILL.md` exists and is structurally identical to upstream's `bmad-create-story/SKILL.md`: YAML frontmatter with exactly two keys (`name`, `description`) followed by a single body line `Follow the instructions in ./workflow.md.`. `name` MUST equal `clickup-create-story`. `description` MUST be a single-line quoted string and MUST mention (a) "ClickUp", (b) that the output is a task/subtask (not a file), and (c) a trigger phrase consistent with upstream style ("Use when the user says..." or "Use when the Dev agent (story-creation mode) routes story creation to ClickUp").
3. `src/custom-skills/clickup-create-story/workflow.md` exists and contains a skeleton outline. Required sections in this order, all present but empty below the heading except for a single `<!-- story 2.X will implement -->` breadcrumb where applicable:
   - `# Create ClickUp Story Workflow` (H1 title)
   - `**Goal:**` one-line statement copied from EPIC-2 "Goal" section
   - `**Your Role:**` one-line statement framing the skill as ClickUp-authoritative (no file writes to `planning-artifacts/stories/`)
   - `## Prerequisites` — breadcrumb pointing to story 2.2
   - `## Pickers` — two subsections `### Epic picker` and `### Sprint-list picker`, each with a breadcrumb pointing to story 2.3 / 2.4
   - `## Description Composer` — breadcrumb pointing to story 2.5
   - `## Task Creation` — breadcrumb pointing to story 2.6
4. `src/custom-skills/clickup-create-story/steps/` exists as a directory. It MAY be empty, OR it MAY contain a single `.gitkeep` file. No other files.
5. `src/custom-skills/README.md` exists (new file) and explains in ≤15 lines: what the `custom-skills/` layer is for (PRD §Customization boundary verbatim pointer), why it's separate from upstream BMAD skills (read-only upstream per PRD), and how it gets wired in (`customize.toml` on the relevant agent — deferred to story 2.7). No implementation details. This is the layer-level README, not a per-skill README.
6. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
7. No files under `src/tools/clickup/` (the vendored tree from story 1.1) are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
8. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown and directory entries only.
9. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. baseline `f5bd256`. Since no `.ts` lands, the expected deltas are zero in all four.
10. The vendor-tree exclusions added in story 1.1 (`src/tools/clickup/**`) remain intact. `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` VENDORED_PATHS are all byte-unchanged.

## Out of Scope (explicitly deferred to later stories)

- Prereq file check (PRD.md + architecture.md presence guard) → **story 2.2**.
- Epic picker implementation (list Backlog tasks, present, parse selection) → **story 2.3**.
- Sprint-list picker implementation (list sprint folder lists, flag active by date range) → **story 2.4**.
- Description composer (PRD + architecture + epic context → ClickUp task description body) → **story 2.5**.
- ClickUp task creation call via vendored `register*Tools` (`parent` + target list wiring) → **story 2.6**.
- `customize.toml` override that routes the story-creation menu entry to `clickup-create-story` → **story 2.7**.
- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating → **story 2.9**.
- Any `steps/step-*.md` files. Story 2.1 creates the directory; later stories add the per-step instruction files as their logic lands.

## Tasks / Subtasks

- [ ] **Task 1 — Create the directory tree (AC: #1, #4)**
  - [ ] `mkdir -p src/custom-skills/clickup-create-story/steps`
  - [ ] Confirm parent `src/custom-skills/` did not pre-exist (`git status --porcelain | grep custom-skills` should show both levels as untracked before commit).
  - [ ] Decide on `.gitkeep` for `steps/`: if the team convention is to track empty dirs via `.gitkeep`, add one. Otherwise leave empty and stage the first `steps/step-*.md` file in story 2.2, which will cause git to pick up the directory implicitly. **Default here: add `.gitkeep`** so the scaffolding is visible in the tree immediately and the story's deliverable is concrete.

- [ ] **Task 2 — Author `SKILL.md` (AC: #2)**
  - [ ] Create `src/custom-skills/clickup-create-story/SKILL.md` with:

    ```markdown
    ---
    name: clickup-create-story
    description: 'Creates a ClickUp task as a subtask of a chosen epic in the active sprint list, with a rich description composed from PRD + architecture + epic context. Use when the user says "create the next story" or "create story [id]" in a project where the Dev agent (story-creation mode) is routed to ClickUp.'
    ---

    Follow the instructions in ./workflow.md.
    ```

  - [ ] Diff against upstream `bmad-create-story/SKILL.md` (cached at `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-create-story/SKILL.md`) — structure MUST match exactly (same keys in same order, same body line).

- [ ] **Task 3 — Author `workflow.md` skeleton (AC: #3)**
  - [ ] Create `src/custom-skills/clickup-create-story/workflow.md` with the six sections in AC #3, each populated only with its heading and a single HTML-comment breadcrumb pointing to the story that will implement it. Example for the Pickers section:

    ```markdown
    ## Pickers

    ### Epic picker

    <!-- story 2.3 will implement: list tasks in the Backlog list, present to user, parse selection. -->

    ### Sprint-list picker

    <!-- story 2.4 will implement: list sprint folder lists, flag the active sprint by date range, present, parse. -->
    ```

  - [ ] Do NOT import upstream `bmad-create-story/workflow.md` content (380 lines of file-based story logic). This skill is ClickUp-authoritative per PRD §Functional requirements #4; copying upstream's file-writing flow would require deletion later. Starting from a skeleton is cheaper than starting from upstream minus 90%.

- [ ] **Task 4 — Author `src/custom-skills/README.md` (AC: #5)**
  - [ ] Create a layer-level README with these sections (≤15 lines total):
    - One-paragraph purpose: where custom skills live and why they're separated from upstream BMAD skills.
    - One-sentence pointer to PRD §Customization boundary.
    - One-sentence pointer: "Wiring is per-agent via `customize.toml` — see story 2.7 when adding or moving a skill entry."
  - [ ] Do NOT enumerate the skills. Current directory listing (`ls src/custom-skills/`) is the source of truth.

- [ ] **Task 5 — Verify regression-free (AC: #6, #7, #8, #9, #10)**
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (story 1.1's vendor-tree exclusions MUST be byte-unchanged).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → same 2 errors + 7 warnings as baseline `f5bd256` (pre-existing per story 1.1 completion notes). No new lint findings from `src/custom-skills/`.
  - [ ] `npm run format` → no diff in `src/custom-skills/`. If prettier touches the new markdown, accept the reformat — markdown formatting is in scope for prettier per repo convention.
  - [ ] `npm test` → 194/195 passing (same pre-existing failure as story 1.1 baseline).

- [ ] **Task 6 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/README.md`, `src/custom-skills/clickup-create-story/SKILL.md`, `src/custom-skills/clickup-create-story/workflow.md`, `src/custom-skills/clickup-create-story/steps/.gitkeep` (if used).
  - [ ] Commit message: `feat(custom-skills): scaffold clickup-create-story skill shell` (commitlint accepts any scope; `custom-skills` is descriptive).
  - [ ] Body: one sentence summary, explicit list of Out-of-Scope items deferred to 2.2–2.9, reference to EPIC-2 and story key `2-1-scaffold-clickup-create-story-skill`.

## Dev Notes

### Naming discrepancy to watch for in story 2.7

EPIC-2's "Outcomes" bullet 2 says: `config.toml routes the Dev agent's CS invocation to the new skill`. BMAD-METHOD does not use a top-level `config.toml` for skill routing. The actual mechanism is per-agent `customize.toml` files that live alongside the agent's `SKILL.md` — e.g. `src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` has `[[agent.menu]]` blocks where one entry (`code = "CS"`) wires `skill = "bmad-create-story"`. Story 2.7 is where the wiring lands, and it should override that `skill` value (to `clickup-create-story`) via BMAD's override merge rules (see the comment block at the top of the upstream `customize.toml`: "arrays-of-tables with `code`/`id`: replace matching items").

No action required in this story. But flag it in the commit body so story 2.7's author isn't chasing a file that doesn't exist.

### Why start `workflow.md` from a skeleton (not a fork of upstream)

Upstream `bmad-create-story/workflow.md` is 380 lines. Roughly 90% of it — sprint-status bookkeeping, `{implementation_artifacts}/{{story_key}}.md` file generation, template rendering via `template.md`, checklist validation via `checklist.md` — assumes the file-based "agile-in-the-repo" model that PRD §Problem explicitly rejects. Forking and deleting is more work than writing fresh, and the diff review for story 2.5 (description composer) gets polluted by the removed-upstream-logic churn.

The skill is ClickUp-authoritative: it does not write to `planning-artifacts/stories/`, does not update `sprint-status.yaml` (that file doesn't exist in this repo layout per PRD §Repo layout — only `planning-artifacts/PRD.md` + `architecture.md` are tracked), and does not consume `template.md`. It emits a ClickUp task, full stop.

### Why a layer-level README (AC #5) and not a skill-level README

A per-skill README would duplicate SKILL.md's `description` field and rot. A layer-level README explains the customization boundary once, for every skill that ever lands in `src/custom-skills/`, and the skills themselves stay self-describing via their frontmatter. This mirrors how `src/tools/clickup/README.md` (from upstream vendoring) documents the vendored layer, not any individual tool.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. `tsconfig.json#include` is `["src/**/*"]` but `.md` files are not in `compilerOptions.allowedExts`, so tsc ignores them. No new exclude entry needed.
- **ESLint**: flat config `eslint.config.mjs` targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No new ignore entry needed.
- **Prettier**: `.prettierignore` currently only excludes `build/`, `node_modules/`, and `src/tools/clickup/`. Prettier WILL format our new markdown — that is desirable (consistent formatting for the skill docs). No action needed; just re-run `npm run format` before commit so lint-staged's hook doesn't rewrite on commit.
- **Vitest**: `vitest.config.ts` scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` gets picked up.
- **Dep-audit test**: `tests/unit/dependency-audit.test.ts` scans `src/**/*.ts` for undeclared imports. No `.ts` in this story → nothing for dep-audit to flag. The story 1.1 `VENDORED_PATHS` guard stays relevant only for `src/tools/clickup/`.

### The `.gitkeep` question

Git does not track empty directories. If we leave `steps/` empty, the directory will silently not exist after `git clone` until story 2.2 stages the first `step-*.md` file. Two failure modes: (a) story 2.2's author may assume `steps/` exists and not create it; (b) a reviewer pulling the branch sees an incomplete-looking skill shell. Adding `steps/.gitkeep` avoids both. The file is a zero-byte convention, not a tooling requirement. Remove it in story 2.2 as part of the first real step file commit.

### Project structure notes

- `src/custom-skills/` is a new top-level sibling to `src/core/`, `src/tools/`, `src/types/`, `src/utils/`. The flat-by-concern layout in the architecture doc (`docs/architecture.md` §File Structure) accommodates this — adding a peer directory here is the established extension pattern, not a layering violation.
- The skill shape (`SKILL.md`, `workflow.md`, `steps/`) mirrors upstream precisely, which means BMAD's skill discovery in `ResourceLoaderGit` (per `docs/architecture.md` §Multi-Source Loading, priority 1 = `./bmad/`) will find it if the skill is registered via a manifest or `customize.toml`. Registration is story 2.7's scope; discovery wiring (whether we need a local `_bmad/` or if the existing resolver already walks `src/custom-skills/`) is a story 2.7 investigation. Not a blocker here.

### Testing standards

- No new tests in this story. Scaffolding is inert markdown.
- Existing `npm test` (= `vitest run tests/unit tests/integration`) must pass unchanged (194/195 baseline — pre-existing `node:http` failure persists).
- A test for the skill's end-to-end behavior would land with story 2.6 (task creation) at the earliest, and likely with story 2.8's regression check for upstream `bmad-create-story`.

### References

- [EPIC-2 §Outcomes bullet 1](../epics/EPIC-2-dev-story-creation-clickup.md) — "New custom skill `src/custom-skills/clickup-create-story/` (mirrors shape of upstream `bmad-create-story`)."
- [EPIC-2 §Stories bullet 1](../epics/EPIC-2-dev-story-creation-clickup.md) — "Scaffold `src/custom-skills/clickup-create-story/` skill directory structure (`SKILL.md`, `workflow.md`, steps/)".
- [EPIC-2 §Exit criteria](../epics/EPIC-2-dev-story-creation-clickup.md) — "No BMAD-METHOD source files edited."
- [PRD §Customization boundary](../PRD.md) — upstream read-only; customizations live in `bmad-mcp-server/src/custom-skills/`; wired via `config.toml` override (see naming note above).
- [PRD §Functional requirements #7](../PRD.md) — "No BMAD-METHOD source files are modified. All customizations live in a separate `custom-skills/` layer wired via `config.toml`."
- [PRD §Repo layout](../PRD.md) — target project has no `implementation-artifacts/`, `epics/`, or `stories/` dirs; only `planning-artifacts/PRD.md` + `architecture.md`. This is what the eventual workflow's prereq check (story 2.2) will enforce.
- [Story 1.1 §File List](./1-1-vendor-clickup-mcp-source.md) — enumerates all files touched by EPIC-1 story 1; this story MUST NOT re-touch any of them.
- Upstream reference shape: `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-create-story/` — files: `SKILL.md` (6 lines), `workflow.md` (380 lines), `checklist.md` (357 lines), `discover-inputs.md` (88 lines), `template.md` (49 lines). We mirror only the first two by name; `steps/` is our convention and is unused upstream for `bmad-create-story` but is used upstream for other skills (e.g. `bmad-code-review/steps/`).
- Upstream wiring reference: `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-agent-dev/customize.toml` — `[[agent.menu]]` block with `code = "CS"`, `skill = "bmad-create-story"` is the target of story 2.7's override.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/custom-skills/README.md` — layer-level README (AC #5)
- `src/custom-skills/clickup-create-story/SKILL.md` — skill frontmatter + workflow pointer (AC #2)
- `src/custom-skills/clickup-create-story/workflow.md` — skeleton outline with per-section breadcrumbs (AC #3)
- `src/custom-skills/clickup-create-story/steps/.gitkeep` — directory marker (AC #4; removed in story 2.2 when first real step lands)

**Modified**

- (none expected)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-21 | Story drafted from EPIC-2 bullet 1 via `bmad-create-story` workflow. Status → ready-for-dev. |
