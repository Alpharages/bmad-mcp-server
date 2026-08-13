import { describe, it, expect } from 'vitest';
import { isTaskId, taskIdSchema } from '../../src/tools/clickup/src/shared/utils.js';

// Regression guard: the bound used to be {6,9}, which rejected 10-char IDs from newer ClickUp
// workspaces. Agents then truncated the ID to fit the schema, silently addressing another task.
describe('task ID validation', () => {
  it('accepts IDs longer than 9 characters', () => {
    expect(isTaskId('z929e7adh2')).toBe(true);
    expect(taskIdSchema.safeParse('z929e7adh2').success).toBe(true);
  });

  it('still accepts the classic 9-character IDs', () => {
    expect(isTaskId('86eyeq6zu')).toBe(true);
  });

  it('rejects prefixed IDs, prose and anything too short', () => {
    for (const bad of ['CU-86eyeq6zu', 'https://app.clickup.com/t/86eyeq6zu', 'budget threshold', 'abc', '']) {
      expect(isTaskId(bad)).toBe(false);
      expect(taskIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});
