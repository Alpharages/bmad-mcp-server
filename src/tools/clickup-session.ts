/**
 * Interactive ClickUp space picker with session caching.
 * Part of Story 1.4 implementation.
 */

export interface SelectedSpace {
  readonly id: string;
  readonly name: string;
}

/**
 * ClickUpSessionState manages session-scoped state for the ClickUp integration.
 * In stdio mode, this corresponds to the process lifetime.
 * In HTTP mode, this corresponds to a single Mcp-Session-Id.
 */
export class ClickUpSessionState {
  private selected: SelectedSpace | null = null;

  /**
   * Returns a defensive shallow copy of the currently selected space, or null.
   */
  get(): SelectedSpace | null {
    if (this.selected === null) {
      return null;
    }
    // Return a shallow copy to prevent mutation of internal state
    return { id: this.selected.id, name: this.selected.name };
  }

  /**
   * Stores a defensive shallow copy of the provided space.
   */
  set(space: SelectedSpace): void {
    // Store a shallow copy to prevent mutation via the passed reference
    this.selected = { id: space.id, name: space.name };
  }

  /**
   * Resets the session state.
   */
  clear(): void {
    this.selected = null;
  }
}
