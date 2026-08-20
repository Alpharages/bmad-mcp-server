---
human_qa_verdict: ''
human_qa_findings: ''
browser_tool: ''
base_url: ''
app_started_by_qa: ''
app_server_handle: ''
---

# Step 5: Human-Style Visual QA Pass

> **Inherited context:** `{human_qa_notes}`, `{acceptance_criteria}`, `{run_visual_pass}`, `{supplied_base_url}`, `{task_name}`, and any prior Lore lessons surfaced in step 3 are available.

> **Lessons-first:** if step 3 surfaced prior Lore lessons describing user-facing defects (recurring visual regressions, broken edge cases), add a black-box scenario for each and treat them as priority checks.

**Your Role here:** Manual QA tester with NO code access. You only see what a user sees — the UI, deep links, API responses. Follow the Human QA Notes exactly as written, black-box. Do not reference source files, function names, or line numbers in your findings.

## RULES

1. **Skip cleanly when not applicable.** If `{run_visual_pass}` is `'false'`, set `{human_qa_verdict}` = `'skipped'`, `{human_qa_findings}` = `'No Human QA Notes / black-box inputs.'`, emit a one-line skip notice, and proceed to step 6.
2. **No browser MCP → skip, don't fake.** If neither a chrome-devtools nor a Playwright MCP is connected, set `{human_qa_verdict}` = `'skipped'`, record the reason in `{human_qa_findings}`, emit the no-browser advisory, and proceed to step 6. NEVER claim a visual result you did not actually observe through a driven browser.
3. **App not running → start it, don't skip.** If no app is already reachable, do NOT skip for that reason. Resolve a URL the user supplied or one in the Human QA Notes first; otherwise **auto-start the project's dev server** (instruction 2a) and run against it. Only skip (`{human_qa_verdict}` = `'skipped'`) when the app genuinely cannot be started AND the user supplies no URL when asked once — never skip merely because nothing was running on first probe.
4. **Tear down what you start.** If you launched the dev server (`{app_started_by_qa}` = `'true'`), you MUST stop it in instruction 6 once the pass completes — leave the environment as you found it. Never kill a server you did not start.
5. **Black-box only.** Findings describe observable behaviour and reference screenshots — never code.
6. **Action failure is non-fatal.** If a browser action errors mid-scenario (selector not found, navigation timeout), mark that scenario `BLOCKED` with what happened and the last screenshot, and continue with the remaining scenarios.

## INSTRUCTIONS

### 1. Detect the browser MCP

Check the connected MCP tools, in preference order:

- **chrome-devtools** — tools prefixed `mcp__chrome-devtools__` (`navigate_page`, `click`, `fill`, `take_screenshot`, `take_snapshot`, `wait_for`, etc.). Set `{browser_tool}` = `'chrome-devtools'`.
- **Playwright** — a connected Playwright MCP (tools for navigate / click / fill / screenshot). Set `{browser_tool}` = `'playwright'`.
- If neither is present, apply RULE 2.

### 2. Resolve the base URL

Resolve `{base_url}` in this order; use the first that yields a reachable app. Leave `{app_started_by_qa}` = `'false'` for sources 1–3 (you did not launch the server); only instruction 2a sets it to `'true'`.

