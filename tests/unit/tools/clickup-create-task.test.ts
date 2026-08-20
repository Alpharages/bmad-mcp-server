/**
 * `createTask` request-body contract.
 *
 * Both cases here were found by a live ClickUp canary, not by the suite: the
 * tool accepted a `tags` array and silently dropped it, and the bug skill fed
 * `priority` an integer the schema rejects. Neither shows up in a prose test —
 * the tool reports success either way — so the assertions below inspect the
 * body that actually reaches ClickUp.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../src/tools/clickup/src/shared/utils', () => ({
  getCurrentUser: vi.fn(async () => ({ user: { id: '1', username: 'test' } })),
  taskIdSchema: { describe: () => ({}) },
}));

vi.mock('../../../src/tools/clickup/src/shared/config', () => ({
  CONFIG: { apiKey: 'pk_test', teamId: '123', primaryLanguageHint: 'en' },
}));

const { registerTaskToolsWrite } = await import(
  '../../../src/tools/clickup/src/tools/task-write-tools'
);

/** Captures the handler each `server.tool(name, ...)` call registers. */
const captureHandlers = () => {
  const handlers = new Map<
    string,
    (args: Record<string, unknown>) => unknown
  >();
  const server = {
    tool: (name: string, ...rest: unknown[]) => {
      const handler = rest[rest.length - 1];
      if (typeof handler === 'function')
        handlers.set(name, handler as (a: Record<string, unknown>) => unknown);
    },
  };
  registerTaskToolsWrite(server as never, {
    user: { id: '1', username: 'test' },
  });
  return handlers;
};

describe('createTask request body', () => {
  let bodies: Array<Record<string, unknown>>;
  let createTask: (args: Record<string, unknown>) => unknown;

  beforeEach(() => {
    bodies = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        bodies.push(JSON.parse(init.body) as Record<string, unknown>);
        return {
          ok: true,
          json: async () => ({ id: 'abc', url: 'https://clickup/t/abc' }),
        };
      }),
    );
    createTask = captureHandlers().get('createTask')!;
  });

  it('sends tags inline so they are not silently discarded', async () => {
    await createTask({
      list_id: '1',
      name: 'task',
      tags: ['bug', 'bmad-test'],
    });
    expect(bodies[0].tags).toEqual(['bug', 'bmad-test']);
  });

  it('omits tags entirely when none were supplied', async () => {
    await createTask({ list_id: '1', name: 'task' });
    expect(bodies[0]).not.toHaveProperty('tags');
  });

  it('converts the priority label to the integer ClickUp expects', async () => {
    await createTask({ list_id: '1', name: 'task', priority: 'high' });
    expect(bodies[0].priority).toBe(2);
  });

  // ClickUp echoes the priority back as a label, not an integer. Mapping only
  // integers reported every real priority as 'unknown' in the response text.
  it('reports the priority ClickUp echoed back, not "unknown"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: 'abc',
          url: 'https://clickup/t/abc',
          priority: { id: '2', priority: 'high' },
        }),
      })),
    );
    const result = (await captureHandlers().get('createTask')!({
      list_id: '1',
      name: 'task',
      priority: 'high',
    })) as { content: Array<{ text: string }> };

    expect(result.content[0].text).toContain('priority: high');
    expect(result.content[0].text).not.toContain('priority: unknown');
  });
});
