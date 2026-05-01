# EPIC-9 README Staleness Punch List

Generated: 2026-05-01
Story: 9-1-readme-staleness-audit

## Status

This punch list is the authoritative input for stories 9-2 through 9-9.
Each item is marked with its owner story.

---

## A. Agent / workflow counts

**Live-count results (confirmed 2026-05-01):**

| Item | README claim | Live count | Lines affected |
|------|-------------|-----------|----------------|
| Agents | 9 | **6** | 18, 121, 393–401 (table rows) |
| Workflows | 26 | **29** | 18, 406 |

**Live output from `npm run cli:list-agents`:**
```
Loaded 6 agents, 29 workflows, 546 resources
```

**Agents present in README table but absent from live output:**

| Agent | Name | Role | README line | Status |
|-------|------|------|-------------|--------|
| `qa` | Murat | Test Architect | 397 | ❌ absent |
| `sm` | Bob | Scrum Master | 399 | ❌ absent |
| `debug` | Diana | Debug Specialist | 400 | ❌ absent |

> **Note:** These three agents appear in the cached `mkellerman/BMAD-METHOD#debug-agent-workflow` build but not in the `Alpharages/BMAD-METHOD#main` build. The README's agent table references the upstream `Alpharages/BMAD-METHOD` source but lists agents that are not present in its current `main` branch.

**Owner story:** 9-2 (update README agent table to match live counts or document upstream discrepancy).

---

## B. Missing `resolve-doc-paths` operation

The unified `bmad` tool now has **5 operations** (`list`, `read`, `execute`, `search`, `resolve-doc-paths`). The README documents only 4.

| Location | Lines | Gap |
|----------|-------|-----|
| Features › Unified `bmad` tool → operations table | 374–381 | `resolve-doc-paths` absent |
| Usage section → direct tool call examples | 440–453 | No example for `resolve-doc-paths` |

**Owner story:** 9-5 (expand configuration reference) or 9-3 (cascade documentation). Recommend 9-5.

---

## C. Custom skills — missing `clickup-create-bug`

The Custom Skills section (lines 597–704) has subsections for:
- `clickup-create-epic` ✓
- `clickup-create-story` ✓
- `clickup-dev-implement` ✓
- `clickup-code-review` ✓

**Missing:** `clickup-create-bug` (shipped in EPIC-7).

Key facts for the new subsection:
- **Trigger:** "create a bug", "report a bug", "log bug `<description>`"
- **Steps:** prereq + auth check → list picker → epic picker (optional) → description composer → `createTask`
- **Planning artifacts:** soft-loaded (PRD, architecture, epics are optional); the skill MUST NOT abort on missing artifacts
- **Description shape:** bug-shaped (repro / expected / actual / impact / suspected area)
- **Config keys** (`[clickup_create_bug]`): `target_list_id`, `default_priority`, `default_tags`, `pinned_epic_id`, `pinned_epic_name`

**Owner story:** 9-3.

---

## D. Custom skills — no-epic gap

Two touch-points have no mention of EPIC-8's no-epic option:

### D.1 Walkthrough Step 10 (lines 305–316)

Current text: "Invoke the `clickup-create-story` skill against pilot epic `<epic-id>`."

Missing:
- The `[0] No epic — create as standalone task` picker entry
- Standalone task outcome (no parent epic)
- Reference to `allow_no_epic` config key

### D.2 Custom Skills `clickup-create-story` subsection (lines 611–622)

Current steps line: "prereq + auth check → epic picker → sprint-list picker → `bmad-create-story` → review → `createTask`"

Missing:
- `[0] No epic` picker entry when `allow_no_epic` is `true` (default)
- Standalone task outcome
- `allow_no_epic` config key reference

**Owner story:** 9-4.

---

## E. Project-local config — missing keys

Comparing `.bmadmcp/config.example.toml` against README "Project-local config" section (lines 650–700):

