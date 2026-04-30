---
epic_id: ''
epic_name: ''
---

# Step 3: Epic Picker

## STATUS

🚧 **Not yet implemented — story 7-7**

This step will: present the user with epics in the chosen space so they can
optionally attach the bug to an epic parent. This step is **skippable** — bugs do
not require an epic parent. Full implementation depends on EPIC-8 landing first.

**Skip contract:** when the user skips this step, `epic_id` and `epic_name` remain
`''` (empty string). Step 5 checks `epic_id` before wiring the parent — an empty
value means no parent is set on the created task.

See: [EPIC-7 story 7-7](../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Proceed to [step-04-description-composer.md](./step-04-description-composer.md).
