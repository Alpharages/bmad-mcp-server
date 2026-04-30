# Story 7.4: Implement bug description composer

Status: done

Epic: [EPIC-7: Bug-shaped stories in ClickUp](../epics/EPIC-7-bug-shaped-stories.md)

> Fills the `🚧 Not yet implemented — story 7-4` stub in
> `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`.
>
> The step accepts the user's free-form bug report (a paste, a stack trace, or a
> brief description), parses it into a structured bug description template
> (Summary / Steps to reproduce / Expected / Actual / Impact / Suspected area /
> Environment / Related links), optionally appends a `## Tech Context` section
> when the soft-loaded PRD or architecture content from step-01 yields relevant
> bullets, presents the composed result for user review, and sets `{bug_title}`
> and `{bug_description}` for step-05's `createTask` call.
>
> No `bmad-create-story` delegation, no architecture guardrail extraction, no BDD
> criteria generation. No TypeScript is touched; this story ships markdown only.

## Story

As a **developer** using the `clickup-create-bug` skill,
I want step 4 to parse my free-form bug report into a structured, bug-shaped
ClickUp description and let me review it before task creation,
so that the created ticket captures repro steps, expected/actual behaviour,
impact, and suspected area in a consistent format, without fabricating details
not present in my report.

## Acceptance Criteria

### Step file structure

1. `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`
   MUST contain the implemented description-composer logic. The stub block is
   replaced; no other file is created or deleted.

2. **YAML front-matter** MUST retain the five keys established by story 7-2 and
   consumed by step-05, with their original comments intact:

   ```yaml
   ---
   # pass-through from step-01 (soft-loaded; may be '' if files were missing)
   prd_content: ''
   architecture_content: ''
   epics_content: ''
   # outputs set by this step
   bug_title: ''
   bug_description: ''
   ---
   ```

   No keys are added, removed, or renamed. Exact key spelling matters — step-05
   reads `bug_title` as `createTask` `name` and `bug_description` as
   `createTask` `description`.

3. **`## STATUS` block replaced.** The `🚧 Not yet implemented — story 7-4` stub
   block (including the `See:` link and its surrounding content) is removed and
   replaced with `## RULES` and `## INSTRUCTIONS` sections.

4. **`## NEXT` line preserved** byte-for-byte. The pointer to
   `step-05-create-task.md` MUST remain unchanged.

### RULES section

5. The `## RULES` section MUST include these four rules:

   (a) **No delegation.** MUST NOT invoke `bmad-create-story`,
   `bmad-create-epic`, or any other BMAD workflow. The bug description is parsed
   directly from the user's raw report.

   (b) **No fabrication.** The description MUST NOT invent repro steps, expected
   behaviour, technical constraints, or any other detail not present in the
   user's report or the soft-loaded planning artifacts. Sections that cannot be
   populated from available inputs MUST use "Not specified."

   (c) **Optional enrichment.** If `{prd_content}` or `{architecture_content}`
   (set by step-01) is non-empty, the step MAY add a `## Tech Context` section
   with ≤3 bullets from architecture and ≤2 bullets from the PRD relevant to the
   suspected area. If neither artifact yields relevant content, the section MUST
   be omitted entirely — no empty heading.

   (d) **Blocking.** MUST NOT proceed to step 5 if `{bug_title}` or
   `{bug_description}` is empty at the end of this step.

### INSTRUCTIONS section

6. **Bug report collection.** The step MUST ask:

   > "Please describe the bug. You can paste a free-form report, a stack trace,
   > or a brief description."

   Accept any multi-line input; store as `{raw_bug_report}`. If the user
   provides an empty response, re-ask once; if still empty, stop with:

   > ❌ **Description composer failed — no bug report provided.**
   >
   > Please re-invoke the skill and paste or type a bug description when prompted.

