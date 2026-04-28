import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { BMADServerLiteMultiToolGit } from '../../src/server.js';
import { BMADEngine } from '../../src/core/bmad-engine.js';

// Spy on the adapter's registerClickUpTools without evaluating the vendored tree.
vi.mock('../../src/tools/clickup-adapter.js', () => ({
  registerClickUpTools: vi.fn(),
}));

import { registerClickUpTools } from '../../src/tools/clickup-adapter.js';

/**
 * Minimal no-op transport satisfying the MCP Transport interface.
 * The SDK's `McpServer.connect()` calls `transport.start()` and installs
 * event handlers; this fake lets us exercise `BMADServerLiteMultiToolGit.connect()`
 * without a real stdio or HTTP transport.
 */
class NoopTransport implements Transport {
  onclose?: () => void;
  // eslint-disable-next-line no-unused-vars
  onerror?: (err: Error) => void;
  // eslint-disable-next-line no-unused-vars
  onmessage?: <T>(msg: T) => void;
  sessionId?: string;

  async start(): Promise<void> {}

  async send(): Promise<void> {}

  async close(): Promise<void> {}
}

describe('BMADServerLiteMultiToolGit ensureInitialized', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('runs initialization exactly once across multiple connect calls', async () => {
    const server = new BMADServerLiteMultiToolGit();
    const transportA = new NoopTransport();

    await server.connect(transportA);

    // Call ensureInitialized directly to verify idempotency without
    // relying on McpServer's reconnection guard.
    await (server as any).ensureInitialized();

    expect(registerClickUpTools).toHaveBeenCalledTimes(1);
  });

  it('retries initialization after a failure', async () => {
    const spy = vi
      .spyOn(BMADEngine.prototype, 'initialize')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    const server = new BMADServerLiteMultiToolGit();
    const transport = new NoopTransport();

    await expect(server.connect(transport)).rejects.toThrow('boom');

    // The first failure should have cleared initPromise, so a new
    // transport + server attempt on the SAME instance re-runs init.
    const transport2 = new NoopTransport();
    await server.connect(transport2);

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('maintains independent init state across instances', async () => {
    const serverA = new BMADServerLiteMultiToolGit();
    const serverB = new BMADServerLiteMultiToolGit();
    const transportA = new NoopTransport();
    const transportB = new NoopTransport();

    await serverA.connect(transportA);
    await serverB.connect(transportB);

    expect(registerClickUpTools).toHaveBeenCalledTimes(2);
  });
});
