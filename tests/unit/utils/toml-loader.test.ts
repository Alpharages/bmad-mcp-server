import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadToml } from '@/utils/toml-loader.js';

describe('loadToml', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'toml-loader-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns ok for flat keys', () => {
    const p = join(tempDir, 'flat.toml');
    writeFileSync(p, 'prd_path = "specs/PRD.md"', 'utf-8');
    const r = loadToml(p);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.data).toEqual({ prd_path: 'specs/PRD.md' });
    }
  });

  it('returns ok for nested tables', () => {
    const p = join(tempDir, 'nested.toml');
    writeFileSync(
      p,
      '[docs]\nprd_path = "specs/PRD.md"\narchitecture_path = "docs/arch.md"',
      'utf-8',
    );
    const r = loadToml(p);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.data.docs).toEqual({
        prd_path: 'specs/PRD.md',
        architecture_path: 'docs/arch.md',
      });
    }
  });

  it('returns missing for a file that does not exist', () => {
    const p = join(tempDir, 'nonexistent.toml');
    const r = loadToml(p);
    expect(r.kind).toBe('missing');
  });

  it('returns missing when the path is a directory', () => {
    const p = join(tempDir, 'adir');
    mkdirSync(p);
    const r = loadToml(p);
    expect(r.kind).toBe('missing');
  });

  it('returns malformed for an unterminated string', () => {
    const p = join(tempDir, 'bad.toml');
    writeFileSync(p, 'prd_path = "unterminated', 'utf-8');
    const r = loadToml(p);
    expect(r.kind).toBe('malformed');
    if (r.kind === 'malformed') {
      expect(r.path).toBe(p);
      expect(r.error).toBeInstanceOf(Error);
      expect(r.error.message.length).toBeGreaterThan(0);
    }
  });

  it('returns malformed for duplicate keys', () => {
    const p = join(tempDir, 'dup.toml');
    writeFileSync(p, 'prd_path = "a"\nprd_path = "b"', 'utf-8');
    const r = loadToml(p);
    expect(r.kind).toBe('malformed');
  });

  it('returns ok for an empty file', () => {
    const p = join(tempDir, 'empty.toml');
    writeFileSync(p, '', 'utf-8');
    const r = loadToml(p);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.data).toEqual({});
    }
  });

  it('returns ok for whitespace and comments only', () => {
    const p = join(tempDir, 'comments.toml');
    writeFileSync(p, '# top-level comment\n\n', 'utf-8');
    const r = loadToml(p);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.data).toEqual({});
    }
  });

  it('throws TypeError for a relative path', () => {
    expect(() => loadToml('relative/path.toml')).toThrow(TypeError);
    expect(() => loadToml('relative/path.toml')).toThrow(
      'expected absolute path',
    );
  });

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'propagates permission errors on POSIX',
    () => {
      const p = join(tempDir, 'secret.toml');
      writeFileSync(p, 'key = "value"', 'utf-8');
      chmodSync(p, 0o000);
      expect(() => loadToml(p)).toThrow();
      chmodSync(p, 0o644);
    },
  );

  it('returns the raw smol-toml error instance on malformed input', () => {
    const p = join(tempDir, 'bad.toml');
    writeFileSync(p, 'key = "unterminated', 'utf-8');
    const r = loadToml(p);
    expect(r.kind).toBe('malformed');
    if (r.kind === 'malformed') {
      expect(r.error.constructor.name).toBe('TomlError');
    }
  });

  it('does not cache — reflects filesystem changes', () => {
    const p = join(tempDir, 'changing.toml');
    const r1 = loadToml(p);
    expect(r1.kind).toBe('missing');
    writeFileSync(p, 'key = "value"', 'utf-8');
    const r2 = loadToml(p);
    expect(r2.kind).toBe('ok');
    if (r2.kind === 'ok') {
      expect(r2.data).toEqual({ key: 'value' });
    }
  });
});
