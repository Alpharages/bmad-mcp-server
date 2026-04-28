# Story 1.3: Add `CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` env-var loading and validation

Status: ready-for-dev

Epic: [EPIC-1: ClickUp MCP integration layer](../epics/EPIC-1-clickup-mcp-integration.md)

> Third story in EPIC-1. Story 1.2 wired the vendored `register*Tools` functions into `BMADServerLiteMultiToolGit` behind a dynamic import and a bare presence check that emits a single `stderr` line when either env var is missing. This story replaces that shim with proper, user-facing validation: structured diagnostic output listing which var is missing, what format it should take, where to obtain it, and a soft-disable-by-default / hard-fail-on-opt-in posture that preserves BMAD-only usage while letting ClickUp-primary deployments (Docker, hosted HTTP) enforce presence at boot. Space discovery stays interactive and is story 1.4's problem.

## Story

As the **bmad-mcp-server platform maintainer**,
I want `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` validated at server startup with actionable diagnostics (which var is missing, expected shape, where to get it) and a documented `BMAD_REQUIRE_CLICKUP` opt-in that converts the default soft-disable into a hard-fail,
so that a ClickUp-primary deployment (e.g. the Docker image + HTTP transport in `src/http-server.ts`) can refuse to boot silently-misconfigured rather than serving a ClickUp-less tool surface, while a BMAD-only developer running `node build/index.js` locally still gets a clean startup with a one-paragraph notice explaining what is disabled and how to enable it — all without loading the vendored `src/tools/clickup/src/shared/config.ts` (which throws at module-evaluation time when either var is empty) and without changing the `bmad` tool surface.

## Acceptance Criteria

