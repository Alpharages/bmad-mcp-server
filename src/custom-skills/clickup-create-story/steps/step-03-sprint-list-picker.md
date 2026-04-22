---
sprint_folder_id: ''
sprint_list_id: ''
sprint_list_name: ''
---

# Step 3: Sprint-List Picker

## RULES

1. **Mode requirement** — this step calls `searchSpaces` which is **not registered** in `read-minimal` mode; `CLICKUP_MCP_MODE` MUST be `read` or `write` (since `createTask` in story 2.6 requires `write`, the practical minimum for the full skill is `write` mode).
2. **Read-only** — this step calls `searchSpaces` and `getListInfo` for discovery only; it MUST NOT call `createTask`, `updateTask`, or any other write tool.
3. **Blocking** — the step MUST NOT continue to step 4 if `{sprint_list_id}` is empty at the end of this step.

## INSTRUCTIONS

1. Read `{space_id}` and `{space_name}` from the step-02 context (set by the epic picker); if absent or empty, emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — space not selected**

   The `clickup-create-story` skill requires a space to be chosen before the sprint-list picker runs.

   **Why:** The sprint folder is discovered within the selected space. Without a space, there is no folder to query.

   **What to do:** Re-run step 2 (epic picker) to select a space and epic, then return to this step.
   ```

2. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space. A single-space search always returns detailed mode (≤5 threshold is always met when searching by exact name).

3. Scan the returned folders for the sprint folder: prefer a folder whose name contains "sprint" (case-insensitive). If no such folder exists, present the full folder list to the user as a numbered list and ask them to identify the sprint folder by entering its number **or** its raw folder ID. If the user enters a number, resolve it to the corresponding folder. If the space has no folders at all, emit the following error block and stop.

   ```
   ❌ **Sprint-list picker failed — no sprint folder found**

   No folder containing "sprint" (case-insensitive) was found in space **{space_name}** (`{space_id}`).

   **Why:** The `clickup-create-story` skill expects sprint lists to live inside a ClickUp Sprint folder in the selected space. If your workspace uses a different naming convention, identify the correct folder from the list above and retry.

   **What to do:** Either rename your sprint folder to include the word "sprint", or enter the folder ID manually when prompted above, then re-invoke this step.
   ```

4. Store the identified folder's ID in `{sprint_folder_id}`.

5. From the folder tree data already returned by `searchSpaces`, collect all lists within `{sprint_folder_id}`. Filter out any lists where `archived: true`. If the folder returns no non-archived lists, inform the user and stop.

6. Present a numbered list of non-archived sprint lists with the format:

   ```
   [N] <list_name> (list_id: <id>)
   ```

   Precede the list with the hint: "If your sprint lists have ClickUp date ranges configured, the active sprint is the one whose start date is before today and end date is after today."
   Follow the list with: "Enter the number of the sprint list that should receive the new story."

7. Parse the user's numeric response: validate it is a number between 1 and N; if invalid, re-present the list and ask again.

8. Set `{sprint_list_id}` to the selected list's ID and `{sprint_list_name}` to its name.

9. Confirm the selection: emit `✅ Sprint list selected: <sprint_list_name> (list_id: <sprint_list_id>)` and continue to step 4.
