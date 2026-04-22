# Story 2.5: Implement description composer (PRD + architecture + epic context → task description)

Status: review

Epic: [EPIC-2: Dev agent story-creation mode → ClickUp (non-destructive)](../epics/EPIC-2-dev-story-creation-clickup.md)

> Fills the `## Description Composer` skeleton left by story 2.1. Adds one step file (`step-04-description-composer.md`) and updates one section of `workflow.md`. No TypeScript lands; no ClickUp write calls are made. The step is read-only: it collects a story title from the user, fetches the selected epic's ClickUp task description via `getTaskById`, synthesizes context from `{prd_content}` and `{architecture_content}` (loaded by step-01), presents the composed description for user review, and stores the final text in `{task_description}` for consumption by story 2.6 (task creation).
>
> **Depends on stories 2.1, 2.2, 2.3, and 2.4 completing first.** The `{prd_content}`, `{architecture_content}`, `{epic_id}`, `{epic_name}`, and `{sprint_list_name}` variables needed by this step are populated by steps 01–03. The step file slot `step-04-description-composer.md` must land after `step-03-sprint-list-picker.md` to preserve execution order. Do not start implementation until story 2.4 is merged.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `src/custom-skills/clickup-create-story/workflow.md` to include a working description-composer step — backed by `steps/step-04-description-composer.md` — that collects a story title from the user, fetches the selected epic's ClickUp task description via `getTaskById`, synthesizes context from `{prd_content}` and `{architecture_content}`, composes a rich structured task description, presents it for user review, and stores the final text in `{task_description}`,
so that story 2.6 (task creation) can pass a ready-to-use, PRD+architecture-derived description body to `createTask` — matching PRD §Functional requirements #2 ("creates ClickUp tasks with rich, PRD+architecture-derived descriptions") — without fabricating requirements or silently skipping relevant planning artifacts.

## Acceptance Criteria