1. A dedicated validator module `src/utils/clickup-env.ts` is introduced. Its sole responsibility is to inspect `CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, and (optionally) `CLICKUP_MCP_MODE` from an injected env map, and return a discriminated-union result of one of three shapes — every variant carries a `warnings: readonly string[]` field so the caller can iterate warnings without narrowing on `kind` first:
   - `{ kind: 'ok'; apiKey: string; teamId: string; mode: 'read-minimal' | 'read' | 'write'; warnings: readonly string[] }` — both required vars non-empty after `.trim()`; mode resolved to a canonical value (default `'write'`); `warnings` populated per AC #4.
   - `{ kind: 'disabled'; missing: readonly ('CLICKUP_API_KEY' | 'CLICKUP_TEAM_ID')[]; warnings: readonly string[]; diagnostic: string }` — one or both required vars missing / empty / whitespace-only; `diagnostic` is a multi-line, human-readable message (see AC #3) ready to hand to `logger.info` / `console.error`.
   - `{ kind: 'invalid'; reasons: readonly string[]; warnings: readonly string[]; diagnostic: string }` — reserved for future hard-fails on malformed values (e.g. non-numeric team ID). Story 1.3 does NOT populate this branch from format checks — see AC #4 on why format sanity stays in `warnings`, not `reasons` — but the branch MUST exist in the type signature so future stories can add strict format validation without a breaking API change.
     The module exports `validateClickUpEnv(env?: Readonly<NodeJS.ProcessEnv>): ClickUpEnvResult` plus the `ClickUpEnvResult` type. The `env` parameter is optional and defaults to `process.env` inside the function body (not via a signature default, which can't combine with `?`); explicit injection is load-bearing for unit testability (AC #12). The `Readonly<...>` wrapper signals the pure-function contract: validator never writes to the passed env map.
2. `src/tools/clickup-adapter.ts` from story 1.2 is updated to call `validateClickUpEnv()` at the top of `registerClickUpTools(server)` and branch on the result:
   - `kind: 'ok'` → proceed with dynamic-import dispatch exactly as today; use the validated `apiKey`/`teamId`/`mode` instead of reading `process.env.*` again. Do NOT re-read after validation — the validated result is the single source of truth for the rest of the function.
   - `kind: 'disabled'` → short-circuit with `{ disabled: true, reason: result.diagnostic }`. No dynamic import, no `CONFIG` evaluation, no network touch.
   - `kind: 'invalid'` → short-circuit with `{ disabled: true, reason: result.diagnostic }` under the default (soft-disable) posture; **or** throw an `Error` under hard-fail (`BMAD_REQUIRE_CLICKUP=1` per AC #5). Story 1.3 reuses `disabled` for this branch since it produces no invalid values from format checks; the throw path for `invalid` is future-proofing and must still be wired so future stories don't have to touch the adapter.
3. The `diagnostic` field on a `disabled` result is a multi-line string designed for `logger.error` / `console.error` at startup. Format:

   ```
   ClickUp tools disabled — missing required environment variables:
     - CLICKUP_API_KEY: per-user ClickUp personal token (usually starts with "pk_")
         Obtain at: Profile Icon → Settings → Apps → API Token
     - CLICKUP_TEAM_ID: workspace ID (7–10 digit number)
         Obtain at: the number in the URL while on any ClickUp settings page

   To enable, set the missing variable(s) in your environment (or .env file for local dev)
   and restart the server. See .env.example for the canonical list of supported vars.

   Running in BMAD-only mode: the `bmad` tool remains fully available.
   ```

   Only the lines for variables that are actually missing appear in the bullet list. The last two paragraphs always appear unless `BMAD_REQUIRE_CLICKUP=1` (AC #5), in which case the final line is replaced with `Refusing to start — BMAD_REQUIRE_CLICKUP=1`.

4. `warnings` on an `ok` result is populated from non-fatal format checks: (a) API key missing the `pk_` prefix (upstream README notes tokens "usually" start with `pk_`, not "must" — this is a warning, not an error); (b) team ID containing non-digit characters; (c) `CLICKUP_MCP_MODE` set to an unrecognized value (upstream already warns via `console.error` in `src/tools/clickup/src/shared/config.ts:57-58`, but upstream's warn fires after module evaluation — we mirror the check pre-dispatch so users see it before any ClickUp network traffic). Warnings are emitted via `logger.warn` at startup, one line per warning, prefixed `ClickUp env warning:`. Warnings do NOT demote an `ok` result to `disabled` — upstream is still loaded and its existing behavior takes over.
5. A new environment variable `BMAD_REQUIRE_CLICKUP` is supported: when set to `1` or `true` (case-insensitive, whitespace-trimmed), a `disabled` or `invalid` validator result causes `start()` (and `startHttpServer()`) to log the diagnostic and exit with status code `1` rather than soft-disabling. The env var defaults to unset (soft-disable). This is the ClickUp-primary opt-in called out in the story header. Implementation lives in `src/server.ts` and `src/http-server.ts` (both entry paths), **not** in the adapter — the adapter stays pure (returns a result, caller decides hard-fail) so CLI / tests / future transports can reuse it without a process-exit side effect.
6. `src/server.ts`'s `start()` is updated to log the validator result exactly once per process:
   - `ok` → emit each warning in `result.warnings` via `logger.warn` (one line per warning, prefixed `ClickUp env warning:`), then a single line via `logger.info`:
     ```
     ClickUp tools registered (mode=<mode>, count=<n>)
     ```
     Functionally unchanged from story 1.2 in spirit; only the log helper swaps from `console.error` to `logger.info` and warnings are routed correctly.
   - `disabled` → emit the multi-line `diagnostic` via `logger.info` (not `warn` — disable is an expected operating mode, not an anomaly). If `BMAD_REQUIRE_CLICKUP=1`, emit via `logger.error` instead, set `process.exitCode = 1`, then call `process.exit(1)`. Use `process.exit` (not `throw`) to bypass the `main().catch(...)` fallback at `src/index.ts:83-86` which would otherwise wrap the structured diagnostic in a `Fatal error: Error: ...` prefix. No pre-exit sleep / flush / timer is required — `logger.error` routes to `console.error`, which is synchronous on the stderr TTY path used by both stdio and Docker log capture.
   - `invalid` → same as `disabled` regarding hard-fail (no format-driven `invalid` results exist in this story; this line is forward-compat scaffolding).
7. `src/http-server.ts`'s `startHttpServer()` is updated to run `validateClickUpEnv()` once at boot, **before** `httpServer.listen(...)` opens the port. On `BMAD_REQUIRE_CLICKUP=1` + non-`ok` result → log the `diagnostic` via `console.error` and call `process.exit(1)` before listening. On non-`ok` without `BMAD_REQUIRE_CLICKUP` → log the diagnostic once (soft-disable notice) and continue listening. For any warnings on an `ok` result → log one `ClickUp env warning: ...` line each. Do NOT re-run validation per request. **Known limitation (forward-pointed to a follow-up story):** under story 1.2's current design, `registerClickUpTools` is invoked only from `BMADServerLiteMultiToolGit.start()`, and `src/http-server.ts:74-76` calls `connect()` (never `start()`) — so in HTTP transport today, the adapter is never actually called regardless of env vars, and ClickUp tools never register on a live HTTP session. Story 1.3's boot-time validator still earns its keep as a misconfig tripwire for Docker deployments (`BMAD_REQUIRE_CLICKUP=1` refuses to launch a misconfigured container), but the per-session registration gap is explicitly out of scope for this story and MUST be closed in a later story (candidate: folded into story 1.5 once HTTP smoke tests surface it, or tracked as a new story 1.4.5 / 1.7-adjacent fixup). Do NOT paper over by moving `registerClickUpTools` into `connect()` here — that is a story-1.2-shaped decision and belongs in its own change with its own smoke tests.
8. `src/index.ts`'s `main()` and `src/index-http.ts`'s entry (if it exists with a separate `main`) do NOT need to know about ClickUp — validation and hard-fail happen inside `start()` / `startHttpServer()`. The top-level `main().catch(...)` in `src/index.ts:83-86` remains as a safety net for unexpected throws, but the `BMAD_REQUIRE_CLICKUP=1` hard-fail path uses explicit `process.exit(1)` rather than throwing, so the `Fatal error:` prefix does not pollute the structured diagnostic.
9. `.env.example` is expanded to document the new ClickUp variables alongside the existing BMAD ones, in the order: `PORT`, `BMAD_API_KEY`, `BMAD_ROOT`, `BMAD_DEBUG`, `BMAD_REQUIRE_CLICKUP`, `CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_MCP_MODE`. Each var gets a one-line `#` comment above it explaining purpose + expected value. No `.env` file is added to the repo (that would leak secrets); `.env` stays in `.gitignore` (already covered by the existing `.env` rule).
10. `README.md` §"Environment variables" (lines ~463–472 per the current file — check with `grep` before edit) is updated: the existing `BMAD_API_KEY` / `BMAD_ROOT` / `BMAD_DEBUG` / `PORT` table rows are augmented with new rows for `BMAD_REQUIRE_CLICKUP`, `CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_MCP_MODE`. A short paragraph above the table explains the soft-disable-by-default posture and points at the `.env.example` for the canonical list. Do NOT duplicate the validator's diagnostic text into README — link to `.env.example` instead so the diagnostic and README cannot drift.
11. `CLAUDE.md` §"Environment Variables" (lines ~78–84) is updated with the same four new rows. Keep table formatting consistent with the existing rows (column widths, alignment markers).
12. A new unit test file `tests/unit/clickup-env.test.ts` exercises `validateClickUpEnv`:
    - `ok` with both vars set returns `kind: 'ok'` and the parsed values.
    - Missing `CLICKUP_API_KEY` → `kind: 'disabled'`, `missing` contains `'CLICKUP_API_KEY'`, `diagnostic` contains the `pk_` guidance line and does NOT contain the `CLICKUP_TEAM_ID` guidance line.
    - Missing `CLICKUP_TEAM_ID` → symmetric to the above.
    - Both missing → `missing` contains both; both guidance lines appear.
    - Whitespace-only values (`'   '`) are treated as missing.
    - `CLICKUP_API_KEY=abc123` (no `pk_` prefix) → `kind: 'ok'`, `warnings` contains an API-key-prefix warning.
    - `CLICKUP_TEAM_ID=abc` (non-numeric) → `kind: 'ok'`, `warnings` contains a team-id-format warning.
    - `CLICKUP_MCP_MODE=write`, `read`, `read-minimal` → `kind: 'ok'`, `mode` matches; `CLICKUP_MCP_MODE=nonsense` → `kind: 'ok'`, `mode === 'write'`, `warnings` contains a mode-fallback warning.
    - The validator is a pure function — calling it twice with the same env object returns equivalent results and no mutations on `env` or `process.env`. Use explicit `env` injection, never mutate `process.env` in tests (use `vi.stubEnv` or per-test copy of `process.env`).
    - No unit test calls `registerClickUpTools` or dynamic-imports the vendored tree. Adapter-level integration stays verified by the smoke tests in stories 1.5–1.6.
