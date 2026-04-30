---
branch_name: ''
commit_list: ''
changed_files: ''
diff_loaded: 'false'
---

# Step 3: Code Reader

## RULES

1. **Read-only.** This step uses shell commands and IDE Read tools only. No writes.
2. **Must-locate-changes.** If no commits or changed files can be found, emit the no-changes error block and stop. A review with no code to examine is meaningless.
3. **Scope limit.** Read only the files that changed — do not read the entire repo. For files larger than 500 lines, read only the changed sections (use `git diff` output to identify them).
4. **Planning artifacts are required.** PRD and architecture must be loaded for acceptance-criteria context. If either is absent, emit a warning (non-fatal) and continue with whatever is available.

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

Resolve `{project-root}` from the current working directory.

Check and load:

- `{project-root}/planning-artifacts/PRD.md` — required for acceptance criteria
- `{project-root}/planning-artifacts/architecture.md` — required for design conformance

If either is missing, emit the missing-artifact warning (non-fatal) and continue with whatever is available.

> ⚠️ **Planning artifact missing — review context reduced**
>
> `{missing_file}` was not found in the project root. The review will proceed without it, but acceptance-criteria and design-conformance checks will be limited to the task description only.

### 6. Confirm and continue

Emit the success summary block and continue to step 4.

```
✅ **Code reader complete**

- **Branch:** {branch_name}
- **Changed files:** {changed_files}
- **Diff loaded:** yes
- **Planning artifacts:** PRD {prd_status}, Architecture {arch_status}

Proceeding to step 4 (review execution).
```

### Error block — no changes found

```
❌ **Code reader failed — no changed files found**

The `clickup-code-review` skill could not find any code changes to review.

**Tried:**
- `git diff main...HEAD --name-status`
- `git diff HEAD~1 --name-status`

**Possible causes:**
- The implementation branch has not been pushed or the branch name does not follow convention.
- The task was implemented directly on `main` with no separate branch.
- The working directory is not the correct repository for this task.

**What to do:** Ensure you are in the correct project directory and that the implementation commits exist, then re-invoke the skill.
```
