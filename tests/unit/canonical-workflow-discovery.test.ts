/**
 * Canonical workflow discovery and removed-ID rejection.
 *
 * Exercises the real `ResourceLoaderGit` against this repository, so it covers
 * the same path an MCP `list` / `read` / `execute` call takes. The clean
 * cutover promises that only `bmad-clickup-*` IDs work and the six removed
 * `clickup-*` IDs fail with the normal unknown-workflow error — this is where
 * that promise is enforced.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ResourceLoaderGit } from '../../src/core/resource-loader.js';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const CANONICAL = [
  'bmad-clickup-code-review',
  'bmad-clickup-create-bug',
  'bmad-clickup-create-epic',
  'bmad-clickup-create-story',
  'bmad-clickup-dev-implement',
  'bmad-clickup-qa',
] as const;

const REMOVED = [
  'clickup-code-review',
  'clickup-create-bug',
  'clickup-create-epic',
  'clickup-create-story',
  'clickup-dev-implement',
  'clickup-qa',
] as const;

/**
 * A loader scoped to this repository with the user and Git sources disabled,
 * so discovery reflects `src/custom-skills/` alone and cannot be satisfied by
 * a stale cache on the machine running the tests.
 */
const projectOnlyLoader = (): ResourceLoaderGit => {
  const loader = new ResourceLoaderGit(REPO_ROOT);
  const internals = loader as unknown as {
    resolvedGitPaths: Map<string, string>;
    paths: { userBmad: string; gitRemotes?: string[] };
  };
  internals.paths.userBmad = join(tmpdir(), 'bmad-nonexistent-user-scope');
  internals.paths.gitRemotes = [];
  internals.resolvedGitPaths.clear();
  return loader;
};

describe('canonical workflow discovery', () => {
  let listed: string[] = [];

  beforeAll(async () => {
    listed = await projectOnlyLoader().listWorkflows();
  });

  it('lists all six canonical workflows', () => {
    for (const name of CANONICAL) {
      expect(listed, `${name} must appear in workflow discovery`).toContain(
        name,
      );
    }
  });

  it('lists each workflow exactly once', () => {
    const clickup = listed.filter((n) => n.includes('clickup'));
    expect(new Set(clickup).size).toBe(clickup.length);
  });

  it('lists no removed workflow ID', () => {
    for (const name of REMOVED) {
      expect(
        listed,
        `${name} was removed and must not be listed`,
      ).not.toContain(name);
    }
  });

  it('exposes no bare clickup-* entry at all', () => {
    expect(listed.filter((n) => /^clickup-/.test(n))).toEqual([]);
  });

  it.each(CANONICAL)('reads %s and inlines its step files', async (name) => {
    const resource = await projectOnlyLoader().loadWorkflow(name);
    expect(resource.name).toBe(name);
    expect(resource.source).toBe('project');
    expect(resource.content).toContain(`name: ${name}`);
    expect(resource.content).toContain('=== ./workflow.md ===');
    expect(resource.content).toMatch(/=== \.\/steps\/step-01-/);
  });

  it.each(REMOVED)(
    'rejects removed ID %s with the normal unknown-workflow error',
    async (name) => {
      await expect(projectOnlyLoader().loadWorkflow(name)).rejects.toThrow(
        `Workflow not found: ${name}`,
      );
    },
  );
});
