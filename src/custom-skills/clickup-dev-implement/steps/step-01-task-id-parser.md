---
task_id: ''
---

# Step 1: Task-ID Parser

## RULES

1. **Read-only step.** This step does not write files or call ClickUp APIs — pure parsing only.
2. **Must-complete.** If parsing fails with an unrecognisable input, emit the standard error block below and stop — do not proceed to step 2.
3. **Normalisation contract.** `{task_id}` MUST be a non-empty alphanumeric string by the time this step completes. The bare ID is passed verbatim to `getTaskById` in step 2.

## INSTRUCTIONS

1. Read the raw task-identifier string supplied by the user.
2. Detect and handle **URL form** — if the input contains `app.clickup.com`, extract the last non-empty path segment after splitting the URL path on `/`.
   - Example: `https://app.clickup.com/t/86abc123` → `86abc123`
   - Example: `https://app.clickup.com/9012345678/v/t/86abc123` → `86abc123`
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