| Key / Section | In `config.example.toml` | In README | Gap |
|---------------|--------------------------|-----------|-----|
| `[clickup]` shared section | ✓ (lines 22–25) | ❌ absent | Entire section missing |
| `[clickup].pinned_space_id` | ✓ | ❌ absent | — |
| `[clickup].pinned_space_name` | ✓ | ❌ absent | — |
| `[clickup].pinned_backlog_list_id` | ✓ | ❌ absent | — |
| `[clickup_create_story].allow_no_epic` | ✓ | ❌ absent | No-epic config key missing |
| `[clickup_create_bug]` section | ✓ | ❌ entirely absent | All 5 keys missing |
| `[clickup_create_bug].target_list_id` | ✓ | ❌ absent | — |
| `[clickup_create_bug].default_priority` | ✓ | ❌ absent | — |
| `[clickup_create_bug].default_tags` | ✓ | ❌ absent | — |
| `[clickup_create_bug].pinned_epic_id` | ✓ | ❌ absent | — |
| `[clickup_create_bug].pinned_epic_name` | ✓ | ❌ absent | — |
| `[docs].epics_path` | ✓ | ❌ absent | Only `prd_path` + `architecture_path` shown |
| `[docs].planning_dir` | ✓ | ❌ absent | — |
| Auto-save behaviour | documented in step files | ❌ not mentioned | Skills write discovered IDs back to config after first successful picker run |

**Owner story:** 9-5.

---

## F. Walkthrough staleness

### F.1 Step 4 (lines 155–170) — hardcodes `planning-artifacts/`

```bash
mkdir -p planning-artifacts
touch planning-artifacts/PRD.md
touch planning-artifacts/architecture.md
```

After EPIC-6, these paths are configurable via `[docs]` table. The step should note that if docs already exist elsewhere, users can set `[docs].prd_path` and `[docs].architecture_path` in `.bmadmcp/config.toml` instead.

**Owner story:** 9-6.

### F.2 Step 8 (lines 266–281) — stale `.bmad-pilot-marker` requirement

Step 8 instructs users to create `.bmad-pilot-marker` and claims "The skills check this sentinel file at every invocation to confirm they're running in the right repo."

Evidence this is stale:
- No step file under `src/custom-skills/*/steps/` references `.bmad-pilot-marker`
- Custom Skills intro (README line 593) states: "No `.bmad-pilot-marker` or other per-project sentinel files are needed"
- `grep -r "bmad-pilot-marker" src/custom-skills/` → zero matches

Step 8 should be removed or replaced with actual one-time setup instructions (e.g. creating `.bmadmcp/config.toml` with credentials, or verifying space/list access via interactive pickers on first run).

**Owner story:** 9-6.

### F.3 Custom Skills prerequisite note (line 593) — soft-load inconsistency

Current text: "All custom skills require `CLICKUP_MCP_MODE=write` and `planning-artifacts/PRD.md` + `planning-artifacts/architecture.md` in the project root."

Two problems:
1. After EPIC-6, paths are configurable — the statement is no longer fully accurate.
2. `clickup-create-bug` soft-loads all three artifacts; missing PRD/architecture is a warning, not an abort. The prerequisite note groups all skills together incorrectly.

**Owner story:** 9-3.

---

## G. Configuration reference — env-var gaps

CLAUDE.md env var table vs README Configuration reference (lines 810–819):

| Env var | CLAUDE.md | README config ref | Status |
|---------|-----------|-------------------|--------|
| `BMAD_ROOT` | ✓ | ✓ | ✓ ok |
| `BMAD_DEBUG` | ✓ | ✓ | ✓ ok |
| `NODE_ENV` | ✓ | ✓ | ✓ ok |
| `BMAD_GIT_AUTO_UPDATE` | ✓ | ✓ | ✓ ok |
| `BMAD_REQUIRE_CLICKUP` | ✓ | ❌ absent | Missing from config ref table (only in ClickUp section line 505) |
| `CLICKUP_API_KEY` | ✓ | noted as "ClickUp vars listed separately" | ✓ ok |
| `CLICKUP_TEAM_ID` | ✓ | noted as "ClickUp vars listed separately" | ✓ ok |
| `CLICKUP_MCP_MODE` | ✓ | noted as "ClickUp vars listed separately" | ✓ ok |
| `PORT` | ✓ | ✓ | ✓ ok |
| `BMAD_API_KEY` | ✓ | ✓ | ✓ ok |

