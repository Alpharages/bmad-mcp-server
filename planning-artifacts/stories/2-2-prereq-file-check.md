# Story 2.2: Implement prereq-file check (PRD.md + architecture.md)

Status: ready-for-dev

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Fills the `## Prerequisites` skeleton left by story 2.1. Adds one step file and updates two lines in `workflow.md`. No TypeScript lands; no ClickUp API calls are made. Gate logic is pure markdown workflow instruction.
>
> **Depends on story 2.1 completing first.** The files this story modifies (`workflow.md`) and deletes (`steps/.gitkeep`) are created by story 2.1. Do not start implementation until story 2.1 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-create-story/workflow.md` to gate execution on the presence of `planning-artifacts/PRD.md` and `planning-artifacts/architecture.md` in the target project's working directory,
so that the skill refuses with a clear error when those files are missing — matching PRD §Functional requirements #2 — and subsequent steps (2.3–2.6) can assume both files are readable without defensive fallbacks.

## Acceptance Criteria

1. `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` exists and is the canonical source of the gate logic. It MUST:
   - Have YAML frontmatter with exactly two runtime-population keys: `prd_content: ''` and `architecture_content: ''` (both empty strings; set during execution when files are found).
   - Include a `# Step 1: Prereq File Check` H1 title.
   - Include a `## RULES` section with: (a) a read-only rule (this step does not write files or call ClickUp), (b) an early-exit rule (stop the entire skill run, do not proceed to step 2, if either file is missing).
   - Include an `## INSTRUCTIONS` section with numbered steps that: (1) resolve the project root (`{project-root}`) from CWD; (2) check for `{project-root}/planning-artifacts/PRD.md` — if absent, emit the standard error block (see AC #3) and stop; (3) check for `{project-root}/planning-artifacts/architecture.md` — if absent, emit the standard error block (see AC #3) and stop; (4) load both files into `{prd_content}` and `{architecture_content}` for use by downstream steps; (5) confirm prereqs passed and continue.
2. `src/custom-skills/clickup-create-story/workflow.md` — the `## Prerequisites` section is updated to replace the `<!-- story 2.2 will implement -->` breadcrumb with: a one-line description of what the prereq check does, a `See: ./steps/step-01-prereq-check.md` pointer, and an inline summary of the gate rule (both files required; skill aborts if either is missing). No other sections in `workflow.md` change.
3. The standard error block (referenced in AC #1 step instructions) MUST follow this exact template so that downstream stories can assume a consistent error surface:

   ```
   ❌ **Prereq check failed — missing required file**

   The `clickup-create-story` skill requires both of the following files to exist in the project root before it can proceed:

   - `planning-artifacts/PRD.md` — **MISSING** ← (swap for `architecture.md` as appropriate)
   - `planning-artifacts/architecture.md` — present

   **Why:** Story descriptions are composed from PRD and architecture context (story 2.5). Without these files the description would be empty or fabricated.

   **What to do:** Add the missing file(s) to your project's `planning-artifacts/` directory, then re-invoke the Dev agent in story-creation mode.
   ```

   The step file MUST quote this block verbatim (not paraphrase) so reviewers can verify the exact wording.

4. `src/custom-skills/clickup-create-story/steps/.gitkeep` is removed. It was a directory-marker added in story 2.1 per the `.gitkeep` convention; now that `step-01-prereq-check.md` exists, the marker is no longer needed.
5. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
6. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
7. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.
8. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 2.1 (current pre-2.1 baseline: `d0ce7d7`). Since no `.ts` lands, the expected deltas are zero in all four.
9. The vendor-tree exclusions from story 1.1 remain byte-unchanged: `.gitignore`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

## Out of Scope (explicitly deferred to later stories)

- Epic picker (list Backlog tasks, present, parse selection) → **story 2.3**.
- Sprint-list picker (list sprint folder lists, flag active by date range) → **story 2.4**.
- Description composer (PRD + architecture + epic context → ClickUp task description body) → **story 2.5**.
- ClickUp task creation call via vendored `register*Tools` → **story 2.6**.
- `customize.toml` override routing the Dev agent's `CS` trigger → **story 2.7**.
- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating → **story 2.9**.
- Reading or validating the _contents_ of PRD.md or architecture.md (existence check only here; content reading happens in story 2.5).
- Checking for optional files (`ux-design.md`, `tech-spec.md`) — PRD §Repo layout marks these as optional and story 2.5 decides whether to include them in the description.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-01-prereq-check.md` (AC: #1, #3)**
  - [ ] Create the file with YAML frontmatter, H1 title, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [ ] Include the verbatim error block template from AC #3 inside the INSTRUCTIONS, showing both file paths and a clear "MISSING / present" status example.
  - [ ] Verify the frontmatter keys match the downstream contract: `prd_content` and `architecture_content` (story 2.5 will read these keys by name; the exact strings matter).

- [ ] **Task 2 — Update `workflow.md` Prerequisites section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-create-story/workflow.md`.
  - [ ] Replace the single-line `<!-- story 2.2 will implement -->` comment under `## Prerequisites` with:
    - One descriptive sentence: what the prereq check verifies and what happens on failure.
    - `See: [./steps/step-01-prereq-check.md](./steps/step-01-prereq-check.md)`
    - An inline gate rule: "Both files must be present. The skill aborts with an error if either is missing."
  - [ ] Confirm no other sections in `workflow.md` are touched (breadcrumbs for 2.3–2.6 MUST remain unchanged).

- [ ] **Task 3 — Remove `steps/.gitkeep` (AC: #4)**
  - [ ] Delete `src/custom-skills/clickup-create-story/steps/.gitkeep`.
  - [ ] Confirm `git status` shows the deletion and the new step file (both in `steps/`).

- [ ] **Task 4 — Verify regression-free (AC: #5–#9)**
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (story 1.1 vendor-tree exclusions MUST be byte-unchanged).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new lint findings from `src/custom-skills/`.
  - [ ] `npm run format` → no diff in `src/custom-skills/`. Accept any prettier reformat of the new markdown (re-run before commit).
  - [ ] `npm test` → passing count unchanged from `d0ce7d7` baseline. Since no `.ts` lands, the test count must not change.

- [ ] **Task 5 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-create-story/workflow.md`, `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md`, deletion of `src/custom-skills/clickup-create-story/steps/.gitkeep`.
  - [ ] Commit message: `feat(custom-skills): implement prereq-file check in clickup-create-story`
  - [ ] Body:

    ```
    Add step-01-prereq-check.md to gate the clickup-create-story skill on the
    presence of planning-artifacts/PRD.md and planning-artifacts/architecture.md
    in the target project, matching PRD §Functional requirements #2.

    Removes steps/.gitkeep (story 2.1 directory marker — no longer needed now
    that a real step file exists).

    Out of scope (deferred): epic picker (2.3), sprint-list picker (2.4),
    description composer (2.5), ClickUp task creation (2.6), customize.toml
    wiring (2.7), upstream regression check (2.8), token-permission gating (2.9).

    Refs: EPIC-2, story 2-2-prereq-file-check.
    ```

## Dev Notes

### What the step file is responsible for — and what it is not

`step-01-prereq-check.md` is a workflow instruction file consumed by the BMAD Dev agent at runtime. It is not executable code; the LLM reads its `## INSTRUCTIONS` and follows them literally. That means:

- The "check for file existence" instruction causes the LLM to use whatever tool it has available (filesystem read, `ls`, `Read` tool, etc.) to verify the file is present.
- The `{prd_content}` / `{architecture_content}` frontmatter variables are runtime-populated: the agent sets them by loading the file content when both files pass the check. They persist in the BMAD step-context for downstream steps (story 2.5 reads them without re-reading the files).
- The error block in AC #3 is exact wording the agent must emit verbatim. Using a template here rather than a paraphrase means test-assist tooling (story 2.8's regression check) can assert the exact error string.

### Why both files are required (not just PRD.md)

PRD §Functional requirements #2 says "Refuses if `planning-artifacts/PRD.md` + `architecture.md` are missing." Both are required, not either. The description composer (story 2.5) draws from both to produce a rich task description. If either is absent, the description quality drops to "one half of context", which is worse than refusing with a clear message and asking the user to add the file.

### `architecture.md` path — no wildcard

The upstream `bmad-create-story` workflow uses a glob `{planning_artifacts}/*architecture*.md` to find the architecture file. We use a fixed path `planning-artifacts/architecture.md` because:

1. The PRD §Repo layout names the file exactly: `planning-artifacts/architecture.md`. No variants are listed.
2. Wildcard matching creates ambiguity when multiple `*architecture*` files exist (e.g. `tech-architecture.md`, `architecture-v2.md`). A hard-coded path is unambiguous and matches the agreed-upon repo layout.

If a project uses a non-standard name, the error message's "What to do" block tells the user exactly what path is expected.

### `.gitkeep` lifecycle

Story 2.1 added `steps/.gitkeep` with this note: "Remove it in story 2.2 as part of the first real step file commit." This story fulfils that contract. The deletion and addition of `step-01-prereq-check.md` MUST land in the same commit — splitting them would briefly leave the `steps/` directory with both files, which is noise in the review diff.

### Tooling interaction

- **tsc / ESLint / Vitest**: Same as story 2.1 — no `.ts` files, no impact.
- **Prettier**: Will format the new `.md` files. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **`steps/` naming convention**: Upstream uses `step-NN-slug.md` (e.g. `step-01-gather-context.md`). We follow the same convention. Story 2.3 will add `step-02-epic-picker.md`, 2.4 `step-03-sprint-list-picker.md`, etc. The numbering must be sequential by execution order (not story number — though they happen to align here).

### References

- [PRD §Functional requirements #2](../PRD.md) — "Refuses if `planning-artifacts/PRD.md` + `architecture.md` are missing."
- [PRD §Repo layout](../PRD.md) — canonical paths: `planning-artifacts/PRD.md`, `planning-artifacts/architecture.md`.
- [Story 2.1 §Acceptance Criteria #3](./2-1-scaffold-clickup-create-story-skill.md) — `## Prerequisites` section created with `<!-- story 2.2 will implement -->` breadcrumb. This story replaces that breadcrumb.
- [Story 2.1 §Dev Notes: `.gitkeep` question](./2-1-scaffold-clickup-create-story-skill.md) — "Remove it in story 2.2 as part of the first real step file commit."
- [EPIC-2 §Stories bullet 3](../epics/EPIC-2-dev-story-creation-clickup.md) — "Implement prereq-file check (PRD.md + architecture.md)".
- Upstream reference shape for step files: `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-code-review/steps/step-01-gather-context.md` — pattern: YAML frontmatter with runtime keys, H1 title, `## RULES`, `## INSTRUCTIONS`.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/custom-skills/clickup-create-story/steps/step-01-prereq-check.md` — step file with gate logic and error block template (AC #1, #3)

**Modified**

- `src/custom-skills/clickup-create-story/workflow.md` — `## Prerequisites` section updated (AC #2)

**Deleted**

- `src/custom-skills/clickup-create-story/steps/.gitkeep` — directory marker from story 2.1, no longer needed (AC #4)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-2 bullet 3 via `bmad-create-story` workflow. Status → ready-for-dev. |
