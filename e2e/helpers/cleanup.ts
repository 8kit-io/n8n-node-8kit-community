/**
 * CleanupTracker — registers resources for automatic teardown in afterAll.
 */
import * as api from './api-client';

type ResourceType = 'uniq' | 'lookup' | 'lock' | 'last-updated';

interface Resource {
  type: ResourceType;
  name: string;
}

export class CleanupTracker {
  private resources: Resource[] = [];

  /** Register a resource for cleanup. Resources are cleaned up in reverse order. */
  track(type: ResourceType, name: string): void {
    this.resources.push({ type, name });
  }

  /** Delete all tracked resources. Swallows errors (resource may already be deleted). */
  async cleanAll(): Promise<void> {
    // Reverse order: delete children before parents
    const toClean = [...this.resources].reverse();
    this.resources = [];

    for (const { type, name } of toClean) {
      try {
        switch (type) {
          case 'uniq':
            await api.deleteUniq(name);
            break;
          case 'lookup':
            await api.deleteLookup(name);
            break;
          case 'lock':
            await api.releaseLock(name);
            break;
          case 'last-updated':
            await api.deleteLastUpdatedByKey(name);
            break;
        }
      } catch {
        // Swallow — resource may already be deleted by test
      }
    }
  }
}
