import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  executeAddToLookup,
  executeGetLookupValues,
  executeRemoveFromLookup,
  executeSearchLookupValues,
} from '../../nodes/EightKit/operations';
import * as api from '../helpers/api-client';
import { CleanupTracker } from '../helpers/cleanup';
import { lookupName, value } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Lookup Values operations (E2E)', () => {
  const cleanup = new CleanupTracker();
  const collName = lookupName('values');
  const leftVal = value('left');
  const rightVal = value('right');
  let addedValueId: string;

  beforeAll(async () => {
    await api.createLookup(collName, { description: 'E2E lookup values test' });
    cleanup.track('lookup', collName);
  });

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  it('adds a value pair to a lookup', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collName,
        leftValue: leftVal,
        rightValue: rightVal,
      },
      inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeAddToLookup.call(fx, 0);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.left).toBe(leftVal);
    expect(result.data.right).toBe(rightVal);
    expect(result.data.id).toBeDefined();
    addedValueId = result.data.id;
  });

  it('searches by left value', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collName,
        searchType: 'left',
        searchValue: leftVal,
      },
    });

    const result = await executeSearchLookupValues.call(fx, 0);

    expect(result.success).toBe(true);
    expect(result.searchType).toBe('left');
    expect(result.count).toBeGreaterThanOrEqual(1);
    const found = result.results.find((r: any) => r.left === leftVal);
    expect(found).toBeDefined();
    expect(found.right).toBe(rightVal);
  });

  it('searches by right value', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collName,
        searchType: 'right',
        searchValue: rightVal,
      },
    });

    const result = await executeSearchLookupValues.call(fx, 0);

    expect(result.success).toBe(true);
    expect(result.searchType).toBe('right');
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('gets all values from a lookup', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collName,
        advancedSettings: { pagination: { pagination: { page: 1, limit: 50 } } },
      },
    });

    const result = await executeGetLookupValues.call(fx, 0);

    // API returns paginated: { items: [...], meta: {...} }
    const items = Array.isArray(result) ? result : result.items;
    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('removes a value from a lookup by ID', async () => {
    expect(addedValueId).toBeDefined();

    const fx = createE2EExecuteFunctions({
      params: {
        name: collName,
        value: addedValueId,
      },
      inputData: [{ json: { keep: 'me' }, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeRemoveFromLookup.call(fx, 0);

    expect(result.removed).toBe(true);
    expect(result.keep).toBe('me'); // Input preserved
  });
});
