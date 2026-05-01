# Story 9.8: Verify Anchors and Links

Status: done

Epic: [EPIC-9: README freshness pass](../epics/EPIC-9-readme-freshness.md)

> This story closes the EPIC-9 exit criterion "No anchor link or internal
> cross-reference in the README is broken." It also covers the external-link
> re-verification called out in the EPIC-9 punch list (section I). The complete
> audit has already been done as part of creating this story; the work is to
> apply the one actionable fix found (missing `LICENSE` file) and commit the
> verification record.

## Story

As a **developer or contributor who follows the README badge or license link**,
I want a `LICENSE` file to exist at the repo root,
so that the ISC license badge link resolves to actual license text instead of a
404.

## Acceptance Criteria

### Internal-anchor audit (pre-verified — no changes required)

1. All nav-row anchors resolve to existing `##` headings (nav-row source:
   README.md line 10):

   | Anchor | Heading | Status |
   |--------|---------|--------|
   | `#quick-start` | `## Quick start` (line 26) | ✓ ok |
   | `#your-first-session--a-beginner-walkthrough` | `## Your first session — a beginner walkthrough` (line 107) | ✓ ok |
   | `#clickup-integration` | `## ClickUp integration` (line 501) | ✓ ok |
   | `#custom-skills` | `## Custom Skills` (line 600) | ✓ ok |
   | `#common-patterns` | `## Common patterns` (line 782) | ✓ ok |
   | `#self-hosting-http` | `## Self-hosting (HTTP)` (line 834) | ✓ ok |
   | `#documentation` | `## Documentation` (line 1029) | ✓ ok |

2. All in-content anchor links added or touched by stories 9-2 through 9-7
   resolve correctly:

   | Link target | Resolved heading | Status |
   |-------------|-----------------|--------|
   | `#doc-path-cascade-docs-table` | `#### Doc-path cascade (\`[docs]\` table)` (line 738) | ✓ ok |
   | `#clickup-create-bug` | `### \`clickup-create-bug\`` (line 671) | ✓ ok |
   | `#clickup-create-story` | `### \`clickup-create-story\`` (line 630) | ✓ ok |
   | `#project-local-config-bmadmcpconfigtoml` | `### Project-local config (\`.bmadmcp/config.toml\`)` (line 695) | ✓ ok |
   | `#development` | `## Development` (line 950) | ✓ ok |
   | `./CLAUDE.md#doc-path-cascade` | `## Doc-Path Cascade` in CLAUDE.md (line 119) | ✓ ok |

### Relative file-link audit

3. All relative file links in the README point to files that exist on disk:

   | Link | Target path | Status |
   |------|-------------|--------|
   | `./docs/clickup-quickstart.md` | exists | ✓ ok |
   | `./docs/architecture.md` | exists | ✓ ok |
   | `./docs/api-contracts.md` | exists | ✓ ok |
   | `./docs/development-guide.md` | exists | ✓ ok |
   | `./src/custom-skills/README.md` | exists | ✓ ok |
   | `./.github/RELEASE_PROCESS.md` | exists | ✓ ok |
   | `./.bmadmcp/config.example.toml` | exists | ✓ ok |
   | `./CLAUDE.md#doc-path-cascade` | CLAUDE.md exists, anchor resolves | ✓ ok |
   | `LICENSE` | **missing — this story creates it** | ❌ → fix |

4. A `LICENSE` file is created at the repo root containing the ISC license
   text for the copyright holder `Alpharages`.

5. The badge link `[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)`
   on line 6 resolves after the file is created. No change to the Markdown
   source is needed — the link already points to `LICENSE`.

### External link audit (pre-verified — no changes required)

6. All external links return expected responses:

   | URL | Status | Notes |
   |-----|--------|-------|
   | `https://github.com/Alpharages/BMAD-METHOD` | 200 ✓ | ok |
   | `https://github.com/Alpharages/bmad-mcp-server` | 200 ✓ | ok |
   | `https://github.com/mkellerman/bmad-mcp-server` | 200 ✓ | ok |
   | `https://img.shields.io/badge/License-ISC-blue.svg` | 200 ✓ | ok |
   | `https://badge.fury.io/js/bmad-mcp-server.svg` | 302 → CDN | badge renders correctly (shows latest npm version 3.0.1) |
   | `https://www.npmjs.com/package/bmad-mcp-server` | 403 (Cloudflare bot-block) | browser-accessible; not broken |
   | `https://www.npmjs.com/package/mcp-remote` | 403 (Cloudflare bot-block) | browser-accessible; not broken |
   | `https://modelcontextprotocol.io/` | 308 → `/docs/getting-started/intro` | site is live; base URL is most stable reference |

   No README source changes are needed for any external link.

### Story file and sprint-status.yaml

7. **Story file saved** as
   `planning-artifacts/stories/9-8-verify-anchors-and-links.md`
   with Status set to `review` after implementation.

8. **sprint-status.yaml updated:**
   - `9-8-verify-anchors-and-links`: `backlog` → `ready-for-dev` (on story
     creation), then `review` after implementation.
   - `last_updated` field and annotation updated.

### Change isolation

9. Only `LICENSE`, `planning-artifacts/stories/9-8-verify-anchors-and-links.md`,
   and `planning-artifacts/sprint-status.yaml` are modified.
   - `git diff --stat -- 'src/**/*.ts'` MUST be empty.
   - `git diff --stat -- tests/` MUST be empty.
   - `git diff --stat -- README.md` MUST be empty (no README changes needed).

### Commit

