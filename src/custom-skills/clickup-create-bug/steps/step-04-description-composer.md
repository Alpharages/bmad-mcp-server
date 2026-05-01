---
# pass-through from step-01 (soft-loaded; may be '' if files were missing)
prd_content: ''
architecture_content: ''
epics_content: ''
gitnexus_available: false
# outputs set by this step
bug_title: ''
bug_description: ''
code_location: ''
root_cause: ''
suggested_fix: ''
---

# Step 4: Description Composer

## RULES

- **No delegation.** MUST NOT invoke `bmad-create-story`, `bmad-create-epic`, or any other BMAD workflow. The bug description is parsed directly from the user's raw report.
- **No fabrication.** The description MUST NOT invent repro steps, expected behaviour, technical constraints, or any other detail not present in the user's report or the soft-loaded planning artifacts. Sections that cannot be populated from available inputs MUST use "Not specified."
- **Code investigation is NOT fabrication.** Searching the codebase, reading relevant files, tracing stack traces, and analyzing the suspected area to extract exact file paths, function names, and line numbers is REQUIRED context enrichment — not invention. The dev agent MUST receive precise location data.
- **Optional enrichment.** If `{prd_content}` or `{architecture_content}` (set by step-01) is non-empty, the step MAY add a `## Tech Context` section with ≤3 bullets from architecture and ≤2 bullets from the PRD relevant to the suspected area. If neither artifact yields relevant content, the section MUST be omitted entirely — no empty heading.
- **Blocking.** MUST NOT proceed to step 5 if `{bug_title}` or `{bug_description}` is empty at the end of this step.

## INSTRUCTIONS

1. **Bug report collection.** Ask:

   > "Please describe the bug. You can paste a free-form report, a stack trace, or a brief description."

   Accept any multi-line input; store as `{raw_bug_report}`. If the user provides an empty response (or whitespace-only after trimming), re-ask once; if still empty, stop with:

   > ❌ **Description composer failed — no bug report provided.**
   >
   > Please re-invoke the skill and paste or type a bug description when prompted.

2. **Section parsing.** Extract the following sections from `{raw_bug_report}`:

   | Section                | Extraction rule                                                                                                        |
   | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
   | **Summary**            | First sentence, error message header, or first meaningful line. Single line, max ~80 characters. Set as `{bug_title}`. |
   | **Steps to reproduce** | Numbered list from the report. "Not specified" if absent. Always included.                                             |
   | **Expected behaviour** | What the user expected. Omit section if absent.                                                                        |
   | **Actual behaviour**   | What actually happened. Omit section if absent.                                                                        |
   | **Impact / severity**  | Severity inferred from keywords (see table below). Include a one-line impact note. Always included.                    |
   | **Suspected area**     | Component, file, function, or feature area mentioned or implied. Omit if absent.                                       |
   | **Environment**        | OS, Node.js version, browser, MCP client — extract verbatim if mentioned. Omit section if nothing found.               |
   | **Related links**      | URLs, ClickUp task IDs, GitHub issue refs found in the report. Omit section if none.                                   |
   | **Test notes / QA hints**| Any test steps, verification notes, or QA guidance mentioned by the reporter. Omit section if absent.                  |

   MUST NOT invent content for any section. Lean toward "Not specified" over a plausible guess. Only omit the heading when directed to "Omit section" above.

   **Severity inference:**

   | Severity | Keywords (non-exhaustive)                            |
   | -------- | ---------------------------------------------------- |
   | Critical | crash, data loss, security, unrecoverable, corrupted |
   | High     | broken, fails, cannot, unable, blocked, error        |
   | Medium   | slow, wrong, inconsistent, unexpected, regression    |
   | Low      | cosmetic, minor, typo, formatting, style             |

   Default to **High** when no keyword matches. When keywords match multiple severity levels, use the highest matching level.

3. **Deep artifact analysis (BMAD-style).** Before code investigation, analyze planning artifacts for traceability — this prevents reinventing context that already exists.

   **3a. Trace suspected area in artifacts.**
   - If `{epics_content}` is non-empty: search for any epic, story, or task that mentions the suspected area or a related feature. Extract the user-story statement, acceptance criteria, and technical requirements. Store as `{traced_epic_context}`.
   - If `{prd_content}` is non-empty: search for functional requirements, user flows, or feature definitions related to the suspected area. Extract the relevant requirements and store as `{traced_prd_context}`.
   - If `{architecture_content}` is non-empty: search for the tech stack, API patterns, database schemas, or security rules relevant to the suspected area. Extract the relevant architecture notes and store as `{traced_arch_context}`.

   **3b. Derive BDD test scenarios from traceability.**
   - If acceptance criteria were found in `{traced_epic_context}`, convert them into BDD Given/When/Then format. These become the seed for the QA section later.
   - If no acceptance criteria exist, derive plausible test scenarios from the functional requirements in `{traced_prd_context}`.

   Store the findings as `{traced_test_scenarios}`.