1. `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md` exists and is the canonical source of the description-composer logic. It MUST:
   - Have YAML frontmatter with exactly three runtime-population keys:
     ```yaml
     epic_description: ''
     story_title: ''
     task_description: ''
     ```
     All empty strings; set during execution. `epic_description` holds the raw text returned by `getTaskById` for the selected epic; `story_title` holds the story name entered by the user; `task_description` holds the final composed description passed to step-05. Story 2.6 reads `{task_description}` and `{story_title}` by name; exact key spelling matters.
   - Include a `# Step 4: Description Composer` H1 title.
   - Include a `## RULES` section with:
     (a) a mode note — `getTaskById` is available in **all** `CLICKUP_MCP_MODE` values (`read-minimal`, `read`, `write`); since the full skill requires `write` mode (for `createTask` in step-05 and `searchSpaces` in steps 02–03), this step always runs in `write` context;
     (b) a read-only rule — this step calls only `getTaskById` for the epic; it MUST NOT call `createTask`, `updateTask`, `addComment`, or any other write tool;
     (c) a blocking rule — the step MUST NOT continue to step 5 if `{task_description}` is empty at the end of this step;
     (d) a no-fabrication rule — the description MUST NOT invent requirements, acceptance criteria, or technical constraints that cannot be traced to `{prd_content}`, `{architecture_content}`, the epic task response, or explicit user input; if the planning artifacts are thin, the description should be shorter, not padded with plausible-sounding content.
   - Include an `## INSTRUCTIONS` section with numbered steps that:
     1. Verify that `{prd_content}`, `{architecture_content}`, `{epic_id}`, and `{epic_name}` are all non-empty. If any are missing, emit the standard missing-context error block (see AC #3) and stop.
     2. Confirm current context to the user:
        ```
        📋 **Description composer context**
        - Epic: **{epic_name}** (`{epic_id}`)
        - Sprint list: **{sprint_list_name}**
        - PRD: loaded ✓
        - Architecture: loaded ✓
        ```
     3. Ask: "What is the title for the new story? (This becomes the ClickUp task name.)"
     4. Parse the user's response and set `{story_title}`. Validate it is non-empty; if empty, re-ask.
     5. Ask (optional follow-up): "Any additional scope notes for this story? (Press Enter to skip.)" Accept free-text or empty input. Store as `{scope_notes}` (a local variable for this step only) if non-empty.
     6. Call `getTaskById` with `id: "{epic_id}"` to fetch the full epic task details. The response contains task metadata, then the task's own description content, then comments (each prefixed with `Comment by {username} on {date}:`), then status-change events. Extract only the text **before** the first `Comment by` line as `{epic_description}` — do not include any comment or status-change content. If `getTaskById` returns an error or the pre-comment content is empty, warn the user ("⚠️ Could not fetch epic description — proceeding without it.") and continue with `{epic_description}` as an empty string.
     7. Compose `{task_description}` as a structured Markdown document following the template in AC #2. The composer MUST:
        - Pull a concise "Business Context" summary (≤5 bullet points) from `{prd_content}` — specifically the Problem, Goal, and the Functional requirements most relevant to `{story_title}`.
        - Pull a concise "Technical Context" summary (≤5 bullet points) from `{architecture_content}` — the tech stack, key patterns, and constraints most relevant to `{story_title}`.
        - Include the full `{epic_description}` under the Epic section (unmodified — the human owns this text).
        - Include `{scope_notes}` under a "Scope Notes" section if non-empty; omit the section entirely if empty.
        - Keep each section focused: synthesize and reference, do not paste entire documents verbatim.
     8. Present the composed description to the user:

        ```
        📝 **Proposed task description for "{story_title}":**

        ---
        {task_description}
        ---

        Does this description look correct? [Y/n/edit]
        ```

        - If user replies `Y` or presses Enter: proceed.
        - If user replies `n`: ask "What would you like to change?" and accept free-text edit instructions. Regenerate the description applying the requested changes. Re-present and ask again. Repeat until confirmed.
        - If user replies `edit`: instruct the user to paste the full revised description, terminated by a line containing only `---END---`. Parse the pasted text as the new `{task_description}` and confirm it back to the user before proceeding.

     9. Confirm the finalized description: emit `✅ Description set for story "{story_title}". Continuing to task creation…` and proceed to step 5.

2. The `{task_description}` composed in AC #1 step 7 MUST follow this template structure (each section is optional if its source data is absent — omit silently rather than rendering an empty section heading):

   ```markdown
   ## Epic: {epic_name}

   {epic_description}

   ---

   ## Business Context

   _Synthesized from planning-artifacts/PRD.md_

   - [bullet 1 — problem, goal, or relevant functional requirement]
   - [bullet 2 …]
   - … (up to 5 bullets)

   ---

   ## Technical Context

   _Synthesized from planning-artifacts/architecture.md_

   - [bullet 1 — stack, pattern, or constraint relevant to this story]
   - [bullet 2 …]
   - … (up to 5 bullets)

   ---

   ## Scope Notes

   {scope_notes}

   ---

   _Created by Dev agent (story-creation mode) via bmad-mcp-server `clickup-create-story` skill. Sprint: {sprint_list_name}._
   ```

   The template is a guide — the agent MUST adapt the bullet content to the actual planning artifacts and `{story_title}`. The `---` dividers and `## ` headings are required structure; section content is synthesized, not copy-pasted. The footer line is required verbatim (it signals agent authorship and provides traceability). If `{epic_description}` is empty (ClickUp error in step 6), omit the Epic section body but keep the heading with a note: `_Epic description unavailable — see ClickUp task {epic_id}._`

3. The standard missing-context error block (referenced in AC #1 step 1) MUST follow this exact template:

   ```
   ❌ **Description composer failed — missing upstream context**

   The `clickup-create-story` skill requires the following variables to be set before the description composer can run:

   - `{prd_content}` — {MISSING or present}  (set by step 1: prereq check)
   - `{architecture_content}` — {MISSING or present}  (set by step 1: prereq check)
   - `{epic_id}` — {MISSING or present}  (set by step 2: epic picker)
   - `{epic_name}` — {MISSING or present}  (set by step 2: epic picker)

   **Why:** The description is synthesized from PRD + architecture content and the selected epic's ClickUp task. Without these inputs, the description would be empty or fabricated.

   **What to do:** Re-run from step 1 to ensure all prerequisite steps have completed successfully, then return to this step.
   ```

   The step file MUST quote this block verbatim (not paraphrase) so reviewers can verify the exact wording. Replace `{MISSING or present}` with the actual status of each variable at runtime.

4. `src/custom-skills/clickup-create-story/workflow.md` — the `## Description Composer` section is updated to replace the `<!-- story 2.5 will implement -->` breadcrumb with:
   - A one-line description of what the description composer does (collect story title from user → fetch epic description via `getTaskById` → synthesize PRD + architecture context → compose `{task_description}` → confirm with user).
   - A `See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)` pointer.
   - An inline rule: "Step 4 MUST complete with a non-empty `{task_description}` before the workflow proceeds to step 5." No other sections in `workflow.md` change; the breadcrumb for story 2.6 (`## Task Creation`) MUST remain unchanged.

5. No files under `BMAD-METHOD/` are created, modified, or deleted. `git diff --stat -- BMAD-METHOD/` MUST be empty.
6. No files under `src/tools/clickup/` are created, modified, or deleted. `git diff --stat -- src/tools/clickup/` MUST be empty.
7. No TypeScript source files are added or modified. `git diff --stat -- 'src/**/*.ts'` MUST be empty. This story ships markdown only.
8. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with no new failures vs. the merge commit of story 2.4 (baseline shifts as EPIC-2 stories land). Since no `.ts` lands, the expected deltas are zero in all four.
9. The vendor-tree exclusions from story 1.1 remain byte-unchanged: `.gitignore`, `tsconfig.json#exclude`, `eslint.config.mjs` `ignores`, `.eslintignore`, `.prettierignore`, and `tests/unit/dependency-audit.test.ts` `VENDORED_PATHS`.

## Out of Scope (explicitly deferred to later stories)

- ClickUp task creation call (`createTask` with `{story_title}`, `{task_description}`, `parent: {epic_id}`, `list_id: {sprint_list_id}`) → **story 2.6**.
- `customize.toml` override routing Dev agent's `CS` trigger to `clickup-create-story` → **story 2.7**.
- Regression check that upstream `bmad-create-story` still works in isolation → **story 2.8**.
- Token-permission gating → **story 2.9**.
- Acceptance criteria generation: the description composer synthesizes context from existing artifacts; it MUST NOT generate BDD acceptance criteria, user story statements ("As a…"), or task checklists. Those belong to the team lead's review of the ClickUp task.
- Automatic loading and synthesis of optional planning files (`planning-artifacts/ux-design.md`, `planning-artifacts/tech-spec.md`): step-04 MAY check for their existence and include a single footer mention if present (e.g., "See also: `planning-artifacts/ux-design.md`."), but MUST NOT fail or warn if they are absent, and MUST NOT attempt to synthesize their contents — that scope belongs to a future story.
- Duplicate story detection (checking if a ClickUp task with the same title already exists in the sprint list) → story 2.6 owns pre-creation validation.
- Streaming or incremental description display as each section is composed — the agent composes the full description first, then presents it in a single block.
- Version or revision history of the description: the description is composed once and written at creation time (story 2.6). Post-creation edits are the team lead's responsibility per PRD §Functional requirements #6.

## Tasks / Subtasks

- [x] **Task 1 — Create `steps/step-04-description-composer.md` (AC: #1, #2, #3)**
  - [x] Create the file with YAML frontmatter (three keys: `epic_description`, `story_title`, `task_description`), H1 title, `## RULES`, and `## INSTRUCTIONS` sections exactly as specified in AC #1.
  - [x] Include the verbatim missing-context error block from AC #3 inside the INSTRUCTIONS at step 1, with the four variable rows and `{MISSING or present}` as runtime-resolvable placeholders.
  - [x] Inline the description template from AC #2 inside the INSTRUCTIONS at step 7 so the agent has it at hand while composing. The agent MUST fill in synthesized content, not produce the template verbatim.
  - [x] Verify frontmatter key names match downstream contracts: `story_title` → story 2.6's `createTask` `name` field; `task_description` → story 2.6's `createTask` `description` field. Exact spelling matters.
  - [x] Confirm that `{sprint_list_name}` appears in the description footer (AC #2) and in the context-confirmation block (AC #1 step 2), but is NOT a frontmatter key of step-04 — it is a frontmatter key of step-03 and is available from the shared step context without re-declaration. Similarly, `{scope_notes}` is NOT a frontmatter key — it is a local composition variable used within this step only; its content is embedded into `{task_description}` and not propagated downstream.

- [x] **Task 2 — Update `workflow.md` Description Composer section (AC: #4)**
  - [x] Open `src/custom-skills/clickup-create-story/workflow.md`.
  - [x] Under `## Description Composer`, replace the single-line `<!-- story 2.5 will implement ... -->` comment with:
    - One descriptive sentence covering the full step: user provides story title → agent fetches epic description via `getTaskById` → agent synthesizes PRD + architecture context → agent presents and confirms `{task_description}`.
    - `See: [./steps/step-04-description-composer.md](./steps/step-04-description-composer.md)`
    - Inline rule: "Step 4 MUST complete with a non-empty `{task_description}` before the workflow proceeds to step 5."
  - [x] Confirm `## Task Creation` section beneath is byte-unchanged (its breadcrumb for story 2.6 MUST remain unchanged).

- [x] **Task 3 — Verify regression-free (AC: #5–#9)**
  - [x] `git diff --stat -- BMAD-METHOD/` → empty.
  - [x] `git diff --stat -- src/tools/clickup/` → empty.
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff -- .gitignore .eslintignore .prettierignore eslint.config.mjs tsconfig.json tests/unit/dependency-audit.test.ts` → empty (story 1.1 vendor-tree exclusions MUST be byte-unchanged).
  - [x] `npm run build` → clean.
  - [x] `npm run lint` → 0 errors. Pre-existing `no-console` warnings in `tests/support/litellm-helper.mjs` unchanged. No new lint findings from `src/custom-skills/`.
  - [x] `npm run format` → no diff in `src/custom-skills/`. Re-run before commit to accept any prettier reformat of the new markdown.
  - [x] `npm test` → passing count unchanged from story 2.4 merge baseline. Since no `.ts` lands, the test count must not change.

- [ ] **Task 4 — Commit (AC: all)**
  - [ ] Stage in this order: `src/custom-skills/clickup-create-story/workflow.md`, `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`.
  - [ ] Commit message: `feat(custom-skills): implement description composer in clickup-create-story`
  - [ ] Body:

    ```
    Add step-04-description-composer.md to the clickup-create-story skill. The
    step collects a story title from the user, fetches the selected epic's
    ClickUp description via getTaskById, synthesizes ≤5 bullets each from
    {prd_content} and {architecture_content} (loaded by step-01), presents the
    composed description for user review (Y/n/edit), and stores the final text
    in {task_description} and {story_title} for step-05 (story 2.6) to pass to
    createTask.

    Updates workflow.md § Description Composer to replace the 2.5 breadcrumb
    with the step pointer and blocking rule.

    Note: no acceptance criteria or user story statements are generated — the
    description synthesizes existing planning artifacts only. The no-fabrication
    rule prevents invented requirements.

    Out of scope (deferred): task creation (2.6), customize.toml wiring (2.7),
    upstream regression check (2.8), token-permission gating (2.9).

    Refs: EPIC-2, story 2-5-description-composer.
    ```

## Dev Notes

### What `step-04` is responsible for — and what it is not

`step-04-description-composer.md` is a workflow instruction file consumed by the BMAD Dev agent at runtime. It is not executable code; the LLM reads its `## INSTRUCTIONS` and follows them literally. That means:

- "Call `getTaskById` with `id: "{epic_id}"`" causes the LLM to invoke the `getTaskById` MCP tool and extract the task description from the text response.
- "Synthesize ≤5 bullets from `{prd_content}`" means the LLM reads the PRD content string set by step-01 and distills the most relevant points for the given story title.
- The `{epic_description}`, `{story_title}`, `{task_description}` frontmatter variables are runtime-populated by the LLM. They persist in the BMAD step-context for downstream steps.
- The missing-context error block in AC #3 is exact wording the agent must emit verbatim. Story 2.8's regression check can assert the exact error string.

### Variables consumed from previous steps / provided to downstream

| Key                      | Direction    | Source / Consumer                                                                 |
| ------------------------ | ------------ | --------------------------------------------------------------------------------- |
| `{prd_content}`          | **consumed** | Set by step-01 (prereq check, story 2.2)                                          |
| `{architecture_content}` | **consumed** | Set by step-01 (prereq check, story 2.2)                                          |
| `{epic_id}`              | **consumed** | Set by step-02 (epic picker, story 2.3) — `getTaskById` input                     |
| `{epic_name}`            | **consumed** | Set by step-02 (epic picker, story 2.3) — description heading                     |
| `{sprint_list_name}`     | **consumed** | Set by step-03 (sprint-list picker, story 2.4) — description footer               |
| `{epic_description}`     | **produced** | Set during this step from `getTaskById` response; kept for reference              |
| `{story_title}`          | **produced** | Set from user input; consumed by step-05 (story 2.6) as `createTask` `name` field |
| `{task_description}`     | **produced** | Consumed by step-05 (story 2.6) as `createTask` `description` field               |

### `getTaskById` tool usage and response structure

`getTaskById` is registered in all `CLICKUP_MCP_MODE` values (see `src/tools/clickup-adapter.ts` lines 169, 178, 196 — `registerTaskToolsRead` is called in all three mode branches). The call:

```
getTaskById({ id: "{epic_id}" })
```

The `id` parameter must be a 6–9 character alphanumeric bare ClickUp task ID (no `#`, `CU-`, or URL prefix). `{epic_id}` was set by step-02 via `searchTasks` response parsing, which returns bare task IDs in the correct format.

The response layout (from `src/tools/clickup/src/tools/task-tools.ts`):

1. **Task metadata block** — name, status, assignees, dates (from `generateTaskMetadata`)
2. **Task description blocks** — the task's own markdown description (from `loadTaskContent`)
3. **Comments** — each prefixed with `Comment by {username} on {date}:` (from `loadTaskComments`, chronologically sorted)
4. **Status-change events** — interspersed chronologically

Step-04 MUST extract only sections 1–2 (metadata + description) as `{epic_description}`. The boundary is the first line matching `Comment by`. This is the "stop at first `Comment by` line" rule in AC #1 step 6. Epics often have many comments from team discussion; including those in the task description would pollute the synthesized output.

### `createTask` parameter mapping (story 2.6 downstream contract)

Confirmed from `src/tools/clickup/src/tools/task-write-tools.ts` line 348–356:

| Step-04 frontmatter key | `createTask` parameter | Notes                                                                                                                                                    |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{story_title}`         | `name`                 | Required — task title                                                                                                                                    |
| `{task_description}`    | `description`          | Optional — markdown body; the tool internally maps this to `markdown_description` in the ClickUp API request (line 376); this is transparent to the step |

The `parent_task_id` (`{epic_id}`) and `list_id` (`{sprint_list_id}`) parameters come from steps 02 and 03 respectively and are consumed directly by step-05; step-04 does not need to re-declare them.

### Description template in the step file (nesting concern)

AC #2 presents the description template inside a fenced code block (triple backtick). When the dev agent writes `step-04-description-composer.md`, the template must appear inside an `## INSTRUCTIONS` numbered step — which is itself markdown. Nested fenced blocks (triple-backtick inside triple-backtick) break markdown parsers.

**Recommended representation in step-04:** Use a blockquote or an indented section with a preamble like "Compose `{task_description}` using this structure:" followed by the template sections listed as plain-text headings and bullets (not inside a code block). The template is an instruction to the LLM, not a code sample — it does not need to be inside a fenced block in the step file. The dev agent writing step-04 should adapt the presentation to avoid nested code blocks.

### No-fabrication rule

The no-fabrication rule in `## RULES` (AC #1 item d) prevents a class of LLM mistakes: inventing acceptance criteria, adding unstated constraints, or padding a thin description with plausible-sounding requirements. The rule is explicit and testable:

> "The description MUST NOT invent requirements, acceptance criteria, or technical constraints that cannot be traced to `{prd_content}`, `{architecture_content}`, the epic task response, or explicit user input."

If planning artifacts are minimal (e.g., a one-sentence PRD), the description should be correspondingly brief. Story 2.8's regression check can assert that the description contains only phrases traceable to the actual PRD/architecture content.

### Description length and synthesis guidance

The ≤5 bullets per section is an upper bound, not a target. A focused story typically needs 2–3 bullets per section. Prefer:

1. **Specificity over completeness** — one precise bullet ("Uses TypeScript strict mode per `tsconfig.json`") beats three vague ones.
2. **Traceability** — every technical bullet should reference the architecture section or PRD requirement it summarizes.
3. **Story relevance** — filter ruthlessly to only what matters for `{story_title}`. Do not include unrelated PRD goals or architecture sections.

### User review loop (AC #1 step 8)

The review loop is intentional. Description quality varies with planning artifact completeness, and the team lead may need to correct context before the task is created. The Y/n/edit interaction provides a final check. The `edit` path (paste revised text) handles cases where the user wants to rewrite entirely rather than iterate on the composed version.

The loop MUST NOT auto-approve. It runs until the user explicitly confirms with `Y` or abandons.

### PRD §Functional requirements #6 and description authorship

PRD §Functional requirements #6 states: "Humans own ticket _description_; agents write only via _comments_ and _status_." This might appear to conflict with the description composer. The distinction is:

- §FR #6 applies to **updates** to existing task descriptions. Once a task exists, the team lead owns the description field.
- Story 2.5 + 2.6 together write the description **once, at task creation time** (story 2.6's `createTask` call). This is not an update — it is the initial content. The human reviews and confirms the text via the AC #1 step 8 loop before creation proceeds.

No conflict exists. The composer prepares the initial description; the human reviews it; `createTask` writes it once.

### Optional planning files

Per the Out of Scope section, `ux-design.md` and `tech-spec.md` are not synthesized. The recommended pattern for step-04:

- After composing the description body, do a quick existence check for `planning-artifacts/ux-design.md` and `planning-artifacts/tech-spec.md`.
- If either exists, append a single line to the footer: "See also: `planning-artifacts/ux-design.md`." Do not load or synthesize their contents.
- No warning or error if they are absent.

### Mode constraint: write mode

Although `getTaskById` is available in all modes, the full skill requires `CLICKUP_MCP_MODE=write` because:

- Step-02 (`searchSpaces`) and step-03 (`searchSpaces`) are not available in `read-minimal`.
- Step-05 (`createTask`) requires `write` mode.

The `## RULES` mode note in step-04 should state this so a reader of the step file understands the full skill constraint, even though step-04 itself does not raise the minimum mode requirement.

### ClickUp task description format

ClickUp task descriptions accept Markdown. The template in AC #2 uses standard Markdown (H2 headings, bullet lists, horizontal rules). Avoid tables — they render inconsistently in ClickUp's rich-text editor. Code blocks are acceptable for technical snippets.

### Step file naming convention

| Step file                         | Created by story | Execution order |
| --------------------------------- | ---------------- | --------------- |
| `step-01-prereq-check.md`         | 2.2              | 1               |
| `step-02-epic-picker.md`          | 2.3              | 2               |
| `step-03-sprint-list-picker.md`   | 2.4              | 3               |
| `step-04-description-composer.md` | **2.5**          | 4               |
| `step-05-create-task.md`          | 2.6              | 5               |

### Workflow.md breadcrumb contract

At the time story 2.5 is implemented, `workflow.md` will have been updated by stories 2.2, 2.3, and 2.4. The breadcrumb for story 2.6 (`## Task Creation`) MUST remain unchanged. Before committing, confirm that `diff` shows only the `## Description Composer` section modified.

### Tooling interaction

- **tsc / ESLint / Vitest**: No `.ts` files — no impact.
- **Prettier**: Will format the new `.md` file. Run `npm run format` before staging to avoid lint-staged rewrites on commit.

### References

- [PRD §Functional requirements #2](../PRD.md) — "creates ClickUp tasks with rich, PRD+architecture-derived descriptions."
- [PRD §Functional requirements #6](../PRD.md) — "Humans own ticket _description_; agents write only via _comments_ and _status_." — See Dev Notes above for why this does not conflict with the description composer.
- [Story 2.1 §AC #3](./2-1-scaffold-clickup-create-story-skill.md) — `## Description Composer` section created with `<!-- story 2.5 will implement -->` breadcrumb. This story replaces that breadcrumb.
- [Story 2.2 §Dev Notes: step-file shape](./2-2-prereq-file-check.md) — YAML frontmatter keys, `## RULES`, `## INSTRUCTIONS` pattern. `{prd_content}` and `{architecture_content}` variable names confirmed.
- [Story 2.3 §Dev Notes: downstream variables](./2-3-epic-picker.md) — `{epic_id}` (bare task ID, 6–9 chars) and `{epic_name}` confirmed as step-02 outputs.
- [Story 2.4 §Dev Notes: variables provided](./2-4-sprint-list-picker.md) — `{sprint_list_name}` confirmed as step-03 output; available in shared step context for the description footer.
- [EPIC-2 §Stories bullet 6](../epics/EPIC-2-dev-story-creation-clickup.md) — "Implement story description composer (pulls from PRD + architecture + epic task description)".
- Tool surface: `src/tools/clickup/src/tools/task-tools.ts` — `registerTaskToolsRead` registers `getTaskById` (all modes); response is a merged text block of task details, comments, and status history.
- Mode dispatch: `src/tools/clickup-adapter.ts` lines 169, 178, 196 — `getTaskById` registered in all three mode branches (`read-minimal`, `read`, `write`).
- Story 2.6 (task creation) reads `{story_title}` as `name`, `{task_description}` as `description`, `{epic_id}` as `parent_task_id`, `{sprint_list_id}` as target list. Key names in step-04 frontmatter MUST match these downstream expectations exactly.

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (root agent)

### Debug Log References

- Prettier initially converted `---` dividers inside the template to `***`; resolved by wrapping the template in a 4-backtick `text` fenced code block so prettier preserves literals while the LLM still reads the structure clearly.

### Completion Notes List

1. Created `step-04-description-composer.md` with exact YAML frontmatter keys (`epic_description`, `story_title`, `task_description`), H1, RULES (mode note, read-only, blocking, no-fabrication), and INSTRUCTIONS (9 numbered steps).
2. Included verbatim missing-context error block from AC #3 with four variable rows and `{MISSING or present}` placeholders.
3. Inlined description template from AC #2 inside step 7 using a `text` fenced block to preserve `---` dividers through prettier formatting; added instruction to synthesize bullets rather than copy placeholders verbatim.
4. Updated `workflow.md` § Description Composer to replace the 2.5 breadcrumb with the step description, pointer, and blocking rule.
5. Verified `## Task Creation` section is byte-unchanged.
6. All regression checks pass: BMAD-METHOD/, src/tools/clickup/, src/**/*.ts, vendor-tree exclusion files — all empty diffs. Build, lint, format, test clean (233 tests passing, no new failures).

### File List

**New**

- `src/custom-skills/clickup-create-story/steps/step-04-description-composer.md` — step file with description-composer logic, description template, and missing-context error block (AC #1–#3)

**Modified**

- `src/custom-skills/clickup-create-story/workflow.md` — `## Description Composer` section updated (AC #4)

**Deleted**

- (none)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-22 | Story drafted from EPIC-2 bullet 6 via `bmad-create-story` workflow. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-22 | Validation pass: clarified `getTaskById` response parsing (stop at first `Comment by` line to exclude comments from `{epic_description}`); confirmed `createTask` parameter names from source (`name`, `description`, `parent_task_id`); added `createTask` parameter mapping table and response structure to Dev Notes; noted description-template nesting concern for step file authoring; made `{scope_notes}` non-frontmatter status explicit in Task 1; simplified `{N}/{M} chars` to `loaded ✓` in context-confirmation block. |
| 2026-04-22 | Implementation complete. Added `step-04-description-composer.md` and updated `workflow.md`. All ACs satisfied; regression checks pass. Status → review. |