1. **User-supplied** — if `{supplied_base_url}` is non-empty, use it.
2. **Already-running local dev server** — probe common local conventions for a server already listening (e.g. `http://localhost:3000`, `:5173`, `:8080`, `:4200`, `:8000`; check the project manifest's dev script for a configured port). Use the first that responds.
3. **Human QA Notes** — if the notes contain an explicit test URL (staging/dev), use it.

If none of 1–3 resolve, do NOT skip — proceed to instruction 2a and start the app yourself.

### 2a. Auto-start the project's dev server

When no URL resolved above, launch the project locally before falling back to asking the user. **Prefer the project's own `run` skill if one is available** (check the available skills list for a project-specific launch skill, or the generic `run` skill) — it already encodes how this app starts. Otherwise detect and start it manually:

1. **Detect the start command and port.** Inspect the project manifest at the project root:
   - **Node** (`package.json`): prefer `scripts.dev`, then `scripts.start`, then `scripts.serve`. Read the port from the script flags (e.g. `next dev -p 4000`, `vite --port 5173`), framework config (`next.config.*`, `vite.config.*`, `vue.config.*`, `angular.json`), or `PORT` in `.env*`. Use the framework default if unspecified (Next/CRA `3000`, Vite `5173`, Angular `4200`, Nuxt `3000`).
   - **Other stacks** — Python (`manage.py runserver` → `8000`, `uvicorn`/`flask run` → `8000`/`5000`), Go, Rails (`bin/rails server` → `3000`), etc. — use the conventional dev command and port for the detected stack.
   - If no start command can be determined, skip auto-start and go to the "ask once" fallback below.
2. **Install dependencies if needed.** If the dependency dir is absent (e.g. `node_modules/` missing for a Node project), run the install command (`npm ci` / `npm install`, `pnpm i`, `yarn`) once before starting.
3. **Launch in the background.** Start the dev server as a background process (Bash with `run_in_background: true`) so it keeps running across the pass. Capture its handle/PID as `{app_server_handle}` and set `{app_started_by_qa}` = `'true'`. Set `{base_url}` to `http://localhost:{detected_port}`.
4. **Wait until ready.** Poll the base URL until it responds (HTTP 2xx/3xx/401), up to ~60s, before driving the browser. Watch the background process's output for the framework's "ready"/"compiled"/"listening" line and for startup errors.
   - If the server exits or fails to become ready within the timeout, capture the last ~30 lines of its output, treat auto-start as failed, and fall through to the "ask once" fallback below (include the failure reason).

**Ask-once fallback** (only reached if no URL resolved AND auto-start was impossible or failed):

> 🌐 **Which URL should I run the visual QA against?**
>
> I couldn't resolve a URL and couldn't auto-start the dev server for task `{task_id}` ({task_name}).
> {one-line reason: e.g. "no dev/start script found in package.json" or "dev server failed to become ready — <error>"}
> Reply with a base URL (e.g. `http://localhost:3000`), or type `skip` to skip the visual pass.

Apply RULE 3 only if the user then skips or gives nothing usable.

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

Evaluate in this order and stop at the first match:

- `{human_qa_verdict}` = `'fail'` if any scenario is `FAIL`.
- `{human_qa_verdict}` = `'inconclusive'` if the scenario list is non-empty but **no scenario reached `PASS` or `FAIL`** — i.e. every one is `BLOCKED`. A browser session that could not complete a single scenario (app erroring on every route, preconditions unreachable) verified nothing, and must not be reported as a pass.
- `{human_qa_verdict}` = `'pass'` if at least one scenario is `PASS` and none is `FAIL`. Any remaining `BLOCKED` scenarios MUST be surfaced as caveats.
- Store per-scenario results with screenshot references and observed-vs-expected notes as `{human_qa_findings}`.

### 6. Tear down and emit a compact pass summary

First, **stop the dev server if you started it** (RULE 4): if `{app_started_by_qa}` = `'true'`, terminate the background process at `{app_server_handle}` (and any child processes it spawned) and confirm the port is released. If the app was already running or user-/notes-supplied, leave it untouched.

Then emit:

```
🖥️ **Visual QA pass complete — {human_qa_verdict}**

- Browser: {browser_tool} @ {base_url}
- App: {auto-started by QA & torn down | already running | user-supplied URL}
- Scenarios run: {N} — {P} pass / {F} fail / {B} blocked
- Top failures: {one line each, or "none"}

Proceeding to step 6 (QA report).
```

### No-browser advisory block

> ⚠️ **Visual QA pass skipped — no browser MCP connected**
>
> The `bmad-clickup-qa` skill found neither a chrome-devtools nor a Playwright MCP server in the current session, so the screen-by-screen visual pass could not run.
>
> **Impact:** Only the code-access QA results will be reported. To enable visual QA, connect a browser MCP and re-invoke.

## NEXT

Proceed to [step-06-qa-report-poster.md](./step-06-qa-report-poster.md).
