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

const step03 = readFileSync(
  join(stepsDir, 'step-03-sprint-list-picker.md'),
  'utf-8',
);
const step02 = readFileSync(join(stepsDir, 'step-02-epic-picker.md'), 'utf-8');

function getSection(content: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  return content.match(pattern)?.[1] ?? '';
}

function parseFrontmatterKeys(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.split(':')[0].trim())
    .filter(Boolean);
}

describe('sprint-list picker step-03 — no-epic regression', () => {
  it('step-03 is epic-agnostic — no {epic_id} references', () => {
    expect(step03).not.toContain('epic_id');
  });

  it('step-03 is epic-agnostic — no {epic_name} references', () => {
    expect(step03).not.toContain('epic_name');
  });

  it('step-03 frontmatter declares exactly the three sprint variables', () => {
    const keys = parseFrontmatterKeys(step03);
    expect(keys.sort()).toEqual(
      ['sprint_folder_id', 'sprint_list_id', 'sprint_list_name'].sort(),
    );
  });

  it('step-03 reads {space_id} from step-02 context', () => {
    const instructions = getSection(step03, 'INSTRUCTIONS');
    expect(instructions).toContain('{space_id}');
  });

  it('step-03 reads {space_name} from step-02 context', () => {
    const instructions = getSection(step03, 'INSTRUCTIONS');
    expect(instructions).toContain('{space_name}');
  });

  it('step-03 NEXT pointer targets step-04-description-composer.md', () => {
    const next = getSection(step03, 'NEXT');
    expect(next).toContain('step-04-description-composer.md');
  });

  it('step-03 NEXT line lists all three produced sprint variables', () => {
    const next = getSection(step03, 'NEXT');
    expect(next).toContain('sprint_folder_id');
    expect(next).toContain('sprint_list_id');
    expect(next).toContain('sprint_list_name');
  });

  it('step-03 RULES includes blocking rule — sprint_list_id must be non-empty', () => {
    const rules = getSection(step03, 'RULES');
    expect(rules).toContain('sprint_list_id');
  });

  it('step-03 RULES includes read-only constraint', () => {
    const rules = getSection(step03, 'RULES');
    expect(rules).toContain('MUST NOT');
  });

  it('step-03 RULES includes mode requirement — searchSpaces not available in read-minimal', () => {
    const rules = getSection(step03, 'RULES');
    expect(rules).toContain('read-minimal');
  });

  it('step-02 NEXT always passes {space_id} to step-03 — epic and no-epic paths', () => {
    const next = getSection(step02, 'NEXT');
    expect(next).toContain('{space_id}');
  });

  it('step-02 NEXT always passes {space_name} to step-03', () => {
    const next = getSection(step02, 'NEXT');
    expect(next).toContain('{space_name}');
  });

  it('step-02 NEXT links to step-03-sprint-list-picker.md', () => {
    const next = getSection(step02, 'NEXT');
    expect(next).toContain('step-03-sprint-list-picker.md');
  });
});
