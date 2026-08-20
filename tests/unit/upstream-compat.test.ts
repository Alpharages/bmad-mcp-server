/**
 * BMAD 6.11 upstream compatibility contract — offline.
 *
 * Runs against the pinned fixture in `tests/fixtures/bmad-6.11/`, so it needs
 * no network and no Git cache and can never silently skip. Every contract
 * element the custom `bmad-clickup-*` workflows depend on is asserted by name,
 * with a message naming the custom instruction that breaks when it moves.
 *
 * Drift in the *real* upstream is caught separately by
 * `tests/integration/upstream-live-compat.test.ts` (opt-in, `BMAD_LIVE_UPSTREAM=1`).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ResourceLoaderGit } from '../../src/core/resource-loader.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BMAD_611_CONTRACTS,
  DEPRECATED_UPSTREAM_IDS,
} from '../helpers/bmad-611-contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const FIXTURE_ROOT = join(REPO_ROOT, 'tests', 'fixtures', 'bmad-6.11');

/**
 * Load a skill from the pinned fixture through the real loader, with the user
 * and Git sources disabled so nothing outside the fixture can satisfy a
 * lookup and mask a missing contract.
 */
const loadFromFixture = async (name: string): Promise<string> => {
  const loader = new ResourceLoaderGit(FIXTURE_ROOT);
  const internals = loader as unknown as {
    resolvedGitPaths: Map<string, string>;
    paths: { userBmad: string; gitRemotes?: string[] };
  };
  internals.paths.userBmad = join(FIXTURE_ROOT, '__no_user_bmad__');
  internals.paths.gitRemotes = [];
  internals.resolvedGitPaths.clear();

  const resource = await loader.loadWorkflow(name);
  expect(
    resource.source,
    `${name} must resolve from the pinned fixture, not another source`,
  ).toBe('project');
  return resource.content;
};

describe('BMAD 6.11 upstream contract (pinned fixture, offline)', () => {
  it('the pinned fixture is present and records its provenance', () => {
    expect(
      existsSync(FIXTURE_ROOT),
      'tests/fixtures/bmad-6.11/ is missing — the offline contract check cannot run',
    ).toBe(true);

    const pinned = readFileSync(join(FIXTURE_ROOT, 'PINNED.md'), 'utf-8');
    expect(pinned).toContain('Alpharages/BMAD-METHOD');
    expect(pinned).toMatch(/`6\.11\.\d+`/);
    expect(pinned).toMatch(/`[0-9a-f]{40}`/);
  });

  for (const contract of BMAD_611_CONTRACTS) {
    describe(`${contract.skill} (consumed by ${contract.consumer})`, () => {
      let content = '';

      beforeAll(async () => {
        content = await loadFromFixture(contract.skill);
      });

      it('returns a non-empty payload from one workflow read', () => {
        expect(content.length).toBeGreaterThan(0);
      });

      it('inlines every required file in that single read', () => {
        for (const file of contract.requiredFiles) {
          expect(
            content,
            `One read of ${contract.skill} must inline ./${file}. ` +
              `Without it the LLM executing ${contract.consumer} cannot reach that file — ` +
              `it lives in the npm package or Git cache, not under any BMAD root the client can see.`,
          ).toContain(`=== ./${file} ===`);
        }
      });

      for (const marker of contract.markers) {
        it(`carries the "${marker.name}" contract`, () => {
          expect(
            content,
            `Upstream ${contract.skill} no longer carries "${marker.name}". ` +
              `Impact: ${marker.why} ` +
              `Update the custom instructions and re-capture tests/fixtures/bmad-6.11/.`,
          ).toMatch(marker.pattern);
        });
      }
    });
  }

  describe('deprecated v6 shims', () => {
    for (const id of DEPRECATED_UPSTREAM_IDS) {
      it(`${id} is absent from the pinned 6.11 fixture`, async () => {
        const loader = new ResourceLoaderGit(FIXTURE_ROOT);
        const internals = loader as unknown as {
          resolvedGitPaths: Map<string, string>;
          paths: { userBmad: string; gitRemotes?: string[] };
        };
        internals.paths.userBmad = join(FIXTURE_ROOT, '__no_user_bmad__');
        internals.paths.gitRemotes = [];
        internals.resolvedGitPaths.clear();

        await expect(loader.loadWorkflow(id)).rejects.toThrow(
          `Workflow not found: ${id}`,
        );
      });
    }
  });
});
