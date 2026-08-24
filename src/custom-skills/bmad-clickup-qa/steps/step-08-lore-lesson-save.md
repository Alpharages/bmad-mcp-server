---
lesson_count: ''
lore_enabled: ''
lore_project_slug: ''
---

# Step 8: Lore Lesson Save

## PURPOSE

Assess whether this QA session produced reusable lessons, deduplicate against the existing Lore corpus, and persist only genuinely new signal so future story authors, implementers, and QA runs benefit without accumulating noise.

## RULES

- **(a) Non-blocking.** Any failure in this step MUST be logged as a warning and skipped — never fail the workflow for a Lore write failure.
- **(b) Skip if nothing was verified.** If `{qa_verdict}` is empty or `inconclusive`, skip this step entirely — QA did not actually verify anything worth a lesson.
- **(c) Slug-scoped MCP resolution.** This step targets exactly one tool: `lore-memory-{lore_project_slug}__save_lesson`. It MUST NOT fall back to any other connected `save_lesson` tool — doing so contaminates a different project's memory corpus.
- **(d) Assess before saving.** Reason first about whether any lesson-eligible signal exists in `{ai_qa_findings}` / `{human_qa_findings}`. Do not call `save_lesson` if nothing qualifies.
- **(e) Two-layer dedup.** Before saving any candidate, check task-level (already saved for this task) and semantic-level (near-identical lesson from any other task) duplicates. Skip candidates that fail either.
- **(f) Quality over quantity.** 1–3 high-quality lessons per session is the target. Do not manufacture lessons to hit a count.
- **(g) Variable contract.** `{lesson_count}` is incremented by 1 for each successful `save_lesson` call.

## WHEN TO RUN

After step 7 completes (or is skipped), if `{qa_verdict}` is `passed` or `failed`.

## LESSON ELIGIBILITY CRITERIA

A candidate qualifies if it meets **at least one** of the following:

| Signal                                               | Example                                                                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Acceptance criterion implemented but broken          | "AC said empty cart shows the 'add items' empty state; cart with only out-of-stock items rendered a blank page instead."   |
| Recurring visual/UX regression                       | "Form submit button stays enabled during the in-flight request, allowing double-submit — third time this pattern shipped." |
| Coverage gap that let a defect through               | "Happy-path tests passed but no test exercised the expired-token branch, where the bug lived."                             |
| Environment/setup gotcha that blocks QA              | "Visual QA against localhost requires the seed script to be run first, or the dashboard 500s on an empty DB."              |
| Black-box edge case that broke                       | "Pasting a 10k-character note crashed the editor — no max-length guard on the textarea."                                   |
| Regression in an adjacent area named in the QA notes | "The new filter broke pagination on the same screen — the two share a query-param parser."                                 |

The following do NOT qualify:

- Style/formatting nits.
- Issues already documented in CLAUDE.md, architecture.md, or tech-spec.md.
- Findings obvious from project conventions.
- Generic "always test edge cases" type observations.

## LESSON SCHEMA

```
content:        One or two sentences, present tense. State the pattern/constraint/finding, then the rationale or consequence.
                Example: "Disable submit controls while a request is in flight — leaving them active is a recurring double-submit defect surfaced repeatedly in QA."
type:           One of: code_quality | architecture | testing | process | debugging | performance | security
tags:           Stack tags relevant to the lesson — derived from the tech involved, not the full project stack.
source_task_id: "{task_id}"
```

## INSTRUCTIONS

1. **Resolve the project slug from `lore.yaml`.** If `{lore_enabled}` / `{lore_project_slug}` are already set in context, reuse them. Otherwise read `lore.yaml` from the project root via the Read tool:
   - If the file does not exist, cannot be parsed as YAML, or lacks `project.slug`: set `{lore_enabled}` = `'false'`, `{lore_project_slug}` = `''`, set `{lesson_count}` = `'0'`, emit the notice below, and stop.

     > ℹ️ **Lore lesson save skipped — no `lore.yaml` for this project**
     >
     > `lore.yaml` was not found at the project root (or did not contain `project.slug`). Lessons are not saved for projects without a Lore project slug.

   - If `project.slug` is set: set `{lore_enabled}` = `'true'` and `{lore_project_slug}` to the slug value.

2. **Resolve the expected tool name.** Construct `lore-memory-{lore_project_slug}__save_lesson` (substituting the actual slug). This is the ONLY `save_lesson` tool this step may call.

3. **Check MCP availability — slug-scoped only.** Verify that tool is registered in the current MCP context.
   - Present → proceed to instruction 4.
   - Absent → emit the warning below, set `{lesson_count}` = `'0'`, and stop. MUST NOT fall back to any other project's `save_lesson` tool.

     > ⚠️ **Lore lesson save skipped — `lore-memory-{lore_project_slug}` MCP server not connected**
     >
     > The tool `lore-memory-{lore_project_slug}__save_lesson` is not registered in the current MCP context. No other `save_lesson` tool is acceptable.
     >
     > **What to do (optional):** Connect the `lore-memory-{lore_project_slug}` MCP server and re-run QA, or leave Lore disconnected — the QA result remains valid without saved lessons.

4. **Assess.** Scan `{ai_qa_findings}` and `{human_qa_findings}` for lesson-eligible signals using the criteria above. Failures and blocked-by-environment findings are the strongest signal. If nothing qualifies, emit `ℹ️ No lesson-eligible findings this QA session — skipping Lore lesson save.` and stop.

5. **Build candidate list.** For each eligible finding, draft `content`, `type`, and `tags` per the schema. Frame each as a **prevention pattern** — what should be done so this defect never ships again, not just what broke.

6. **Layer 1 dedup — task-level.** Call `lore-memory-{lore_project_slug}__query_lessons_for_task` with `task_id` = `"{task_id}"`. If it returns any lessons, emit `ℹ️ Lessons for task {task_id} already exist in Lore — skipping to avoid duplicates.`, set `{lesson_count}` = `'0'`, and stop.

7. **Layer 2 dedup — semantic.** For each candidate, call `lore-memory-{lore_project_slug}__search_similar` with its `content`. If any result scores ≥ 0.88, drop that candidate and emit `ℹ️ Skipping near-duplicate: "{first 60 chars}" (score {score}).`. If all candidates are dropped, emit `ℹ️ All candidates were near-duplicates — nothing new to save.` and stop.

8. **Save remaining candidates.** For each survivor, call `lore-memory-{lore_project_slug}__save_lesson` with the full schema.
   - Success → increment `{lesson_count}`, emit `✅ Lesson saved: "{first 60 chars}…"`.
   - Failure → emit `⚠️ Failed to save lesson: {error}. Continuing.`.

9. **Report summary.**

   > 🧠 **Lore lesson save complete**
   >
   > - Project slug: `{lore_project_slug}`
   > - Lessons saved: `{lesson_count}`
   > - Task: [{task_name}]({task_url})

## NEXT

Step 8 is the terminal step of the `bmad-clickup-qa` skill. After step 8 completes (or is skipped), the workflow ends.
