---
human_qa_verdict: ''
human_qa_findings: ''
browser_tool: ''
base_url: ''
---

# Step 5: Human-Style Visual QA Pass

> **Inherited context:** `{human_qa_notes}`, `{acceptance_criteria}`, `{run_visual_pass}`, `{supplied_base_url}`, `{task_name}`, and any prior Lore lessons surfaced in step 3 are available.

> **Lessons-first:** if step 3 surfaced prior Lore lessons describing user-facing defects (recurring visual regressions, broken edge cases), add a black-box scenario for each and treat them as priority checks.

**Your Role here:** Manual QA tester with NO code access. You only see what a user sees — the UI, deep links, API responses. Follow the Human QA Notes exactly as written, black-box. Do not reference source files, function names, or line numbers in your findings.

## RULES

1. **Skip cleanly when not applicable.** If `{run_visual_pass}` is `'false'`, set `{human_qa_verdict}` = `'skipped'`, `{human_qa_findings}` = `'No Human QA Notes / black-box inputs.'`, emit a one-line skip notice, and proceed to step 6.
2. **No browser MCP → skip, don't fake.** If neither a chrome-devtools nor a Playwright MCP is connected, set `{human_qa_verdict}` = `'skipped'`, record the reason in `{human_qa_findings}`, emit the no-browser advisory, and proceed to step 6. NEVER claim a visual result you did not actually observe through a driven browser.
3. **No URL → ask once, then skip.** If no base URL can be resolved (see instruction 2) and the user does not supply one when asked, set `{human_qa_verdict}` = `'skipped'` with the reason and proceed. Do not require a deploy comment — this skill assumes the app runs locally or at a URL the user gives.
4. **Black-box only.** Findings describe observable behaviour and reference screenshots — never code.
5. **Action failure is non-fatal.** If a browser action errors mid-scenario (selector not found, navigation timeout), mark that scenario `BLOCKED` with what happened and the last screenshot, and continue with the remaining scenarios.

## INSTRUCTIONS

### 1. Detect the browser MCP

Check the connected MCP tools, in preference order:
- **chrome-devtools** — tools prefixed `mcp__chrome-devtools__` (`navigate_page`, `click`, `fill`, `take_screenshot`, `take_snapshot`, `wait_for`, etc.). Set `{browser_tool}` = `'chrome-devtools'`.
- **Playwright** — a connected Playwright MCP (tools for navigate / click / fill / screenshot). Set `{browser_tool}` = `'playwright'`.
- If neither is present, apply RULE 2.

### 2. Resolve the base URL

Resolve `{base_url}` in this order; use the first that yields a reachable app:

1. **User-supplied** — if `{supplied_base_url}` is non-empty, use it.
2. **Local dev server** — probe common local conventions for a running dev server (e.g. `http://localhost:3000`, `:5173`, `:8080`, `:4200`, `:8000`; check the project manifest's dev script for a configured port). Use the first that responds.
3. **Human QA Notes** — if the notes contain an explicit test URL (staging/dev), use it.

If none resolve, ask the user once:

> 🌐 **Which URL should I run the visual QA against?**
>
> I couldn't find a running local dev server or a URL in the Human QA Notes for task `{task_id}` ({task_name}).
> Reply with a base URL (e.g. `http://localhost:3000`), or type `skip` to skip the visual pass.

Apply RULE 3 if the user skips or gives nothing usable.

### 3. Build the visual scenario list

- If `{human_qa_notes}` is non-empty: use its Setup & Preconditions, Test Steps (UI/API), Expected Visible Outcomes, Edge Cases to Try, Cross-cutting Checks, and Regression Areas as the script. Honor any test accounts/roles, feature flags, and seed-data notes it specifies.
- If `{human_qa_notes}` is empty (deriving from ACs): build a minimal black-box smoke check — load the primary screen(s) implied by each acceptance criterion and confirm the user-visible outcome of each AC.

### 4. Execute screen-by-screen

For each scenario, drive `{browser_tool}` like a tester:
- Navigate to the relevant screen / deep link under `{base_url}`; establish the stated preconditions (log in with the specified test account, enable flags, seed/select data).
- Perform the UI/API steps in order. Use the accessibility/DOM snapshot to locate elements rather than guessing coordinates.
- After each meaningful step, **capture a screenshot** and compare what's on screen against the **Expected Visible Outcome**. Note the screenshot reference alongside the observation.
- Run the **edge cases** (empty/invalid/oversized inputs, refresh mid-flow, back-button, double-submit, slow network where controllable).
- Do the **cross-cutting** spot-checks the notes call for (different roles/locales; resize the viewport for responsive checks if the notes mention devices/screen sizes).
- Click through the **manual regression areas** to confirm nothing adjacent broke.

Assign each scenario `PASS` (observed outcome matches expected), `FAIL` (mismatch — describe what you saw vs. expected, cite the screenshot), or `BLOCKED` (couldn't complete — app error, missing precondition).

### 5. Compute the visual verdict

- `{human_qa_verdict}` = `'fail'` if any scenario is `FAIL`.
- `{human_qa_verdict}` = `'pass'` if no `FAIL` (BLOCKED scenarios surfaced as caveats).
- Store per-scenario results with screenshot references and observed-vs-expected notes as `{human_qa_findings}`.

### 6. Emit a compact pass summary

```
🖥️ **Visual QA pass complete — {human_qa_verdict}**

- Browser: {browser_tool} @ {base_url}
- Scenarios run: {N} — {P} pass / {F} fail / {B} blocked
- Top failures: {one line each, or "none"}

Proceeding to step 6 (QA report).
```

### No-browser advisory block

> ⚠️ **Visual QA pass skipped — no browser MCP connected**
>
> The `clickup-qa` skill found neither a chrome-devtools nor a Playwright MCP server in the current session, so the screen-by-screen visual pass could not run.
>
> **Impact:** Only the code-access QA results will be reported. To enable visual QA, connect a browser MCP and re-invoke.

## NEXT

Proceed to [step-06-qa-report-poster.md](./step-06-qa-report-poster.md).
