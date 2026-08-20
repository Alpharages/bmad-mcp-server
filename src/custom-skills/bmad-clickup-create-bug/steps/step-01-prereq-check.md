---
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
lore_enabled: ''
lore_project_slug: ''
lore_project_context: ''
---

# Step 1: Prereq Check

## RULES

- `CLICKUP_MCP_MODE=write` is required. If `createTask` is not in the available tool list, stop immediately.
- Verify authentication by calling `pickSpace` directly — do NOT run shell commands (`printenv`, `env`, etc.) to check for env vars. ClickUp credentials live in the MCP server process, not in the shell.
- PRD, architecture, and epics are **soft-loaded** — the skill warns when they are absent but does **not abort**. Missing planning artifacts never block bug creation.
- **Doc-path resolution is client-side.** Resolve PRD / architecture / epics paths yourself against the client project root (your current working directory) using the cascade in instruction 1. Do NOT call `bmad({ operation: 'resolve-doc-paths' })` — the MCP server may be remote and cannot see this project's files. All file reads (`.bmadmcp/config.toml`, the BMAD config chain, the planning docs themselves) are performed by you against the local filesystem.

## Permission Gate

Run these two checks in order. If either fails, emit the corresponding error block and stop the entire skill run immediately.

1. **Verify write mode.** Check whether `createTask` is available in the current tool list. If it is absent (mode is `read-minimal` or `read`), emit the mode error block below and stop.

2. **Verify token authentication.** Call `pickSpace` with no arguments. If the response contains an authentication error (response text contains `401`, `Unauthorized`, or `invalid token`, or zero spaces are returned alongside an error indicator), emit the token error block below and stop.

3. **Confirm success.** If both checks pass, report to the user:

   > ✅ Permission gate passed — write mode active, token authenticated.

   Capture this line **verbatim** in the Dev Agent Record. Then continue to `## INSTRUCTIONS`.

### Mode error block

> ❌ **Permission gate failed — write mode required**
>
> The `bmad-clickup-create-bug` skill requires `CLICKUP_MCP_MODE=write`. The current mode does not register `createTask`, so ticket creation is impossible.
>
> **What to do:** Set `CLICKUP_MCP_MODE=write` in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings) and restart, then re-invoke the skill.

### Token error block

> ❌ **Permission gate failed — ClickUp authentication failed**
>
> `pickSpace` returned an authentication error. The `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` in the MCP server config may be invalid or expired.
>
> **What to do:** Update the credentials in the `bmad-mcp-server` env config (whichever name you gave it in your MCP client settings), restart the MCP server, then re-invoke the skill.

## INSTRUCTIONS

1. **Resolve doc paths yourself (client-side cascade).** Run the cascade below against the **client project root** — your current working directory, the project you are operating in, NOT the MCP server's filesystem. Resolve the three keys `prd`, `architecture`, and `epics` **independently and per-key** (first match wins for each key — preserve the full chain; do NOT collapse it to a single `.bmadmcp/config.toml [docs]` read). Treat relative paths as relative to the project root (join them); absolute paths are used as-is. Collect any malformed/wrong-type config warnings into `{warnings}`.

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

2. **Emit cascade warnings.** If `{warnings}` is non-empty, emit each warning to the user as a `⚠️`-prefixed line before proceeding.

3. **Soft-load PRD.** Attempt to read `{prd_info.path}`:
   - If present: load into `{prd_content}`, set `{prd_present}` = `present`.
   - If absent: set `{prd_content}` = `''`, set `{prd_present}` = `missing`, and emit:

     > ⚠️ PRD not found at `<prd_info.path>` [`<prd_info.layer>`] — proceeding without PRD context. Bug description will be based on the user's report only.

     The skill MUST NOT stop.

4. **Soft-load architecture.** Attempt to read `{arch_info.path}`:
   - If present: load into `{architecture_content}`, set `{arch_present}` = `present`.
   - If absent: set `{architecture_content}` = `''`, set `{arch_present}` = `missing`, and emit:

     > ⚠️ Architecture doc not found at `<arch_info.path>` [`<arch_info.layer>`] — proceeding without architecture context.

     The skill MUST NOT stop.

5. **Soft-load epics.** Use `{epics_info.path}` from the resolver result:
   - **If the path ends with `.md` (single file):** attempt to read it directly → `{epics_content}`.
   - **Otherwise (directory path):** list and read all `EPIC-*.md` files inside the directory, concatenate them with `---` separators → `{epics_content}`.
   - If the path does not exist or yields no files: set `{epics_content}` = `''` and emit:

     > ⚠️ Epics path not found at `<epics_info.path>` [`<epics_info.layer>`] — story detail will be derived from bug report only.

     The skill MUST NOT stop.

6. **Detect GitNexus availability.** Check whether the project has a GitNexus index by looking for `.gitnexus/meta.json` in the project root (or by testing whether the `gitnexus_query` / `query` tool is available). Set `{gitnexus_available}`:
   - If found / available → `true`. Emit: `🔍 GitNexus index detected — code investigation will use knowledge-graph queries.`
   - If not found / unavailable → `false`. Emit: `ℹ️ GitNexus not detected — code investigation will fall back to file search and grep.`

   This is a non-blocking check; the skill proceeds regardless.

7. **Query Lore for current project context (optional).**

   Read `lore.yaml` from the project root.

   - Missing, unparseable, or no `project.slug` → set `{lore_enabled}` = `'false'`, `{lore_project_context}` = `''`, and skip the rest of this instruction **silently**. Do NOT emit a warning — Lore is optional and most projects do not have it. Everything else in this step continues exactly as it does today.
   - Present with `project.slug` → set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

   **Lore-enabled path only.** Call `query_project_context` on the `lore-memory-{lore_project_slug}` MCP server:

   - `query`: `current requirements and constraints — bug triage`
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

8. **Confirm and continue.** Report to the user:

   ```
   ✅ Prereq check complete:
   - PRD:          <prd_info.path> [<prd_info.layer>] — <present|missing>
   - Architecture: <arch_info.path> [<arch_info.layer>] — <present|missing>
   - Epics:        <epics_info.path> [<epics_info.layer>] — <found N file(s)|not found>
   - GitNexus:     <available|not available>
   ```

   Then proceed to the next step regardless of which soft-load slots are empty.

## NEXT

Proceed to [step-02-list-picker.md](./step-02-list-picker.md). The permission-gate verbatim message, `{prd_content}` / `{architecture_content}` / `{epics_content}`, `{lore_project_context}`, and the full `{resolve_doc_paths_result}` (including resolved paths and their layers) are available to all downstream steps.
