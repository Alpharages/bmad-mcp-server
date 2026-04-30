import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleBMADTool } from '@/tools/bmad-unified.js';
import { BMADEngine } from '@/core/bmad-engine.js';

describe('resolve-doc-paths integration', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'resolve-doc-paths-integ-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('end-to-end via handleBMADTool with no projectRoot', async () => {
    const engine = new BMADEngine(projectRoot);
    const result = await handleBMADTool(
      { operation: 'resolve-doc-paths' },
      engine,
    );

    const text = result.content[0].text;
    expect(text).toContain(`Resolved doc paths (project root: ${projectRoot})`);
    expect(text).toContain('prd:');
    expect(text).toContain('[default]');
    expect(text).toContain('architecture:');
    expect(text).toContain('epics:');
  });

  it('end-to-end with explicit projectRoot and .bmadmcp config', async () => {
    const otherRoot = mkdtempSync(
      join(tmpdir(), 'resolve-doc-paths-integ-other-'),
    );
    try {
      const bmadmcpDir = join(otherRoot, '.bmadmcp');
      mkdirSync(bmadmcpDir, { recursive: true });
      writeFileSync(
        join(bmadmcpDir, 'config.toml'),
        '[docs]\nprd_path = "specs/PRD.md"\n',
        'utf-8',
      );

      const engine = new BMADEngine(projectRoot);
      const result = await handleBMADTool(
        { operation: 'resolve-doc-paths', projectRoot: otherRoot },
        engine,
      );

      const text = result.content[0].text;
      expect(text).toContain(`Resolved doc paths (project root: ${otherRoot})`);
      expect(text).toContain(join(otherRoot, 'specs', 'PRD.md'));
      expect(text).toContain('[bmadmcp-config]');
    } finally {
      rmSync(otherRoot, { recursive: true, force: true });
    }
  });

  it('end-to-end with malformed .bmadmcp/config.toml', async () => {
    const bmadmcpDir = join(projectRoot, '.bmadmcp');
    mkdirSync(bmadmcpDir, { recursive: true });
    writeFileSync(
      join(bmadmcpDir, 'config.toml'),
      '[docs]\nprd_path = "unterminated',
      'utf-8',
    );

    const engine = new BMADEngine(projectRoot);
    const result = await handleBMADTool(
      { operation: 'resolve-doc-paths' },
      engine,
    );

    const text = result.content[0].text;
    expect(text).toContain('Warnings (1):');
    expect(text).toContain('malformed TOML —');
  });
});
