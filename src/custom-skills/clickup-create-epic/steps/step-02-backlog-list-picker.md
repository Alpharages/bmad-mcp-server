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

1. Call `getCurrentSpace` (no arguments) to check if a space is already selected for this MCP session. If a space is returned, confirm with the user: "Current space: **{space_name}** (`{space_id}`). Use this space? [Y/n]". If confirmed, set `{space_id}` and `{space_name}` from the response and skip to step 5. If declined, call `clearCurrentSpace` and continue to step 2.

2. Call `pickSpace` with no arguments to list all available spaces.

3. Ask: "Which space are you working in? Enter the space name or ID."

4. Call `pickSpace` with `query: "<user input>"` to select the space. If one match, extract `{space_id}` and `{space_name}` from the confirmation response. If multiple matches, present them and ask the user to narrow the query or provide the exact space ID.

5. Call `searchSpaces` with `terms: ["{space_name}"]` to retrieve the detailed folder/list tree for the selected space.

6. **Pinned-list short-circuit.** Before scanning the tree, check whether `_bmad/custom/bmad-agent-dev.toml`'s `[clickup_create_epic].pinned_backlog_list_id` is set to a non-empty value. If it is, verify that the pinned ID appears as a list in the tree returned by `searchSpaces`; if it does, set `{backlog_list_id}` to the pinned value, confirm `✅ Backlog list pinned via config: {backlog_list_id}` to the user, and skip the scan. If the pinned ID is not found in the tree, warn the user (`⚠️ pinned_backlog_list_id not found in current space — falling back to scan`) and continue. If the key is unset or empty, proceed to the scan.

   Scan the tree for a list whose name matches `Backlog` (case-insensitive). If found, set `{backlog_list_id}` automatically (do not ask the user). If NOT found, present all lists visible in the tree and ask: "I couldn't find a list named 'Backlog'. Enter the name or number of the list that holds your epics."

   > **Edge case:** If the space contains multiple lists named `Backlog`, present both and ask the user to pick. Pin the chosen list via `[clickup_create_epic].pinned_backlog_list_id` to skip this prompt on future invocations.

7. Confirm: "✅ Backlog list found: `{backlog_list_id}` in space **{space_name}**. Continuing to epic picker…"

## NEXT

Proceed to [step-03-local-epic-picker.md](./step-03-local-epic-picker.md) with `{space_id}`, `{space_name}`, and `{backlog_list_id}` available in step context.
