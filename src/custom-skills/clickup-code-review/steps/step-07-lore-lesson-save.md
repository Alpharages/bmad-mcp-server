---
lesson_count: ''
lore_enabled: ''
lore_project_slug: ''
---

# Step 7: Lore Lesson Save

## PURPOSE

Assess whether this code review session produced reusable lessons, deduplicate against the existing Lore corpus, and persist only genuinely new signal so future reviewers and implementers benefit without accumulating noise.

## RULES

- **(a) Non-blocking.** Any failure in this step MUST be logged as a warning and skipped — never fail the workflow for a Lore write failure.
- **(b) Skip if no verdict.** If `{review_verdict}` is empty, skip this step entirely — the review did not complete.
- **(c) Slug-scoped MCP resolution.** This step targets exactly one tool: `lore-memory-{lore_project_slug}__save_lesson`. It MUST NOT fall back to any other connected `save_lesson` tool. Saving lessons through any other Lore MCP server contaminates that project's memory corpus with this project's findings.
- **(d) Assess before saving.** Reason first about whether any lesson-eligible signal exists in `{review_findings}`. Do not call `save_lesson` if the assessment concludes nothing worth saving occurred.
- **(e) Two-layer dedup.** Before saving any candidate, check for duplicates at two levels: task-level (already saved for this task) and semantic-level (near-identical lesson from any other task). Skip candidates that fail either check.
- **(f) Quality over quantity.** 2–4 high-quality lessons per session is the target. Do not manufacture lessons to hit a count.
- **(g) Variable contract.** `{lesson_count}` is incremented by 1 for each successful `save_lesson` call.

## WHEN TO RUN

After step 6 completes (or is skipped), if `{review_verdict}` is non-empty.

## LESSON ELIGIBILITY CRITERIA

A candidate qualifies if it meets **at least one** of the following:

| Signal                                                     | Example                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Recurring anti-pattern caught in review                    | "Missing null guard before drizzle insert on optional relation fields"                             |
| AC gap found — requirement was present but not implemented | "Pagination AC required a `nextCursor` field; implementation omitted it"                           |
| Security or data-integrity issue found                     | "User-supplied sort column was passed to raw SQL without allowlist validation"                     |
| Non-obvious test coverage gap                              | "Happy-path only — error branch from the external API call had no test"                            |
| Architecture violation caught                              | "Service layer imported drizzle directly, bypassing the repository layer"                          |
| Pattern that would have prevented the finding              | "Zod parse at the controller boundary would have caught the invalid enum before it reached the DB" |

The following do NOT qualify:

- Style or formatting issues (those belong in lint rules, not memory)
- Issues already documented in CLAUDE.md, architecture.md, or tech-spec.md
- Findings that are obvious from the project conventions
- Generic "always write tests" type observations

## LESSON SCHEMA

```
content:        One or two sentences in present tense. State the pattern/constraint/finding, then the rationale or consequence.
                Example: "Always validate sort column against an allowlist before interpolating into a query — unsanitised sort fields are a SQL injection vector."
type:           One of: code_quality | architecture | testing | process | debugging | performance | security
tags:           Array of stack tags relevant to the lesson — derived from the tech involved in the finding, not the full project stack.
source_task_id: "{task_id}"
```

## INSTRUCTIONS

1. **Resolve the project slug from `lore.yaml`.** Step 4 already attempts to read `lore.yaml` and may have populated `{lore_enabled}` and `{lore_project_slug}` in the conversation context. If those variables are already set, reuse them. Otherwise, attempt to read `lore.yaml` from the project root via the Read tool now:
   - If the file does not exist, OR cannot be parsed as YAML, OR lacks a `project.slug` value: set `{lore_enabled}` = `'false'`, `{lore_project_slug}` = `''`. Emit:

     > ℹ️ **Lore lesson save skipped — no `lore.yaml` for this project**
     >
     > `lore.yaml` was not found at the project root (or did not contain `project.slug`). Lessons are not saved for projects without a Lore project slug.

     Set `{lesson_count}` = `'0'` and stop.

   - If the file exists and `project.slug` is set: set `{lore_enabled}` = `'true'` and `{lore_project_slug}` to the slug value.