7. **Section parsing.** Extract the following sections from `{raw_bug_report}`:

   | Section                | Extraction rule                                                                                                        |
   | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
   | **Summary**            | First sentence, error message header, or first meaningful line. Single line, max ~80 characters. Set as `{bug_title}`. |
   | **Steps to reproduce** | Numbered list from the report. "Not specified" if absent. Always included.                                             |
   | **Expected behaviour** | What the user expected. Omit section if absent.                                                                        |
   | **Actual behaviour**   | What actually happened. Omit section if absent.                                                                        |
   | **Impact / severity**  | Severity inferred from keywords (see Dev Notes). Include a one-line impact note. Always included.                      |
   | **Suspected area**     | Component, file, function, or feature area mentioned or implied. Omit if absent.                                       |
   | **Environment**        | OS, Node.js version, browser, MCP client — extract verbatim if mentioned. Omit section if nothing found.               |
   | **Related links**      | URLs, ClickUp task IDs, GitHub issue refs found in the report. Omit section if none.                                   |

   MUST NOT invent content for any section. Lean toward "Not specified" over a
   plausible guess. Only omit the heading when directed to "Omit section" above.

8. **Optional enrichment.** After parsing, if at least one of `{prd_content}` or
   `{architecture_content}` is non-empty:
   - Search `{architecture_content}` for content relevant to the suspected area.
     If found, compose ≤3 concise bullets on the relevant stack or constraints.
   - Search `{prd_content}` for functional requirements relevant to the suspected
     area. If found, compose ≤2 concise bullets.
   - If at least one bullet was produced, include a `## Tech Context` section in
     the description. If no relevant content was found in either artifact, omit
     the section entirely.

9. **Description template.** Compose `{bug_description}` following this structure.
   Omit any optional section (heading included) when its content is absent per the
   rules in AC #7 and #8:

   ```text
   ## Summary

   {bug_title}

   ## Steps to Reproduce

   1. …

   ## Expected Behaviour

   …

   ## Actual Behaviour

   …

   ## Impact / Severity

   **Severity:** {Critical|High|Medium|Low}

   {one-line impact note}

   ## Suspected Area

   {component or feature}

   ## Environment

   - OS: …
   - Node.js: …
   - {other details}

   ## Related Links

   - {URL or ticket ref}

   ## Tech Context

   _Synthesized from available planning artifacts._

   - {bullet 1}
   - …

   ---

   _Created by Dev agent via bmad-mcp-server `clickup-create-bug` skill._
   ```

   The inner `---` divider and the footer line are required. The `## Tech Context`
   section appears only when AC #8 produces at least one bullet.

   If `{target_list_name}` (set by step-02) is non-empty, append
   ` Target list: {target_list_name}.` to the footer line. If empty (step-02 is
   still a stub), omit the clause entirely — the footer MUST NOT read
   "Target list: ."

10. **User review loop.** Present the composed description:

    ```
    🐛 **Proposed bug ticket for "{bug_title}":**

    ---
    {bug_description}
    ---

    Does this look correct? [Y/n/edit]
    ```

    - `Y` or Enter → proceed.
    - `n` → ask "What would you like to change?", accept feedback, regenerate
      applying the requested changes, re-present. Repeat until confirmed.
    - `edit` → instruct the user to paste the full revised description terminated
      by a line containing only `---END---`. Parse the pasted text as the new
      `{bug_description}`; extract the content of the `## Summary` section as the
      new `{bug_title}` (single line). Confirm back to the user before proceeding.

    The loop MUST NOT auto-approve. It runs until the user explicitly types `Y`
    or abandons the skill.

11. **Confirmation.** After the user approves, emit:

    > ✅ Bug description set for "{bug_title}". Continuing to task creation…

    Then proceed to step 5.

### No TypeScript changes

12. No `.ts` files are created or modified. `git diff --stat -- 'src/**/*.ts'`
    MUST be empty.

13. No test files are created or modified. `git diff --stat -- tests/` MUST be
    empty.

14. `npm run build`, `npm run lint`, `npm run format`, `npm test` all pass with
    no new failures.

### sprint-status.yaml updated

15. `7-4-bug-description-composer` transitions `backlog` → `ready-for-dev` when
    this story file is saved, and → `done` when implementation is complete.

### Commit

16. Commit message MUST follow Conventional Commits:

    ```
    feat(custom-skills): implement bug description composer (story 7-4)
    ```

    Body MUST reference story 7.4, name the modified step file, and note that
    `{prd_content}` / `{architecture_content}` enrich the description optionally.

## Out of Scope

- List / sprint picker (story 7-5) — step-02 remains a stub; the description
  footer handles empty `{target_list_name}` gracefully.