13. `tests/unit/dependency-audit.test.ts` requires no changes. `src/utils/clickup-env.ts` imports only `src/utils/logger.ts` (already in tree) and Node built-ins (if any) — no new runtime deps. The test's `SCAN_EXCLUDED_PATHS` stays at the three upstream-plumbing entries from story 1.2's AC #11.
14. `npm test` passes. Relative to whatever green test baseline story 1.2 lands with on `main`, the expected delta is `+ N tests` (the `clickup-env.test.ts` cases above) `+ 0 failures`. If the count of clickup-env tests ends up ≤ 8 or ≥ 20, revisit AC #12 coverage — the right size for this validator is ~10–14 focused cases. Do NOT hard-code the expected absolute passing count — story 1.2 is still in flight at story-creation time, so the baseline number will shift.
15. `npm run lint` produces the same lint baseline that story 1.2 lands with on `main` — no new findings introduced by `src/utils/clickup-env.ts`, `src/tools/clickup-adapter.ts`, `src/server.ts`, `src/http-server.ts`, or the new test. Story 1.2's baseline at draft time was 2 errors + 7 warnings (pre-existing in `src/http-server.ts` and `tests/support/litellm-helper.mjs`); if story 1.2 ends up clearing some of those, the new baseline is whatever story 1.2 committed. Use `logger` from `src/utils/logger.ts`; no direct `console.*` except in `src/server.ts` / `src/http-server.ts` where the pre-existing style is `console.error` (match local style to keep the diff surgical — but prefer `logger` for any new log lines).
16. `npm run format` does not touch the vendored tree. Run `npm run format` before commit so the pre-commit hook does not rewrite new files. The adapter, validator, server, http-server, `.env.example`, `README.md`, and `CLAUDE.md` all pass prettier cleanly post-edit.
17. `npm run build` passes cleanly — the vendored-tree compile path from story 1.2 is untouched; `src/utils/clickup-env.ts` is compiled by the root tsc under strict mode with no `any` in the public API. The validator's internal regex helpers are fine to type narrowly; exported types are `ClickUpEnvResult` + `validateClickUpEnv` only.
18. `git diff --stat -- src/tools/clickup/src/` prints nothing (vendored tree is read-only). `git diff --stat -- src/tools/clickup-adapter.ts` prints a small diff (top-of-function call to validator + branch on result — keep this change surgical; refactoring the adapter's internal dispatch is out of scope). `git diff --stat -- src/server.ts src/http-server.ts` prints small diffs constrained to the hard-fail wiring. `git diff --stat -- src/tools/bmad-unified.ts src/core/ src/cli.ts` prints nothing (BMAD engine + unified-tool surface untouched, same invariant as story 1.2 AC #17).
19. The commit message follows conventional-commits and is scoped `clickup`: `feat(clickup): validate CLICKUP_API_KEY and CLICKUP_TEAM_ID with actionable diagnostics`. The commit body captures (a) the soft-disable vs hard-fail posture, (b) the new env vars added to `.env.example`, (c) the `BMAD_REQUIRE_CLICKUP=1 → process.exit(1)` semantics (one sentence is enough), and (d) the HTTP-mode tool-registration gap inherited from story 1.2 as a known-limitation line with a forward-pointer.

## Out of Scope (explicitly deferred to later stories)

- Real API call to `/api/v2/user` at startup to confirm the key is valid (round-trip authentication check). Deferred — upstream's register functions already lazy-fetch `getCurrentUser()` and cache the result; a redundant pre-flight call would just double the auth traffic. If a future story decides a hard pre-flight is worth it, the validator has the `kind: 'invalid'` branch already wired for it.
- Interactive space picker with session caching → **story 1.4**. The validator knows nothing about spaces; space is a runtime-interactive concept per PRD §Env vars.
- Smoke-test `createTask` + `addComment` + status round-trip → **story 1.5** (depends on this story + story 1.4).
- Smoke-test cross-list parent/subtask → **story 1.6**.
- README / CHANGELOG entry announcing the ClickUp tool surface → **story 1.7** (this story touches README's env-var table only; the headline "ClickUp tools are available" announcement belongs in 1.7 alongside the tool-list inventory).
- Any edit to the vendored tree. `src/tools/clickup/src/shared/config.ts:70-72` still throws on missing env vars at module-evaluation time. That is upstream's contract; the dynamic-import guard from story 1.2 + the validator in this story mean we never reach that throw in practice.
- Touching `src/tools/bmad-unified.ts`, `BMADEngine`, unified-tool operations, or `src/cli.ts` (CLI entry). AC #18 guards this.
- Adding validation for `MAX_IMAGES`, `MAX_RESPONSE_SIZE_MB`, `CLICKUP_PRIMARY_LANGUAGE`, `LANG` (upstream-defined optional vars per `src/tools/clickup/README.md` §Configuration). Upstream already handles these with defaults; no user-facing guidance is owed. If a team later complains about silent misconfiguration in these, add validator branches then.
- Replacing `console.error` calls in `src/server.ts:438-453` (pre-existing startup banner). Route new log lines through `logger`, but do not refactor the existing console lines — scope creep.

## Tasks / Subtasks

- [ ] **Task 1 — Implement `src/utils/clickup-env.ts` (AC: #1, #3, #4)**
  - [ ] Create the file. Exports:

    ```typescript
    export type ClickUpMode = 'read-minimal' | 'read' | 'write';

    export type ClickUpEnvResult =
      | {
          kind: 'ok';
          apiKey: string;
          teamId: string;
          mode: ClickUpMode;
          warnings: readonly string[];
        }
      | {
          kind: 'disabled';
          missing: readonly ('CLICKUP_API_KEY' | 'CLICKUP_TEAM_ID')[];
          warnings: readonly string[];
          diagnostic: string;
        }
      | {
          kind: 'invalid';
          reasons: readonly string[];
          warnings: readonly string[];
          diagnostic: string;
        };

    export function validateClickUpEnv(
      env: Readonly<NodeJS.ProcessEnv> = process.env,
    ): ClickUpEnvResult {
      /* ... */
    }
    ```

  - [ ] Trim both required values; treat whitespace-only as missing.
  - [ ] Resolve `mode`: lowercase-trim `env.CLICKUP_MCP_MODE`; accept `'read-minimal' | 'read' | 'write'`; default to `'write'` on unset; any other value defaults to `'write'` AND appends a warning `CLICKUP_MCP_MODE="<raw>" is not recognized; using default "write" (valid: read-minimal, read, write)`.
  - [ ] Format warnings (only on `ok`):
    - If API key does not start with `pk_` → warn `CLICKUP_API_KEY does not start with "pk_"; upstream docs note personal tokens usually do — double-check at Profile → Settings → Apps → API Token`.
    - If team ID contains any non-digit character (regex `/\D/`) → warn `CLICKUP_TEAM_ID="<value>" contains non-digit characters; upstream docs describe team ID as a 7–10 digit number`.
  - [ ] Build `diagnostic` as a template literal. Only include the missing-var bullets that are actually missing. Always include the trailing paragraphs per AC #3.
  - [ ] No side effects: no `console.*`, no `logger.*`, no `process.*` writes. The caller logs the `diagnostic` field.

- [ ] **Task 2 — Wire validator into `src/tools/clickup-adapter.ts` (AC: #2)**
  - [ ] At the top of `registerClickUpTools(server)`, call `validateClickUpEnv()`.
  - [ ] On `disabled` → return `{ disabled: true, reason: result.diagnostic }` immediately. No dynamic import.
  - [ ] On `invalid` → same behavior as `disabled` in this story (format-driven `invalid` results don't exist yet; this is forward-compat).
  - [ ] On `ok` → dynamic-import the vendored register functions per story 1.2's existing dispatch and pass the validated `apiKey`/`teamId`/`mode` where needed. Do NOT re-read `process.env.*` inside the `ok` branch — the validator's return value is canonical for the function's scope.
  - [ ] Keep the adapter's `RegisterResult` return type stable — `disabled` / `ok` shapes are unchanged from story 1.2. Only the `reason` field's content is richer (multi-line diagnostic instead of the single line).
  - [ ] Do NOT emit `logger.*` calls from inside the adapter — logging is the server's job (AC #6). The adapter returns structured data, the caller chooses how to present it.

- [ ] **Task 3 — Log diagnostics + hard-fail from `src/server.ts` (AC: #5, #6, #8)**
  - [ ] In `start()` (post-`initialize()`, currently `src/server.ts:440-454`), after calling `registerClickUpTools(this.server)` and receiving the `RegisterResult`, check the current env for `BMAD_REQUIRE_CLICKUP`:
    ```typescript
    const requireClickUp = /^(1|true)$/i.test(
      (process.env.BMAD_REQUIRE_CLICKUP ?? '').trim(),
    );
    ```
  - [ ] On `result.disabled === true`:
    - If `requireClickUp` → `logger.error(result.reason)`; set `process.exitCode = 1`; call `process.exit(1)`. No pre-exit sleep — see AC #6 rationale.
    - Else → `logger.info(result.reason)` and continue startup. BMAD tool remains listed.
  - [ ] On `result.disabled === false`:
    - For each warning in `result.warnings` (if the adapter starts returning them — see Task 2 note — otherwise skip) → `logger.warn` one line.
    - `logger.info(`ClickUp tools registered (mode=${result.mode}, count=${result.toolsRegistered.length})`)`.
  - [ ] Import `logger` from `src/utils/logger.js` (note `.js` extension per CLAUDE.md §Conventions).
  - [ ] Do NOT remove the existing post-`initialize()` log block (`Loaded N agents, N workflows, N resources`). Only add the ClickUp result logging after it.

- [ ] **Task 4 — Hard-fail in HTTP transport path (AC: #7)**
  - [ ] In `src/http-server.ts` `startHttpServer()` (lines ~97–134), before `httpServer.listen(...)`, import the validator and call it:
    ```typescript
    import { validateClickUpEnv } from './utils/clickup-env.js';
    // ...
    const clickUpEnv = validateClickUpEnv();
    const requireClickUp = /^(1|true)$/i.test(
      (process.env.BMAD_REQUIRE_CLICKUP ?? '').trim(),
    );
    if (requireClickUp && clickUpEnv.kind !== 'ok') {
      console.error(clickUpEnv.diagnostic);
      process.exit(1);
    }
    if (clickUpEnv.kind !== 'ok') {
      console.error(clickUpEnv.diagnostic); // same soft-disable notice as stdio path
    }
    for (const w of clickUpEnv.warnings)
      console.error(`ClickUp env warning: ${w}`);
    ```
  - [ ] This is boot-time only. Do NOT re-run validation per request — the per-session `new BMADServerLiteMultiToolGit(...)` inside `handleMcp` already triggers the adapter's dynamic import + revalidation on its own; that is fine and idempotent.
  - [ ] Keep HTTP-server log style as `console.error` (matching lines 121, 127–131). Swapping to `logger` is a separate refactor and out of scope.

- [ ] **Task 5 — Update `.env.example`, README.md, CLAUDE.md (AC: #9, #10, #11)**
  - [ ] `.env.example` final contents:

    ```
    # HTTP server port (default: 3000, used by src/http-server.ts)
    PORT=3000

    # API key for HTTP-transport authentication. If unset, HTTP mode is open to all clients.
    BMAD_API_KEY=your-secret-api-key-here

    # Override BMAD content root directory (default: auto-discovered)
    BMAD_ROOT=

    # Enable verbose debug logging (1 | true | false)
    BMAD_DEBUG=false

    # Require ClickUp env vars — set to 1 to hard-fail at boot when CLICKUP_API_KEY
    # or CLICKUP_TEAM_ID is missing. Default: unset → soft-disable (BMAD-only mode).
    BMAD_REQUIRE_CLICKUP=

    # ClickUp personal API token (starts with pk_). Obtain at:
    #   Profile Icon → Settings → Apps → API Token
    CLICKUP_API_KEY=

    # ClickUp workspace / team ID (7–10 digits). Obtain at: the number in any
    # ClickUp settings page URL.
    CLICKUP_TEAM_ID=

    # ClickUp MCP tool surface: read-minimal | read | write (default: write)
    CLICKUP_MCP_MODE=
    ```

  - [ ] `README.md` env-vars table: find the existing `| BMAD_API_KEY | ...` row (current location lines ~465–472 — confirm with `grep -n '| BMAD_API_KEY' README.md` before editing) and append four rows:
    ```
    | `BMAD_REQUIRE_CLICKUP` | _(unset)_ | `1` or `true` → hard-fail at boot if ClickUp env vars missing. Default soft-disables ClickUp tools and keeps BMAD tools available. |
    | `CLICKUP_API_KEY` | _(unset)_ | Per-user ClickUp personal token. Usually starts with `pk_`. See `.env.example`. |
    | `CLICKUP_TEAM_ID` | _(unset)_ | Workspace ID — 7–10 digit number. See `.env.example`. |
    | `CLICKUP_MCP_MODE` | `write` | One of `read-minimal`, `read`, `write`. Controls which ClickUp tools are exposed (see upstream docs in `src/tools/clickup/README.md`). |
    ```
  - [ ] Add a one-sentence paragraph immediately above the table (or immediately after the existing intro to the env-vars section): `ClickUp env vars are optional by default — missing ClickUp vars soft-disable only the ClickUp tool surface. Set `BMAD_REQUIRE_CLICKUP=1` for deployments where ClickUp must be configured at boot.`
  - [ ] `CLAUDE.md` §"Environment Variables" table: mirror the same four rows in the existing four-column table (`Variable | Purpose | Default`). Adjust to match the table's actual column headers.

- [ ] **Task 6 — Author `tests/unit/clickup-env.test.ts` (AC: #12)**
  - [ ] New test file. Import from `../../src/utils/clickup-env.js`.
  - [ ] Test cases per AC #12. Use Vitest's `describe` / `it` / `expect`. Pass a plain object as the `env` argument — do NOT mutate `process.env`. Example:
    ```typescript
    it('returns ok when both required vars are set', () => {
      const r = validateClickUpEnv({
        CLICKUP_API_KEY: 'pk_xyz',
        CLICKUP_TEAM_ID: '1234567',
      });
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.warnings).toHaveLength(0);
    });
    ```
  - [ ] Structure: one `describe('validateClickUpEnv', ...)` block with all cases inside. No `beforeEach` / `afterEach` needed because `env` is injected per call.
  - [ ] Assert on `diagnostic` content with `.toContain(...)` (stable substrings) rather than `.toBe(...)` (exact string — would churn on whitespace tweaks). Specifically assert the presence of `'pk_'` in the API-key guidance line and `'7–10 digit'` in the team-id guidance line.
  - [ ] Do NOT import or evaluate anything from `src/tools/clickup/src/**` in this test — the vendored config throws on module eval without env vars set, and the test runs in a clean env by design.

- [ ] **Task 7 — Smoke-verify locally (AC: #14–17, #18)**
  - [ ] `npm run build` — clean.
  - [ ] `npm run lint` — same 2 errors + 7 warnings baseline; no new findings.
  - [ ] `npm run format` — no churn in the vendored tree; new files prettier-clean.
  - [ ] `npm test` — passes; count = story 1.2 baseline + clickup-env cases.
  - [ ] Stdio smoke without vars: `CLICKUP_API_KEY= CLICKUP_TEAM_ID= node build/index.js` → prints the BMAD banner, the multi-line ClickUp-disabled diagnostic once via stderr, then `Loaded N agents, ...`. Send a `tools/list` JSON-RPC over stdin; response has `bmad` only. No exception, exit code 0 on clean termination.
  - [ ] Stdio smoke with only one var: `CLICKUP_API_KEY=pk_abc CLICKUP_TEAM_ID= node build/index.js` → diagnostic lists only `CLICKUP_TEAM_ID` in the missing bullet. Soft-disable, BMAD tool still listed.
  - [ ] Hard-fail smoke: `BMAD_REQUIRE_CLICKUP=1 CLICKUP_API_KEY= CLICKUP_TEAM_ID= node build/index.js` → diagnostic printed, process exits 1 before `Loaded N agents, ...` appears (or at least without `tools/list` succeeding). Verify with `echo $?` after the process exits.
  - [ ] Hard-fail HTTP smoke: `BMAD_REQUIRE_CLICKUP=1 CLICKUP_API_KEY= CLICKUP_TEAM_ID= node build/index-http.js` → same diagnostic, process exits 1 before `HTTP Server listening` banner.
  - [ ] Warning smoke: `CLICKUP_API_KEY=abc123 CLICKUP_TEAM_ID=notanumber node build/index.js` → startup prints two `ClickUp env warning:` lines (prefix warning + team-id format warning) then `ClickUp tools registered (mode=write, count=13)`. BMAD + ClickUp tools both listed.
  - [ ] Mode smoke: `CLICKUP_API_KEY=pk_abc CLICKUP_TEAM_ID=1234567 CLICKUP_MCP_MODE=read-minimal node build/index.js` → `ClickUp tools registered (mode=read-minimal, count=2)`.

- [ ] **Task 8 — Commit (AC: #19)**
  - [ ] Stage in this order: `src/utils/clickup-env.ts`, `tests/unit/clickup-env.test.ts`, `src/tools/clickup-adapter.ts`, `src/server.ts`, `src/http-server.ts`, `.env.example`, `README.md`, `CLAUDE.md`. (Source + tests first, then wiring, then docs — keeps lint-staged tidy if it re-runs mid-stage.)
  - [ ] Commit message: `feat(clickup): validate CLICKUP_API_KEY and CLICKUP_TEAM_ID with actionable diagnostics`
  - [ ] Commit body per AC #19: summary, `.env.example` additions, `BMAD_REQUIRE_CLICKUP=1 → process.exit(1)` semantics in one sentence, HTTP-mode tool-registration gap as a known-limitation line (forward-pointer per AC #7), link back to story key `1-3-env-var-wiring`.

## Dev Notes

### Why a separate validator module (not inline in the adapter)

Three reasons, in priority order:

1. **Unit-testability without touching `process.env`.** The adapter dynamic-imports the vendored tree; unit-testing the adapter means either evaluating the vendored `shared/config.ts` (which throws on empty vars — dead on arrival) or mocking a Node module system to avoid the import. A pure function that takes `env` as a parameter is the friction-free path. `vi.stubEnv` exists but the state-leak risk between test cases is real; explicit injection is safer.
2. **Reusability for future entry points.** `src/cli.ts`, hypothetical worker transports, or a future `bmad doctor` subcommand might want the same validation without the register-tools side effects. The adapter's job is dispatch; the validator's job is policy. Don't conflate.
3. **Hard-fail-decision separation.** AC #5 says the adapter stays pure and the caller (server / http-server) decides whether to exit. If validation logic sat inside the adapter and emitted `console.error` + `process.exit`, the adapter would no longer be testable-in-isolation, and the HTTP path couldn't reuse it without duplicating the presence check.

### Alternative posture trade-offs

Soft-disable-by-default + `BMAD_REQUIRE_CLICKUP=1` opt-in (see story header + AC #5) was chosen over three alternatives, all rejected:

- **Always hard-fail.** Breaks BMAD-only users — a legitimate workflow per PRD §Goal (ClickUp is one of several surfaces, not the gating one).
- **Always soft-disable.** Silent misconfiguration in production: a Docker container cheerfully boots with ClickUp disabled and teams ship tasks to `/dev/null` for days before noticing. `BMAD_REQUIRE_CLICKUP` is the missing tripwire.
- **Fail based on transport type (stdio soft, HTTP hard).** Tempting — HTTP-mode deployments are more likely to be shared team infra — but cross-cutting the policy by transport hides the intent. An explicit env var is more discoverable in a `docker-compose.yml`.

### Why `BMAD_REQUIRE_CLICKUP` lives in the caller, not the adapter

The adapter returns structured data. The caller decides the process-level response. Moving the `process.exit(1)` into the adapter would mean:

- Unit tests on the adapter have to mock `process.exit` (Vitest's `vi.spyOn(process, 'exit').mockImplementation(...)` works but is fiddly).
- The HTTP path and stdio path end up with two different decision points — adapter-exits-before-listen vs caller-exits-during-start — which is hard to reason about.
- A hypothetical future transport (say, a worker thread) that wants to log-and-continue on `disabled` would have to fork the adapter.

Keeping the decision in the caller localizes the process-exit side effect to `src/server.ts` and `src/http-server.ts`, which are already the two files allowed to call `process.exit` in this codebase.

### Interaction with story 1.2's adapter

Story 1.2 spec says (AC #3, AC #5):

> When `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` is absent (or empty), the server MUST still start cleanly, the `bmad` tool MUST still be listed, and a single `stderr` line of the form `ClickUp tools disabled: CLICKUP_API_KEY and CLICKUP_TEAM_ID required` MUST be emitted at startup. ... Story 1.3 replaces this warn with proper validation — do NOT implement validation beyond presence here.

This story fulfills that deferred contract. The adapter's `RegisterResult` shape (`{ disabled: true; reason: string } | { disabled: false; mode; toolsRegistered }`) is stable; only the `reason` content gets richer. Callers (`src/server.ts`) of `registerClickUpTools` don't need to change their reading of `disabled` / `reason` — they just log a longer string.

**If story 1.2 has not yet landed on main** when this story is picked up: verify `src/tools/clickup-adapter.ts` exists at the expected shape before starting Task 2. If it doesn't, this story is blocked on 1.2 — surface that to the PM rather than reimplementing 1.2's scope here.

### Format check calibration

- **API key prefix `pk_`**: upstream README says tokens "usually start with pk\_" (src/tools/clickup/README.md:107). Not a contract — older keys exist. Warning only, never error.
- **Team ID digits only**: upstream README says "7–10 digit number" (src/tools/clickup/README.md:108). Upstream code doesn't enforce — it just forwards to the API. Numeric-only is a strong hint but not a hard invariant (imagine a dev is developing against a mocked ClickUp API and uses a string ID). Warning only.
- **Mode fallback**: upstream's `shared/config.ts:57-58` already warns on invalid mode. Our pre-dispatch warn is additive — it fires before the dynamic import even happens. If both fire (upstream's warn + ours), that's fine; the message is slightly different and users see the warning sooner.

If a future story wants to promote any of these warnings to errors, add a reason to `kind: 'invalid'` and let `BMAD_REQUIRE_CLICKUP` decide hard-fail vs soft-disable. The type signature is already in place.

### No dotenv auto-load

`src/cli.ts:67-88` parses `.env` by hand (no `dotenv` dependency). The MCP server entry `src/index.ts` does NOT auto-load `.env` — users who want environment variables in stdio mode set them in their shell (or in Claude Desktop's `env` block in `claude_desktop_config.json`, per CLAUDE.md). Do NOT add `dotenv` in this story — it's a dep-audit addition and a behavior change orthogonal to env validation. Docker-compose already surfaces `.env` via `env_file` in `docker-compose.yml`.

If a user runs `node build/index.js` locally and their `CLICKUP_API_KEY` is in an unloaded `.env`, they'll see the diagnostic — that's the correct behavior, because the server will run with env vars as seen. The diagnostic's `.env.example` reference is the breadcrumb to the right fix.

### Logger vs console.error

Per CLAUDE.md §Conventions: "No `console.*`: Use `src/utils/logger.ts` for all logging." Existing `src/server.ts` has three `console.error` calls at startup (`src/server.ts:438,446,450,453`) that predate the convention — leave them alone; rerouting them is scope creep. But all new log lines added in this story go through `logger` (`logger.info`, `logger.warn`, `logger.error`).

`src/http-server.ts` uses `console.error` throughout (lines 121, 127–131). Same principle: match local style for a surgical diff, but the validator's diagnostic is new output — route through `logger` if feasible, else match the nearby `console.error`. The end user can't tell the difference; lint is the only enforcement.

### Progress-notification heartbeat interaction

`src/server.ts:238-252` has a 3-second heartbeat that fires during `tools/call`. The validator runs during `tools/list` (once per initialize) and at `start()` (once per boot). Neither path has a heartbeat to worry about. The hard-fail `process.exit(1)` in Task 3 could race with pending writes on the transport; the explicit `await new Promise(r => setTimeout(r, 0))` before `exit` lets the event loop drain. If this turns out to be flaky in CI, bump to `setImmediate` + a 100 ms `setTimeout` — but the CI suite doesn't exercise `BMAD_REQUIRE_CLICKUP=1 + missing vars + process.exit` end-to-end, so the race is theoretical.

### Testing standards

- New file `tests/unit/clickup-env.test.ts` — place at the standard unit-test location mirroring `src/`'s layout.
- No integration tests in this story. The integration surface (does the server start cleanly, does `tools/list` return the right set, does hard-fail exit with code 1) is verified by Task 7's manual smoke tests and by the upcoming stories 1.5–1.6 against a real workspace.
- Don't add a test that mocks `process.exit` just to assert on the hard-fail path — the smoke test in Task 7 covers the integrated behavior, and the validator itself has no `process.exit` call to test.
- No changes to `tests/unit/dependency-audit.test.ts`. If you find yourself editing it, the likely cause is that `src/utils/clickup-env.ts` imported a package (e.g. a validation library like `zod`) that isn't in root `package.json`. Don't — use Node built-in string/regex primitives.

### SDK + package.json interaction

This story does not touch `package.json` dependencies. `@modelcontextprotocol/sdk` was floor-bumped to `^1.15.1` in story 1.2; that floor remains unchanged. No new runtime or dev dependencies are introduced.

If during Task 7's smoke tests you find an unexpected type error in the adapter involving `RegisterResult`, the cause is almost certainly that story 1.2's adapter was not finalized before you picked up this story — verify `src/tools/clickup-adapter.ts` exists with the `RegisterResult` shape from story 1.2 AC #5 before editing.

### Project structure notes

- `src/utils/clickup-env.ts` is a new sibling of `src/utils/logger.ts` and `src/utils/git-source-resolver.ts`. Same flat-under-utils convention.
- `tests/unit/clickup-env.test.ts` is a new sibling of `tests/unit/dependency-audit.test.ts`. Same flat-under-unit convention.
- No new directories, no new config files, no vendored-tree changes.

### References

- [EPIC-1 §Outcomes bullet 3](../epics/EPIC-1-clickup-mcp-integration.md) — "`CLICKUP_API_KEY` + `CLICKUP_TEAM_ID` env vars wired; space prompted interactively." This story wires + validates the first two; story 1.4 handles the space picker.
- [EPIC-1 §Stories bullet 4](../epics/EPIC-1-clickup-mcp-integration.md) — "Add env var loading and validation (`CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`)" — scope-exact.
- [PRD §Non-functional requirements — Auth](../PRD.md) — "per-user ClickUp token via `CLICKUP_API_KEY` env var; team-shared `CLICKUP_TEAM_ID`. Space asked interactively per session." This story is where "required" becomes enforced (with an opt-out for BMAD-only use).
- [PRD §Env vars](../PRD.md) — authoritative list: `CLICKUP_API_KEY` (required) + `CLICKUP_TEAM_ID` (required); space/sprint folder/backlog list discovered at runtime.
- [Story 1.2 §AC #3](./1-2-wire-register-functions.md) — "Story 1.3 replaces this warn with proper validation — do NOT implement validation beyond presence here." This story is where that promise lands.
- [Story 1.2 §Out of Scope bullet 1](./1-2-wire-register-functions.md) — "Real validation / friendliness for missing env vars... Story 1.3 replaces the guard with a proper startup-time validation step that lists which vars are missing, what they should contain, and where to obtain them. It also decides whether to hard-fail... or soft-disable..."
- [Story 1.2 §Dev Notes — Why dynamic import (AC #4)](./1-2-wire-register-functions.md) — the reason the validator must run BEFORE the dynamic import inside the adapter. `src/tools/clickup/src/shared/config.ts:70` throws at module-eval time with missing vars; the validator + early-return short-circuits that path.
- Upstream `src/tools/clickup/README.md` §Configuration — authoritative source for env var semantics (`pk_` prefix, 7–10 digit team ID, mode defaults).
- Upstream `src/tools/clickup/src/shared/config.ts:52-59` — mirror the mode-fallback logic in the validator to avoid duplicate warnings fighting each other.
- Current `src/utils/logger.ts` — `logger.info` routes to `console.error` (stderr); `logger.warn` to `console.warn`; `logger.debug` gated behind `BMAD_DEBUG=1`. Match the existing logging conventions.
- Current `.env.example` / `README.md` §"Environment variables" / `CLAUDE.md` §"Environment Variables" — three places that document env vars; this story edits all three so they stay in sync.
- Current `src/index.ts:83-86` — top-level `main().catch(console.error + exit 1)` fallback. The hard-fail path in this story uses explicit `process.exit(1)` rather than throw, so the structured diagnostic is not wrapped in `Fatal error:`.
- `commitlint.config.cjs` — no `scope-enum` rule; `feat(clickup)` accepted per stories 1.1 and 1.2.

## Dev Agent Record

### Agent Model Used

<!-- populated by dev agent on implementation -->

### Debug Log References

<!-- populated by dev agent on implementation -->

### Completion Notes List

<!-- populated by dev agent on implementation -->

### File List

**New**

- `src/utils/clickup-env.ts` — pure-function validator returning `ClickUpEnvResult` (AC #1, #3, #4)
- `tests/unit/clickup-env.test.ts` — Vitest unit tests for the validator (AC #12)

**Modified**

- `src/tools/clickup-adapter.ts` — top-of-function call to `validateClickUpEnv` and branch on the result (AC #2)
- `src/server.ts` — log ClickUp validator result; hard-fail on `BMAD_REQUIRE_CLICKUP=1 + !ok` (AC #5, #6)
- `src/http-server.ts` — boot-time validator call + hard-fail on `BMAD_REQUIRE_CLICKUP=1 + !ok` (AC #7)
- `.env.example` — document `BMAD_REQUIRE_CLICKUP`, `CLICKUP_API_KEY`, `CLICKUP_TEAM_ID`, `CLICKUP_MCP_MODE` (AC #9)
- `README.md` — env-var table rows for the four new vars + one intro sentence (AC #10)
- `CLAUDE.md` — env-var table rows for the four new vars (AC #11)

**Untouched (explicitly)**

- `src/tools/clickup/**` (vendored tree — read-only per story 1.1; `shared/config.ts` throw still guards module-eval with missing vars, which is why the validator short-circuits before the dynamic import)
- `BMAD-METHOD/**` (upstream BMAD — read-only)
- `src/tools/bmad-unified.ts`, `src/tools/operations/**`, `src/core/**`, `src/cli.ts` (BMAD engine + unified-tool surface; AC #18)
- `package.json`, `package-lock.json` (no new deps; AC #13)
- `tests/unit/dependency-audit.test.ts` (no changes; AC #13)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Story drafted from EPIC-1 bullet 4 + story 1.2 deferred work via `bmad-create-story`. Status → ready-for-dev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-21 | Validation pass (checklist): unified `ClickUpEnvResult` type shapes across AC #1 and Task 1 (all three variants now carry `readonly warnings: string[]`); fixed invalid `env?: ... = process.env` signature → `env: Readonly<NodeJS.ProcessEnv> = process.env` with pure-function guarantee; reconciled hard-fail pattern (`process.exitCode = 1; process.exit(1)`, no pre-exit sleep) in AC #6 + Task 3; softened lint/test baseline assertions in AC #14 and #15 so they track story 1.2's eventual merge state rather than aspirational numbers; added explicit HTTP-mode tool-registration gap call-out in AC #7 with forward-pointer (under story 1.2's current design, `registerClickUpTools` only runs from `start()` which HTTP never calls); folded exit-code semantics + HTTP-gap into AC #19 commit-body template; trimmed duplicative PRD recap in Dev Notes §"Alternative posture trade-offs"; fenced the log-line example in AC #6 to fix nested-backtick rendering. |
