---
task_id: ''
raw_input: ''
supplied_base_url: ''
---

# Step 1: Task-ID Parser

## RULES

1. **Read-only step.** Pure parsing only — no file writes, no ClickUp API calls.
2. **Must-complete.** If parsing fails with an unrecognisable input, emit the standard error block below and stop.
3. **Normalisation contract.** `{task_id}` MUST be a non-empty alphanumeric string by the time this step completes. `{supplied_base_url}` is `''` unless the user explicitly provided a base URL.

## PREFLIGHT

**Origin PAT-prefix preflight.** Run `git remote -v` and grep the output for the GitHub-PAT prefix pattern (`ghp_`, `github_pat_`, `ghs_`, `ghu_`, `ghr_`). If any remote URL embeds a PAT prefix, emit the PAT error block below and stop. The code-access QA pass reads from git; a leaked token in the remote should be surfaced and rotated before any further git operations.

> ❌ **Origin PAT-prefix preflight failed — token leak in remote URL**
>
> The `clickup-qa` skill found a GitHub Personal Access Token prefix embedded in `git remote -v` output for the current repo.
>
> **What to do:**
>
> 1. Rewrite the remote: `git remote set-url origin <clean-url>` (HTTPS without token, or SSH `git@github.com:OWNER/REPO.git`).
> 2. Rotate the leaked PAT in GitHub Settings → Developer settings → Personal access tokens.
> 3. Re-invoke the skill once `git remote -v` is clean.

## INSTRUCTIONS

1. Read the raw invocation string supplied by the user and record it as `{raw_input}`.
2. **Detect an optional base URL.** If the invocation contains a second token that is an `http://` or `https://` URL (e.g. `qa 86abc123 http://localhost:3000`), record it as `{supplied_base_url}` and remove it from the string before task-ID parsing. Otherwise set `{supplied_base_url}` = `''`. A bare ClickUp app URL (`app.clickup.com/...`) is the task identifier, NOT a base URL — do not treat it as `{supplied_base_url}`.
3. Detect and handle **URL form** — if the remaining input contains `app.clickup.com`, strip any query string and fragment, then extract the last non-empty path segment.
   - Example: `https://app.clickup.com/t/86abc123` → `86abc123`
   - Example: `https://app.clickup.com/t/86abc123?comment=99abc` → `86abc123`
4. Detect and handle **`CU-` prefix form** — if the input starts with `CU-` (case-insensitive), strip the prefix.
5. Otherwise treat the input as a **bare ID** and use it as-is.
6. Validate the result is a non-empty alphanumeric string. If validation fails, emit the error block and stop:

   ```
   ❌ **Task-ID parse failed — unrecognisable input**

   The `clickup-qa` skill could not extract a ClickUp task ID from the input you provided.

   **Input received:** `{raw_input}`

   **Accepted formats:**
   - Bare task ID: `86abc123`
   - Full URL: `https://app.clickup.com/t/86abc123`
   - CU-prefixed: `CU-86abc123`
   - With a base URL for the visual pass: `86abc123 http://localhost:3000`

   **What to do:** Re-invoke the skill with a valid ClickUp task ID in one of the accepted formats above.
   ```

7. Store the normalised bare ID in `{task_id}`.
8. Confirm `✅ Task ID parsed: \`{task_id}\`` (and `— base URL: {supplied_base_url}` if non-empty) and continue to step 2.
