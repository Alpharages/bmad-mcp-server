/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import type Fuse from 'fuse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClickUpSessionState } from './clickup-session.js';

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

// Cast required: the SDK's tool() overloads trigger "excessively deep type
// instantiation" when TypeScript tries to unify ZodRawShapeCompat with
// ToolAnnotations across all overload candidates. Runtime behaviour is
// identical to the typed path — we are still calling the high-level
// McpServer.tool() API, NOT the low-level setRequestHandler.
const _tool = (server: McpServer) => server.tool.bind(server) as any;

export function registerSpacePickerTools(
  server: McpServer,
  session: ClickUpSessionState,
  getSpaceSearchIndex: () => Promise<Fuse<any> | null>,
): void {
  _tool(server)(
    'pickSpace',
    'Selects a ClickUp space for the current session. You can specify a spaceId for an exact match, a query for a fuzzy match, or provide no arguments to list available spaces. The selected space persists for the remainder of this MCP session and can be read back via getCurrentSpace.',
    {
      spaceId: z.string().optional().describe('Exact ClickUp space ID'),
      query: z
        .string()
        .optional()
        .describe('Fuzzy search query for space name'),
    },
    { readOnlyHint: false },
    async (args: { spaceId?: string; query?: string }) => {
      const searchIndex = await getSpaceSearchIndex();
      if (!searchIndex) {
        return text(
          'Error: could not fetch spaces from ClickUp. Verify CLICKUP_API_KEY / CLICKUP_TEAM_ID and try again.',
        );
      }

      // getIndex().docs is the public Fuse API for the indexed document list.
      const allSpaces: any[] = [...searchIndex.getIndex().docs];
      const nonArchivedSpaces = allSpaces.filter((s: any) => !s.archived);

      const { spaceId, query } = args;

      // Mode 1: Exact ID match — spaceId takes precedence over query.
      if (spaceId != null && spaceId !== '') {
        const space = nonArchivedSpaces.find((s: any) => s.id === spaceId);
        if (space) {
          session.set({ id: space.id, name: space.name });
          return text(`Selected space: ${space.name} (id: ${space.id})`);
        } else {
          return text(
            `Error: no space with id "${spaceId}" found in workspace. Use pickSpace with query or with no arguments to list available spaces.`,
          );
        }
      }

      // Mode 2: Fuzzy search.
      if (query != null && query !== '') {
        const results = searchIndex.search(query);
        const matches = results
          .map((r) => r.item)
          .filter((s: any) => !s.archived);

        if (matches.length === 1) {
          const space = matches[0];
          session.set({ id: space.id, name: space.name });
          return text(`Selected space: ${space.name} (id: ${space.id})`);
        } else if (matches.length >= 2 && matches.length <= 5) {
          const list = matches
            .map((s: any, i: number) => `${i + 1}. ${s.name} (id: ${s.id})`)
            .join('\n');
          return text(
            `${list}\nMore than one space matched "${query}". Call pickSpace again with spaceId or a narrower query.`,
          );
        } else if (matches.length > 5) {
          const list = matches
            .slice(0, 5)
            .map((s: any, i: number) => `${i + 1}. ${s.name} (id: ${s.id})`)
            .join('\n');
          return text(
            `${list}\n…and ${matches.length - 5} more\nMore than one space matched "${query}". Call pickSpace again with spaceId or a narrower query.`,
          );
        } else {
          return text(
            `No spaces matched "${query}". Narrow your selection with pickSpace(query=...) or call with no arguments to list all.`,
          );
        }
      }

      // Mode 3: List all non-archived spaces.
      if (nonArchivedSpaces.length === 0) {
        return text('No spaces available in workspace.');
      }

      const count = nonArchivedSpaces.length;
      const list = nonArchivedSpaces
        .slice(0, 30)
        .map((s: any) => `${s.name} (id: ${s.id})`)
        .join('\n');
      const footer =
        count > 30
          ? `\n…and ${count - 30} more. Narrow your selection with pickSpace(query=...)`
          : '';

      return text(
        `${count} space(s) available in workspace:\n${list}${footer}`,
      );
    },
  );

  _tool(server)(
    'getCurrentSpace',
    'Returns the ClickUp space currently selected for this MCP session (set via pickSpace), or indicates no selection.',
    {},
    { readOnlyHint: true },
    () => {
      const current = session.get();
      return current
        ? text(`Current space: ${current.name} (id: ${current.id})`)
        : text('No space is currently selected. Use pickSpace to choose one.');
    },
  );

  _tool(server)(
    'clearCurrentSpace',
    'Clears the currently-selected ClickUp space for this MCP session. Call this to switch to a different space mid-session; subsequent tools requiring a space will need pickSpace to be called again.',
    {},
    { readOnlyHint: false },
    () => {
      const current = session.get();
      session.clear();
      return current
        ? text(`Cleared selection: ${current.name} (id: ${current.id}).`)
        : text('No space was selected; nothing to clear.');
    },
  );
}
