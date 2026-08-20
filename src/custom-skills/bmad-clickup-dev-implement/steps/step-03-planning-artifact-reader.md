---
prd_loaded: ''
architecture_loaded: ''
tech_spec_loaded: ''
project_context_loaded: ''
task_ac_list: ''
task_subtasks: ''
resolve_doc_paths_result: ''
lore_enabled: ''
lore_project_slug: ''
lore_query_executed: ''
lore_consulted_lesson_ids: ''
---

# Step 3: Planning Artifact Reader & Context Builder

## RULES

1. **Read-only:** This step uses the IDE's native Read file tool only. No ClickUp API calls are made in this step. No files are written or modified.
2. **PRD required:** If the file at `data.prd.path` (resolved by `resolve-doc-paths`) is missing or cannot be read, emit the PRD-not-found error block and **stop** — do not proceed to step 4 (implementation loop).
3. **Architecture required:** If the file at `data.architecture.path` (resolved by `resolve-doc-paths`) is missing or cannot be read, emit the architecture-not-found error block and **stop** — do not proceed to step 4 (implementation loop).
4. **Tech-spec best-effort:** If `planning-artifacts/tech-spec.md` is absent, set `{tech_spec_loaded}` = `'false'` and **continue**.
5. **project-context best-effort:** If `project-context.md` is absent, set `{project_context_loaded}` = `'false'` and **continue**.
6. **Contract:** `{prd_loaded}` and `{architecture_loaded}` MUST be `'true'` by the time this step completes.
7. **Doc-path resolution is client-side.** Resolve the PRD and architecture paths yourself against the client project root (your current working directory) using the cascade in instruction 1. Do NOT call `bmad({ operation: 'resolve-doc-paths' })` — the MCP server may be remote and cannot see this project's files. All file reads (`.bmadmcp/config.toml`, the BMAD config chain, the planning docs themselves) are performed by you against the local filesystem.

## INSTRUCTIONS

### Load planning artifacts

1. **Resolve doc paths yourself (client-side cascade).** Run the cascade below against the **client project root** — your current working directory, the project you are operating in, NOT the MCP server's filesystem. Resolve the keys `prd`, `architecture`, and `epics` **independently and per-key** (first match wins for each key — preserve the full chain; do NOT collapse it to a single `.bmadmcp/config.toml [docs]` read). Treat relative paths as relative to the project root (join them); absolute paths are used as-is. Collect any malformed/wrong-type config warnings into `data.warnings`.

   Default filenames per key: `prd` → `PRD.md`, `architecture` → `architecture.md`, `epics` → `epics/` (a directory — keep the trailing slash). Layer tags MUST be exactly the resolver strings: `bmadmcp-config`, `bmad-config`, or `default`.
   - **Layer 1 — `{root}/.bmadmcp/config.toml` `[docs]` table.** Read `{root}/.bmadmcp/config.toml`.
     - Absent → skip this layer.
     - Present but not valid TOML → add warning `<path>: malformed TOML — <reason>; falling back to BMAD / default for all doc paths`, then skip this layer.
     - Parses with a `[docs]` table:
       - **Per-key path settings** (`prd_path`, `architecture_path`, `epics_path`): for each key, if the setting is present but is **not** a non-empty string, add warning `<path> [docs].<setting>: expected non-empty string, got <type>; ignoring this layer for key '<key>'` (emit this even if `planning_dir` later fills the key). If it is a non-empty string, resolve that key to its path with layer `bmadmcp-config`.
       - **`planning_dir`** (base dir for any key still unresolved): if it is a non-empty string, resolve each still-unset key to `<planning_dir>/<default filename>` with layer `bmadmcp-config`. If `planning_dir` is present but not a non-empty string, add warning `<path> [docs].planning_dir: expected non-empty string, got <type>; ignoring this layer`.
   - **Layer 2 — BMAD config chain** (unresolved keys only). Choose the BMAD dir: use `{root}/bmad` if `{root}/bmad/config.toml` exists, else `{root}/_bmad` if `{root}/_bmad/config.toml` exists, else skip this layer. Merge the `[bmm]` table across these four files **in order**, later overriding earlier (deep-merge tables; replace scalars/arrays); skip any missing file, and for a malformed file add warning `<path>: malformed TOML — <reason>; skipping this BMAD config layer` and skip just that file:
     1. `<bmaddir>/config.toml`
     2. `<bmaddir>/config.user.toml`
     3. `<bmaddir>/custom/config.toml`
     4. `<bmaddir>/custom/config.user.toml`

     From the merged `[bmm]`, read `planning_artifacts`. If it is a non-empty string, resolve each still-unset key to `<planning_artifacts>/<default filename>` with layer `bmad-config`. If `planning_artifacts` is present but not a non-empty string, add warning `<bmaddir>/config.toml chain [bmm].planning_artifacts: expected non-empty string, got <type>; falling back to default`.

   - **Layer 3 — default** (remaining keys): resolve to `{root}/planning-artifacts/<default filename>` with layer `default`.

   Store the result as `{resolve_doc_paths_result}` — an object with `prd`, `architecture`, `epics` (each `{ path, layer }`) plus `warnings`. Extract:
   - `data.prd` → contains `.path` and `.layer`
   - `data.architecture` → contains `.path` and `.layer`
   - `data.warnings` → array of warning strings

