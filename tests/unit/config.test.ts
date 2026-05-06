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
      workflow: 'clickup-code-review',
      workflowPath:
        '{project-root}/bmad/workflows/clickup-code-review/workflow.yaml',
      userContext: '86exg4m91',
      // agent and agentWorkflowHandler omitted — custom-skills branch
    });

    expect(out).toContain('agent: unknown');
    expect(out).toContain('menu-item: clickup-code-review');
    expect(out).toContain('user-prompt: 86exg4m91');
    expect(out).toContain('Next steps (no agent handler is registered');
    expect(out).toContain(
      'bmad({ operation: "read", type: "workflow", workflow: "clickup-code-review" })',
    );
    expect(out).toContain('SKILL.md');
    expect(out).toContain('./steps/step-NN-');
  });

  it('substitutes the workflow name into the read call (no leakage between invocations)', () => {
    const a = getWorkflowExecutionPrompt({
      workflow: 'clickup-create-story',
      workflowPath: '{project-root}/bmad/workflows/clickup-create-story/workflow.yaml',
    });
    const b = getWorkflowExecutionPrompt({
      workflow: 'clickup-dev-implement',
      workflowPath:
        '{project-root}/bmad/workflows/clickup-dev-implement/workflow.yaml',
    });

    expect(a).toContain('workflow: "clickup-create-story"');
    expect(a).not.toContain('workflow: "clickup-dev-implement"');
    expect(b).toContain('workflow: "clickup-dev-implement"');
    expect(b).not.toContain('workflow: "clickup-create-story"');
  });

  it('falls back to "(no prompt provided)" when userContext is omitted', () => {
    const out = getWorkflowExecutionPrompt({
      workflow: 'clickup-code-review',
      workflowPath:
        '{project-root}/bmad/workflows/clickup-code-review/workflow.yaml',
    });
    expect(out).toContain('user-prompt: (no prompt provided)');
  });
});
