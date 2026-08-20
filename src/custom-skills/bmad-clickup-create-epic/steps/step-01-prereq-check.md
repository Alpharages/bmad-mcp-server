---
resolve_doc_paths_result: ''
warnings: ''
prd_content: ''
architecture_content: ''
epics_content: ''
---

# Step 1: Prereq Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- If any required file is missing, **stop the entire skill run immediately**. Do not proceed to step 2.

## Permission Gate

1. **Verify write mode.** Check whether `createTask` is available in the current tool list. If it is absent, emit the mode error block below and stop.

2. **Verify token authentication.** Call `pickSpace` with no arguments. If the response contains an authentication error (response text contains `401`, `Unauthorized`, or `invalid token`, or zero spaces are returned alongside an error indicator), emit the token error block below and stop.

3. **Confirm success.** If both checks pass, report to the user:

   > ✅ Permission gate passed — write mode active, token authenticated.

   Then continue to `## INSTRUCTIONS

4. **Resolve doc paths yourself (client-side cascade).** Run the cascade below against the **client project root** — your current working directory, the project you are operating in, NOT the MCP server's filesystem. Resolve the three keys `prd`, `architecture`, and `epics` **independently and per-key** (first match wins for each key — preserve the full chain; do NOT collapse it to a single `.bmadmcp/config.toml [docs]` read). Treat relative paths as relative to the project root (join them); absolute paths are used as-is. Collect any malformed/wrong-type config warnings into `{warnings}`.

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

   Store the result as `{resolve_doc_paths_result}` — an object with `prd`, `architecture`, `epics` (each `{ path, layer }`) plus `warnings`. Extract `data.prd` → `{prd_info}`, `data.architecture` → `{arch_info}`, `data.epics` → `{epics_info}`, `data.warnings` → `{warnings}`.

5. **Emit cascade warnings.** If `{warnings}` is non-empty, emit each warning to the user as a `⚠️`-prefixed line before proceeding.

6. **Check the three required inputs at their resolved paths.** All three remain required for epic creation — the epic description is composed from PRD and architecture context, and the epics artifact is what the user picks an epic from. What changed in BMAD 6.11 is only _where_ they are found: the cascade above, not a hardcoded `planning-artifacts/`.
   - PRD → `{prd_info.path}`. Set `{prd_present}` = `present` or `**MISSING**`.
   - Architecture → `{arch_info.path}`. Set `{arch_present}` accordingly.
   - Epics → `{epics_info.path}`. This key resolves to a **directory** by default (`epics/`). Treat it as present when:
     - the path is a directory containing at least one `*.md` file, **or**
     - the path is an existing file (a single-file epics artifact, e.g. an explicitly configured `epics_path = "docs/epics-and-stories.md"`), **or**
     - the path is a directory that does not exist but a sibling single-file artifact does — check `<planning dir>/epics-and-stories.md` and `<planning dir>/epics.md` in that order, and adopt the first that exists as `{epics_info.path}`.

     Set `{epics_present}` accordingly.

7. **If any input is missing, emit the following error block and stop:**

   ```
   ❌ **Prereq check failed — missing required input(s)**

   The `bmad-clickup-create-epic` skill requires the following, resolved through the doc-path cascade:

   - PRD: `{prd_info.path}` [{prd_info.layer}] — {prd_present}
   - Architecture: `{arch_info.path}` [{arch_info.layer}] — {arch_present}
   - Epics: `{epics_info.path}` [{epics_info.layer}] — {epics_present}

   **Why:** The epic description is composed from PRD and architecture context. The epics artifact is used to pick which epic to create.

   **What to do:** Either add the missing input(s) at the paths above, or point the resolver at where they actually live:

   1. `.bmadmcp/config.toml` `[docs]` — set `prd_path`, `architecture_path`, or `epics_path` (highest priority; per-key).
   2. BMAD config chain — set `[bmm].planning_artifacts` in `_bmad/config.toml` (or its `.user` / `custom` overrides).
   3. Default — `{project-root}/planning-artifacts/`.

   Then re-invoke the skill.
   ```

8. **Load the three inputs.** Read PRD and architecture into `{prd_content}` and `{architecture_content}`.

   For the epics artifact, read into `{epics_content}`:
   - **Directory** → read every `*.md` file beneath it, in sorted filename order, each preceded by a `=== <filename> ===` marker so step 3 can attribute each epic to its source file.
   - **Single file** → read it directly.

9. **Query Lore for current project context (optional).**

   Read `lore.yaml` from the project root.

   - Missing, unparseable, or no `project.slug` → set `{lore_enabled}` = `'false'`, `{lore_project_context}` = `''`, and skip the rest of this instruction **silently**. Do NOT emit a warning — Lore is optional and most projects do not have it. Everything else in this step continues exactly as it does today.
   - Present with `project.slug` → set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

   **Lore-enabled path only.** Call `query_project_context` on the `lore-memory-{lore_project_slug}` MCP server:

   - `query`: `current requirements, constraints, and recent decisions — epic planning`
   - `limit`: `10`

   Best-effort — if the tool is not registered in this session (Lore builds without the Project Evolution surface do not expose it) or the call fails for any reason, set `{lore_project_context}` = `''`, emit the single line `WARNING: Lore configured but project context unavailable — continuing with planning docs only.` and continue. Do NOT halt.

   On success, store the returned items in `{lore_project_context}` and surface them inline:

   ```
   Current project context (from Lore):

   {for each item:}
     - <type>: <statement> [<status>] — <why it matched>
       (evidence: <source>, item_id: <id>)
   {end}
   ```

   **Precedence.** Accepted Lore items are the project's *current* truth; planning docs may be stale. Where an accepted item contradicts a planning doc, prefer the Lore item downstream and say so once — `⚠️ <doc statement> superseded by Lore item <id>`. Lore never substitutes for a planning doc: the doc checks in this step still apply unchanged.

10. **Confirm and continue.** Report the resolved paths and their cascade layers to the user, then proceed to the next step:

   ```
   ✅ Prereq check passed.
      PRD: {prd_info.path} [{prd_info.layer}]
      Architecture: {arch_info.path} [{arch_info.layer}]
      Epics: {epics_info.path} [{epics_info.layer}]
   ```

## NEXT

Proceed to [step-02-backlog-list-picker.md](./step-02-backlog-list-picker.md). The permission-gate verbatim message, `{resolve_doc_paths_result}` (with `{prd_info}`, `{arch_info}`, `{epics_info}`), the loaded `{prd_content}` / `{architecture_content}` / `{epics_content}`, and `{lore_project_context}` are available to all downstream steps.
