import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDocPaths } from '@/utils/doc-path-resolver.js';

describe('resolveDocPaths', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'doc-path-resolver-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  function writeBmadmcp(toml: string): void {
    const dir = join(projectRoot, '.bmadmcp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.toml'), toml, 'utf-8');
  }

  function writeBmadConfig(
    toml: string,
    variant: 'bmad' | '_bmad' = '_bmad',
  ): void {
    const dir = join(projectRoot, variant);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.toml'), toml, 'utf-8');
  }

  function writeBmadUserConfig(
    toml: string,
    variant: 'bmad' | '_bmad' = '_bmad',
  ): void {
    const dir = join(projectRoot, variant);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.user.toml'), toml, 'utf-8');
  }

  function writeBmadCustomConfig(
    toml: string,
    variant: 'bmad' | '_bmad' = '_bmad',
  ): void {
    const dir = join(projectRoot, variant, 'custom');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.toml'), toml, 'utf-8');
  }

  function writeBmadCustomUserConfig(
    toml: string,
    variant: 'bmad' | '_bmad' = '_bmad',
  ): void {
    const dir = join(projectRoot, variant, 'custom');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.user.toml'), toml, 'utf-8');
  }

  it('default-only: no config anywhere', () => {
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'planning-artifacts', 'PRD.md'),
      layer: 'default',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'planning-artifacts', 'architecture.md'),
      layer: 'default',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'planning-artifacts', 'epics/'),
      layer: 'default',
    });
    expect(r.warnings).toEqual([]);
  });

  it('.bmadmcp-only — all three keys set (relative)', () => {
    writeBmadmcp(
      '[docs]\n' +
        'prd_path = "specs/PRD.md"\n' +
        'architecture_path = "docs/architecture.md"\n' +
        'epics_path = "docs/epics"\n',
    );
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'specs', 'PRD.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'docs', 'architecture.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'docs', 'epics'),
      layer: 'bmadmcp-config',
    });
    expect(r.warnings).toEqual([]);
  });

  it('.bmadmcp-only — all three keys set (absolute)', () => {
    writeBmadmcp(
      '[docs]\n' +
        'prd_path = "/abs/PRD.md"\n' +
        'architecture_path = "/abs/architecture.md"\n' +
        'epics_path = "/abs/epics"\n',
    );
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({ path: '/abs/PRD.md', layer: 'bmadmcp-config' });
    expect(r.architecture).toEqual({
      path: '/abs/architecture.md',
      layer: 'bmadmcp-config',
    });
    expect(r.epics).toEqual({ path: '/abs/epics', layer: 'bmadmcp-config' });
    expect(r.warnings).toEqual([]);
  });

  it('.bmadmcp-only — partial (prd_path only)', () => {
    writeBmadmcp('[docs]\nprd_path = "specs/PRD.md"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'specs', 'PRD.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'planning-artifacts', 'architecture.md'),
      layer: 'default',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'planning-artifacts', 'epics/'),
      layer: 'default',
    });
    expect(r.warnings).toEqual([]);
  });

  it('.bmadmcp-only — planning_dir fallback', () => {
    writeBmadmcp('[docs]\nplanning_dir = "docs"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'docs', 'PRD.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'docs', 'architecture.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'docs', 'epics/'),
      layer: 'bmadmcp-config',
    });
    expect(r.warnings).toEqual([]);
  });

  it('.bmadmcp-only — planning_dir plus per-key override', () => {
    writeBmadmcp(
      '[docs]\n' + 'planning_dir = "docs"\n' + 'prd_path = "specs/PRD.md"\n',
    );
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'specs', 'PRD.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'docs', 'architecture.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'docs', 'epics/'),
      layer: 'bmadmcp-config',
    });
    expect(r.warnings).toEqual([]);
  });

  it('BMAD-only — _bmad/config.toml with [bmm].planning_artifacts', () => {
    writeBmadConfig('[bmm]\nplanning_artifacts = "docs/planning"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'docs', 'planning', 'PRD.md'),
      layer: 'bmad-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'docs', 'planning', 'architecture.md'),
      layer: 'bmad-config',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'docs', 'planning', 'epics/'),
      layer: 'bmad-config',
    });
    expect(r.warnings).toEqual([]);
  });

  it('BMAD-only — bmad/ preferred over _bmad/', () => {
    writeBmadConfig('[bmm]\nplanning_artifacts = "bmad-dir"\n', 'bmad');
    writeBmadConfig(
      '[bmm]\nplanning_artifacts = "underscore-bmad-dir"\n',
      '_bmad',
    );
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'bmad-dir', 'PRD.md'),
      layer: 'bmad-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'bmad-dir', 'architecture.md'),
      layer: 'bmad-config',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'bmad-dir', 'epics/'),
      layer: 'bmad-config',
    });
    expect(r.warnings).toEqual([]);
  });

  describe('BMAD 4-layer merge', () => {
    it('all four layers: custom.user wins', () => {
      writeBmadConfig('[bmm]\nplanning_artifacts = "base"\n');
      writeBmadUserConfig('[bmm]\nplanning_artifacts = "user"\n');
      writeBmadCustomConfig('[bmm]\nplanning_artifacts = "custom"\n');
      writeBmadCustomUserConfig('[bmm]\nplanning_artifacts = "custom-user"\n');
      const r = resolveDocPaths(projectRoot);
      expect(r.prd.path).toBe(join(projectRoot, 'custom-user', 'PRD.md'));
      expect(r.architecture.path).toBe(
        join(projectRoot, 'custom-user', 'architecture.md'),
      );
      expect(r.epics.path).toBe(join(projectRoot, 'custom-user', 'epics/'));
      expect(r.prd.layer).toBe('bmad-config');
      expect(r.warnings).toEqual([]);
    });

    it('base + user: user wins', () => {
      writeBmadConfig('[bmm]\nplanning_artifacts = "base"\n');
      writeBmadUserConfig('[bmm]\nplanning_artifacts = "user"\n');
      const r = resolveDocPaths(projectRoot);
      expect(r.prd.path).toBe(join(projectRoot, 'user', 'PRD.md'));
      expect(r.prd.layer).toBe('bmad-config');
    });

    it('base + custom: custom wins', () => {
      writeBmadConfig('[bmm]\nplanning_artifacts = "base"\n');
      writeBmadCustomConfig('[bmm]\nplanning_artifacts = "custom"\n');
      const r = resolveDocPaths(projectRoot);
      expect(r.prd.path).toBe(join(projectRoot, 'custom', 'PRD.md'));
      expect(r.prd.layer).toBe('bmad-config');
    });

    it('base + custom.user: custom.user wins', () => {
      writeBmadConfig('[bmm]\nplanning_artifacts = "base"\n');
      writeBmadCustomUserConfig('[bmm]\nplanning_artifacts = "custom-user"\n');
      const r = resolveDocPaths(projectRoot);
      expect(r.prd.path).toBe(join(projectRoot, 'custom-user', 'PRD.md'));
      expect(r.prd.layer).toBe('bmad-config');
    });
  });

  it('BMAD layer — deep-merge of [bmm] table', () => {
    writeBmadConfig('[bmm]\nplanning_artifacts = "base"\nother_key = "x"\n');
    writeBmadUserConfig('[bmm]\nother_key = "y"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.path).toBe(join(projectRoot, 'base', 'PRD.md'));
    expect(r.prd.layer).toBe('bmad-config');
  });

  it('.bmadmcp overrides BMAD', () => {
    writeBmadmcp('[docs]\nprd_path = "specs/PRD.md"\n');
    writeBmadConfig('[bmm]\nplanning_artifacts = "docs"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'specs', 'PRD.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'docs', 'architecture.md'),
      layer: 'bmad-config',
    });
    expect(r.epics).toEqual({
      path: join(projectRoot, 'docs', 'epics/'),
      layer: 'bmad-config',
    });
    expect(r.warnings).toEqual([]);
  });

  it('malformed .bmadmcp/config.toml', () => {
    writeBmadmcp('[docs]\nprd_path = "unterminated');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('default');
    expect(r.architecture.layer).toBe('default');
    expect(r.epics.layer).toBe('default');
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain(
      join(projectRoot, '.bmadmcp', 'config.toml'),
    );
    expect(r.warnings[0]).toContain('malformed TOML —');
    expect(r.warnings[0]).toContain('falling back to BMAD / default');
  });

  it('malformed BMAD layer file in middle of chain', () => {
    writeBmadConfig('[bmm]\nplanning_artifacts = "base"\n');
    writeBmadUserConfig('[bmm]\nplanning_artifacts = "unterminated');
    writeBmadCustomConfig('[bmm]\nplanning_artifacts = "custom"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.path).toBe(join(projectRoot, 'custom', 'PRD.md'));
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain(
      join(projectRoot, '_bmad', 'config.user.toml'),
    );
    expect(r.warnings[0]).toContain('malformed TOML —');
    expect(r.warnings[0]).toContain('skipping this BMAD config layer');
  });

  it('[docs].prd_path of wrong type (number)', () => {
    writeBmadmcp('[docs]\nprd_path = 42\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('default');
    expect(r.architecture.layer).toBe('default');
    expect(r.epics.layer).toBe('default');
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain(
      join(projectRoot, '.bmadmcp', 'config.toml'),
    );
    expect(r.warnings[0]).toContain('[docs].prd_path');
    expect(r.warnings[0]).toContain('expected non-empty string, got number');
  });

  it('[docs].planning_dir of wrong type (array)', () => {
    writeBmadmcp('[docs]\nplanning_dir = ["a", "b"]\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('default');
    expect(r.architecture.layer).toBe('default');
    expect(r.epics.layer).toBe('default');
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain('[docs].planning_dir');
    expect(r.warnings[0]).toContain('expected non-empty string, got object');
    expect(r.warnings[0]).toContain('ignoring this layer');
  });

  it('[bmm].planning_artifacts of wrong type', () => {
    writeBmadConfig('[bmm]\nplanning_artifacts = false\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('default');
    expect(r.architecture.layer).toBe('default');
    expect(r.epics.layer).toBe('default');
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain('[bmm].planning_artifacts');
    expect(r.warnings[0]).toContain('expected non-empty string');
  });

  it('empty string treated as unset', () => {
    writeBmadmcp('[docs]\nprd_path = ""\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('default');
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain('expected non-empty string, got string');
  });

  it('absolute path values honoured', () => {
    writeBmadmcp('[docs]\nprd_path = "/tmp/test/PRD.md"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.path).toBe('/tmp/test/PRD.md');
    expect(r.prd.layer).toBe('bmadmcp-config');
  });

  it('relative projectRoot rejected', () => {
    expect(() => resolveDocPaths('relative/path')).toThrow(TypeError);
    expect(() => resolveDocPaths('relative/path')).toThrow(
      'expected absolute projectRoot',
    );
  });

  it('empty projectRoot rejected', () => {
    expect(() => resolveDocPaths('')).toThrow(TypeError);
    expect(() => resolveDocPaths('')).toThrow('expected absolute projectRoot');
  });

  it('null/undefined projectRoot rejected', () => {
    expect(() => resolveDocPaths(null as unknown as string)).toThrow(TypeError);
    expect(() => resolveDocPaths(undefined as unknown as string)).toThrow(
      TypeError,
    );
  });

  it('no filesystem reads beyond what is necessary (tolerance)', () => {
    // ESM modules do not allow vi.spyOn on namespace exports, so we verify
    // behaviour indirectly: a project with no config layers resolves to
    // defaults with zero warnings and no thrown errors.
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('default');
    expect(r.architecture.layer).toBe('default');
    expect(r.epics.layer).toBe('default');
    expect(r.warnings).toEqual([]);
  });

  it('per-key independence (mixed cascade)', () => {
    writeBmadmcp(
      '[docs]\n' +
        'prd_path = "specs/PRD.md"\n' +
        'epics_path = "/abs/path/epics.md"\n',
    );
    writeBmadConfig('[bmm]\nplanning_artifacts = "docs"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd).toEqual({
      path: join(projectRoot, 'specs', 'PRD.md'),
      layer: 'bmadmcp-config',
    });
    expect(r.architecture).toEqual({
      path: join(projectRoot, 'docs', 'architecture.md'),
      layer: 'bmad-config',
    });
    expect(r.epics).toEqual({
      path: '/abs/path/epics.md',
      layer: 'bmadmcp-config',
    });
  });

  it('output stability', () => {
    writeBmadmcp('[docs]\nprd_path = "specs/PRD.md"\n');
    writeBmadConfig('[bmm]\nplanning_artifacts = "docs"\n');
    const r1 = resolveDocPaths(projectRoot);
    const r2 = resolveDocPaths(projectRoot);
    expect(r1).toEqual(r2);
  });

  it('malformed .bmadmcp with valid BMAD falls through to BMAD', () => {
    writeBmadmcp('[docs]\nprd_path = "unterminated');
    writeBmadConfig('[bmm]\nplanning_artifacts = "docs"\n');
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.layer).toBe('bmad-config');
    expect(r.architecture.layer).toBe('bmad-config');
    expect(r.epics.layer).toBe('bmad-config');
    expect(r.warnings.length).toBe(1);
  });

  it('missing .bmadmcp and missing BMAD silently defaults', () => {
    const r = resolveDocPaths(projectRoot);
    expect(r.warnings).toEqual([]);
    expect(r.prd.layer).toBe('default');
    expect(r.architecture.layer).toBe('default');
    expect(r.epics.layer).toBe('default');
  });

  it('unknown keys inside [docs] are silently ignored', () => {
    writeBmadmcp(
      '[docs]\n' + 'prd_path = "specs/PRD.md"\n' + 'unknown_key = "whatever"\n',
    );
    const r = resolveDocPaths(projectRoot);
    expect(r.prd.path).toBe(join(projectRoot, 'specs', 'PRD.md'));
    expect(r.warnings).toEqual([]);
  });
});
