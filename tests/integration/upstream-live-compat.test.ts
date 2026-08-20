/**
 * BMAD 6.11 upstream compatibility contract — live.
 *
 * Asserts the SAME contract as `tests/unit/upstream-compat.test.ts`, but
 * against the real `Alpharages/BMAD-METHOD` upstream instead of the pinned
 * fixture. When this fails and the offline check passes, upstream has moved.
 *
 * Opt-in, so the default suite stays offline and deterministic:
 *
 *   BMAD_LIVE_UPSTREAM=1 npm run test:integration
 *
 * When it IS enabled, an unavailable upstream is a hard failure, not a skip —
 * a compatibility job that silently passes because it could not reach the
 * thing it was checking is worse than no job at all.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ResourceLoaderGit } from '../../src/core/resource-loader.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BMAD_611_CONTRACTS } from '../helpers/bmad-611-contract.js';

const ENABLED = /^(1|true)$/i.test(process.env.BMAD_LIVE_UPSTREAM ?? '');

describe.skipIf(!ENABLED)('BMAD 6.11 upstream contract (live upstream)', () => {
  let projectDir = '';
  const payloads = new Map<string, string>();
  let loadError: Error | null = null;

  beforeAll(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'bmad-live-compat-'));
    const loader = new ResourceLoaderGit(projectDir);
    try {
      for (const contract of BMAD_611_CONTRACTS) {
        const resource = await loader.loadWorkflow(contract.skill);
        expect(
          resource.source,
          `${contract.skill} must resolve from the git upstream, not a local override`,
        ).toBe('git');
        payloads.set(contract.skill, resource.content);
      }
    } catch (error) {
      loadError = error as Error;
    }
  }, 300_000);

  it('resolved every upstream skill (no silent skip)', () => {
    expect(
      loadError,
      'BMAD_LIVE_UPSTREAM is set but the upstream could not be resolved. ' +
        'This is a hard failure: a compatibility check that cannot reach ' +
        'upstream must not report success. Fix network/cache access, or ' +
        'unset BMAD_LIVE_UPSTREAM to run the offline fixture check only.',
    ).toBeNull();

    for (const contract of BMAD_611_CONTRACTS) {
      expect(
        payloads.get(contract.skill)?.length ?? 0,
        `${contract.skill} returned an empty payload from upstream`,
      ).toBeGreaterThan(0);
    }
  });

  for (const contract of BMAD_611_CONTRACTS) {
    describe(`${contract.skill} (consumed by ${contract.consumer})`, () => {
      it('still inlines every required file in one read', () => {
        const content = payloads.get(contract.skill) ?? '';
        for (const file of contract.requiredFiles) {
          expect(
            content,
            `Upstream ${contract.skill} no longer ships ./${file}, or the loader ` +
              `stopped inlining it. ${contract.consumer} depends on it being ` +
              `reachable through a single MCP workflow read.`,
          ).toContain(`=== ./${file} ===`);
        }
      });

      for (const marker of contract.markers) {
        it(`still carries the "${marker.name}" contract`, () => {
          const content = payloads.get(contract.skill) ?? '';
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

  it('cleans up the temporary project dir', () => {
    rmSync(projectDir, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
