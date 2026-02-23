import { afterAll, describe, expect, it } from 'vitest';
import {
  executeCreateLookup,
  executeDeleteLookup,
  executeListLookups,
} from '../../nodes/EightKit/operations';
import { CleanupTracker } from '../helpers/cleanup';
import { lookupName } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Lookup Collection CRUD (E2E)', () => {
  const cleanup = new CleanupTracker();
  let createdName: string;

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  it('creates a lookup collection', async () => {
    createdName = lookupName('crud');
    cleanup.track('lookup', createdName);

    const fx = createE2EExecuteFunctions({
      params: {
        name: createdName,
        additionalFields: {
          description: 'E2E lookup test',
          leftSystem: 'Shopify',
          rightSystem: 'ERP',
        },
      },
    });

    const result = await executeCreateLookup.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe(createdName);
  });

  it('lists lookup collections and finds the created one', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        advancedSettings: { pagination: { pagination: { page: 1, limit: 100 } } },
      },
    });

    const result = await executeListLookups.call(fx, 0);

    // API returns paginated: { items: [...], meta: {...} }
    const items = Array.isArray(result) ? result : result.items;
    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    const found = items.find((c: any) => c.name === createdName);
    expect(found).toBeDefined();
  });

  it('rejects creation of duplicate lookup name', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: createdName,
        additionalFields: {},
      },
    });

    await expect(executeCreateLookup.call(fx, 0)).rejects.toThrow();
  });

  it('deletes a lookup collection', async () => {
    const fx = createE2EExecuteFunctions({
      params: { name: createdName, confirmDelete: 'delete' },
      inputData: [{ json: { marker: 'test' }, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeDeleteLookup.call(fx, 0);

    expect(result.deleted).toBe(true);
    expect(result.collectionName).toBe(createdName);
    expect(result.marker).toBe('test'); // Input preserved
  });
});
