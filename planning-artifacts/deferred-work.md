# Deferred Work

## Deferred from: code review of 1-1-vendor-clickup-mcp-source (2026-04-21)

- `.eslintignore` entry is dead under ESLint 9 flat-config; harmless breadcrumb that aligns with Task 3's literal wording. Clean up when the task text is corrected.
- Dep-audit no longer enforces vendored import versions against root `package.json`. Once Story 1.3 declares the six runtime deps (`@modelcontextprotocol/sdk`, `fuse.js`, `remark-gfm`, `remark-parse`, `unified`, `zod`), add a vendor-aware version check so a future major bump silently breaking upstream gets caught.
- Six different glob dialects across `.gitignore`, `.eslintignore`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`, `dependency-audit.test.ts#VENDORED_PATHS`. Each is correct individually; no test keeps them synced. Consider a single vendor-paths manifest + generator.
- `tsconfig.test.json` silently inherits `exclude` from `tsconfig.json`. Works today, but a future redefinition of the child's `exclude` could forget `"src/tools/clickup/**"`. Add a comment in `tsconfig.json` calling this out, or restate the exclude explicitly in `tsconfig.test.json`.
- `.gitignore` negation `!src/tools/clickup/**` won't re-include if a future ancestor rule excludes `src/tools/` (git semantics: cannot re-include if a parent directory is excluded). Hypothetical, not a current bug — document this constraint if the repo adds broader `src/` ignore rules later.
