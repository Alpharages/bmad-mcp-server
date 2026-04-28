---
prd_loaded: ''
architecture_loaded: ''
tech_spec_loaded: ''
project_context_loaded: ''
task_ac_list: ''
task_subtasks: ''
---

# Step 3: Planning Artifact Reader & Context Builder

## RULES

1. **Read-only:** This step uses the IDE's native Read file tool only. No ClickUp API calls are made in this step. No files are written or modified.
2. **PRD required:** If `planning-artifacts/PRD.md` cannot be read, emit the PRD-not-found error block and **stop** — do not proceed to step 4 (implementation loop).
3. **Architecture required:** If `planning-artifacts/architecture.md` cannot be read, emit the architecture-not-found error block and **stop** — do not proceed to step 4 (implementation loop).
4. **Tech-spec best-effort:** If `planning-artifacts/tech-spec.md` is absent, set `{tech_spec_loaded}` = `'false'` and **continue**.
5. **project-context best-effort:** If `project-context.md` is absent, set `{project_context_loaded}` = `'false'` and **continue**.
6. **Contract:** `{prd_loaded}` and `{architecture_loaded}` MUST be `'true'` by the time this step completes.

## INSTRUCTIONS

### Load planning artifacts

1. Read `planning-artifacts/PRD.md`. If it fails, emit the PRD-not-found error block and stop.

   ```
   ❌ **Planning artifact missing — PRD.md not found**

   The `clickup-dev-implement` skill could not read `planning-artifacts/PRD.md`.

   **Why this is fatal:** The PRD defines product requirements and functional scope. Without it, the Dev agent cannot make scope-aware implementation decisions.

   **What to do:** Ensure `planning-artifacts/PRD.md` exists in the project root, then re-invoke the Dev agent with task `{task_id}`.
   ```

2. Set `{prd_loaded}` = `'true'`. PRD content is now in conversation context.

3. Read `planning-artifacts/architecture.md`. If it fails, emit the architecture-not-found error block and stop.

   ```
   ❌ **Planning artifact missing — architecture.md not found**

   The `clickup-dev-implement` skill could not read `planning-artifacts/architecture.md`.

   **Why this is fatal:** The architecture document defines the technical stack, patterns, and constraints the Dev agent must follow.

   **What to do:** Ensure `planning-artifacts/architecture.md` exists in the project root, then re-invoke the Dev agent with task `{task_id}`.
   ```

4. Set `{architecture_loaded}` = `'true'`. Architecture content is now in conversation context.

5. Attempt to read `planning-artifacts/tech-spec.md`. If found, set `{tech_spec_loaded}` = `'true'`; otherwise set `'false'` and emit:

   ```
   ⚠️ **Optional artifact not found — tech-spec.md skipped**
   `planning-artifacts/tech-spec.md` was not found. The Dev agent will rely on PRD and architecture only.
   ```

6. Attempt to read `project-context.md` (search `**/project-context.md` from project root). If found, set `{project_context_loaded}` = `'true'`; otherwise set `'false'` (silent — no warning needed).

### Parse task description structure

The ClickUp task description from step 2 is already in conversation context. Extract and store the following structured sections to give the implementation loop a precise execution plan:

7. **Extract `{task_ac_list}`** — locate the `## Acceptance Criteria` section in the task description. Extract the full numbered list. If the section is absent, set `{task_ac_list}` = `''` (the implementation loop will derive ACs from PRD + epic context).

8. **Extract `{task_subtasks}`** — locate the `## Tasks / Subtasks` section in the task description. Extract the full checkbox list including subtask indentation. If the section is absent, set `{task_subtasks}` = `''`.

9. **Extract dev notes** — locate the `## Dev Notes` section in the task description. Note the Architecture Guardrails, Previous Story Context, and References subsections. These are available in conversation context for the implementation loop — no separate variable needed.

### Emit success summary

10. Emit the success summary block and continue to step 4.

    ```
    ✅ **Context loaded**

    **Planning artifacts:**
    - PRD: `planning-artifacts/PRD.md` — loaded
    - Architecture: `planning-artifacts/architecture.md` — loaded
    - Tech spec: `planning-artifacts/tech-spec.md` — {loaded | not found, skipped}
    - Project context: `project-context.md` — {loaded | not found, skipped}

    **Task structure:**
    - Acceptance criteria: {count from task_ac_list, or "derived from PRD" if empty}
    - Tasks/subtasks: {count from task_subtasks, or "none in task description"}
    - Dev notes: {present | absent}

    Proceeding to step 4 (implementation loop).
    ```