- Epic parent picker (story 7-7, EPIC-8 dependency) — step-03 remains a stub;
  `{epic_id}` is not used in description composition.
- Severity-to-priority wiring in `createTask` (story 7-6) — the severity parsed
  here appears only in `{bug_description}` text; the ClickUp `priority` field is
  set by story 7-6.
- `bug` tag wiring (story 7-6).
- Tests and fixtures (story 7-9).
- Documentation updates (story 7-10).
- Any changes to `clickup-create-story`, `clickup-create-epic`, or
  `clickup-dev-implement`.

## Tasks / Subtasks

- [x] **Task 1 — Implement `step-04-description-composer.md` (AC: #1–#11)**
  - [x] Remove the `## STATUS` stub block entirely (heading + body).
  - [x] Add `## RULES` section with four rules: no-delegation, no-fabrication,
        optional-enrichment, blocking (AC #5).
  - [x] Add `## INSTRUCTIONS` section with numbered steps matching ACs #6–#11:
        bug-report collection, section parsing, optional enrichment, description
        template assembly (inlined via `text`-fenced block), user review loop,
        confirmation emit.
  - [x] Verify front-matter is byte-unchanged (five keys + comments as in AC #2).
  - [x] Verify `## NEXT` line is byte-unchanged (AC #4).

- [x] **Task 2 — Regression verification (AC: #12–#14)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `npm run build && npm run lint && npm run format && npm test` → clean (pre-existing dependency-audit failure in vendored clickup tools, unrelated).

- [x] **Task 3 — Update sprint-status.yaml (AC: #15)**
  - [x] Set `7-4-bug-description-composer: done`.
  - [x] Update `last_updated` field.

- [x] **Task 4 — Commit (AC: #16)**
  - [x] Stage: `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`,
        `planning-artifacts/stories/7-4-bug-description-composer.md`,
        `planning-artifacts/sprint-status.yaml`.
  - [x] Commit with header + body per AC #16.

## Dev Notes

### Exact change surface in `step-04-description-composer.md`

The file already exists at
`src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`.
Its current content is:

```
---
# pass-through from step-01 (soft-loaded; may be '' if files were missing)
prd_content: ''
architecture_content: ''
epics_content: ''
# outputs set by this step
bug_title: ''
bug_description: ''
---

# Step 4: Description Composer

## STATUS

🚧 **Not yet implemented — story 7-4**

This step will: parse the user's free-form bug report into a bug-shaped description
template (Summary / Steps to reproduce / Expected / Actual / Impact / Suspected area /
Environment / Related links). No `bmad-create-story` delegation — extracts sections
directly from the user's report.

See: [EPIC-7 story 7-4](../../../../planning-artifacts/epics/EPIC-7-bug-shaped-stories.md)

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md).
```

**Surgical diff — what changes:**

| Region                                      | Action                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| Lines 1–8 (front-matter)                    | **KEEP byte-for-byte** — including both comment lines        |
| `# Step 4: Description Composer` (H1)       | **KEEP**                                                     |
| `## STATUS` block + stub body + `See:` link | **DELETE** entirely — 8 lines gone                           |
| _(gap between H1 and `## NEXT`)_            | **INSERT** `## RULES` section then `## INSTRUCTIONS` section |
| `## NEXT` + pointer line                    | **KEEP byte-for-byte**                                       |

The finished file structure must be:

```
---
[front-matter — unchanged]
---

# Step 4: Description Composer

## RULES
[4 bullet rules]

## INSTRUCTIONS
[numbered steps 1–6]

## NEXT
Proceed to [step-05-create-task.md](./step-05-create-task.md).
```

### Section structure pattern (derived from implemented step-01)

Read `src/custom-skills/clickup-create-bug/steps/step-01-prereq-check.md` as
the authoritative structural template. The pattern it establishes:

- `## RULES` — flat bullet list, short imperatives, no sub-headings
- `## <Named Section>` — (step-01 uses `## Permission Gate`; step-04 has no named gate section)
- `## INSTRUCTIONS` — flat numbered list, each item bolded title + body
- `## NEXT` — single pointer sentence

Step-04 does not need a named gate section (no permission check here — that
was step-01's job). Use `## RULES` then `## INSTRUCTIONS` directly, mirroring
the two-section shape of step-01's post-gate content.

### Reference divergence: bug step-04 vs story step-04

The reference file at
`src/custom-skills/clickup-create-story/steps/step-04-description-composer.md`
MUST NOT be copied. It diverges in every substantive way:

| Concern               | Story step-04 (reference — WRONG for bugs)                              | Bug step-04 (THIS story — correct)                                                                             |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Front-matter keys     | `epic_description`, `story_title`, `story_entry`, `task_description`    | `prd_content`, `architecture_content`, `epics_content`, `bug_title`, `bug_description`                         |
| Output variable names | `{task_description}` + `{story_title}`                                  | `{bug_description}` + `{bug_title}`                                                                            |
| Composition method    | Delegates to `bmad-create-story` via `bmad` execute operation           | Direct extraction from user's raw report — no delegation                                                       |
| Planning artifacts    | Required (hard-fail if missing)                                         | Optional (soft-loaded by step-01; may be `''`)                                                                 |
| ClickUp API calls     | `getTaskById` to fetch epic description                                 | None — this step makes no tool calls                                                                           |
| Description shape     | Feature-shaped (Business Context, Technical Context, Epic, Scope Notes) | Bug-shaped (Summary, Steps to Reproduce, Expected, Actual, Impact, Suspected Area, Environment, Related Links) |
| Blocking variable     | `{task_description}`                                                    | `{bug_title}` AND `{bug_description}`                                                                          |

**Do not call `getTaskById`.** That is the story step-04 pattern. Bug step-04
makes zero ClickUp API calls. All information comes from the user's text input
and the pre-loaded `{prd_content}` / `{architecture_content}` strings.

**Do not call `bmad(...)`.** The story step-04 calls `bmad({ operation:
'execute', workflow: 'bmad-create-story' })`. Bug step-04 does NOT delegate to
any BMAD workflow.

### Front-matter key contracts across all steps

Exact front-matter keys as they exist today in each file:

**step-01** (implemented — source of truth for soft-loaded vars):

```yaml
prd_content: ''
architecture_content: ''
epics_content: ''
resolve_doc_paths_result: ''
```

**step-02** (stub — story 7-5):

```yaml
space_id: ''
space_name: ''
target_list_id: ''
target_list_name: ''
```

**step-03** (stub — story 7-7):

```yaml
epic_id: ''
epic_name: ''
```

**step-04** (THIS story — current stub, must be preserved):

```yaml
# pass-through from step-01 (soft-loaded; may be '' if files were missing)
prd_content: ''
architecture_content: ''
epics_content: ''
# outputs set by this step
bug_title: ''
bug_description: ''
```

**step-05** (stub — stories 7-6 + 7-7 — reads these from step-04):

```yaml
target_list_id: ''
target_list_name: ''
epic_id: '' # '' when step-03 was skipped — omit parent_task_id
epic_name: ''
bug_title: ''
bug_description: ''
created_task_id: ''
created_task_url: ''
```

Step-05's front-matter confirms the two required outputs: `bug_title` →
`createTask` `name`, `bug_description` → `createTask` `description`. Tags and
`priority` are set by story 7-6 in step-05; step-04 does not touch them.

### Prettier `---` divider trap

Prettier config (`.prettierrc`): `singleQuote: true`, `printWidth: 80`,
`tabWidth: 2`, `semi: true`. Prettier converts bare `---` horizontal rules
inside markdown to `***` when they appear at the top level of a numbered list
item or inside a fenced code block that uses the same delimiter.

**The trap:** If you write the description template inside a triple-backtick
fenced block, any inner `---` dividers get reformatted to `***` on `npm run
format`. The dev agent reading the step file then sees `***` and may not
recognise them as `---` separators.

**The fix (established in story 2-5, confirmed via debug log):** Wrap the
description template in a **`text`-language fenced block** (triple-backtick
with explicit `text` tag). Prettier preserves the literal content of `text`
blocks without reformatting their internals. The INSTRUCTIONS section in
step-04 must use exactly this form for the template:

````
```text
## Summary
...
---
_Created by Dev agent…_
```
````

Run `npm run format` before staging and verify the `---` lines survive
unchanged.

### Variable flow at step-04 runtime

At the point step-04 executes, the BMAD agent's working context contains:

| Variable                 | Value origin      | Expected content                                    |
| ------------------------ | ----------------- | --------------------------------------------------- |
| `{prd_content}`          | step-01 soft-load | Full PRD markdown, or `''` if file missing          |
| `{architecture_content}` | step-01 soft-load | Full architecture markdown, or `''` if file missing |
| `{epics_content}`        | step-01 soft-load | Concatenated EPIC-\*.md files, or `''`              |
| `{target_list_id}`       | step-02 (stub)    | `''` until story 7-5 lands                          |
| `{target_list_name}`     | step-02 (stub)    | `''` until story 7-5 lands                          |
| `{epic_id}`              | step-03 (stub)    | `''` until story 7-7 lands                          |
| `{epic_name}`            | step-03 (stub)    | `''` until story 7-7 lands                          |

Step-04 must handle every variable being `''` without failing. The only input
it cannot proceed without is the user's raw bug report (AC #6 re-ask + hard
stop handles the empty case).

### `{raw_bug_report}` is a local-only variable

`{raw_bug_report}` is set during this step to hold the user's input text. It
MUST NOT be added to the YAML front-matter. The front-matter contract (five
keys with their comments) must be preserved byte-for-byte. Adding extra keys
would break the downstream expectation that step-04's front-matter carries
only the soft-load pass-throughs and the two outputs.

### Severity inference table

Informational only — applies to `{bug_description}` text. Mapping to ClickUp
`priority` belongs to story 7-6. Step-05's `createTask` call (story 7-6) will
read severity from the description or infer it independently; this step does
not need to set any external severity variable.

| Severity | Keywords (non-exhaustive)                            |
| -------- | ---------------------------------------------------- |
| Critical | crash, data loss, security, unrecoverable, corrupted |
| High     | broken, fails, cannot, unable, blocked, error        |
| Medium   | slow, wrong, inconsistent, unexpected, regression    |
| Low      | cosmetic, minor, typo, formatting, style             |

Default to **High** when no keyword matches.

### Footer clause when step-02 is still a stub

Step-02's `{target_list_name}` will be `''` until story 7-5 lands. The footer
line in `{bug_description}` must handle this:

```
# CORRECT — target_list_name is non-empty:
_Created by Dev agent via bmad-mcp-server `clickup-create-bug` skill. Target list: Sprint 4._

# CORRECT — target_list_name is '' (stub):
_Created by Dev agent via bmad-mcp-server `clickup-create-bug` skill._

# WRONG — renders "Target list: ." with empty value:
_Created by Dev agent via bmad-mcp-server `clickup-create-bug` skill. Target list: ._
```

### Analogy to story 7-3 (soft-load pattern)

Story 7-3 established that `{prd_content}` and `{architecture_content}` may
be `''` and the skill must continue regardless. Story 7-4 consumes that
contract. The optional-enrichment rule (AC #5c) is the downstream expression
of that pattern: when both are empty, the `## Tech Context` section is simply
omitted — no error, no warning.

### Files changed by this story

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`
  — `## STATUS` stub deleted; `## RULES` + `## INSTRUCTIONS` inserted between
  H1 and `## NEXT`
- `planning-artifacts/stories/7-4-bug-description-composer.md` (this file)
- `planning-artifacts/sprint-status.yaml` (status update)

**No other files change.** Do not touch `workflow.md` — its `## Description
Composer` section already accurately describes step-04's behaviour and the
`See:` pointer already points to the step file.

### Git pattern

Commit message for story 7-3 (direct analogue):
`feat(custom-skills): implement bug prereq check with soft artifact loading (story 7-3)`

Story 7-4 commit:
`feat(custom-skills): implement bug description composer (story 7-4)`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**Modified**

- `src/custom-skills/clickup-create-bug/steps/step-04-description-composer.md`
- `planning-artifacts/stories/7-4-bug-description-composer.md`
- `planning-artifacts/sprint-status.yaml`

**New / Deleted**

- (none)

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-05-01 | Story drafted. Status → ready-for-dev. |
| 2026-05-01 | Implemented step-04-description-composer.md. Status → done. |
| 2026-05-01 | Code review fixes: clarified whitespace trimming on empty input, enforced single-line ~80 char bug_title in edit mode, removed contradictory "proceed / do not proceed" language in step 6. |
