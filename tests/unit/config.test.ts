import { describe, it, expect } from 'vitest';
import { getWorkflowExecutionPrompt } from '../../src/config.js';

describe('getWorkflowExecutionPrompt', () => {
  it('uses agent handler text when provided', () => {
    const out = getWorkflowExecutionPrompt({
      workflow: 'prd',
      workflowPath: '{project-root}/bmad/workflows/prd/workflow.yaml',
      userContext: 'Build a mobile app',
      agent: 'pm',
      agentWorkflowHandler:
        '<handler>load workflow.xml then run steps</handler>',
    });

    expect(out).toContain('agent: pm');
    expect(out).toContain('menu-item: prd');
    expect(out).toContain('user-prompt: Build a mobile app');
    expect(out).toContain('This workflow has been requested to be executed.');
    expect(out).toContain(
      '<handler>load workflow.xml then run steps</handler>',
    );
    expect(out).not.toContain('Next steps (no agent handler is registered');
  });

  it('emits a concrete bmad read call when no agent handler is registered (custom skills)', () => {
    const out = getWorkflowExecutionPrompt({
      workflow: 'bmad-clickup-code-review',
      workflowPath:
        '{project-root}/bmad/workflows/bmad-clickup-code-review/workflow.yaml',
      userContext: '86exg4m91',
      // agent and agentWorkflowHandler omitted — custom-skills branch
    });

    expect(out).toContain('agent: unknown');
    expect(out).toContain('menu-item: bmad-clickup-code-review');
    expect(out).toContain('user-prompt: 86exg4m91');
    expect(out).toContain('Next steps (no agent handler is registered');
    expect(out).toContain(
      'bmad({ operation: "read", type: "workflow", workflow: "bmad-clickup-code-review" })',
    );
    expect(out).toContain('complete text skill package');
    expect(out).toContain('=== ./<relative-path> ===');
    expect(out).toContain('sorted path order');
    expect(out).toContain(
      'Do NOT attempt to fetch any of these files separately',
    );
  });

  it('substitutes the workflow name into the read call (no leakage between invocations)', () => {
    const a = getWorkflowExecutionPrompt({
      workflow: 'bmad-clickup-create-story',
      workflowPath:
        '{project-root}/bmad/workflows/bmad-clickup-create-story/workflow.yaml',
    });
    const b = getWorkflowExecutionPrompt({
      workflow: 'bmad-clickup-dev-implement',
      workflowPath:
        '{project-root}/bmad/workflows/bmad-clickup-dev-implement/workflow.yaml',
    });

    expect(a).toContain('workflow: "bmad-clickup-create-story"');
    expect(a).not.toContain('workflow: "bmad-clickup-dev-implement"');
    expect(b).toContain('workflow: "bmad-clickup-dev-implement"');
    expect(b).not.toContain('workflow: "bmad-clickup-create-story"');
  });

  it('falls back to "(no prompt provided)" when userContext is omitted', () => {
    const out = getWorkflowExecutionPrompt({
      workflow: 'bmad-clickup-code-review',
      workflowPath:
        '{project-root}/bmad/workflows/bmad-clickup-code-review/workflow.yaml',
    });
    expect(out).toContain('user-prompt: (no prompt provided)');
  });
});