4. **Code investigation (REQUIRED).** Investigate the codebase to produce context-rich location data for the dev agent.

   **4a. Extract code references from `{raw_bug_report}`.**
   - Scan for file paths, function names, class names, error codes, or stack-trace lines.
   - If a stack trace is present, parse the top-most project frames (skip library/framework frames) to identify the exact file and line where the error originates.

   **4b. Search the suspected area — GitNexus path (when `{gitnexus_available}` is `true`).**
   - Use GitNexus `query` with the suspected area or component name as the query string. Search for execution flows, functions, and files related to the bug.
   - If the bug mentions a specific error message or function, use GitNexus `context` on that symbol to get callers, callees, and process participation.
   - Read the relevant source files identified by GitNexus to confirm exact file paths, function signatures, and line ranges.

   **4c. Search the suspected area — fallback path (when `{gitnexus_available}` is `false`).**
   - Use file-system grep or glob search for the suspected component, feature, or function name.
   - Read the relevant source files to confirm the file path, function signature, and approximate line range involved.
   - If the bug mentions a specific error message, grep for that message string in the source to locate where it is thrown or logged.

   **4d. Analyze root cause.**
   - Based on the actual code read in 4b/4c and the bug report, determine the most likely root cause.
   - Cross-reference with `{traced_arch_context}` to check if the bug violates an architectural guardrail (e.g., missing validation that architecture mandates).
   - Identify the specific logic path, missing guard clause, incorrect assumption, or state mismatch causing the failure.
   - If the root cause cannot be determined, state: "Root cause unclear from current information — requires deeper debugging during implementation."

   **4e. Suggest fix approach.**
   - Based on the root cause analysis and `{traced_arch_context}`, outline the minimal code change required to resolve the bug.
   - Specify which file(s) need modification, what kind of change (add validation, update condition, fix race condition, etc.), and which architecture patterns MUST be preserved.
   - Reference `{traced_epic_context}` to ensure the fix aligns with the original feature intent.
   - If a confident fix cannot be determined, state: "Suggested fix: investigate during implementation."

   Store the findings as:
   - `{code_location}` — exact file path(s), function/method name(s), line number(s) or range(s)
   - `{root_cause}` — concise root cause statement
   - `{suggested_fix}` — step-by-step fix outline

5. **Optional enrichment.** After parsing and investigation, if at least one of `{prd_content}` or `{architecture_content}` is non-empty:
   - Search `{architecture_content}` for content relevant to the suspected area. If found, compose ≤3 concise bullets on the relevant stack or constraints.
   - Search `{prd_content}` for functional requirements relevant to the suspected area. If found, compose ≤2 concise bullets.
   - If at least one bullet was produced, include a `## Tech Context` section in the description. If no relevant content was found in either artifact, omit the section entirely.

6. **Description template assembly.** Compose `{bug_description}` following this structure. Omit any optional section (heading included) when its content is absent per the rules in steps 2 and 5:

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

   ## Traced Requirements

   _Traceability from planning artifacts — ensures the fix aligns with original intent._

   **Related epic / story:**
   {traced_epic_context or "Not traced"}

   **Relevant PRD requirements:**
   {traced_prd_context or "Not traced"}

   ## Code Location

   _Investigated from the codebase — exact files and functions the dev agent must touch._

   - **File(s):** {code_location}
   - **Function / Method:** {function or class names}
   - **Line(s):** {line numbers or ranges}

   ## Root Cause

   {root_cause}

   ## Suggested Fix

   {suggested_fix}

   ## QA / Testing Notes

   _Generated from the bug report for the QA team._

   **How to verify the fix:**
   1. Follow the reproduction steps above and confirm the issue no longer occurs.
   2. Verify the expected behaviour is restored under the same environment.

   **Edge cases to check:**
   - [ ] Same flow under different user roles / permissions (if applicable).
   - [ ] Same flow after clearing cache / hard refresh (for UI bugs).
   - [ ] Re-try with invalid or empty inputs where relevant.
   - [ ] Concurrent or repeated execution (if race condition suspected).

   **Regression areas:**
   - [ ] Related features or adjacent components that touch the suspected area.
   - [ ] Any integration points mentioned in the tech context or related links.

   **Test environment:**
   - Same as the environment section above, or a staging equivalent.
   - If `{traced_arch_context}` mentions specific environment constraints (e.g., feature flags, API versions), include them here.

   ## Tech Context

   _Synthesized from available planning artifacts._

   - {bullet 1}
   - …

   ---

   _Created by Dev agent via bmad-mcp-server `clickup-create-bug` skill._
   ```

   The inner `---` divider and the footer line are required.
   - The `## Tech Context` section appears only when step 5 produces at least one bullet.
   - The `## Code Location`, `## Root Cause`, and `## Suggested Fix` sections appear only when step 4 (code investigation) produces non-empty findings. If the investigation yields nothing, omit all three sections entirely — do not leave empty headings.
   - The `## Traced Requirements` section appears only when step 3 (deep artifact analysis) produces non-empty `{traced_epic_context}` or `{traced_prd_context}`.
   - The `## QA / Testing Notes` section is always included (unless the user explicitly removes it during the edit loop).

   If `{target_list_name}` (set by step-02) is non-empty, append ` Target list: {target_list_name}.` to the footer line. If empty (step-02 is still a stub), omit the clause entirely — the footer MUST NOT read "Target list: ."

7. **User review loop.** Present the composed description:

   ```
   🐛 **Proposed bug ticket for "{bug_title}":**

   ~~~
   {bug_description}
   ~~~

   Does this look correct? [Y/n/edit]
   ```

   - `Y` or Enter → proceed.
   - `n` → ask "What would you like to change?", accept feedback, regenerate applying the requested changes, re-present. Repeat until confirmed.
   - `edit` → instruct the user to paste the full revised description terminated by a line containing only `---END---`. Parse the pasted text as the new `{bug_description}`; extract the first line of the `## Summary` section as the new `{bug_title}` (single line, max ~80 characters). Confirm back to the user before proceeding.

   The loop MUST NOT auto-approve. It runs until the user explicitly types `Y` or abandons the skill.

8. **Confirmation and hand-off.** After the user approves, emit:

   > ✅ Bug description set for "{bug_title}". Continuing to task creation…

   Then proceed to the next step **only if** both `{bug_title}` and `{bug_description}` are non-empty. If either is empty, stop immediately — do not proceed to step 5.

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md).
