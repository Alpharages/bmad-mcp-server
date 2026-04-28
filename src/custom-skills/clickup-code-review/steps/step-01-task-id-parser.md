---
task_id: ''
raw_input: ''
---

# Step 1: Task-ID Parser

## RULES

1. **Read-only step.** Pure parsing only — no file writes, no ClickUp API calls.
2. **Must-complete.** If parsing fails with an unrecognisable input, emit the standard error block below and stop.
3. **Normalisation contract.** `{task_id}` MUST be a non-empty alphanumeric string by the time this step completes.

## PREFLIGHT

**Origin PAT-prefix preflight.** Run `git remote -v` and grep the output for the GitHub-PAT prefix pattern (`ghp_`, `github_pat_`, `ghs_`, `ghu_`, `ghr_`). If any remote URL embeds a PAT prefix, emit the PAT error block below and stop.

> ❌ **Origin PAT-prefix preflight failed — token leak in remote URL**
>
> The `clickup-code-review` skill found a GitHub Personal Access Token prefix embedded in `git remote -v` output for the current repo. Continuing would mean every subsequent `git push` reads the leaked token.
>
> **What to do:**
>
> 1. Rewrite the remote: `git remote set-url origin <clean-url>` (HTTPS without token, or SSH `git@github.com:OWNER/REPO.git`).
> 2. Rotate the leaked PAT in GitHub Settings → Developer settings → Personal access tokens.
> 3. Re-invoke the skill once `git remote -v` is clean.

## INSTRUCTIONS

1. Read the raw task-identifier string supplied by the user and record it as `{raw_input}`.
2. Detect and handle **URL form** — if the input contains `app.clickup.com`, strip any query string and fragment, then extract the last non-empty path segment.
   - Example: `https://app.clickup.com/t/86abc123` → `86abc123`
   - Example: `https://app.clickup.com/t/86abc123?comment=99abc` → `86abc123`
3. Detect and handle **`CU-` prefix form** — if the input starts with `CU-` (case-insensitive), strip the prefix.
   - Example: `CU-86abc123` → `86abc123`
4. Otherwise treat the input as a **bare ID** and use it as-is.
5. Validate the result is a non-empty alphanumeric string. If validation fails, emit the error block and stop:

   ```
   ❌ **Task-ID parse failed — unrecognisable input**

   The `clickup-code-review` skill could not extract a ClickUp task ID from the input you provided.

   **Input received:** `{raw_input}`

   **Accepted formats:**
   - Bare task ID: `86abc123`
   - Full URL: `https://app.clickup.com/t/86abc123`
   - CU-prefixed: `CU-86abc123`

   **What to do:** Re-invoke the skill with a valid ClickUp task ID in one of the accepted formats above.
   ```

6. Store the normalised bare ID in `{task_id}`.
7. Confirm `✅ Task ID parsed: \`{task_id}\`` and continue to step 2.
