import { describe, it, expect } from 'vitest';
import { ClickUpSessionState } from '../../src/tools/clickup-session.js';

describe('ClickUpSessionState', () => {
  it('should initialize with null selection', () => {
    const session = new ClickUpSessionState();
    expect(session.get()).toBeNull();
  });

  it('should store and retrieve a selection', () => {
    const session = new ClickUpSessionState();
    const space = { id: '123', name: 'Test Space' };
    session.set(space);
    expect(session.get()).toEqual(space);
  });

  it('should perform defensive copying on set', () => {
    const session = new ClickUpSessionState();
    const space = { id: '123', name: 'Test Space' };
    session.set(space);
    
    // Mutate the original object
    (space as any).name = 'Mutated';
    
    // session should still return the original values
    expect(session.get()).toEqual({ id: '123', name: 'Test Space' });
  });

  it('should perform defensive copying on get', () => {
    const session = new ClickUpSessionState();
    session.set({ id: '123', name: 'Test Space' });
    
    const retrieved = session.get();
    expect(retrieved).not.toBeNull();
    
    // Mutate the retrieved object
    if (retrieved) {
      (retrieved as any).name = 'Mutated';
    }
    
    // subsequent get should still return original values
    expect(session.get()).toEqual({ id: '123', name: 'Test Space' });
  });

  it('should clear selection', () => {
    const session = new ClickUpSessionState();
    session.set({ id: '123', name: 'Test Space' });
    expect(session.get()).not.toBeNull();
    
    session.clear();
    expect(session.get()).toBeNull();
  });

  it('should be idempotent on clear', () => {
    const session = new ClickUpSessionState();
    session.clear();
    expect(session.get()).toBeNull();
    session.clear();
    expect(session.get()).toBeNull();
  });

  it('should maintain independent state across instances', () => {
    const sessionA = new ClickUpSessionState();
    const sessionB = new ClickUpSessionState();
    
    sessionA.set({ id: 'A', name: 'Space A' });
    
    expect(sessionB.get()).toBeNull();
    expect(sessionA.get()).toEqual({ id: 'A', name: 'Space A' });
    
    sessionB.set({ id: 'B', name: 'Space B' });
    expect(sessionA.get()).toEqual({ id: 'A', name: 'Space A' });
    expect(sessionB.get()).toEqual({ id: 'B', name: 'Space B' });
  });

  it('should have no static fields beyond ES-class built-ins', () => {
    const propertyNames = Object.getOwnPropertyNames(ClickUpSessionState).sort();
    // AC #12 specifies exactly these three
    expect(propertyNames).toEqual(['length', 'name', 'prototype']);
  });
});
