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

  it('inlines the complete text skill package alongside SKILL.md', async () => {
    const customSkillDir = join(
      testDir,
      'src',
      'custom-skills',
      'skill-with-steps',
    );
    mkdirSync(join(customSkillDir, 'steps'), { recursive: true });
    writeFileSync(
      join(customSkillDir, 'SKILL.md'),
      '---\nname: skill-with-steps\n---\nFollow ./workflow.md.',
    );
    writeFileSync(
      join(customSkillDir, 'workflow.md'),
      '# Workflow\nSee: [./steps/step-01-first.md](./steps/step-01-first.md)',
    );
    // Files written out of alphabetical order to verify sorting.
    writeFileSync(
      join(customSkillDir, 'steps', 'step-02-second.md'),
      '# Step 2 - Second\nSecond step body.',
    );
    writeFileSync(
      join(customSkillDir, 'steps', 'step-01-first.md'),
      '# Step 1 - First\nFirst step body.',
    );

    const customLoader = new ResourceLoaderGit(testDir);
    const resource = await customLoader.loadWorkflow('skill-with-steps');

    expect(resource.content).toContain('Follow ./workflow.md.');
    expect(resource.content).toContain('=== ./workflow.md ===');
    expect(resource.content).toContain('# Workflow');
    expect(resource.content).toContain('=== ./steps/step-01-first.md ===');
    expect(resource.content).toContain('First step body.');
    expect(resource.content).toContain('=== ./steps/step-02-second.md ===');
    expect(resource.content).toContain('Second step body.');
    // Step 1 must appear before step 2 regardless of filesystem order.
    expect(resource.content.indexOf('step-01-first.md')).toBeLessThan(
      resource.content.indexOf('step-02-second.md'),
    );
    // Inlining marker must precede the first inlined section so the LLM
    // does not try to re-fetch the package files.
    expect(resource.content.indexOf('inlined below')).toBeLessThan(
      resource.content.indexOf('=== ./steps/step-01-first.md ==='),
    );
  });

  it('inlines nested prompts, references, templates and customize.toml', async () => {
    const skillDir = join(testDir, 'src', 'custom-skills', 'rich-skill');
    mkdirSync(join(skillDir, 'references'), { recursive: true });
    mkdirSync(join(skillDir, 'review-prompts'), { recursive: true });
    mkdirSync(join(skillDir, 'assets'), { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '---\nname: rich-skill\n---\nRoot skill body.',
    );
    writeFileSync(join(skillDir, 'customize.toml'), 'menu_code = "ZZ"\n');
    writeFileSync(join(skillDir, 'spec-template.md'), '# Spec Template');
    writeFileSync(join(skillDir, 'checklist.md'), '# Checklist');
    // BMAD 6.11 skills may keep step files at the package root.
    writeFileSync(join(skillDir, 'step-01-clarify.md'), '# Root-level step 1');
    writeFileSync(
      join(skillDir, 'references', 'claims-check.md'),
      '# Claims Check',
    );
    writeFileSync(
      join(skillDir, 'review-prompts', 'edge-case-hunter.md'),
      '# Edge Case Hunter',
    );
    writeFileSync(
      join(skillDir, 'assets', 'stories-schema.md'),
      '# Stories Schema',
    );
    writeFileSync(join(skillDir, 'module.yaml'), 'name: rich\n');
    writeFileSync(join(skillDir, 'data.json'), '{"a":1}');
    writeFileSync(join(skillDir, 'notes.txt'), 'plain text note');

    const customLoader = new ResourceLoaderGit(testDir);
    const resource = await customLoader.loadWorkflow('rich-skill');

    for (const marker of [
      '=== ./assets/stories-schema.md ===',
      '=== ./checklist.md ===',
      '=== ./customize.toml ===',
      '=== ./data.json ===',
      '=== ./module.yaml ===',
      '=== ./notes.txt ===',
      '=== ./references/claims-check.md ===',
      '=== ./review-prompts/edge-case-hunter.md ===',
      '=== ./spec-template.md ===',
      '=== ./step-01-clarify.md ===',
    ]) {
      expect(resource.content).toContain(marker);
    }
    expect(resource.content).toContain('# Edge Case Hunter');
    expect(resource.content).toContain('menu_code = "ZZ"');
    expect(resource.content).toContain('plain text note');
  });

  it('emits package files in deterministic sorted order', async () => {
    const skillDir = join(testDir, 'src', 'custom-skills', 'ordered-skill');
    mkdirSync(join(skillDir, 'zeta'), { recursive: true });
    mkdirSync(join(skillDir, 'alpha'), { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '---\nname: ordered-skill\n---\nBody.',
    );
    writeFileSync(join(skillDir, 'zeta', 'z.md'), 'Z body');
    writeFileSync(join(skillDir, 'alpha', 'a.md'), 'A body');
    writeFileSync(join(skillDir, 'workflow.md'), 'W body');

    const customLoader = new ResourceLoaderGit(testDir);
    const first = await customLoader.loadWorkflow('ordered-skill');
    const second = await new ResourceLoaderGit(testDir).loadWorkflow(
      'ordered-skill',
    );

    expect(first.content).toBe(second.content);
    const order = [
      '=== ./alpha/a.md ===',
      '=== ./workflow.md ===',
      '=== ./zeta/z.md ===',
    ].map((m) => first.content.indexOf(m));
    expect(order.every((idx) => idx >= 0)).toBe(true);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  it('includes SKILL.md exactly once and never as an inlined section', async () => {
    const skillDir = join(testDir, 'src', 'custom-skills', 'once-skill');
    mkdirSync(join(skillDir, 'nested'), { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '---\nname: once-skill\n---\nUNIQUE_ROOT_MARKER',
    );
    // A nested SKILL.md-named file is a normal package file, not the root one.
    writeFileSync(join(skillDir, 'nested', 'SKILL.md'), 'NESTED_MARKER');

    const customLoader = new ResourceLoaderGit(testDir);
    const resource = await customLoader.loadWorkflow('once-skill');

    expect(resource.content.split('UNIQUE_ROOT_MARKER')).toHaveLength(2);
    expect(resource.content).not.toContain('=== ./SKILL.md ===');
    expect(resource.content).toContain('=== ./nested/SKILL.md ===');
  });

  it('excludes hidden entries, unsupported extensions and binary files', async () => {
    const skillDir = join(testDir, 'src', 'custom-skills', 'filtered-skill');
    mkdirSync(join(skillDir, '.hidden'), { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '---\nname: filtered-skill\n---\nBody.',
    );
    writeFileSync(join(skillDir, '.hidden', 'secret.md'), 'HIDDEN_DIR_BODY');
    writeFileSync(join(skillDir, '.env.md'), 'HIDDEN_FILE_BODY');
    writeFileSync(join(skillDir, 'diagram.png'), 'UNSUPPORTED_EXT_BODY');
    writeFileSync(join(skillDir, 'script.sh'), 'echo UNSUPPORTED_SH_BODY');
    // A .md file that is actually binary (contains a NUL byte).
    writeFileSync(
      join(skillDir, 'binary.md'),
      Buffer.from([
        0x42, 0x49, 0x4e, 0x41, 0x52, 0x59, 0x5f, 0x42, 0x4f, 0x44, 0x59, 0x00,
        0x21,
      ]),
    );

    const customLoader = new ResourceLoaderGit(testDir);
    const resource = await customLoader.loadWorkflow('filtered-skill');

    expect(resource.content).not.toContain('HIDDEN_DIR_BODY');
    expect(resource.content).not.toContain('HIDDEN_FILE_BODY');
    expect(resource.content).not.toContain('UNSUPPORTED_EXT_BODY');
    expect(resource.content).not.toContain('UNSUPPORTED_SH_BODY');
    expect(resource.content).not.toContain('BINARY_BODY');
    expect(resource.content).not.toContain('=== ./binary.md ===');
  });

  it('omits the inlining marker when a skill is a lone SKILL.md', async () => {
    const customSkillDir = join(
      testDir,
      'src',
      'custom-skills',
      'skill-without-steps',
    );
    mkdirSync(customSkillDir, { recursive: true });
    writeFileSync(
      join(customSkillDir, 'SKILL.md'),
      '---\nname: skill-without-steps\n---\nNo steps here.',
    );

    const customLoader = new ResourceLoaderGit(testDir);
    const resource = await customLoader.loadWorkflow('skill-without-steps');

    expect(resource.content).toContain('No steps here.');
    expect(resource.content).not.toContain('inlined below');
    expect(resource.content).not.toContain('=== ./');
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
        'bmad-clickup-create-story',
      );
      mkdirSync(customSkillDir, { recursive: true });
      writeFileSync(
        join(customSkillDir, 'SKILL.md'),
        '---\nname: bmad-clickup-create-story\n---\n# ClickUp Create Story',
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

  it('should load bmad-clickup-create-story without confusion when bmad-clickup-create-bug also exists', async () => {
    // arrange — two sibling skills in src/custom-skills/ (EPIC-7 layout)
    const projectDir = mkdtempSync(join(tmpdir(), 'bmad-regression-7-8-'));
    try {
      const createStoryDir = join(
        projectDir,
        'src',
        'custom-skills',
        'bmad-clickup-create-story',
      );
      const createBugDir = join(
        projectDir,
        'src',
        'custom-skills',
        'bmad-clickup-create-bug',
      );
      mkdirSync(createStoryDir, { recursive: true });
      mkdirSync(createBugDir, { recursive: true });
      writeFileSync(
        join(createStoryDir, 'SKILL.md'),
        '---\nname: bmad-clickup-create-story\n---\n# ClickUp Create Story — sentinel',
      );
      writeFileSync(
        join(createBugDir, 'SKILL.md'),
        '---\nname: bmad-clickup-create-bug\n---\n# ClickUp Create Bug — sentinel',
      );
      const disambigLoader = new ResourceLoaderGit(projectDir);
      // act + assert — create-story resolves to the correct skill
      const storyResource = await disambigLoader.loadWorkflow(
        'bmad-clickup-create-story',
      );
      expect(storyResource.name).toBe('bmad-clickup-create-story');
      expect(storyResource.content).toContain(
        'ClickUp Create Story — sentinel',
      );
      expect(storyResource.content).not.toContain('ClickUp Create Bug');
      expect(storyResource.source).toBe('project');
      // act + assert — create-bug resolves to the correct skill
      const bugResource = await disambigLoader.loadWorkflow(
        'bmad-clickup-create-bug',
      );
      expect(bugResource.name).toBe('bmad-clickup-create-bug');
      expect(bugResource.content).toContain('ClickUp Create Bug — sentinel');
      expect(bugResource.content).not.toContain('ClickUp Create Story');
      expect(bugResource.source).toBe('project');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
