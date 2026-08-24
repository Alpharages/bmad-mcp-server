---
name: bmad-clickup-code-review
description: 'Accepts a ClickUp task ID whose status is "in review", fetches task requirements and acceptance criteria from ClickUp, reads the git diff, then delegates to the BMAD 6.11 bmad-code-review workflow (adversarial review layers + triage) in report-only mode — it never modifies code, tests, or BMAD artifacts. Posts the structured review findings as a single ClickUp comment and transitions status to approved or back to in-progress; an inconclusive review posts its reason and leaves the status untouched. Use when the user says "review [task ID]", "code review [task ID]", or "review task [task ID]".'
---

Follow the instructions in ./workflow.md.