10. Commit message MUST follow Conventional Commits:

    ```
    docs(license): add missing LICENSE file and verify all README anchors and links (story 9-8)
    ```

    Body MUST reference story 9.8, name all modified/created files (`LICENSE`,
    story file, `sprint-status.yaml`), and confirm README and source files are
    unmodified.

## Out of Scope

- Modifying README content (all anchors and links are already correct).
- Updating the `modelcontextprotocol.io` URL — the 308 redirect is stable
  behaviour; the base URL is the canonical reference.
- Cross-checking the `docs/` directory (story 9-9).
- Any changes to `src/`, `tests/`, or other `docs/` files.

## Tasks / Subtasks

- [x] **Task 1 — Confirm internal-anchor audit (AC: #1–#2)**
  - [x] Run `grep -n "^## " README.md` and verify all nav-row targets exist.
  - [x] Run `grep -Fn "](#" README.md` and spot-check the five new anchors from
        story 9-7 against the heading list.
  - [x] Confirm `CLAUDE.md` line 119 has `## Doc-Path Cascade`.

- [x] **Task 2 — Confirm relative file links (AC: #3)**
  - [x] `ls docs/clickup-quickstart.md docs/architecture.md docs/api-contracts.md docs/development-guide.md src/custom-skills/README.md .github/RELEASE_PROCESS.md .bmadmcp/config.example.toml` — all must exist.
  - [x] Confirm `LICENSE` does NOT exist yet (pre-condition for Task 3).

- [x] **Task 3 — Create LICENSE file (AC: #4–#5)**
  - [x] Create `LICENSE` at repo root with the standard ISC license text.
  - [x] Copyright holder: `Alpharages` (or `Alpharages contributors`).
  - [x] Copyright year: current year (2026).
  - [x] Verify `ls LICENSE` returns the file.

- [x] **Task 4 — Update sprint-status.yaml (AC: #8)**
  - [x] Set `9-8-verify-anchors-and-links`: `ready-for-dev` → `review`.
  - [x] Update `last_updated` field and annotation.

- [x] **Task 5 — Regression verification (AC: #9)**
  - [x] `git diff --stat -- 'src/**/*.ts'` → empty.
  - [x] `git diff --stat -- tests/` → empty.
  - [x] `git diff --stat -- README.md` → empty.
  - [x] `npm run build && npm run lint` → clean (0 errors).

- [x] **Task 6 — Commit (AC: #10)**
  - [x] Stage `LICENSE`, story file, `sprint-status.yaml`.
  - [x] Commit with header + body per AC #10.

## Dev Notes

### ISC license text

The standard ISC license text to use in `LICENSE`:

```
ISC License

Copyright (c) 2026 Alpharages

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

### Why LICENSE was missing

The repo `package.json` declares `"license": "ISC"` and the README badge links
to `(LICENSE)` but no `LICENSE` file was ever committed. The badge and link have
been broken since the repo was initialized. This story is the first to notice
and fix it.

### Anchor-generation rules (GitHub Markdown)

GitHub generates heading anchors by:
1. Lower-casing the heading text
2. Stripping all characters except letters, digits, hyphens, and spaces
3. Replacing spaces with hyphens

Examples relevant to this README:
- `#### Doc-path cascade (\`[docs]\` table)` → `#doc-path-cascade-docs-table`
- `### \`clickup-create-bug\`` → `#clickup-create-bug`
- `### Project-local config (\`.bmadmcp/config.toml\`)` → `#project-local-config-bmadmcpconfigtoml`

### External link notes

- **npmjs.com** always returns 403 for non-browser clients (Cloudflare bot
  protection). This is expected behaviour; both
  `https://www.npmjs.com/package/bmad-mcp-server` and
  `https://www.npmjs.com/package/mcp-remote` are accessible in a browser.
- **badge.fury.io** returns 302 to a CloudFront CDN for the badge SVG. The
  badge renders correctly and shows the current npm version (3.0.1 as of
  2026-05-01). No action needed.
- **modelcontextprotocol.io** returns 308 (permanent redirect) to
  `/docs/getting-started/intro`. The base URL is still the canonical reference
  for the MCP spec; no URL update is warranted.

### Previous story learnings (from 9-3 through 9-7)

- Line numbers shift after each story lands. Use `grep -n` before editing; do
  not trust numbers recorded in story files.
- Use `npm run build && npm run lint` (not just `lint`) to catch both type
  errors and style violations before committing.
- Commit body must name every modified file explicitly; reviewers check this
  against `git diff --stat`.

### Files changed by this story

**Created:**
- `LICENSE` — ISC license text

**Modified:**
- `planning-artifacts/sprint-status.yaml` — story 9-8 status
- `planning-artifacts/stories/9-8-verify-anchors-and-links.md` — this file

**Unchanged:**
- `README.md` — no source changes needed; all anchors and links verified correct
- All TypeScript source and test files
- `CLAUDE.md`
- `docs/` directory files
- `.bmadmcp/config.example.toml`
- `src/custom-skills/` directory

### References

- EPIC-9 punch list section H (internal anchors) [Source: planning-artifacts/epics/EPIC-9-punch-list.md §H]
- EPIC-9 punch list section I (external links) [Source: planning-artifacts/epics/EPIC-9-punch-list.md §I]
- EPIC-9 story descriptions [Source: planning-artifacts/epics/EPIC-9-readme-freshness.md §Stories line 29–30]
- Previous story learnings [Source: planning-artifacts/stories/9-7-add-common-patterns-faq.md §Dev Notes]
