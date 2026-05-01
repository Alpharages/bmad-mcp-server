/**
 * Upstream compatibility regression tests
 *
 * These tests validate that the upstream BMAD-METHOD workflows still contain
 * the step names/structures that our custom skills override. If upstream
 * renames or renumbers steps, these tests fail immediately so we know to
 * update our override instructions.
 */

import { describe, it, expect } from 'vitest';
import { ResourceLoaderGit } from '../../src/core/resource-loader.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('upstream compatibility — bmad-create-story', () => {
  it('upstream workflow must contain the step names referenced by clickup-create-story overrides', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'bmad-upstream-compat-'));
    try {
      const loader = new ResourceLoaderGit(projectDir);

      let resource;
      try {
        resource = await loader.loadWorkflow('bmad-create-story');
      } catch {
        // Upstream not cached and network clone would be required.
        // Skip rather than block the test suite on a fresh machine or CI.
        return;
      }

      // Only validate when we actually resolved from the git upstream.
      // If a project-local override exists, this test is not exercising
      // the real upstream contract.
      if (resource.source !== 'git') {
        return;
      }

      const content = resource.content;

      // These step markers are referenced by name in
      // src/custom-skills/clickup-create-story/steps/step-04-description-composer.md
      // (branches 3a and 3b override instructions).
      // If BMAD-METHOD renames or renumbers these steps, the LLM executing
      // bmad-create-story may ignore our overrides.
      const requiredSteps = [
        {
          pattern: /<step n=["']5["'].+goal=["']Create comprehensive story file["']/i,
          name: 'Step 5: Create comprehensive story file',
        },
        {
          pattern: /<step n=["']6["'].+goal=["']Update sprint status/i,
          name: 'Step 6: Update sprint status',
        },
      ];

      for (const step of requiredSteps) {
        // Custom assertion message so the failure is actionable
        expect(
          content,
          `Upstream bmad-create-story is missing "${step.name}". ` +
            `BMAD-METHOD may have renamed/renumbered this step. ` +
            `Update src/custom-skills/clickup-create-story/steps/step-04-description-composer.md ` +
            `override instructions to match the new upstream step names.`,
        ).toMatch(step.pattern);
      }
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
