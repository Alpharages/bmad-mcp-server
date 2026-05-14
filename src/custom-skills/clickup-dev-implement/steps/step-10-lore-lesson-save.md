---
lesson_count: ''
---

# Step 10: Lore Lesson Save

## PURPOSE

Assess whether this implementation session produced reusable lessons, deduplicate against the existing Lore corpus, and persist only genuinely new signal so future agents benefit without accumulating noise.

## RULES

- **(a) Non-blocking.** Any failure in this step MUST be logged as a warning and skipped — never fail the workflow for a Lore write failure.
- **(b) Skip if incomplete.** If `{implementation_complete}` ≠ `'true'`, skip this step entirely.
- **(c) Soft gate.** If no `save_lesson` tool is available in the current MCP context, emit the skip warning and stop.
- **(d) Assess before saving.** Reason first about whether any lesson-eligible signal exists. Do not call `save_lesson` if the assessment concludes nothing worth saving occurred.
- **(e) Two-layer dedup.** Before saving any candidate, check for duplicates at two levels: task-level (already saved for this task) and semantic-level (near-identical lesson from any other task). Skip candidates that fail either check.
- **(f) Quality over quantity.** 2–5 high-quality lessons per session is the target. Do not manufacture lessons to hit a count.
- **(g) Variable contract.** `{lesson_count}` is incremented by 1 for each successful `save_lesson` call.

## WHEN TO RUN

After step 9 completes (or is skipped), if `{implementation_complete}` = `'true'`.

## LESSON ELIGIBILITY CRITERIA

A candidate qualifies if it meets **at least one** of the following:

| Signal | Example |
| --- | --- |
| Assumption that proved wrong | "Assumed endpoint existed; had to create it" |
| Non-obvious implementation constraint | "Drizzle `onConflictDoUpdate` requires all non-PK columns to be listed" |
| Pattern that resolved repeated friction | "Type narrowing needed before drizzle insert on optional fields" |
| Clarification that changed scope | "AC said 'notify user' — channel was email, not in-app; confirmed step 8" |
| Test strategy decision with non-obvious reason | "Integration test against real DB was required — mock diverged on upsert semantics" |
| Architecture choice with local impact | "Chose optimistic locking — lower contention for this resource" |

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

1. **Check MCP availability.** Look for a `save_lesson` tool in the current MCP context (named `<project-lore-server>__save_lesson`). If not found, emit:

   > ⚠️ **Lore lesson save skipped — no Lore MCP available**
   >
   > No `save_lesson` tool found in the current MCP context. If this project uses Lore, connect its MCP server before running the workflow.

   Set `{lesson_count}` = `'0'` and stop.

2. **Skip if incomplete.** If `{implementation_complete}` ≠ `'true'`, emit `ℹ️ Implementation did not complete — skipping Lore lesson save.` and stop.

3. **Assess.** Scan the conversation context of this session for lesson-eligible signals:
   - Assumptions from step 7 (Template D comments), especially `**Confidence:** low` or `medium`
   - Clarifications from step 8 (Template F resolved comments)
   - Test failures caused by non-obvious library or framework behaviour
   - Constraint or API discoveries that surprised the implementation
   - Decisions that qualified for cross-story propagation in step 9 (high-signal by definition)

   If no signals pass the eligibility criteria, emit:

   > ℹ️ No lesson-eligible signals this session — skipping Lore lesson save.

   and stop.

4. **Build candidate list.** For each eligible signal, draft the lesson `content`, `type`, and `tags` using the schema above. Collect into a working candidate list.

5. **Layer 1 dedup — task-level.** Call `query_lessons_for_task` with `task_id` = `"{task_id}"`. If it returns any lessons, lessons for this task were already saved in a previous run. Emit:

   > ℹ️ Lessons for task `{task_id}` already exist in Lore — skipping to avoid duplicate saves.

   Set `{lesson_count}` = `'0'` and stop.

6. **Layer 2 dedup — semantic.** For each candidate in the list, call `search_similar` with the candidate's `content`. If any result has a similarity score ≥ 0.88, the lesson is already captured from another task. Remove that candidate and emit:

   > ℹ️ Skipping near-duplicate: "{first 60 chars}" — similar lesson already in corpus (score: {score}, source: {existing_source_task_id}).

   Continue with the remaining candidates. If all candidates are removed, emit:

   > ℹ️ All candidates were near-duplicates of existing lessons — nothing new to save.

   and stop.

7. **Save remaining candidates.** For each candidate that survived both dedup layers, call `save_lesson` with the full schema.

   - On success: increment `{lesson_count}`, emit `✅ Lesson saved: "{first 60 chars of content}…"`
   - On failure: emit `⚠️ Failed to save lesson: {error}. Continuing.`

8. **Report summary.**

   > 🧠 **Lore lesson save complete**
   >
   > - Lessons saved: `{lesson_count}`
   > - Task: [{task_name}]({task_url})

## NEXT

Step 10 is the terminal step of the `clickup-dev-implement` skill. After step 10 completes (or is skipped), the workflow ends.
