---
space_id: ''
space_name: ''
backlog_list_id: ''
---

# Step 2: Backlog List Picker

## RULES

- **Near-read-only.** This step calls only `pickSpace`, `getCurrentSpace`, `clearCurrentSpace`, and `searchSpaces`. No writes to ClickUp.
- **Early-exit.** Stop the skill run immediately if the user cannot identify a space, or if no Backlog list exists in the chosen space.

## INSTRUCTIONS

0. **Pinned-config short-circuit (two-level cascade).** Read `{project-root}/.bmadmcp/config.toml` if it exists.
   Derive the effective pinned values using the cascade below. Treat any missing file, missing table, or missing key as unset (empty).

   ```
   effective pinned_space_id        = [clickup_create_epic].pinned_space_id        if non-empty,
                                      else [clickup].pinned_space_id
   effective pinned_space_name      = [clickup_create_epic].pinned_space_name      if non-empty,
                                      else [clickup].pinned_space_name
   effective pinned_backlog_list_id = [clickup_create_epic].pinned_backlog_list_id if non-empty,
                                      else [clickup].pinned_backlog_list_id
   ```

   - **If both effective `pinned_space_id` AND effective `pinned_backlog_list_id` are set to non-empty values:** skip every ClickUp discovery call below. Set `{space_id}` = effective `pinned_space_id`, `{space_name}` = effective `pinned_space_name` (fall back to `(pinned)` if that key is unset), `{backlog_list_id}` = effective `pinned_backlog_list_id`. Confirm to the user: `✅ Space + backlog list pinned via .bmadmcp/config.toml — skipping picker.` Proceed directly to step 3 (local epic picker). If a downstream call (e.g. `searchTasks` in step 5) returns "list not found" or "space not found", surface the failure verbatim and instruct the user to update or remove the pinned IDs in `.bmadmcp/config.toml`.
   - **If only effective `pinned_space_id` is set:** skip `getCurrentSpace` and `pickSpace`. Set `{space_id}` = effective `pinned_space_id`, `{space_name}` = effective `pinned_space_name` (or `(pinned)`). Continue to instruction 5 below (`searchSpaces`) using `{space_name}` to retrieve the folder/list tree.
   - **If only effective `pinned_backlog_list_id` is set (no effective `pinned_space_id`):** continue to instruction 1 below; the list-pin will be applied at instruction 6.
   - **If no effective pins are set:** continue to instruction 1 below.

1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.

2. Call `pickSpace` with no arguments to list all available spaces.

3. Ask: "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space.

6. **Pinned-list short-circuit (cascade).** Before scanning the tree, derive the effective `pinned_backlog_list_id` using the same two-level cascade as instruction 0: `[clickup_create_epic].pinned_backlog_list_id` if non-empty, else `[clickup].pinned_backlog_list_id`. If the effective value is non-empty, verify that the pinned ID appears as a list in the tree returned by `searchSpaces`; if it does, set `{backlog_list_id}` to the pinned value, confirm `✅ Backlog list pinned via config: {backlog_list_id}` to the user, and skip the scan. If the pinned ID is not found in the tree, warn the user (`⚠️ pinned_backlog_list_id not found in current space — falling back to scan`) and continue with the scan below. If the key is unset or empty, proceed to the scan.

   Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."

7. **Auto-save discovered values to `[clickup]`.** If the backlog list in instruction 6 was resolved via the interactive picker (scan or user choice) — i.e., NOT from a pinned config value — persist the discovered space and list IDs so future runs skip the picker:

   a. Use the Write/Edit tool to write `pinned_space_id`, `pinned_space_name`, and `pinned_backlog_list_id` into the `[clickup]` section of `.bmadmcp/config.toml`.
   - If the file does not exist, create it with just the `[clickup]` section.
   - If the file exists but has no `[clickup]` section, append the section.
   - If the `[clickup]` section already exists, update only keys that are absent or empty.

   b. Before writing each key, check whether it already exists with a non-empty value in the file. If it does and the current value differs from the discovered value, emit:
   `⚠️ .bmadmcp/config.toml already has [clickup].{key} set — not overwriting. Update manually if needed.`
   and skip that key.

   c. After a successful write, confirm:
   `✅ Space + backlog list saved to .bmadmcp/config.toml ([clickup] table) — future runs will skip this picker.`

   d. If the write fails for any reason (permission error, disk error), emit a non-fatal warning and continue — auto-save is supplemental, the skill session is not interrupted.

8. Confirm: "✅ Backlog list found: `{backlog_list_id}` in space **{space_name}**. Continuing to epic picker…"

## NEXT

Proceed to [step-03-local-epic-picker.md](./step-03-local-epic-picker.md) with `{space_id}`, `{space_name}`, and `{backlog_list_id}` available in step context.
