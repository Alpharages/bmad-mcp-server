/**
 * Basic tests for the Lite implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResourceLoaderGit } from '../../src/core/resource-loader.js';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('ResourceLoader (Lite)', () => {
  let testDir: string;
  let loader: ResourceLoaderGit;

  beforeEach(() => {
    // Create temp directory for testing
    testDir = join(tmpdir(), `bmad-lite-test-${Date.now()}`);
    mkdirSync(join(testDir, 'bmad', 'agents'), { recursive: true });
    mkdirSync(join(testDir, 'bmad', 'workflows', 'test-workflow'), {
      recursive: true,
    });

    // Create test files
    writeFileSync(
      join(testDir, 'bmad', 'agents', 'test-agent.md'),
      '# Test Agent\nThis is a test agent',
    );
    writeFileSync(
      join(testDir, 'bmad', 'workflows', 'test-workflow', 'workflow.yaml'),
      'name: test-workflow\ndescription: Test workflow',
    );

    loader = new ResourceLoaderGit(testDir);
  });

  afterEach(() => {
    // Cleanup
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load an agent', async () => {
    const resource = await loader.loadAgent('test-agent');
    expect(resource.name).toBe('test-agent');
    expect(resource.content).toContain('Test Agent');
    expect(resource.source).toBe('project');
  });

  it('should load a workflow', async () => {
    const resource = await loader.loadWorkflow('test-workflow');
    expect(resource.name).toBe('test-workflow');
    expect(resource.content).toContain('test-workflow');
    expect(resource.source).toBe('project');
  });

  it('should list agents', async () => {
    const agents = await loader.listAgents();
    expect(agents).toContain('test-agent');
  });

  it('should list workflows', async () => {
    const workflows = await loader.listWorkflows();
    expect(workflows).toContain('test-workflow');
  });

  it('should throw when agent not found', async () => {
    await expect(loader.loadAgent('nonexistent')).rejects.toThrow(
      'Agent not found: nonexistent',
    );
  });

  it('should throw when workflow not found', async () => {
    await expect(loader.loadWorkflow('nonexistent')).rejects.toThrow(
      'Workflow not found: nonexistent',
    );
  });

  it('should load a workflow from src/custom-skills layout', async () => {
    // arrange
    const customSkillDir = join(
      testDir,
      'src',
      'custom-skills',
      'my-custom-skill',
    );
    mkdirSync(customSkillDir, { recursive: true });
    writeFileSync(
      join(customSkillDir, 'SKILL.md'),
      '---\nname: my-custom-skill\n---\n# My Custom Skill',
    );
    const customLoader = new ResourceLoaderGit(testDir);
    // act
    const resource = await customLoader.loadWorkflow('my-custom-skill');
    // assert
    expect(resource.name).toBe('my-custom-skill');
    expect(resource.content).toContain('My Custom Skill');
    expect(resource.source).toBe('project');
  });

  it('should resolve upstream skill from git source when project has only src/custom-skills', async () => {
    // P3: local alias for DEFAULT_BMAD_REMOTE in src/core/resource-loader.ts — keep in sync
    const BMAD_METHOD_GIT_URL =
      'git+https://github.com/Alpharages/BMAD-METHOD.git';
    // arrange — P2: mkdtempSync creates atomically unique dirs, safe under parallel workers
    const projectDir = mkdtempSync(join(tmpdir(), 'bmad-regression-project-'));
    const gitCacheDir = mkdtempSync(join(tmpdir(), 'bmad-regression-git-'));
    try {
      const customSkillDir = join(
        projectDir,
        'src',
        'custom-skills',
        'clickup-create-story',
      );
      mkdirSync(customSkillDir, { recursive: true });
      writeFileSync(
        join(customSkillDir, 'SKILL.md'),
        '---\nname: clickup-create-story\n---\n# ClickUp Create Story',
      );
      const upstreamSkillDir = join(
        gitCacheDir,
        'src',
        'bmm-skills',
        'bmad-create-story',
      );
      mkdirSync(upstreamSkillDir, { recursive: true });
      writeFileSync(
        join(upstreamSkillDir, 'SKILL.md'),
        '---\nname: bmad-create-story\n---\n# BMAD Create Story',
      );
      const regressionLoader = new ResourceLoaderGit(projectDir);
      type LoaderInternals = {
        resolvedGitPaths: Map<string, string>;
        paths: { userBmad: string };
      };
      const internals = regressionLoader as unknown as LoaderInternals;
      // Redirect user bmad to a nonexistent path so Stage 1 + Stage 2 user lookups are skipped
      internals.paths.userBmad = join(tmpdir(), 'bmad-nonexistent-user');
      // Pre-populate the git cache map with the real BMAD-METHOD URL so resolveGitRemotes()
      // skips the network fetch (it checks .has(url) before cloning)
      internals.resolvedGitPaths.set(BMAD_METHOD_GIT_URL, gitCacheDir);
      // act
      const resource = await regressionLoader.loadWorkflow('bmad-create-story');
      // assert
      expect(resource.name).toBe('bmad-create-story');
      expect(resource.content).toContain('BMAD Create Story');
      expect(resource.source).toBe('git');
    } finally {
      // P1: cleanup runs unconditionally even when assertions throw
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(gitCacheDir, { recursive: true, force: true });
    }
  });
});
