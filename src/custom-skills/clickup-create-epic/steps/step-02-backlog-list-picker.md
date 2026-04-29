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

0. **Pinned-config short-circuit.** Read `{project-root}/.bmadmcp/config.toml` if it exists. Inside, look for the `[clickup_create_epic]` table and read the optional keys `pinned_space_id`, `pinned_space_name`, and `pinned_backlog_list_id`. Treat any missing file, missing table, or missing key as unset.

   - **If both `pinned_space_id` AND `pinned_backlog_list_id` are set to non-empty values:** skip every ClickUp discovery call below. Set `{space_id}` = `pinned_space_id`, `{space_name}` = `pinned_space_name` (fall back to `(pinned)` if that key is unset), `{backlog_list_id}` = `pinned_backlog_list_id`. Confirm to the user: `✅ Space + backlog list pinned via .bmadmcp/config.toml — skipping picker.` Proceed directly to step 3 (local epic picker). If a downstream call (e.g. `searchTasks` in step 5) returns "list not found" or "space not found", surface the failure verbatim and instruct the user to update or remove the pinned IDs in `.bmadmcp/config.toml`.
   - **If only `pinned_space_id` is set:** skip `getCurrentSpace` and `pickSpace`. Set `{space_id}` = `pinned_space_id`, `{space_name}` = `pinned_space_name` (or `(pinned)`). Continue to instruction 5 below (`searchSpaces`) using `{space_name}` to retrieve the folder/list tree.
   - **If only `pinned_backlog_list_id` is set (no `pinned_space_id`):** continue to instruction 1 below; the list-pin will be applied at instruction 6.
   - **If no pins are set:** continue to instruction 1 below.

1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.

2. Call `pickSpace` with no arguments to list all available spaces.

3. Ask: "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space.

6. **Pinned-list short-circuit.** Before scanning the tree, check whether `.bmadmcp/config.toml`'s `[clickup_create_epic].pinned_backlog_list_id` is set to a non-empty value. If it is, verify that the pinned ID appears as a list in the tree returned by `searchSpaces`; if it does, set `{backlog_list_id}` to the pinned value, confirm `✅ Backlog list pinned via config: {backlog_list_id}` to the user, and skip the scan. If the pinned ID is not found in the tree, warn the user (`⚠️ pinned_backlog_list_id not found in current space — falling back to scan`) and continue. If the key is unset or empty, proceed to the scan.

   Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."

   > **Edge case:** If the space contains multiple lists named `Backlog`, present both and ask the user to pick. Pin the chosen list via `[clickup_create_epic].pinned_backlog_list_id` in `.bmadmcp/config.toml` to skip this prompt on future invocations.

7. Confirm: "✅ Backlog list found: `{backlog_list_id}` in space **{space_name}**. Continuing to epic picker…"

## NEXT

Proceed to [step-03-local-epic-picker.md](./step-03-local-epic-picker.md) with `{space_id}`, `{space_name}`, and `{backlog_list_id}` available in step context.
