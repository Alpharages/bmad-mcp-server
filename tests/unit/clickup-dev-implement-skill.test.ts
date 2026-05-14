import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');

const step10Path = join(
  projectRoot,
  'src',
  'custom-skills',
  'clickup-dev-implement',
  'steps',
  'step-10-lore-lesson-save.md',
);

describe('clickup-dev-implement step-10-lore-lesson-save', () => {
  const content = readFileSync(step10Path, 'utf-8');

  it('resolves the project slug from lore.yaml (or inherits from step-03)', () => {
    expect(content).toMatch(/lore\.yaml/);
    expect(content).toMatch(/project\.slug|lore_project_slug/);
  });

  it('targets only the slug-scoped save_lesson tool name', () => {
    expect(content).toMatch(/lore-memory-\{[^}]*slug[^}]*\}__save_lesson/);
  });

  it('scopes query_lessons_for_task and search_similar to the slug', () => {
    expect(content).toMatch(
      /lore-memory-\{[^}]*slug[^}]*\}__query_lessons_for_task/,
    );
    expect(content).toMatch(/lore-memory-\{[^}]*slug[^}]*\}__search_similar/);
  });

  it('does not allow a broad/wildcard match against any *save_lesson tool', () => {
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
    expect(content).toMatch(/(?:does not|never|MUST NOT|do not)\s+fall ?back/i);
  });
});
