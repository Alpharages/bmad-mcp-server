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

## RULES

- **No delegation.** MUST NOT invoke `bmad-create-story`, `bmad-create-epic`, or any other BMAD workflow. The bug description is parsed directly from the user's raw report.
- **No fabrication.** The description MUST NOT invent repro steps, expected behaviour, technical constraints, or any other detail not present in the user's report or the soft-loaded planning artifacts. Sections that cannot be populated from available inputs MUST use "Not specified."
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

   MUST NOT invent content for any section. Lean toward "Not specified" over a plausible guess. Only omit the heading when directed to "Omit section" above.

   **Severity inference:**

   | Severity | Keywords (non-exhaustive)                            |
   | -------- | ---------------------------------------------------- |
   | Critical | crash, data loss, security, unrecoverable, corrupted |
   | High     | broken, fails, cannot, unable, blocked, error        |
   | Medium   | slow, wrong, inconsistent, unexpected, regression    |
   | Low      | cosmetic, minor, typo, formatting, style             |

   Default to **High** when no keyword matches. When keywords match multiple severity levels, use the highest matching level.

3. **Optional enrichment.** After parsing, if at least one of `{prd_content}` or `{architecture_content}` is non-empty:
   - Search `{architecture_content}` for content relevant to the suspected area. If found, compose ≤3 concise bullets on the relevant stack or constraints.
   - Search `{prd_content}` for functional requirements relevant to the suspected area. If found, compose ≤2 concise bullets.
   - If at least one bullet was produced, include a `## Tech Context` section in the description. If no relevant content was found in either artifact, omit the section entirely.

4. **Description template assembly.** Compose `{bug_description}` following this structure. Omit any optional section (heading included) when its content is absent per the rules in steps 2 and 3:

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

   The inner `---` divider and the footer line are required. The `## Tech Context` section appears only when step 3 produces at least one bullet.

   If `{target_list_name}` (set by step-02) is non-empty, append ` Target list: {target_list_name}.` to the footer line. If empty (step-02 is still a stub), omit the clause entirely — the footer MUST NOT read "Target list: ."

5. **User review loop.** Present the composed description:

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

6. **Confirmation and hand-off.** After the user approves, emit:

   > ✅ Bug description set for "{bug_title}". Continuing to task creation…

   Then proceed to the next step **only if** both `{bug_title}` and `{bug_description}` are non-empty. If either is empty, stop immediately — do not proceed to step 5.

## NEXT

Proceed to [step-05-create-task.md](./step-05-create-task.md).
