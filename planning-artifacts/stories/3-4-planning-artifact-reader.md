# Story 3.4: Implement planning-artifact reader

Status: ready-for-dev

Epic: [EPIC-3: Dev agent implementation mode → ClickUp (non-destructive)](../epics/EPIC-3-dev-agent-clickup.md)

> Fills the `## Planning Artifacts` skeleton left by story 3.1. Adds one step file and updates one section in `workflow.md`. No TypeScript lands; no ClickUp API calls. The reader uses the IDE's native Read file tool — no BMAD install needed.
>
> **Depends on story 3.3 completing first** (which in turn depends on story 3.2). Step 3 follows step 2 in the skill execution chain; `workflow.md` must have the `## Fetch` section updated and `step-02-task-fetch.md` must exist before the `## Planning Artifacts` breadcrumb is replaced. Do not start implementation until story 3.3 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-dev-implement/workflow.md` to read the project's planning artifacts (`planning-artifacts/PRD.md`, `planning-artifacts/architecture.md`, and optionally `planning-artifacts/tech-spec.md`) via the IDE's native Read file tool,
so that downstream steps (3.5 progress-comment poster, 3.6 status-transition helper, and the core implementation loop) have the PRD and architecture content available in conversation context — without any writes to ClickUp or to the repo.

## Acceptance Criteria

1. `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` exists and is the canonical source of the planning-artifact-reader logic. It MUST:
   - Have YAML frontmatter with exactly these runtime-population keys (all empty strings, in this order):
     ```yaml
     prd_loaded: ''
     architecture_loaded: ''
     tech_spec_loaded: ''
     ```
   - Include a `# Step 3: Planning Artifact Reader` H1 title.
   - Include a `## RULES` section with all five rules:
     - (a) **Read-only:** This step uses the IDE's native Read file tool only. No ClickUp API calls are made in this step. No files are written or modified.
     - (b) **PRD required:** If `planning-artifacts/PRD.md` cannot be read, emit the PRD-not-found error block (see AC #3) and **stop** — do not proceed to step 4.
     - (c) **Architecture required:** If `planning-artifacts/architecture.md` cannot be read, emit the architecture-not-found error block (see AC #4) and **stop** — do not proceed to step 4.
     - (d) **Tech-spec best-effort:** If `planning-artifacts/tech-spec.md` is absent, emit the tech-spec-skipped warning block (see AC #5), set `{tech_spec_loaded}` = `'false'`, and **continue** — the skill proceeds with PRD and architecture only.
     - (e) **Contract:** `{prd_loaded}` and `{architecture_loaded}` MUST be `'true'` by the time this step completes. `{tech_spec_loaded}` is `'true'` if the file was read, `'false'` otherwise.
   - Include an `## INSTRUCTIONS` section with numbered steps:
     1. Using the IDE Read file tool, attempt to read `planning-artifacts/PRD.md`.
     2. If the read fails (file not found or access error), emit the PRD-not-found error block and stop.
     3. Set `{prd_loaded}` = `'true'`. PRD content is now in conversation context.
     4. Using the IDE Read file tool, attempt to read `planning-artifacts/architecture.md`.
     5. If the read fails, emit the architecture-not-found error block and stop.
     6. Set `{architecture_loaded}` = `'true'`. Architecture content is now in conversation context.
     7. Using the IDE Read file tool, attempt to read `planning-artifacts/tech-spec.md`.
     8. If the read succeeds, set `{tech_spec_loaded}` = `'true'`. Tech-spec content is now in conversation context.
     9. If the read fails, emit the tech-spec-skipped warning block, set `{tech_spec_loaded}` = `'false'`, and continue.
     10. Emit the success summary block (see AC #6) and continue to step 4.

2. `src/custom-skills/clickup-dev-implement/workflow.md` — the `## Planning Artifacts` section is updated to replace the `<!-- story 3-4 will implement: loads planning-artifacts/PRD.md, architecture.md, optional tech-spec.md -->` breadcrumb with:
   - A one-line description of what the planning-artifact reader does (uses IDE Read file tool to load PRD and architecture, with optional tech-spec; stops with a fatal error if either required file is absent).
   - `See: [./steps/step-03-planning-artifact-reader.md](./steps/step-03-planning-artifact-reader.md)`
   - An inline statement: "`{prd_loaded}` and `{architecture_loaded}` are `'true'` after this step completes. `{tech_spec_loaded}` is `'true'` if `planning-artifacts/tech-spec.md` was found, `'false'` otherwise. PRD, architecture, and (when present) tech-spec content are available in conversation context to all downstream steps after this step completes."

   No other sections in `workflow.md` change. The `## Input` section (from story 3.2), `## Fetch` section (from story 3.3), and breadcrumbs for stories 3.5–3.8 MUST remain intact.

3. The PRD-not-found error block (referenced in AC #1 rules (b) and instruction step (2)) MUST be quoted verbatim in the step file:

   ```
   ❌ **Planning artifact missing — PRD.md not found**

   The `clickup-dev-implement` skill could not read `planning-artifacts/PRD.md`.

   **Why this is fatal:** The PRD defines product requirements and functional scope. Without it, the Dev agent cannot make scope-aware implementation decisions.

   **What to do:** Ensure `planning-artifacts/PRD.md` exists in the project root, then re-invoke the Dev agent with task `{task_id}`.
   ```

4. The architecture-not-found error block (referenced in AC #1 rules (c) and instruction step (5)) MUST be quoted verbatim in the step file:

   ```
   ❌ **Planning artifact missing — architecture.md not found**

   The `clickup-dev-implement` skill could not read `planning-artifacts/architecture.md`.

   **Why this is fatal:** The architecture document defines the technical stack, patterns, and constraints the Dev agent must follow. Without it, the Dev agent cannot make architecture-compliant implementation decisions.

   **What to do:** Ensure `planning-artifacts/architecture.md` exists in the project root, then re-invoke the Dev agent with task `{task_id}`.
   ```

5. The tech-spec-skipped warning block (referenced in AC #1 rule (d) and instruction step (9)) MUST be quoted verbatim in the step file:

   ```
   ⚠️ **Optional artifact not found — tech-spec.md skipped**

   `planning-artifacts/tech-spec.md` was not found in the project root.

   **Why this is non-fatal:** Tech-spec is an optional artifact. PRD and architecture are sufficient for most implementations.

   **Impact:** No tech-spec constraints are loaded for this implementation session. The Dev agent will rely on PRD and architecture only.
   ```

6. The success summary block emitted at the end of successful step execution MUST be quoted verbatim in the step file:

   ```
   ✅ **Planning artifacts loaded**

   - **PRD:** `planning-artifacts/PRD.md` — loaded
   - **Architecture:** `planning-artifacts/architecture.md` — loaded
   - **Tech spec:** `planning-artifacts/tech-spec.md` — loaded [or "not found, skipped" if tech_spec_loaded is 'false']

   Proceeding to step 4 (progress-comment poster).
   ```

7. `src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md` and `steps/step-02-task-fetch.md` are byte-unchanged. `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md` MUST be empty.

8. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.

9. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.

10. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.

11. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 3.3. Since no `.ts` lands, the expected test-count delta is zero.

12. The vendor-tree exclusions added in story 1.1 remain byte-unchanged: `.gitignore` rule `!src/tools/clickup/**`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

13. The existing `src/custom-skills/clickup-create-story/` skill tree is byte-unchanged. `git diff --stat -- src/custom-skills/clickup-create-story/` MUST be empty.

14. `_bmad/custom/bmad-agent-dev.toml` is byte-unchanged. DS trigger wiring is deferred to story 3.9. `git diff -- _bmad/custom/bmad-agent-dev.toml` MUST be empty.

## Out of Scope (explicitly deferred to later stories)

- Loading `planning-artifacts/ux-design.md` — not mentioned in EPIC-3's story bullet for 3.4; can be added in a later story if needed.
- Cross-referencing loaded artifacts with ClickUp task or epic content — happens in the implementation loop (beyond story 3.8).
- Emitting a progress comment about which artifacts were loaded → **story 3.5**.
- Status transitions → **story 3.6**.
- Non-blocking assumption comment pattern → **story 3.7**.
- Dev-facing clarification prompt → **story 3.8**.
- `_bmad/custom/bmad-agent-dev.toml` DS-trigger wiring → **story 3.9**.

## Tasks / Subtasks

- [ ] **Task 1 — Create `steps/step-03-planning-artifact-reader.md` (AC: #1, #3, #4, #5, #6)**
  - [ ] Create the file with YAML frontmatter (three keys: `prd_loaded`, `architecture_loaded`, `tech_spec_loaded` — all empty strings, in that order), `# Step 3: Planning Artifact Reader` H1, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [ ] Verify the `## RULES` section includes all five rules: read-only, PRD required, architecture required, tech-spec best-effort, and contract.
  - [ ] Include the verbatim PRD-not-found error block from AC #3 in the INSTRUCTIONS.
  - [ ] Include the verbatim architecture-not-found error block from AC #4 in the INSTRUCTIONS.
  - [ ] Include the verbatim tech-spec-skipped warning block from AC #5 in the INSTRUCTIONS.
  - [ ] Include the verbatim success summary block from AC #6 at the end of INSTRUCTIONS.

- [ ] **Task 2 — Update `workflow.md` Planning Artifacts section (AC: #2)**
  - [ ] Open `src/custom-skills/clickup-dev-implement/workflow.md`.
  - [ ] Replace the single-line HTML-comment breadcrumb under `## Planning Artifacts` with the three-item replacement specified in AC #2 (description sentence, `See:` link, variable-availability statement).
  - [ ] Confirm no other sections in `workflow.md` are touched (breadcrumbs for stories 3.5–3.8 MUST remain unchanged).

- [ ] **Task 3 — Verify regression-free (AC: #7–#14)**
  - [ ] `git diff -- src/custom-skills/clickup-dev-implement/steps/step-01-task-id-parser.md src/custom-skills/clickup-dev-implement/steps/step-02-task-fetch.md` → empty.
  - [ ] `git diff --stat -- BMAD-METHOD/` → empty.
  - [ ] `git diff --stat -- src/tools/clickup/` → empty.
  - [ ] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [ ] `git diff --stat -- src/custom-skills/clickup-create-story/` → empty.
  - [ ] `git diff -- _bmad/custom/bmad-agent-dev.toml` → empty.
  - [ ] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty.
  - [ ] `npm run build` → clean.
  - [ ] `npm run lint` → 0 errors.
  - [ ] `npm run format` → no diff in `src/custom-skills/clickup-dev-implement/`. Run before staging to accept any prettier reformat.
  - [ ] `npm test` → no new failures vs. current baseline.

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-dev-implement/workflow.md`, `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md`.
  - [ ] Commit message: `feat(custom-skills): implement planning-artifact-reader step in clickup-dev-implement`
  - [ ] Body:

    ```
    Add step-03-planning-artifact-reader.md to load planning-artifacts/PRD.md
    (required), planning-artifacts/architecture.md (required), and
    planning-artifacts/tech-spec.md (optional) via the IDE's native Read file
    tool. Populates prd_loaded, architecture_loaded, and tech_spec_loaded in
    step context; content is available in conversation context to downstream steps.

    PRD and architecture are fatal if absent — consistent with story-creation
    mode's gate (PRD §FR #2). Tech-spec absence emits a warning and continues.

    Out of scope (deferred): ux-design.md loading, progress-comment poster (3.5),
    status-transition helper (3.6), assumption pattern (3.7), dev-clarification
    prompt (3.8), bmad-agent-dev.toml DS-trigger wiring (3.9).

    Refs: EPIC-3, story 3-4-planning-artifact-reader.
    ```

## Dev Notes

### IDE Read tool, not BMAD MCP read operation

This step uses the IDE's native file Read tool (e.g., Claude Code's `Read` tool or VS Code Copilot's file-access tool), **not** the `bmad` MCP tool's `read` operation. The BMAD MCP `read` operation serves BMAD agent/workflow content; it cannot read arbitrary project files. The IDE Read tool has direct access to the repo's working directory.

### Path resolution

Paths are specified relative to the project root: `planning-artifacts/PRD.md`, `planning-artifacts/architecture.md`, `planning-artifacts/tech-spec.md`. If the dev agent is operating from a subdirectory, it must resolve these to absolute paths before calling the Read tool.

### Content in conversation context

Once the IDE Read tool returns successfully, the file content is in conversation context. Downstream steps (3.5+) can reference PRD, architecture, and tech-spec content without additional file reads. The `{prd_loaded}` / `{architecture_loaded}` / `{tech_spec_loaded}` flags signal that this content is available and let downstream steps branch on whether tech-spec constraints apply.

### Why both PRD and architecture are required (not best-effort)

PRD §FR #2 gates story-creation mode on both `PRD.md` and `architecture.md` being present. By the same principle, implementation mode must not proceed without architectural constraints: generating code without knowing the tech stack, patterns, or naming conventions risks producing non-compliant output. Making architecture required prevents silent context gaps.

### Why epic context from step 2 does not affect this step

Step 2 may leave `{epic_task_id}` and `{epic_name}` as empty strings (if the task has no parent epic or the epic fetch failed). Step 3 does not use these variables — it reads local files only. Empty epic context has zero impact on step 3's execution. Downstream steps (implementation loop) that use epic context from step 2 must handle the empty-string case independently.

### This project's planning-artifacts layout

In the `bmad-mcp-server` project (where this skill is developed), `planning-artifacts/architecture.md` does not exist — architectural decisions are embedded in `planning-artifacts/PRD.md`. Step 3, as written, would emit the architecture-not-found error block on this project. This is intentional: the step implements the PRD's canonical repo layout (§Repo layout), which specifies `architecture.md` as a required file. Projects bootstrapped without a separate architecture document should create one before invoking the implementation skill.

### Step file naming convention for EPIC-3 (reminder)

| Step file                                 | Created by story | Execution order |
| ----------------------------------------- | ---------------- | --------------- |
| `step-01-task-id-parser.md`               | 3.2              | 1               |
| `step-02-task-fetch.md`                   | 3.3              | 2               |
| **`step-03-planning-artifact-reader.md`** | **3.4 (this)**   | **3**           |
| `step-04-progress-comment-poster.md`      | 3.5              | 4               |
| `step-05-status-transition.md`            | 3.6              | 5               |
| `step-06-assumptions.md`                  | 3.7              | 6               |
| `step-07-dev-clarification.md`            | 3.8              | 7               |

Story 3.5 MUST add `step-04-progress-comment-poster.md`.

### Tooling interaction

- **tsc**: `src/custom-skills/` contains only markdown. No new exclude entry needed.
- **ESLint**: flat config targets `**/*.{ts,tsx,js,mjs,cjs}`. Markdown is out of scope by default. No change.
- **Prettier**: Will format the new `.md` files. Run `npm run format` before staging to avoid lint-staged rewrites on commit.
- **Vitest**: Scans `tests/**/*.{test,spec}.ts`. Nothing under `src/custom-skills/` is picked up.
- **Dep-audit test**: Scans `src/**/*.ts`. No `.ts` in this story — no new dep-audit findings.

### CLICKUP_MCP_MODE requirements for this step

This step makes no ClickUp API calls — it uses IDE file tools only. `CLICKUP_MCP_MODE` is irrelevant to step 3. The `write` mode constraint enters at story 3.5 (progress-comment poster) and 3.6 (status-transition helper).

### References

- [EPIC-3 §Stories bullet 4](../epics/EPIC-3-dev-agent-clickup.md) — "Implement planning-artifact reader (loads PRD + architecture + tech-spec if present)".
- [EPIC-3 §Outcomes](../epics/EPIC-3-dev-agent-clickup.md) — "Reads repo `planning-artifacts/*` via IDE file tools (no BMAD install needed)."
- [PRD §FR #2](../PRD.md) — "Dev agent (story-creation mode) refuses if `planning-artifacts/PRD.md` + `architecture.md` are missing." (Informs the required-file policy for implementation mode.)
- [PRD §FR #5](../PRD.md) — "Dev agent accepts a ClickUp task ID, fetches description + comments + status + parent epic context, reads repo `planning-artifacts/*`, implements code..."
- [PRD §Repo layout](../PRD.md) — Canonical `planning-artifacts/` layout: `PRD.md`, `architecture.md`, `ux-design.md` (if UX), `tech-spec.md` (if needed).
- [Story 3.1 §Acceptance Criteria #3](./3-1-scaffold-clickup-dev-implement-skill.md) — `## Planning Artifacts` section created with the breadcrumb this story replaces.
- [Story 3.2](./3-2-task-id-parser.md) — `step-01-task-id-parser.md` provides `{task_id}` used in step 3's error blocks.
- [Story 3.3 §Dev Notes: Step-context variable contract for downstream steps](./3-3-task-fetch-with-epic-context.md) — Steps 3–8 must handle empty `{epic_task_id}` and `{epic_name}` gracefully; step 3 handles this by not using those variables at all.

## Dev Agent Record

### Agent Model Used

(to be filled by implementing agent)

### Debug Log References

(to be filled by implementing agent)

### Completion Notes List

(to be filled by implementing agent)

### File List

**New**

- `src/custom-skills/clickup-dev-implement/steps/step-03-planning-artifact-reader.md` — step file with reader rules, instructions, and verbatim error/warning/success blocks (AC #1, #3, #4, #5, #6)

**Modified**

- `src/custom-skills/clickup-dev-implement/workflow.md` — `## Planning Artifacts` section updated (AC #2)

**Deleted**

- (none expected)

### Review Findings

(to be filled during code review)

## Change Log

| Date       | Change                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-04-22 | Story drafted from EPIC-3 bullet 4 via `bmad-create-story` workflow. Status → ready-for-dev. |
