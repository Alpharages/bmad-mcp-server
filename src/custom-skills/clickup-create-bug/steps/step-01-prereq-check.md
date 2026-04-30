---
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
---

# Step 1: Prereq Check

## STATUS

🚧 **Not yet implemented — story 7-3**

This step will: verify `CLICKUP_MCP_MODE=write` and ClickUp token authentication
(identical to `clickup-create-story` step 1), then soft-load PRD + architecture via
`bmad({ operation: 'resolve-doc-paths' })` — warning if either file is missing but
**not aborting** (bugs do not require planning artifacts).

See: [EPIC-7 story 7-3](../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Proceed to [step-02-list-picker.md](./step-02-list-picker.md).