2. **Emit cascade warnings.** If `data.warnings` is non-empty, emit each warning to the user as a `⚠️`-prefixed line before proceeding.

3. **Check PRD file.** Verify whether `data.prd.path` exists. If it does not exist, emit the following error block and stop:

   ```
   ❌ **Planning artifact missing — PRD.md not found**

   The `bmad-clickup-dev-implement` skill could not read the PRD at the resolved path.

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

   The `bmad-clickup-dev-implement` skill could not read the architecture document at the resolved path.

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

### Query Lore for relevant prior lessons (optional)

10. **Detect Lore configuration.** Attempt to read `lore.yaml` from the project root via the Read tool.
    - If the file does not exist OR cannot be parsed as YAML OR lacks `project.slug`: set `{lore_enabled}` = `'false'`, `{lore_project_slug}` = `''`, `{lore_consulted_lesson_ids}` = `''`. Skip the rest of this section silently and proceed to step 11. Do NOT emit a warning — Lore is optional and most projects won't have it.
    - If the file exists and `project.slug` is set: set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

    **Lore-enabled path only:**

    Call `query_lessons_for_task` on the `lore-memory-{lore_project_slug}` MCP server. Best-effort — if the tool is not registered in this session, or the call fails for any reason, set `{lore_query_executed}` = `'false'`, `{lore_consulted_lesson_ids}` = `''`, emit a single-line WARNING (`WARNING: Lore configured but MCP server lore-memory-{lore_project_slug} unreachable — continuing without lessons.`) and continue. Do NOT halt.

    Tool arguments:
    - `external_task_id`: `{task_id}`
    - `task_context.title`: `{task_name}`
    - `task_context.description`: first 2000 chars of the task description
    - `task_context.acceptance_criteria`: `{task_ac_list}` (or `''` if empty)
    - `task_context.parent_epic_id`: `{epic_task_id}`
    - `limit`: `10`

    On success:
    - Set `{lore_query_executed}` = `'true'`.
    - Extract lesson IDs into `{lore_consulted_lesson_ids}` as a comma-separated string for step 4's linking call.
    - If the result list is non-empty, surface the lessons inline so they steer the implementation loop:

      ```
      Prior lessons relevant to this task (from Lore):

      {for each lesson:}
        - <title> [<severity>] — <prevention rule>
          (lesson_id: <uuid>, relevance: <score>)
      {end}

      The Dev agent SHOULD consult these before/during implementation. Lessons applied during this task will be linked to the task in step 4.
      ```

    - If the result list is empty, emit nothing and continue. (No noise; the absence of lessons is the common case until the corpus grows.)

### Emit success summary

11. Emit the success summary block and continue to step 4.

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
    {if lore_enabled == 'true' AND lore_consulted_lesson_ids is non-empty:}
    - Lore lessons consulted: {count from lore_consulted_lesson_ids}
    {end}

    Proceeding to step 4 (implementation loop).
    ```
