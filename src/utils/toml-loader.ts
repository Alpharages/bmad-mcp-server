import { readFileSync, statSync } from 'node:fs';
import { parse } from 'smol-toml';

export type TomlLoadResult =
  | { kind: 'ok'; data: Record<string, unknown> }
  | { kind: 'missing' }
  | { kind: 'malformed'; path: string; error: Error };

export function loadToml(absolutePath: string): TomlLoadResult {
  if (
    !absolutePath.startsWith('/') &&
    !absolutePath.startsWith('\\\\') &&
    !/^[A-Za-z]:[\\/]/.test(absolutePath)
  ) {
    throw new TypeError(
      `loadToml: expected absolute path, got "${absolutePath}"`,
    );
  }

  try {
    const stats = statSync(absolutePath);
    if (!stats.isFile()) {
      return { kind: 'missing' };
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err.code === 'ENOENT' || err.code === 'EISDIR')
    ) {
      return { kind: 'missing' };
    }
    throw err;
  }

  let contents: string;
  try {
    contents = readFileSync(absolutePath, 'utf-8');
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err.code === 'ENOENT' || err.code === 'EISDIR')
    ) {
      return { kind: 'missing' };
    }
    throw err;
  }

  try {
    const data = parse(contents);
    return { kind: 'ok', data: data as Record<string, unknown> };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { kind: 'malformed', path: absolutePath, error };
  }
}
