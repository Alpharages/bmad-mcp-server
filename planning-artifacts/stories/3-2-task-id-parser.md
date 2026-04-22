# Story 3.2: Implement task-ID parser step

Status: done

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Input` skeleton left by story 3.1. Adds one step file and updates two lines in `workflow.md`. No TypeScript lands; no ClickUp API calls are made. Parsing logic is pure markdown workflow instruction consumed by the BMAD Dev agent at runtime.
>
> **Depends on story 3.1 completing first.** The files this story modifies (`workflow.md`) and deletes (`steps/.gitkeep`) are created by story 3.1. Do not start implementation until story 3.1 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to parse any user-supplied ClickUp task identifier (raw bare ID, full app URL, or `CU-`-prefixed form) into a normalised bare task ID,
so that subsequent steps (3.3 task fetch and beyond) can call `getTaskById` with a reliable, undecorated alphanumeric ID regardless of how the developer typed or pasted the task reference.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` exists and is the canonical source of the parsing logic. It MUST:
   - Have YAML frontmatter with exactly one runtime-population key: `task_id: ''` (empty string; set during execution when input is successfully parsed).
   - Include a `# Step 1: Task-ID Parser` H1 title.
   - Include a `## RULES` section with: (a) a read-only rule (this step does not write files or call ClickUp APIs — pure parsing only), (b) a must-complete rule (if parsing fails with an unrecognisable input, emit the standard error block (see AC #3) and stop — do not proceed to step 2), (c) a normalisation contract rule (`{task_id}` MUST be a non-empty alphanumeric string by the time this step completes; the bare ID is passed verbatim to `getTaskById` in step 2).
   - Include an `## INSTRUCTIONS` section with numbered steps that: (1) read the raw task-identifier string supplied by the user and record it as `{raw_input}`; (2) detect and handle **URL form** — if the input contains `app.clickup.com`, strip any query string (from the first `?` onward) and any fragment (from the first `#` onward), then extract the last non-empty path segment (e.g. `https://app.clickup.com/t/86abc123` → `86abc123`, `https://app.clickup.com/t/86abc123?comment=99abc` → `86abc123`); (3) detect and handle **`CU-` prefix form** — if the input starts with `CU-` (case-insensitive) strip the prefix (e.g. `CU-86abc123` → `86abc123`); (4) otherwise treat the input as a **bare ID** and use it as-is; (5) validate the result is a non-empty alphanumeric string (letters and digits only, no spaces or special characters); if the result fails validation, emit the standard error block and stop; (6) store the normalised bare ID in `{task_id}`; (7) confirm `✅ Task ID parsed: \`{task_id}\`` and continue to step 2.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Input` section is updated to replace the `<!-- story 3-2 will implement -->` breadcrumb with: a one-line description of what the input step does, a `See: ./steps/step-01-task-id-parser.md` pointer, and an inline statement that `{task_id}` is available to all downstream steps after this step completes. No other sections in `workflow.md` change.

3. The standard error block (referenced in AC #1 step instructions) MUST follow this exact template so that downstream steps and potential test tooling can assume a consistent error surface:

   ```
   ❌ **Task-ID parse failed — unrecognisable input**

   The `clickup-dev-implement` skill could not extract a ClickUp task ID from the input you provided.

   **Input received:** `{raw_input}`

   **Accepted formats:**
   - Bare task ID: `86abc123`
   - Full URL: `https://app.clickup.com/t/86abc123`
   - CU-prefixed: `CU-86abc123`

   **What to do:** Re-invoke the Dev agent with a valid ClickUp task ID in one of the accepted formats above.
   ```

   The step file MUST quote this block verbatim (not paraphrase) so reviewers can verify the exact wording.

4. `src/custom-skills/clickup-dev-implement/steps/.gitkeep` is removed. It was a zero-byte directory-marker added in story 3.1 per the `.gitkeep` convention; now that `step-01-task-id-parser.md` exists, the marker is no longer needed.

5. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

6. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

7. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

8. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.1 (current baseline after story 2.8's regression test: **234 passing**, 0 failing). Since no `.ts` lands, the expected test-count delta is zero.

9. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

10. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty. Story 3.2 adds a step to the sibling `clickup-dev-implement` skill; it MUST NOT touch the EPIC-2 skill tree.

11. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring (routing `DS` → `clickup-dev-implement`) is explicitly deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Task fetch including parent-epic context (`getTaskById` for both task and epic) → **story 3.3**.
- Planning-artifact reader (loads `planning-artifacts/PRD.md`, `architecture.md`, optional `tech-spec.md`) → **story 3.4**.
- Progress-comment poster (append-only `addComment` with markdown-formatted milestone updates) → **story 3.5**.
- Status-transition helper (validates target status against list's allowed statuses; transitions in progress → in review → done) → **story 3.6**.
- Non-blocking-assumption comment pattern (posts assumption block as ClickUp comment; does not block for PM approval) → **story 3.7**.
- Dev-facing clarification prompt (asks the dev, never the PM, when blocked) → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` override routing the Dev agent's `DS` trigger to `clickup-dev-implement` → **story 3.9**.
- Parsing the short human-readable ClickUp `#ID` format (e.g. `#abc`) — this form is not mentioned in the EPIC-3 goal or PRD and is deferred pending confirmation that the vendored `getTaskById` accepts it. The three accepted forms (bare ID, URL, `CU-` prefix) cover all documented entry points.
- API-level validation that `{task_id}` corresponds to a real ClickUp task — that belongs to the fetch step (story 3.3), not the parser.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-01-task-id-parser.md` (AC: #1, #3)**
  - [ ] Create the file with YAML frontmatter (`task_id: ''`), `# Step 1: Task-ID Parser` H1, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [ ] Include the verbatim error block template from AC #3 inside the INSTRUCTIONS, with `{raw_input}` as the placeholder for the input that failed validation.
  - [ ] Verify the frontmatter key name `task_id` matches the downstream contract: story 3.3 will read `{task_id}` by this exact name to call `getTaskById`. The key name is a shared contract across EPIC-3 steps — do not rename.
  - [ ] Verify all three input forms are covered: URL (containing `app.clickup.com`), `CU-`-prefixed (case-insensitive strip), and bare ID (pass-through). The URL extraction rule is: strip any query string and fragment first, then take the last non-empty path segment.

- [ ] **Task 2 — Update `workflow.md` Input section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [ ] Replace the single-line `<!-- story 3-2 will implement: accept raw ID, URL, or CU-prefixed form; normalise to bare task ID -->` comment under `## Input` with:
    - One descriptive sentence: what the task-ID parser accepts, what it normalises to, and what happens on failure.
    - `See: [./steps/step-01-task-id-parser.md](./steps/step-01-task-id-parser.md)`
    - An inline statement: "`{task_id}` (normalised bare ClickUp task ID) is available to all downstream steps after this step completes."
  - [ ] Confirm no other sections in `workflow.md` are touched (breadcrumbs for stories 3.3–3.8 MUST remain unchanged).

- [ ] **Task 3 — Remove `steps/.gitkeep` (AC: #4)**
  - [ ] Delete `src/custom-skills/clickup-dev-implement/steps/.gitkeep`.
  - [ ] Confirm `git status` shows the deletion and the new step file (both under `steps/`).

- [ ] **Task 4 — Verify regression-free (AC: #5–#11)**
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [ ] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (story 1.1 vendor-tree exclusions MUST be byte-unchanged).
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new findings from `src/custom-skills/`.
  - [ ] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat of the new markdown.
  - [ ] `npm test` → **234 passing**, 0 failing. Since no `.ts` lands, the count must not change.

- [ ] **Task 5 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md`, deletion of `src/custom-skills/clickup-dev-implement/steps/.gitkeep`.
  - [ ] Commit message: `feat(custom-skills): implement task-ID parser step in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-01-task-id-parser.md to normalise user-supplied ClickUp task
    identifiers (bare ID, full app URL, or CU-prefixed form) to a bare
    alphanumeric task ID stored in {task_id} for downstream steps (3.3+).

    Removes steps/.gitkeep (story 3.1 directory marker — no longer needed
    now that a real step file exists).

    Out of scope (deferred): task fetch + parent-epic context (3.3),
    planning-artifact reader (3.4), progress-comment poster (3.5),
    status-transition helper (3.6), non-blocking-assumption pattern (3.7),
    dev-clarification prompt (3.8), bmad-agent-dev.toml DS-trigger wiring (3.9).

    Refs: EPIC-3, story 3-2-task-id-parser.
    ```

## Dev Notes

### What the step file is responsible for — and what it is not

`step-01-task-id-parser.md` is a workflow instruction file consumed by the BMAD Dev agent at runtime. It is not executable code; the LLM reads its `## INSTRUCTIONS` and follows them literally. That means:

- The "detect URL form" rule causes the LLM to apply text pattern matching to the raw string — no regex library is invoked; the agent reasons over the pattern description.
- The `{task_id}` frontmatter variable is runtime-populated: the agent sets it by applying the normalisation rules. It persists in the BMAD step-context for downstream steps (story 3.3 reads `{task_id}` without re-parsing the input).
- The error block in AC #3 is exact wording the agent must emit verbatim. Using a template here rather than a paraphrase means potential future regression tooling can assert the exact error string.

### URL path extraction rule — why "last non-empty path segment"

ClickUp task URLs come in at least two forms observed in the wild:

- Short form: `https://app.clickup.com/t/86abc123` — task ID is the last segment.
- Workspace-scoped form: `https://app.clickup.com/9012345678/v/t/86abc123` — task ID is still the last segment.

Using "last non-empty path segment after splitting on `/`" handles both forms without enumerating every URL shape. If ClickUp adds new URL patterns in the future, the rule continues to work as long as the task ID remains the terminal path component — which is consistent with REST URL design.

A trailing slash edge case (`https://app.clickup.com/t/86abc123/`) is handled correctly by "last **non-empty** segment" (skip empty strings after split).

A query-string edge case (`https://app.clickup.com/t/86abc123?comment=99abc`) and a fragment edge case (`https://app.clickup.com/t/86abc123#overview`) are both handled by stripping everything from the first `?` or `#` before splitting on `/`. ClickUp's "Copy link" button and Slack notifications commonly produce URLs with `?comment=...` appended, making this a first-day usage scenario.

### `CU-` prefix — case-insensitive strip

The `CU-` prefix is emitted by ClickUp's own UI (e.g. in Slack notifications, email subject lines) and is frequently copy-pasted by developers. The prefix is always uppercase in practice, but the strip rule is specified as case-insensitive (`cu-`, `Cu-`, `CU-` all stripped) to avoid surprising failures when a user types it in lowercase.

### `{task_id}` is the EPIC-3 step-context contract

Every step added by stories 3.3–3.8 will read `{task_id}` from the step context that this step populates. The key name is a shared contract. Any renaming here would require corresponding edits in all subsequent step files — do not rename.

### `.gitkeep` lifecycle

Story 3.1 added `steps/.gitkeep` with this note: "Remove it in story 3.2 when the first real step file lands." This story fulfils that contract. The deletion and addition of `step-01-task-id-parser.md` MUST land in the same commit — splitting them would briefly leave the `steps/` directory with both files, which is noise in the review diff.

### Step file naming convention for EPIC-3 (reminder from story 3.1)

| Step file                             | Created by story | Execution order |
| ------------------------------------- | ---------------- | --------------- |
| `step-01-task-id-parser.md`           | **3.2 (this)**   | 1               |
| `step-02-task-fetch.md`               | 3.3              | 2               |
| `step-03-planning-artifact-reader.md` | 3.4              | 3               |
| `step-04-progress-comment-poster.md`  | 3.5              | 4               |
| `step-05-status-transition.md`        | 3.6              | 5               |
| `step-06-assumptions.md`              | 3.7              | 6               |
| `step-07-dev-clarification.md`        | 3.8              | 7               |

Steps 4–7 are sub-flows invoked from within the implementation loop rather than strict sequential phases. Story 3.2 adds step 1; story 3.3 MUST add `step-02-task-fetch.md`.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` files. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### References

- [EPIC-3 §Stories bullet 2](../epics/EPIC-3-dev-agent-clickup.md) — "Implement task-ID parser (accept raw ID, URL, or prefixed form like `CU-1234`)".
- [EPIC-3 §Goal](../epics/EPIC-3-dev-agent-clickup.md) — "accepts a ClickUp task ID" — the goal presupposes a normalised bare ID is available for `getTaskById`.
- [Story 3.1 §Acceptance Criteria #3](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Input` section created with `<!-- story 3-2 will implement -->` breadcrumb. This story replaces that breadcrumb.
- [Story 3.1 §Dev Notes: Step file naming convention](./3-1-scaffold-clickup-dev-implement-skill.md) — step-01 through step-07 table; story 3.2 MUST add `step-01-task-id-parser.md`.
- [Story 2.2](./2-2-prereq-file-check.md) — direct analogue for EPIC-2; same one-step-file + workflow.md-update + `.gitkeep`-removal pattern. Follow the same task order.
- Upstream reference shape for step files: `~/.bmad/cache/git/github.com-Alpharages-BMAD-METHOD-main/src/bmm-skills/4-implementation/bmad-code-review/steps/step-01-gather-context.md` — pattern: YAML frontmatter with runtime keys, H1 title, `## RULES`, `## INSTRUCTIONS`.
- [PRD §Functional requirements #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context…" — confirms task ID is the entry point; normalisation is a prerequisite.

## Dev Agent Record

### Agent Model Used

(to be filled by implementing agent)

### Debug Log References

(to be filled by implementing agent)

### Completion Notes List

(to be filled by implementing agent)

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` — step file with parsing rules and error block template (AC #1, #3)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Input` section updated (AC #2)

**Deleted**

- `src/custom-skills/clickup-dev-implement/steps/.gitkeep` — zero-byte directory marker from story 3.1, no longer needed (AC #4)

### Review Findings

| ID   | Category | Finding                                                                                                                                                                                                                                                 | Resolution                                                                                                        |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| BS-1 | bad_spec | URL query strings and fragments not handled — `https://app.clickup.com/t/86abc123?comment=99abc` would extract `86abc123?comment=99abc`, failing alphanumeric validation. ClickUp "Copy link" and Slack notifications produce URLs with `?comment=...`. | Fixed: step-01 instruction 2 now strips `?` and `#` before path extraction. AC #1 and Dev Notes updated to match. |
| P-1  | patch    | `{raw_input}` used in the error block but not declared in YAML frontmatter. LLM could emit the literal placeholder instead of the actual input.                                                                                                         | Fixed: `raw_input: ''` added to frontmatter; instruction 1 now explicitly records `{raw_input}`.                  |
| D-1  | defer    | Ambiguous scope of "the input" in step 3 for a URL path that ends in `CU-...`. ClickUp never emits CU- in URL paths; no practical impact.                                                                                                               | No action taken.                                                                                                  |

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-3 bullet 2 via `bmad-create-story` workflow. Status → ready-for-dev. |