**Gap:** `BMAD_REQUIRE_CLICKUP` should appear in the Configuration reference table or have a cross-reference to the ClickUp section where it is documented.

**Owner story:** 9-5.

---

## H. Internal anchors and links

### H.1 Nav anchors

| Anchor | Target | Status |
|--------|--------|--------|
| `#quick-start` | `## Quick start` (line 26) | ✓ ok |
| `#your-first-session--a-beginner-walkthrough` | `## Your first session — a beginner walkthrough` (line 107) | ✓ ok |
| `#clickup-integration` | `## ClickUp integration` (line 482) | ✓ ok |
| `#custom-skills` | `## Custom Skills` (line 581) | ✓ ok |
| `#self-hosting-http` | `## Self-hosting (HTTP)` (line 708) | ✓ ok |
| `#documentation` | `## Documentation` (line 902) | ✓ ok |

### H.2 File links

| Link | Target | Status |
|------|--------|--------|
| `./docs/clickup-quickstart.md` | exists | ✓ ok |
| `./docs/architecture.md` | exists | ✓ ok |
| `./docs/api-contracts.md` | exists | ✓ ok |
| `./docs/development-guide.md` | exists | ✓ ok |
| `./src/custom-skills/README.md` | exists | ✓ ok |
| `./.github/RELEASE_PROCESS.md` | exists | ✓ ok |
| `./.bmadmcp/config.example.toml` | exists | ✓ ok |
| `./CLAUDE.md#doc-path-cascade` | anchor exists at line 119 | ✓ ok |

---

## I. External links

| URL | Status | Notes |
|-----|--------|-------|
| `https://github.com/Alpharages/BMAD-METHOD` | ✓ ok | 200 |
| `https://www.npmjs.com/package/bmad-mcp-server` | ⚠️ blocked | 403 (Cloudflare challenge for non-browser clients); accessible in browser |
| `https://modelcontextprotocol.io/` | ⚠️ redirects | 308 → `/docs/getting-started/intro` |
| `https://github.com/Alpharages/bmad-mcp-server` | ✓ ok | 200 |
| `https://github.com/mkellerman/bmad-mcp-server` | ✓ ok | 200 |
| `https://badge.fury.io/js/bmad-mcp-server.svg` | ⚠️ redirects | 302 → CloudFront CDN |
| `https://img.shields.io/badge/License-ISC-blue.svg` | ✓ ok | 200 |

> **Note:** The npmjs.com 403 and badge.fury.io 302 are typical for automated curl requests and do not indicate broken links for human users. No action required unless these fail in a browser as well.

**Owner story:** 9-8 (verify and fix any truly broken external links).

---

## Summary by owner story

| Story | Items |
|-------|-------|
| 9-2 | A — Agent/workflow count discrepancies (6 vs 9 agents, 29 vs 26 workflows) |
| 9-3 | B (partial) — `resolve-doc-paths` docs; C — `clickup-create-bug` subsection; F.3 — soft-load prerequisite note |
| 9-4 | D — No-epic option gaps (Step 10 + `clickup-create-story` subsection) |
| 9-5 | B (partial) — `resolve-doc-paths` in operations table; E — Missing config keys; G — `BMAD_REQUIRE_CLICKUP` in config ref |
| 9-6 | F.1 — Step 4 hardcoded paths; F.2 — Step 8 stale `.bmad-pilot-marker` |
| 9-8 | I — External link re-verification in browser |
| 9-9 | (none in this punch list — covers `docs/` directory cross-check) |
