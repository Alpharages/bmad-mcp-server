import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import Fuse from 'fuse.js';
import { ClickUpSessionState } from '../../src/tools/clickup-session.js';
import { registerSpacePickerTools } from '../../src/tools/clickup-space-picker.js';

describe('registerSpacePickerTools', () => {
  const fixture = [
    { id: '100', name: 'Alpha', archived: false },
    { id: '200', name: 'Beta', archived: false },
    { id: '300', name: 'Gamma', archived: false },
    { id: '400', name: 'Archived Space', archived: true },
  ];

  const createStubServer = () => {
    const server = new McpServer({ name: 'test', version: '1.0' });
    const session = new ClickUpSessionState();
    const fuse = new Fuse(fixture, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'id', weight: 0.6 },
      ],
      threshold: 0.4,
      minMatchCharLength: 1,
    });
    const getSpaceSearchIndex = vi.fn().mockResolvedValue(fuse);

    registerSpacePickerTools(server, session, getSpaceSearchIndex);

    return { server, session, getSpaceSearchIndex, fuse };
  };

  /**
   * Helper to invoke a registered tool handler directly.
   * SDK 1.29: handlers live at server._registeredTools[name].handler
   */
  const callTool = async (server: McpServer, name: string, args: any) => {
    const registration = (server as any)._registeredTools[name];
    if (!registration) throw new Error(`Tool ${name} not registered`);
    return await registration.handler(args, {} as any);
  };

  describe('pickSpace', () => {
    it('should select space by exact spaceId', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'pickSpace', { spaceId: '100' });

      expect(result.content[0].text).toContain(
        'Selected space: Alpha (id: 100)',
      );
      expect(session.get()).toEqual({ id: '100', name: 'Alpha' });
    });

    it('should return error for invalid spaceId', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'pickSpace', { spaceId: '999' });

      expect(result.content[0].text).toContain('Error: no space with id "999"');
      expect(session.get()).toBeNull();
    });

    it('should prioritize spaceId over query', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'pickSpace', {
        spaceId: '100',
        query: 'Gamma',
      });

      expect(result.content[0].text).toContain(
        'Selected space: Alpha (id: 100)',
      );
      expect(session.get()).toEqual({ id: '100', name: 'Alpha' });
    });

    it('should select space by fuzzy query with 1 match', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'pickSpace', { query: 'alp' });

      expect(result.content[0].text).toContain(
        'Selected space: Alpha (id: 100)',
      );
      expect(session.get()).toEqual({ id: '100', name: 'Alpha' });
    });

    it('should list candidates for multi-match query (2-5 matches)', async () => {
      const { server, session, fuse } = createStubServer();
      // Deterministic: spy on search so Fuse scoring cannot flip this to 1 result.
      vi.spyOn(fuse, 'search').mockReturnValueOnce([
        { item: fixture[0], refIndex: 0, score: 0.1 } as any,
        { item: fixture[1], refIndex: 1, score: 0.2 } as any,
      ]);
      const result = await callTool(server, 'pickSpace', { query: 'multi' });

      expect(result.content[0].text).toContain('1. Alpha');
      expect(result.content[0].text).toContain(
        'Call pickSpace again with spaceId or a narrower query.',
      );
      expect(session.get()).toBeNull();
    });

    it('should return error for no matches', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'pickSpace', { query: 'zzzz' });

      expect(result.content[0].text).toContain('No spaces matched "zzzz"');
      expect(session.get()).toBeNull();
    });

    it('should list all non-archived spaces when called with no arguments', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'pickSpace', {});

      expect(result.content[0].text).toContain(
        '3 space(s) available in workspace:',
      );
      expect(result.content[0].text).toContain('Alpha (id: 100)');
      expect(result.content[0].text).toContain('Beta (id: 200)');
      expect(result.content[0].text).toContain('Gamma (id: 300)');
      expect(result.content[0].text).not.toContain('Archived Space');
      expect(session.get()).toBeNull();
    });

    it('should handle empty workspace', async () => {
      const server = new McpServer({ name: 'test', version: '1.0' });
      const session = new ClickUpSessionState();
      const fuse = new Fuse([], { keys: ['name'] });
      const getSpaceSearchIndex = vi.fn().mockResolvedValue(fuse);
      registerSpacePickerTools(server, session, getSpaceSearchIndex);

      const result = await callTool(server, 'pickSpace', {});
      expect(result.content[0].text).toBe('No spaces available in workspace.');
    });

    it('should handle upstream fetch failure', async () => {
      const server = new McpServer({ name: 'test', version: '1.0' });
      const session = new ClickUpSessionState();
      const getSpaceSearchIndex = vi.fn().mockResolvedValue(null);
      registerSpacePickerTools(server, session, getSpaceSearchIndex);

      const result = await callTool(server, 'pickSpace', {});
      expect(result.content[0].text).toContain(
        'Error: could not fetch spaces from ClickUp',
      );
    });
  });

  describe('getCurrentSpace', () => {
    it('should return no selection initially', async () => {
      const { server } = createStubServer();
      const result = await callTool(server, 'getCurrentSpace', {});
      expect(result.content[0].text).toBe(
        'No space is currently selected. Use pickSpace to choose one.',
      );
    });

    it('should return current selection', async () => {
      const { server, session } = createStubServer();
      session.set({ id: '100', name: 'Alpha' });

      const result = await callTool(server, 'getCurrentSpace', {});
      expect(result.content[0].text).toBe('Current space: Alpha (id: 100)');
    });
  });

  describe('clearCurrentSpace', () => {
    it('should confirm clearing when selection exists', async () => {
      const { server, session } = createStubServer();
      session.set({ id: '100', name: 'Alpha' });

      const result = await callTool(server, 'clearCurrentSpace', {});
      expect(result.content[0].text).toBe(
        'Cleared selection: Alpha (id: 100).',
      );
      expect(session.get()).toBeNull();
    });

    it('should report nothing to clear when selection is null', async () => {
      const { server, session } = createStubServer();
      const result = await callTool(server, 'clearCurrentSpace', {});
      expect(result.content[0].text).toBe(
        'No space was selected; nothing to clear.',
      );
      expect(session.get()).toBeNull();
    });
  });
});
