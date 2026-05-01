import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '..', '..', '..');

const stepsDir = join(
  projectRoot,
  'src',
  'custom-skills',
  'clickup-create-story',
  'steps',
);

const step02 = readFileSync(join(stepsDir, 'step-02-epic-picker.md'), 'utf-8');
const step04 = readFileSync(
  join(stepsDir, 'step-04-description-composer.md'),
  'utf-8',
);
const step05 = readFileSync(join(stepsDir, 'step-05-create-task.md'), 'utf-8');

function getSection(content: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  return content.match(pattern)?.[1] ?? '';
}

describe('no-epic paths — steps 02, 04, 05', () => {
  describe('step-02 — epic picker (no-epic option)', () => {
    const instructions02 = getSection(step02, 'INSTRUCTIONS');
    const rules02 = getSection(step02, 'RULES');
    const next02 = getSection(step02, 'NEXT');

    it('step-02 presents [0] No epic entry when allow_no_epic is true', () => {
      expect(step02).toContain('[0] No epic');
    });

    it('step-02 picklist text references allow_no_epic flag', () => {
      expect(step02).toContain('allow_no_epic');
    });

    it('step-02 instruction 10 gates [0] entry on effective_allow_no_epic true', () => {
      expect(instructions02).toContain(
        'When `effective_allow_no_epic` is `true`',
      );
    });

    it('step-02 instruction 10 suppresses [0] entry when effective_allow_no_epic is false', () => {
      expect(instructions02).toContain(
        'When `effective_allow_no_epic` is `false`',
      );
    });

    it('step-02 instruction 12 sets epic_id to empty string on [0] selection', () => {
      expect(instructions02).toContain("set `{epic_id}` = `''`");
    });

    it('step-02 instruction 12 treats [0] as invalid when effective_allow_no_epic is false', () => {
      expect(instructions02).toContain('invalid');
    });

    it('step-02 empty-Backlog path offers standalone task when allow_no_epic is true', () => {
      expect(instructions02).toContain('standalone task');
    });

    it('step-02 empty-Backlog path emits hard-stop when allow_no_epic is false', () => {
      expect(instructions02).toContain(
        'Epic picker failed — Backlog list is empty',
      );
    });

    it('step-02 NEXT passes epic_id to step-03', () => {
      expect(next02).toContain('{epic_id}');
    });

    it('step-02 NEXT passes epic_name to step-03', () => {
      expect(next02).toContain('{epic_name}');
    });

    it('step-02 RULES documents the no-epic option', () => {
      expect(rules02).toContain('No-epic option');
    });
  });

  describe('step-04 — description composer (no-epic branch)', () => {
    const instructions04 = getSection(step04, 'INSTRUCTIONS');
    const rules04 = getSection(step04, 'RULES');

    it('step-04 branch 3b exists for no-epic path', () => {
      expect(step04).toContain('Branch 3b');
    });

    it('step-04 branch 3b skips getTaskById', () => {
      expect(instructions04).toContain('skip `getTaskById`');
    });

    it('step-04 branch 3b prohibits Epic or Parent epic field in output', () => {
      expect(instructions04).toContain('Parent epic');
      expect(instructions04).toContain('Do NOT include');
    });

    it('step-04 RULES documents no-epic override', () => {
      expect(rules04).toContain('No-epic override');
    });

    it('step-04 dispatches branch on epic_id sentinel', () => {
      expect(instructions04).toContain(
        "If `{epic_id}` is `''` → use branch 3b",
      );
    });
  });

  describe('step-05 — task creation (no-epic path)', () => {
    const instructions05 = getSection(step05, 'INSTRUCTIONS');

    it('step-05 omits parent_task_id when epic_id is empty', () => {
      expect(instructions05).toContain(
        "omit the parameter entirely when `{epic_id}` is `''`",
      );
    });

    it('step-05 pre-creation summary shows standalone task when epic_id is empty', () => {
      expect(instructions05).toContain('*(none — standalone task)*');
    });

    it('step-05 success message shows standalone task when epic_id is empty', () => {
      // The canonical phrase must appear at least twice:
      // once in instruction 2 (pre-creation summary) and once in instruction 8 (success message).
      const occurrences = step05.split('*(none — standalone task)*').length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    it('step-05 instruction 1 explicitly allows empty epic_id on no-epic path', () => {
      expect(instructions05).toContain(
        'may be intentionally empty on the no-epic path',
      );
    });
  });
});
