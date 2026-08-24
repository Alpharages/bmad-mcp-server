---
ai_qa_notes: ''
human_qa_notes: ''
acceptance_criteria: ''
prd_loaded: ''
architecture_loaded: ''
branch_name: ''
commit_list: ''
changed_files: ''
run_code_pass: ''
run_visual_pass: ''
lore_enabled: ''
lore_project_slug: ''
lore_query_executed: ''
lore_consulted_lesson_ids: ''
---

# Step 3: QA Notes Extraction

> **Inherited context:** `{task_id}`, `{task_name}`, `{task_url}`, `{task_description}`, and `{epic_name}` are available. The full task description is already in conversation context from step 2 — extract from it; do not re-fetch.

## RULES

1. **Read-only.** No ClickUp writes. Git and file reads only.
2. **Section-variant tolerant.** ClickUp descriptions are author-edited; match headings case-insensitively and accept the documented variants. Extract the section body verbatim (everything under the heading until the next `##`-level heading or end of document).
3. **At least one source required.** If NEITHER QA section NOR an acceptance-criteria section can be found, emit the no-QA-source error block and stop — there is nothing to QA against.
4. **Best-effort artifacts.** PRD/architecture resolution is for AC cross-reference only. Missing artifacts are non-fatal: set the corresponding `_loaded` flag to `'false'` and continue.
5. **Best-effort git.** Git context enriches the code pass. If the repo has no commits referencing this task, leave `{commit_list}`/`{changed_files}` as `''` and continue — the code pass falls back to whole-repo tracing.

## INSTRUCTIONS

### 1. Extract the QA sections and acceptance criteria

From the task description in context, extract:

- **`{ai_qa_notes}`** ← the `## QA / Testing Notes` section body. Variants: `## QA Notes`, `## Testing Notes`, `## Test Cases`. Empty string if no matching heading.
- **`{human_qa_notes}`** ← the `## Human QA Notes` section body. Variants: `## Manual QA Notes`, `## Human Testing Notes`. Empty string if no matching heading.
- **`{acceptance_criteria}`** ← the `## Acceptance Criteria` section body. Variants: `## Acceptance Criteria (BDD)`, `## ACs`. Empty string if no matching heading.

If `{ai_qa_notes}`, `{human_qa_notes}`, AND `{acceptance_criteria}` are all empty, emit the no-QA-source error block and stop:

```
❌ **No QA source found — cannot run QA**

The `bmad-clickup-qa` skill found neither a "## QA / Testing Notes" section, a "## Human QA Notes" section, nor an "## Acceptance Criteria" section in task `{task_id}` ({task_name}).

**What to do:** This task was likely not created via `bmad-clickup-create-story` (which writes these sections), or the description was edited to remove them. Add the QA sections / acceptance criteria to the ClickUp task, or re-create the story with `bmad-clickup-create-story`, then re-invoke QA.
```

### 2. Resolve planning artifacts (client-side, best-effort)

Resolve PRD and architecture paths against the client project root using the 3-layer cascade — `{project-root}/.bmadmcp/config.toml [docs]` → the BMAD `{project-root}/_bmad/config.toml` chain → `{project-root}/planning-artifacts/` default. Resolve client-side (read the files yourself); do NOT call a server tool — the MCP server may be remote and cannot see the project's files.

- If the PRD resolves and exists, read it and set `{prd_loaded}` = `'true'`; otherwise `'false'`.
- If the architecture doc resolves and exists, read it and set `{architecture_loaded}` = `'true'`; otherwise `'false'`.

These provide requirement context for judging whether an acceptance criterion is genuinely satisfied. Their absence only reduces context — it never blocks QA.

### 3. Gather git context for the code pass

Best-effort, all non-fatal:

- `{branch_name}` ← current branch (`git rev-parse --abbrev-ref HEAD`).
- `{commit_list}` ← commits whose message references `{task_id}`, `{task_name}`, or the story key (search `git log --oneline`). If none match, leave `''`.
- `{changed_files}` ← files touched by those commits (`git show --stat` / `git diff --name-only`), or the working-tree diff against the main branch if commits can't be pinned. If indeterminate, leave `''` — step 4 then traces from the acceptance criteria across the whole repo.

### 4. Decide which passes run

- `{run_code_pass}` = `'true'` if `{ai_qa_notes}` is non-empty OR `{acceptance_criteria}` is non-empty (the code pass can derive scenarios from ACs when explicit QA notes are absent). Otherwise `'false'`.
- `{run_visual_pass}` = `'true'` if `{human_qa_notes}` is non-empty. If it is empty but `{acceptance_criteria}` is non-empty, set `'true'` anyway and note that step 5 will derive a minimal black-box smoke check from the ACs. Otherwise `'false'`.

### 5. Query Lore for relevant prior lessons (optional)

Recalling what previous QA, dev, and review sessions learned is the highest-leverage context for QA — prior failures point straight at where defects recur. Best-effort and non-blocking throughout.

1. **Detect Lore configuration.** Read `lore.yaml` from the project root via the Read tool.
   - If it does not exist, cannot be parsed as YAML, or lacks `project.slug`: set `{lore_enabled}` = `'false'`, `{lore_project_slug}` = `''`, `{lore_query_executed}` = `'false'`, `{lore_consulted_lesson_ids}` = `''`, and skip the rest of this section **silently** (Lore is optional; most projects won't have it). Proceed to instruction 6.
   - If `project.slug` is set: set `{lore_enabled}` = `'true'`, `{lore_project_slug}` = the slug value.

2. **Recall lessons (Lore-enabled path only).** Call `query_lessons_for_task` on the `lore-memory-{lore_project_slug}` MCP server for `{task_id}`. Best-effort — if the tool is not registered or the call fails, set `{lore_query_executed}` = `'false'`, `{lore_consulted_lesson_ids}` = `''`, emit a single-line `WARNING: Lore configured but MCP server lore-memory-{lore_project_slug} unreachable — continuing without lessons.`, and proceed. Do NOT halt or fall back to another project's Lore server.

3. **Surface to steer both passes.** Set `{lore_query_executed}` = `'true'` and extract lesson IDs into `{lore_consulted_lesson_ids}` (comma-separated). If the result is non-empty, surface the lessons inline so steps 4 and 5 weight their checklists toward these known failure patterns:

   ```
   🧠 Prior lessons relevant to this task (from Lore):
   {for each lesson:}
     - {content}  (lesson_id: <uuid>, type: <type>, relevance: <score>)

   The code-access and visual QA passes SHOULD treat these as priority checks — verify the described defect class did not recur.
   ```

   If the result is empty, emit nothing and continue (the common case until the corpus grows).

### 6. Emit the readiness summary

```
🔎 **QA inputs resolved for `{task_id}` ({task_name})**

- QA / Testing Notes (code pass): {present ✓ | absent — will derive from ACs | absent}
- Human QA Notes (visual pass): {present ✓ | absent — will derive smoke check from ACs | absent}
- Acceptance Criteria: {present ✓ | absent}
- Planning artifacts: PRD {loaded ✓ | not found}, Architecture {loaded ✓ | not found}
- Git context: branch `{branch_name}`, {N commits / no task-linked commits found}, {M changed files / files indeterminate}
- Prior Lore lessons: {K recalled — will be treated as priority checks | none | Lore not configured}
- Passes to run: code-access {yes/no}, visual {yes/no}

Proceeding to step 4 (code-access QA pass).
```

## NEXT

Proceed to [step-04-ai-qa-pass.md](./step-04-ai-qa-pass.md).
