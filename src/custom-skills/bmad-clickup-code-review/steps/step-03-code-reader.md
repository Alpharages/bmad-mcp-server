---
branch_name: ''
commit_list: ''
changed_files: ''
diff_loaded: 'false'
resolve_doc_paths_result: ''
---

# Step 3: Code Reader

## RULES

1. **Read-only.** This step uses shell commands and IDE Read tools only. No writes.
2. **Must-locate-changes.** If no commits or changed files can be found, emit the no-changes error block and stop. A review with no code to examine is meaningless.
3. **Scope limit.** Read only the files that changed — do not read the entire repo. For files larger than 500 lines, read only the changed sections (use `git diff` output to identify them).
4. **Planning artifacts are non-fatal.** PRD and architecture paths are resolved **client-side** by you against the client project root using the 3-layer cascade (`.bmadmcp/config.toml [docs]` → BMAD `_bmad/config.toml` chain → `planning-artifacts/` default) in section 5. If either resolved file is absent, emit the cascade-layer-aware warning and continue — the review proceeds with task-description context only.
5. **Doc-path resolution is client-side.** Run the cascade in section 5 yourself against the client project root (your current working directory). Do NOT call `bmad({ operation: 'resolve-doc-paths' })` — the MCP server may be remote and cannot see this project's files. All file reads (`.bmadmcp/config.toml`, the BMAD config chain, the planning docs themselves) are performed by you against the local filesystem.

## INSTRUCTIONS

### 1. Identify the branch and commits

Run `git branch --show-current` to get `{branch_name}`.

Run `git log --oneline -20` to list recent commits. Search for any commits referencing `{task_id}` or `{task_name}` (case-insensitive) in the commit message. If found, note them as directly related. Store the commit list (all 20 entries) as `{commit_list}`.

### 2. Identify changed files

Run `git diff main...HEAD --name-status` (or `git diff origin/main...HEAD --name-status` if `main` is not local). If that produces no output, fall back to `git diff HEAD~1 --name-status`.

Store the result as `{changed_files}`. If still empty after both attempts, emit the no-changes error block and stop.

### 3. Read the diff

Run `git diff main...HEAD` (or the same fallback as above). This is the primary review artifact — it must be read fully into conversation context. Set `{diff_loaded}` = `'true'`.

### 4. Read changed source files

For each file in `{changed_files}` (status `M` or `A`):

- If the file exists and is ≤ 500 lines, read it in full.
- If the file is > 500 lines, read only the sections identified in the diff (use line numbers from `git diff` output).
- Skip deleted files (status `D`) — the diff is sufficient.
- Skip binary files, lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`), and generated build output.

### 5. Load planning artifacts

**Resolve doc paths yourself (client-side cascade).** Run the cascade below against the **client project root** — your current working directory, the project you are operating in, NOT the MCP server's filesystem. Resolve the keys `prd`, `architecture`, and `epics` **independently and per-key** (first match wins for each key — preserve the full chain; do NOT collapse it to a single `.bmadmcp/config.toml [docs]` read). Treat relative paths as relative to the project root (join them); absolute paths are used as-is. Collect any malformed/wrong-type config warnings into `{warnings}`.

Default filenames per key: `prd` → `PRD.md`, `architecture` → `architecture.md`, `epics` → `epics/` (a directory — keep the trailing slash).

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

Store the result as `{resolve_doc_paths_result}` — an object with `prd`, `architecture`, `epics` (each `{ path, layer }`) plus `warnings`. Extract from `data`:

- `data.prd` → `{prd_info}` (contains `.path` and `.layer`)
- `data.architecture` → `{arch_info}` (contains `.path` and `.layer`)
- `data.warnings` → `{warnings}`

**Emit cascade warnings first.** If `data.warnings` is non-empty, emit each warning as a `⚠️`-prefixed line before proceeding to check whether files exist at the resolved paths.

**Check file existence at resolved paths.**

- Check `{prd_info.path}`. If the file exists, load it into conversation context. If absent, emit (non-fatal) and continue:

  > ⚠️ **Planning artifact missing — review context reduced**
  >
  > `<data.prd.path>` [`<data.prd.layer>`] was not found. The review will proceed without it, but acceptance-criteria and design-conformance checks will be limited to the task description only.
  >
  > **How to configure doc paths:**
  >
  > 1. Per-project (highest priority): add `[docs].prd_path` / `[docs].architecture_path` to `.bmadmcp/config.toml`
  > 2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml`
  > 3. Default (no config needed): place file at `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md`

- Check `{arch_info.path}`. If the file exists, load it into conversation context. If absent, emit (non-fatal) and continue:

  > ⚠️ **Planning artifact missing — review context reduced**
  >
  > `<data.architecture.path>` [`<data.architecture.layer>`] was not found. The review will proceed without it, but acceptance-criteria and design-conformance checks will be limited to the task description only.
  >
  > **How to configure doc paths:**
  >
  > 1. Per-project (highest priority): add `[docs].prd_path` / `[docs].architecture_path` to `.bmadmcp/config.toml`
  > 2. BMAD-config: set `[bmm].planning_artifacts` in `_bmad/config.toml`
  > 3. Default (no config needed): place file at `planning-artifacts/PRD.md` / `planning-artifacts/architecture.md`

Layer tags MUST be exactly the resolver strings: `bmadmcp-config`, `bmad-config`, or `default`.

### 6. Confirm and continue

Emit the success summary block and continue to step 4.

```
✅ **Code reader complete**

- **Branch:** {branch_name}
- **Changed files:** {changed_files}
- **Diff loaded:** yes
- **Planning artifacts:**
  - PRD: <data.prd.path> [<data.prd.layer>] — loaded / not found
  - Architecture: <data.architecture.path> [<data.architecture.layer>] — loaded / not found

Proceeding to step 4 (review execution).
```

### Error block — no changes found

```
❌ **Code reader failed — no changed files found**

The `bmad-clickup-code-review` skill could not find any code changes to review.

**Tried:**
- `git diff main...HEAD --name-status`
- `git diff HEAD~1 --name-status`

**Possible causes:**
- The implementation branch has not been pushed or the branch name does not follow convention.
- The task was implemented directly on `main` with no separate branch.
- The working directory is not the correct repository for this task.

**What to do:** Ensure you are in the correct project directory and that the implementation commits exist, then re-invoke the skill.
```
