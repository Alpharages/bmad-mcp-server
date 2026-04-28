import { describe, it, expect } from 'vitest';
import { validateClickUpEnv } from '../../src/utils/clickup-env.js';

describe('validateClickUpEnv', () => {
  it('returns ok when both required vars are set', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: 'pk_xyz',
      CLICKUP_TEAM_ID: '1234567',
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.apiKey).toBe('pk_xyz');
      expect(r.teamId).toBe('1234567');
      expect(r.mode).toBe('write');
      expect(r.warnings).toHaveLength(0);
    }
  });

  it('handles whitespace in required variables', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: '  pk_xyz  ',
      CLICKUP_TEAM_ID: '  1234567  ',
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.apiKey).toBe('pk_xyz');
      expect(r.teamId).toBe('1234567');
    }
  });

  it('returns disabled when CLICKUP_API_KEY is missing', () => {
    const r = validateClickUpEnv({
      CLICKUP_TEAM_ID: '1234567',
    });
    expect(r.kind).toBe('disabled');
    if (r.kind === 'disabled') {
      expect(r.missing).toContain('CLICKUP_API_KEY');
      expect(r.diagnostic).toContain('pk_');
      expect(r.diagnostic).not.toContain('7–10 digit');
    }
  });

  it('returns disabled when CLICKUP_TEAM_ID is missing', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: 'pk_xyz',
    });
    expect(r.kind).toBe('disabled');
    if (r.kind === 'disabled') {
      expect(r.missing).toContain('CLICKUP_TEAM_ID');
      expect(r.diagnostic).toContain('7–10 digit');
      expect(r.diagnostic).not.toContain('pk_');
    }
  });

  it('returns disabled when both are missing', () => {
    const r = validateClickUpEnv({});
    expect(r.kind).toBe('disabled');
    if (r.kind === 'disabled') {
      expect(r.missing).toContain('CLICKUP_API_KEY');
      expect(r.missing).toContain('CLICKUP_TEAM_ID');
      expect(r.diagnostic).toContain('pk_');
      expect(r.diagnostic).toContain('7–10 digit');
    }
  });

  it('treats whitespace-only values as missing', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: '   ',
      CLICKUP_TEAM_ID: '\t',
    });
    expect(r.kind).toBe('disabled');
    if (r.kind === 'disabled') {
      expect(r.missing).toContain('CLICKUP_API_KEY');
      expect(r.missing).toContain('CLICKUP_TEAM_ID');
    }
  });

  it('warns when API key misses pk_ prefix', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: 'abc123',
      CLICKUP_TEAM_ID: '1234567',
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.warnings).toContain(
        'CLICKUP_API_KEY does not start with "pk_"; upstream docs note personal tokens usually do — double-check at Profile → Settings → Apps → API Token',
      );
    }
  });

  it('warns when team ID contains non-digits', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: 'pk_xyz',
      CLICKUP_TEAM_ID: 'abc-123',
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.warnings).toContain(
        'CLICKUP_TEAM_ID="abc-123" contains non-digit characters; upstream docs describe team ID as a 7–10 digit number',
      );
    }
  });

  it('resolves valid modes correctly', () => {
    const modes: ('read-minimal' | 'read' | 'write')[] = [
      'read-minimal',
      'read',
      'write',
    ];
    for (const mode of modes) {
      const r = validateClickUpEnv({
        CLICKUP_API_KEY: 'pk_xyz',
        CLICKUP_TEAM_ID: '1234567',
        CLICKUP_MCP_MODE: mode,
      });
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.mode).toBe(mode);
    }
  });

  it('falls back to "write" mode and warns on unrecognized mode', () => {
    const r = validateClickUpEnv({
      CLICKUP_API_KEY: 'pk_xyz',
      CLICKUP_TEAM_ID: '1234567',
      CLICKUP_MCP_MODE: 'destructive',
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.mode).toBe('write');
      expect(r.warnings).toContain(
        'CLICKUP_MCP_MODE="destructive" is not recognized; using default "write" (valid: read-minimal, read, write)',
      );
    }
  });

  it('reflects BMAD_REQUIRE_CLICKUP in diagnostic when disabled', () => {
    const r = validateClickUpEnv({
      BMAD_REQUIRE_CLICKUP: '1',
    });
    expect(r.kind).toBe('disabled');
    if (r.kind === 'disabled') {
      expect(r.diagnostic).toContain(
        'Refusing to start — BMAD_REQUIRE_CLICKUP=1',
      );
      expect(r.diagnostic).not.toContain('Running in BMAD-only mode');
    }
  });

  it('is a pure function and does not mutate input', () => {
    const input = Object.freeze({
      CLICKUP_API_KEY: 'pk_xyz',
      CLICKUP_TEAM_ID: '1234567',
    });
    const r1 = validateClickUpEnv(input);
    const r2 = validateClickUpEnv(input);
    expect(r1).toEqual(r2);
  });
});
