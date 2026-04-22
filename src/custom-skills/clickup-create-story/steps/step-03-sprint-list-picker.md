---
sprint_folder_id: ''
sprint_list_id: ''
sprint_list_name: ''
---

# Step 3: Sprint-List Picker

## RULES

1. **Mode requirement** — this step calls `searchSpaces` which is **not registered** in `read-minimal` mode; `CLICKUP_MCP_MODE` MUST be `read` or `write` (since `createTask` in story 2.6 requires `write`, the practical minimum for the full skill is `write` mode).
2. **Read-only** — this step calls `searchSpaces` for discovery only; it MUST NOT call any ClickUp write tool.
3. **Blocking** — the step MUST NOT continue to step 4 if `{sprint_list_id}` is empty at the end of this step.

## INSTRUCTIONS

1. Read `{space_id}` and `{space_name}` from the step-02 context (set by the epic picker); if absent or empty, emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — space not selected**

   The `clickup-create-story` skill requires a space to be chosen before the sprint-list picker runs.

   **Why:** The sprint folder is discovered within the selected space. Without a space, there is no folder to query.

   **What to do:** Re-run step 2 (epic picker) to select a space and epic, then return to this step.
   ```

2. Call `searchSpaces` with `terms: ["{space_name}"]`. If the call fails or returns an error response, emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — space search error**

   The `searchSpaces` call for space **{space_name}** returned an error.

   **Why:** The ClickUp API or MCP tool encountered a problem retrieving the space folder tree.

   **What to do:** Check your ClickUp API key and network connection, then re-invoke this step.
   ```

   If the response is in summary mode (no folder data — occurs when the space name matches more than five spaces), emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — space name is ambiguous**

   The name "{space_name}" matched multiple spaces and the search returned summary mode with no folder data.

   **Why:** `searchSpaces` switches to summary mode when more than five spaces match the query. In summary mode, folder and list data is not included.

   **What to do:** Re-run step 2 (epic picker) and select the space by a more specific name, then return to this step.
   ```

   Otherwise, from the detailed response filter the tree to entries matching `{space_id}` to ensure only the selected space's folders are scanned.

3. Scan the filtered folders for the sprint folder:
   - **Exactly one folder** whose name contains "sprint" (case-insensitive): use it automatically.
   - **More than one folder** whose name contains "sprint": present the matching folders as a numbered list and ask: "More than one sprint folder was found. Enter the number of the correct sprint folder."
   - **No folder** whose name contains "sprint" but other folders exist: present the full folder list as a numbered list and ask the user to identify the sprint folder by entering its number **or** its raw folder ID. If the user enters a number, resolve it to the corresponding folder. If the user enters a raw folder ID, verify it appears in the returned folder tree; if not found, warn the user and re-present the list.
   - **No folders at all** in the space: emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — no sprint folder found**

   Space **{space_name}** (`{space_id}`) has no folders.

   **Why:** The `clickup-create-story` skill expects sprint lists to live inside a ClickUp Sprint folder. A space with no folders cannot contain a sprint folder.

   **What to do:** Create a Sprint folder in your ClickUp space, add your sprint lists inside it, then re-invoke this step.
   ```

   If folders exist but none match "sprint" and the user cannot identify the correct one, emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — no sprint folder found**

   No folder containing "sprint" (case-insensitive) was found in space **{space_name}** (`{space_id}`).

   **Why:** The `clickup-create-story` skill expects sprint lists to live inside a ClickUp Sprint folder in the selected space. If your workspace uses a different naming convention, identify the correct folder from the list above and retry.

   **What to do:** Either rename your sprint folder to include the word "sprint", or enter the folder ID manually when prompted above, then re-invoke this step.
   ```

4. Store the identified folder's ID in `{sprint_folder_id}`.

5. From the folder tree data already returned by `searchSpaces`, collect all lists within `{sprint_folder_id}`. Filter out any lists where `archived: true`. If the folder contains no non-archived lists, emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — no active sprint lists**

   The sprint folder (folder_id: `{sprint_folder_id}`) in space **{space_name}** contains no non-archived lists.

   **Why:** Sprint lists that have been archived are excluded from selection. The skill only creates stories in active (non-archived) sprint lists.

   **What to do:** Unarchive the sprint list you want to use, or create a new sprint list inside the sprint folder, then re-invoke this step.
   ```

6. Present a numbered list of non-archived sprint lists with the format:

   ```
   [N] <list_name> (list_id: <id>)
   ```

   Precede the list with the hint: "If your sprint lists have ClickUp date ranges configured, the active sprint is the one whose start date is before today and end date is after today."
   Follow the list with: "Enter the number of the sprint list that should receive the new story."

7. Parse the user's numeric response: validate it is a number between 1 and N; if invalid, re-present the list and ask again.

8. Set `{sprint_list_id}` to the selected list's ID and `{sprint_list_name}` to its name.

9. Confirm the selection: emit `✅ Sprint list selected: {sprint_list_name} (list_id: {sprint_list_id})` and continue to step 4.

## NEXT

Step 4 (description composer, story 2.5) is not yet implemented. Inform the user that the sprint-list picker step is complete and the skill is still in progress.
