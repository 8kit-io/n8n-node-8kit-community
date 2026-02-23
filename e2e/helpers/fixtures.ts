/**
 * Test fixtures — unique name generators to avoid collisions between test runs.
 */

const timestamp = Date.now();
let counter = 0;

function uid(): string {
  return `${timestamp}-${++counter}`;
}

export function uniqName(label = 'uniq'): string {
  return `e2e-${label}-${uid()}`;
}

export function lookupName(label = 'lookup'): string {
  return `e2e-${label}-${uid()}`;
}

export function lockKey(label = 'lock'): string {
  return `e2e-${label}-${uid()}`;
}

export function lastUpdatedKey(label = 'lu'): string {
  return `e2e-${label}-${uid()}`;
}

export function value(label = 'val'): string {
  return `e2e-${label}-${uid()}`;
}