2. **Resolve the expected tool name.** Construct the slug-scoped tool name as `lore-memory-{lore_project_slug}__save_lesson` (substituting the actual slug). This is the ONLY `save_lesson` tool this step is permitted to call.

3. **Check MCP availability — slug-scoped only.** Verify that the tool named exactly `lore-memory-{lore_project_slug}__save_lesson` is registered in the current MCP context.
   - If the slug-scoped tool is **present**: proceed to instruction 4.
   - If the slug-scoped tool is **absent**: emit the warning below, set `{lesson_count}` = `'0'`, and stop.

     **The step MUST NOT fall back to any other `save_lesson` tool that happens to be connected to the current session** — calling, for example, `lore-memory-someotherproject__save_lesson` would write this project's review findings into a different project's memory corpus (cross-project memory contamination).

     > ⚠️ **Lore lesson save skipped — `lore-memory-{lore_project_slug}` MCP server not connected**
     >
     > The tool `lore-memory-{lore_project_slug}__save_lesson` is not registered in the current MCP context. No other `save_lesson` tool is acceptable — this step never falls back to a different project's Lore server.
     >
     > **What to do (optional):** Connect the `lore-memory-{lore_project_slug}` MCP server in your client config and re-run the review, or leave Lore disconnected for this session and the review remains valid without saved lessons.

4. **Skip if no verdict.** If `{review_verdict}` is empty, emit `ℹ️ Review did not complete — skipping Lore lesson save.` and stop.

5. **Assess.** Scan `{review_findings}` for lesson-eligible signals using the eligibility criteria above. Consider:
   - Findings marked as blocking (MUST FIX) — highest signal, always assess
   - Security or data-integrity issues — always assess regardless of severity
   - Repeated finding types (same pattern across multiple files) — strong signal
   - Architecture violations — strong signal
   - AC gaps — strong signal

   If no findings pass the eligibility criteria, emit:

   > ℹ️ No lesson-eligible findings this review — skipping Lore lesson save.

   and stop.

6. **Build candidate list.** For each eligible finding, draft the lesson `content`, `type`, and `tags` using the schema above. Frame the lesson as a **prevention pattern** — what should be done to avoid this finding, not just what went wrong.

7. **Layer 1 dedup — task-level.** Call `lore-memory-{lore_project_slug}__query_lessons_for_task` with `task_id` = `"{task_id}"`. If it returns any lessons, lessons for this task were already saved in a previous run. Emit:

   > ℹ️ Lessons for task `{task_id}` already exist in Lore — skipping to avoid duplicate saves.

   Set `{lesson_count}` = `'0'` and stop.

8. **Layer 2 dedup — semantic.** For each candidate in the list, call `lore-memory-{lore_project_slug}__search_similar` with the candidate's `content`. If any result has a similarity score ≥ 0.88, the lesson is already captured from another task. Remove that candidate and emit:

   > ℹ️ Skipping near-duplicate: "{first 60 chars}" — similar lesson already in corpus (score: {score}, source: {existing_source_task_id}).

   Continue with the remaining candidates. If all candidates are removed, emit:

   > ℹ️ All candidates were near-duplicates of existing lessons — nothing new to save.

   and stop.

9. **Save remaining candidates.** For each candidate that survived both dedup layers, call `lore-memory-{lore_project_slug}__save_lesson` with the full schema.
   - On success: increment `{lesson_count}`, emit `✅ Lesson saved: "{first 60 chars of content}…"`
   - On failure: emit `⚠️ Failed to save lesson: {error}. Continuing.`

10. **Report summary.**

    > 🧠 **Lore lesson save complete**
    >
    > - Project slug: `{lore_project_slug}`
    > - Lessons saved: `{lesson_count}`
    > - Task: [{task_name}]({task_url})

## NEXT

Step 7 is the terminal step of the `clickup-code-review` skill. After step 7 completes (or is skipped), the workflow ends.
