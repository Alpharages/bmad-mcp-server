---
name: clickup-code-review
description: 'Accepts a ClickUp task ID whose status is "in review", fetches task requirements and acceptance criteria from ClickUp, reads the git diff, then delegates to the bmad-code-review workflow (adversarial review layers + triage). Posts the structured review findings as a ClickUp comment and transitions status to approved or back to in-progress. Use when the user says "review [task ID]", "code review [task ID]", or "review task [task ID]".'
---

Follow the instructions in ./workflow.md.
