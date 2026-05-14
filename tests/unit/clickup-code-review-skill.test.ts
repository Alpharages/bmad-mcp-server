import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');

const step07Path = join(
  projectRoot,
  'src',
  'custom-skills',
  'clickup-code-review',
  'steps',
  'step-07-lore-lesson-save.md',
);

describe('clickup-code-review step-07-lore-lesson-save', () => {
  const content = readFileSync(step07Path, 'utf-8');

  it('resolves the project slug from lore.yaml before selecting an MCP tool', () => {
    expect(content).toMatch(/lore\.yaml/);
    expect(content).toMatch(/project\.slug/);
  });

  it('targets only the slug-scoped save_lesson tool name', () => {
    expect(content).toMatch(/lore-memory-\{[^}]*slug[^}]*\}__save_lesson/);
  });

  it('does not allow a broad/wildcard match against any *save_lesson tool', () => {
    // The broken behaviour was: "Look for a save_lesson tool" without scoping
    // to the project slug. The fix must replace that with the slug-scoped check.
    expect(content).not.toMatch(
      /Look for a `save_lesson` tool in the current MCP context\.?\s*(?!\(named `lore-memory-)/,
    );
    expect(content).not.toMatch(
      /any (?:tool|MCP tool) (?:whose name )?contains? `?\*?save_lesson/i,
    );
  });

  it('skips with a clear warning when the slug-scoped MCP tool is unavailable', () => {
    expect(content).toMatch(/skip/i);
    expect(content).toMatch(
      /lore-memory-\{[^}]*slug[^}]*\}.*(?:unavailable|not connected|not registered|not in the (?:current )?(?:session|MCP context|tool list))/is,
    );
  });

  it("never falls back to a different project's save_lesson tool", () => {
    // The fix must explicitly forbid fallback so future edits cannot
    // re-introduce cross-project memory contamination.
    expect(content).toMatch(/(?:does not|never|MUST NOT|do not)\s+fall ?back/i);
  });

  it('inherits or independently resolves lore_project_slug', () => {
    // The slug must be available in step-07 either by inheritance from
    // step-04 (which reads lore.yaml) or by an in-step read fallback.
    // Either way, the file should reference lore_project_slug.
    expect(content).toMatch(/lore_project_slug/);
  });
});
