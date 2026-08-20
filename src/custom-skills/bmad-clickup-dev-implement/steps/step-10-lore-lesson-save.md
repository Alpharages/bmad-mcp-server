---
lesson_count: ''
---

# Step 10: Lore Lesson Save

## PURPOSE

Assess whether this implementation session produced reusable lessons, deduplicate against the existing Lore corpus, and persist only genuinely new signal so future agents benefit without accumulating noise.

## RULES

- **(a) Non-blocking.** Any failure in this step MUST be logged as a warning and skipped — never fail the workflow for a Lore write failure.
- **(b) Skip if incomplete.** If `{implementation_complete}` ≠ `'true'`, skip this step entirely.
- **(c) Slug-scoped MCP resolution.** This step targets exactly one Lore server: `lore-memory-{lore_project_slug}`. It MUST NOT fall back to any other connected `save_lesson` / `search_similar` / `query_lessons_for_task` tool. Writing lessons through any other Lore MCP server contaminates that project's memory corpus with this project's findings.
- **(d) Assess before saving.** Reason first about whether any lesson-eligible signal exists. Do not call `save_lesson` if the assessment concludes nothing worth saving occurred.
- **(e) Two-layer dedup.** Before saving any candidate, check for duplicates at two levels: task-level (already saved for this task) and semantic-level (near-identical lesson from any other task). Skip candidates that fail either check.
- **(f) Quality over quantity.** 2–5 high-quality lessons per session is the target. Do not manufacture lessons to hit a count.
- **(g) Variable contract.** `{lesson_count}` is incremented by 1 for each successful `save_lesson` call.

## WHEN TO RUN

After step 9 completes (or is skipped), if `{implementation_complete}` = `'true'`.

## LESSON ELIGIBILITY CRITERIA

A candidate qualifies if it meets **at least one** of the following:

| Signal                                         | Example                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Assumption that proved wrong                   | "Assumed endpoint existed; had to create it"                                        |
| Non-obvious implementation constraint          | "Drizzle `onConflictDoUpdate` requires all non-PK columns to be listed"             |
| Pattern that resolved repeated friction        | "Type narrowing needed before drizzle insert on optional fields"                    |
| Clarification that changed scope               | "AC said 'notify user' — channel was email, not in-app; confirmed step 8"           |
| Test strategy decision with non-obvious reason | "Integration test against real DB was required — mock diverged on upsert semantics" |
| Architecture choice with local impact          | "Chose optimistic locking — lower contention for this resource"                     |

The following do NOT qualify:

- Summaries of what was built
- Restatements of the story AC
- Observations already captured in CLAUDE.md, architecture.md, or tech-spec.md

## LESSON SCHEMA

```
content:        One or two sentences in present tense. State the constraint/pattern/decision, then the rationale.
                Example: "Use optimistic locking for lesson votes — row-level contention is low and rollback cost is negligible."
type:           One of: code_quality | architecture | testing | process | debugging | performance | security
tags:           Array of stack tags relevant to the lesson — derived from the tech touched, not the full project stack.
source_task_id: "{task_id}"
```

## INSTRUCTIONS

1. **Resolve the project slug.** `{lore_project_slug}` and `{lore_enabled}` are populated by step 3 (planning-artifact reader) when `lore.yaml` is present at the project root. Use those values directly here.

   If `{lore_enabled}` ≠ `'true'` (no `lore.yaml`, or it lacked `project.slug`), emit:

   > ℹ️ **Lore lesson save skipped — no `lore.yaml` for this project**
   >
   > `lore.yaml` was not found at the project root in step 3 (or did not contain `project.slug`). Lessons are not saved for projects without a Lore project slug.

   Set `{lesson_count}` = `'0'` and stop.

2. **Resolve the expected tool name.** Construct the slug-scoped tool name as `lore-memory-{lore_project_slug}__save_lesson` (substituting the actual slug). This is the ONLY `save_lesson` tool this step is permitted to call. The same `lore-memory-{lore_project_slug}__…` prefix applies to `query_lessons_for_task` and `search_similar` below.

3. **Check MCP availability — slug-scoped only.** Verify that the tool named exactly `lore-memory-{lore_project_slug}__save_lesson` is registered in the current MCP context.
   - If the slug-scoped tool is **present**: proceed to instruction 4.
   - If the slug-scoped tool is **absent**: emit the warning below, set `{lesson_count}` = `'0'`, and stop.

     **The step MUST NOT fall back to any other `save_lesson` tool that happens to be connected to the current session** — calling, for example, `lore-memory-someotherproject__save_lesson` would write this project's implementation lessons into a different project's memory corpus (cross-project memory contamination).

     > ⚠️ **Lore lesson save skipped — `lore-memory-{lore_project_slug}` MCP server not connected**
     >
     > The tool `lore-memory-{lore_project_slug}__save_lesson` is not registered in the current MCP context. No other `save_lesson` tool is acceptable — this step never falls back to a different project's Lore server.
     >
     > **What to do (optional):** Connect the `lore-memory-{lore_project_slug}` MCP server in your client config and re-run the workflow, or leave Lore disconnected for this session and the implementation remains valid without saved lessons.

4. **Skip if incomplete.** If `{implementation_complete}` ≠ `'true'`, emit `ℹ️ Implementation did not complete — skipping Lore lesson save.` and stop.

5. **Assess.** Scan the conversation context of this session for lesson-eligible signals:
   - Assumptions from step 7 (Template D comments), especially `**Confidence:** low` or `medium`
   - Clarifications from step 8 (Template F resolved comments)
   - Test failures caused by non-obvious library or framework behaviour
   - Constraint or API discoveries that surprised the implementation
   - Decisions that qualified for cross-story propagation in step 9 (high-signal by definition)

   If no signals pass the eligibility criteria, emit:

   > ℹ️ No lesson-eligible signals this session — skipping Lore lesson save.

   and stop.

6. **Build candidate list.** For each eligible signal, draft the lesson `content`, `type`, and `tags` using the schema above. Collect into a working candidate list.

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

Step 10 is the terminal step of the `bmad-clickup-dev-implement` skill. After step 10 completes (or is skipped), the workflow ends.
