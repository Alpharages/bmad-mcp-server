---
prd_loaded: ''
architecture_loaded: ''
tech_spec_loaded: ''
project_context_loaded: ''
task_ac_list: ''
task_subtasks: ''
resolve_doc_paths_result: ''
---

# Step 3: Planning Artifact Reader & Context Builder

## RULES

1. **Read-only:** This step uses the IDE's native Read file tool only. No ClickUp API calls are made in this step. No files are written or modified.
2. **PRD required:** If the file at `data.prd.path` (resolved by `resolve-doc-paths`) is missing or cannot be read, emit the PRD-not-found error block and **stop** — do not proceed to step 4 (implementation loop).
3. **Architecture required:** If the file at `data.architecture.path` (resolved by `resolve-doc-paths`) is missing or cannot be read, emit the architecture-not-found error block and **stop** — do not proceed to step 4 (implementation loop).
4. **Tech-spec best-effort:** If `planning-artifacts/tech-spec.md` is absent, set `{tech_spec_loaded}` = `'false'` and **continue**.
5. **project-context best-effort:** If `project-context.md` is absent, set `{project_context_loaded}` = `'false'` and **continue**.
6. **Contract:** `{prd_loaded}` and `{architecture_loaded}` MUST be `'true'` by the time this step completes.

## INSTRUCTIONS

### Load planning artifacts

1. **Call `bmad({ operation: 'resolve-doc-paths' })`.** No `projectRoot` argument — the operation defaults to the server's configured project root. Store the full response as `{resolve_doc_paths_result}`. Extract:
   - `data.prd` → contains `.path` and `.layer`
   - `data.architecture` → contains `.path` and `.layer`
   - `data.warnings` → array of warning strings

2. **Emit cascade warnings.** If `data.warnings` is non-empty, emit each warning to the user as a `⚠️`-prefixed line before proceeding.

3. **Check PRD file.** Verify whether `data.prd.path` exists. If it does not exist, emit the following error block and stop:

   ```
   ❌ **Planning artifact missing — PRD.md not found**

   The `clickup-dev-implement` skill could not read the PRD at the resolved path.

   **Why this is fatal:** The PRD defines product requirements and functional scope. Without it, the Dev agent cannot make scope-aware implementation decisions.

   - PRD: <data.prd.path> [<data.prd.layer>] — **MISSING**

   **How to override doc paths:**
   1. Per-project (highest priority): add `[docs].prd_path` to `.bmadmcp/config.toml`
   2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml`
   3. Default (no config needed): place file at `planning-artifacts/PRD.md`

   **What to do:** Add the missing file at the resolved path, adjust your config to point to an existing file, then re-invoke the Dev agent with task `{task_id}`.
   ```

   If the file exists, set `{prd_loaded}` = `'true'`. PRD content is now in conversation context.

4. **Check architecture file.** Verify whether `data.architecture.path` exists. If it does not exist, emit the following error block and stop:

   ```
   ❌ **Planning artifact missing — architecture.md not found**

   The `clickup-dev-implement` skill could not read the architecture document at the resolved path.

   **Why this is fatal:** The architecture document defines the technical stack, patterns, and constraints the Dev agent must follow.

   - Architecture: <data.architecture.path> [<data.architecture.layer>] — **MISSING**

   **How to override doc paths:**
   1. Per-project (highest priority): add `[docs].architecture_path` to `.bmadmcp/config.toml`
   2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml`
   3. Default (no config needed): place file at `planning-artifacts/architecture.md`

   **What to do:** Add the missing file at the resolved path, adjust your config to point to an existing file, then re-invoke the Dev agent with task `{task_id}`.
   ```

   If the file exists, set `{architecture_loaded}` = `'true'`. Architecture content is now in conversation context.

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
    - PRD: <data.prd.path> [<data.prd.layer>] — loaded
    - Architecture: <data.architecture.path> [<data.architecture.layer>] — loaded
    - Tech spec: `planning-artifacts/tech-spec.md` — {loaded | not found, skipped}
    - Project context: `project-context.md` — {loaded | not found, skipped}

    **Task structure:**
    - Acceptance criteria: {count from task_ac_list, or "derived from PRD" if empty}
    - Tasks/subtasks: {count from task_subtasks, or "none in task description"}
    - Dev notes: {present | absent}

    Proceeding to step 4 (implementation loop).
    ```
