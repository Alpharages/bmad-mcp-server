---
task_id: ''
raw_input: ''
---

# Step 1: Task-ID Parser

## RULES

1. **Read-only step.** This step does not write files or call ClickUp APIs — pure parsing only.
2. **Must-complete.** If parsing fails with an unrecognisable input, emit the standard error block below and stop — do not proceed to step 2.
3. **Normalisation contract.** `{task_id}` MUST be a non-empty alphanumeric string by the time this step completes. The bare ID is passed verbatim to `getTaskById` in step 2.

## PREFLIGHT

Run these two checks **before** parsing the task ID. They catch wrong-cwd and origin-PAT-leak conditions that no downstream step otherwise enforces.

0a. **Assert pilot-repo cwd.** Resolve `{cwd}` from `pwd`. Look for a `.bmad-pilot-marker` file at `{cwd}/.bmad-pilot-marker`. If the file is present, read its first line and verify it begins with `bmad-pilot-marker:` (any non-empty value); record `{cwd_assertion}` = `pass`. If the file is absent, emit the cwd error block below and stop.

> ❌ **Cwd assertion failed — not the pilot repo**
>
> The `clickup-dev-implement` skill expects to run with `{cwd}` pointing at the pilot/target repo whose code will be implemented. The current `{cwd}` does not contain a `.bmad-pilot-marker` sentinel file at its root.
>
> **Why:** When Claude Code opens multiple repos in one session, `pwd` can resolve to the bmad-mcp-server repo root rather than the target repo. Implementing under the wrong cwd silently lands changes in the wrong tree.
>
> **What to do:** Either `cd` to the pilot repo before re-invoking the skill, or place a `.bmad-pilot-marker` file at the target repo root (a single line `bmad-pilot-marker: 1` is sufficient; optional `repo:` and `epic:` fields enable stronger assertion).
>
> **Disclosed-deviation escape hatch:** If the dev session must remain at the bmad-mcp-server cwd (e.g. multi-repo Claude Code project) and planning artifacts / source files are loaded via absolute-path `Read` against the pilot-repo files, record the deviation in the Dev Agent Record §Agent Model Used and continue. Story 5-5 used this path under disclosed deviation.

0b. **Origin PAT-prefix preflight.** Run `git remote -v` and grep the output for the GitHub-PAT prefix pattern (`ghp_`, `github_pat_`, `ghs_`, `ghu_`, `ghr_`). If any remote URL embeds a PAT prefix, emit the PAT error block below and stop.

> ❌ **Origin PAT-prefix preflight failed — token leak in remote URL**
>
> The `clickup-dev-implement` skill found a GitHub Personal Access Token prefix embedded in `git remote -v` output for the current repo. Continuing would mean every subsequent `git push` reads the leaked token, and any forked clone of this repo retains it.
>
> **Why:** Embedding `ghp_…` / `github_pat_…` / `ghs_…` / `ghu_…` / `ghr_…` in a remote URL is a credential leak. Story 5-7 added this preflight after story 5-5's `pilot.md` §Known risks bullet 2 surfaced the same gap.
>
> **What to do:**
>
> 1. Rewrite the remote: `git remote set-url origin <clean-url>` (HTTPS without token, or SSH `git@github.com:OWNER/REPO.git`).
> 2. Rotate the leaked PAT in GitHub Settings → Developer settings → Personal access tokens — even if the repo is private, treat any leaked token as compromised.
> 3. Re-invoke the skill once `git remote -v` is clean.

## INSTRUCTIONS

1. Read the raw task-identifier string supplied by the user and record it as `{raw_input}`.
2. Detect and handle **URL form** — if the input contains `app.clickup.com`, strip any query string (from the first `?` onward) and any fragment (from the first `#` onward), then extract the last non-empty path segment after splitting the URL path on `/`.
   - Example: `https://app.clickup.com/t/86abc123` → `86abc123`
   - Example: `https://app.clickup.com/9012345678/v/t/86abc123` → `86abc123`
   - Example: `https://app.clickup.com/t/86abc123?comment=99abc` → `86abc123`
   - Example: `https://app.clickup.com/t/86abc123#overview` → `86abc123`
3. Detect and handle **`CU-` prefix form** — if the input starts with `CU-` (case-insensitive), strip the prefix.
   - Example: `CU-86abc123` → `86abc123`
   - Example: `cu-86abc123` → `86abc123`
4. Otherwise, treat the input as a **bare ID** and use it as-is.
5. Validate the result is a non-empty alphanumeric string (letters and digits only, no spaces or special characters). If the result fails validation, emit the following standard error block and stop:

   ```
   ❌ **Task-ID parse failed — unrecognisable input**

   The `clickup-dev-implement` skill could not extract a ClickUp task ID from the input you provided.

   **Input received:** `{raw_input}`

   **Accepted formats:**
   - Bare task ID: `86abc123`
   - Full URL: `https://app.clickup.com/t/86abc123`
   - CU-prefixed: `CU-86abc123`

   **What to do:** Re-invoke the Dev agent with a valid ClickUp task ID in one of the accepted formats above.
   ```

6. Store the normalised bare ID in `{task_id}`.
7. Confirm `✅ Task ID parsed: \`{task_id}\`` and continue to step 2.

> **Refinement source:** `pwd-deviation-cwd-not-pilot-repo`, `lore-origin-pat-preflight-gap` (story 5-7).
