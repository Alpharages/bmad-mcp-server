---
ai_qa_verdict: ''
ai_qa_findings: ''
test_suite_result: ''
---

# Step 4: Code-Access QA Pass

> **Inherited context:** `{ai_qa_notes}`, `{acceptance_criteria}`, `{changed_files}`, `{commit_list}`, `{run_code_pass}`, `{prd_loaded}`, `{architecture_loaded}`, and any prior Lore lessons surfaced in step 3 are available.

> **Lessons-first:** if step 3 surfaced prior Lore lessons, add a verification for each one to the checklist below and treat them as priority checks — confirm the described defect class did not recur in this change.

**Your Role here:** QA engineer with repository access. You verify the implementation against its acceptance criteria and QA notes. You are NOT the developer — you do not fix anything.

## RULES

1. **Hard read-only on the repo.** This pass MUST NOT create, modify, or delete any source file or test file, and MUST NOT commit, stage, or stash. Running the existing test suite and reading code/git is allowed. If you discover a bug, you record it as a finding — you do not fix it, and you do not write a new test to prove it. (Fixing and new tests belong to `clickup-dev-implement`. Authoring new tests here was explicitly excluded from this skill's scope.)
2. **Skip cleanly.** If `{run_code_pass}` is `'false'`, set `{ai_qa_verdict}` = `'skipped'`, `{ai_qa_findings}` = `'No code-access QA inputs.'`, `{test_suite_result}` = `'not run'`, emit a one-line skip notice, and proceed to step 5.
3. **Environment failure is non-fatal.** If the test suite cannot run (deps missing, no runner, build broken before your involvement), mark affected scenarios `BLOCKED` with the reason, capture the error in `{test_suite_result}`, and continue tracing the rest by reading code. A blocked suite does not by itself mean `fail`.
4. **Evidence-bound verdicts.** Every PASS/FAIL must cite concrete evidence — a test name + result, or a `file:line` reference showing the code path. No verdict from assumption.

## INSTRUCTIONS

### 1. Run the existing test suite

Detect the project's test runner from its manifest and conventions (e.g. `package.json` scripts like `test`/`test:unit`/`test:e2e`; `pytest`/`pyproject.toml`; `go test`; `cargo test`; a Makefile target). Run the suite (prefer the narrowest command that covers the changed area when the full suite is slow, but run the full suite if scope is unclear). Capture into `{test_suite_result}`: command run, totals (passed/failed/skipped), and the names + messages of any failures. If no runner exists, set `{test_suite_result}` = `'no test runner detected'`.

### 2. Build the scenario checklist

Derive the checklist from, in priority order:
1. Explicit scenarios in `{ai_qa_notes}` (Given/When/Then, edge cases, regression risks, test-data/setup notes).
2. Acceptance criteria in `{acceptance_criteria}` (when QA notes are thin or absent — turn each AC into a verifiable scenario).

Cross-reference against the PRD/architecture (if loaded) only to judge intent where an AC is ambiguous.

### 3. Trace each scenario through the implementation

For each checklist item, determine whether the real code satisfies it. Use GitNexus when available (`gitnexus_query` / `gitnexus_context` for execution flows and symbol context) and fall back to grep / file reads otherwise. Anchor on `{changed_files}` and `{commit_list}` when present; otherwise locate the relevant code from the scenario itself. Pay explicit attention to:

- **Edge cases & boundaries** named in the notes (empty/invalid/oversized inputs, nulls, concurrency, error branches).
- **Regression risks** named in the notes — read the adjacent code/integration the note flags and confirm it isn't broken by the change.
- **Error and failure paths**, not just the happy path.

Assign each item one of: `PASS` (evidence the behaviour is correct), `FAIL` (evidence it is wrong or missing), `BLOCKED` (couldn't verify — env failure or insufficient access). Record the evidence inline.

### 4. Compute the pass verdict

- `{ai_qa_verdict}` = `'fail'` if any checklist item is `FAIL`, OR if a test that covers a checklist scenario failed in step 1.
- `{ai_qa_verdict}` = `'pass'` if no `FAIL` items and no covering-test failures (BLOCKED items are allowed but must be surfaced as caveats in the report).
- Store the full per-item results, with evidence, as `{ai_qa_findings}` (this feeds the report in step 6 — keep it structured: scenario → verdict → evidence).

### 5. Emit a compact pass summary

```
🧪 **Code-access QA pass complete — {ai_qa_verdict}**

- Test suite: {test_suite_result one-liner — e.g. "142 passed, 3 failed (npm test)"}
- Scenarios checked: {N} — {P} pass / {F} fail / {B} blocked
- Top failures: {one line each, or "none"}

Proceeding to step 5 (human-style visual QA pass).
```

## NEXT

Proceed to [step-05-human-qa-pass.md](./step-05-human-qa-pass.md).
