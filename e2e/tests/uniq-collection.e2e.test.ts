import { afterAll, describe, expect, it } from 'vitest';
import {
  executeCreateUniqCollection,
  executeDeleteUniqCollection,
  executeGetUniqCollectionInfo,
  executeListUniqCollections,
} from '../../nodes/EightKit/operations';
import { CleanupTracker } from '../helpers/cleanup';
import { uniqName } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Uniq Collection CRUD (E2E)', () => {
  const cleanup = new CleanupTracker();
  let createdName: string;

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  it('creates a uniq collection', async () => {
    createdName = uniqName('crud');
    cleanup.track('uniq', createdName);

    const fx = createE2EExecuteFunctions({
      params: {
        name: createdName,
        additionalFields: { description: 'E2E test collection' },
      },
    });

    const result = await executeCreateUniqCollection.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe(createdName);
  });

  it('lists uniq collections and finds the created one', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        advancedSettings: { pagination: { pagination: { page: 1, limit: 100 } } },
      },
    });

    const result = await executeListUniqCollections.call(fx, 0);

    // API returns paginated: { items: [...], meta: {...} }
    const items = Array.isArray(result) ? result : result.items;
    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    const found = items.find((c: any) => c.name === createdName);
    expect(found).toBeDefined();
  });

  it('gets info for a specific uniq collection', async () => {
    const fx = createE2EExecuteFunctions({
      params: { name: createdName },
    });

    const result = await executeGetUniqCollectionInfo.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.name).toBe(createdName);
    expect(result.id).toBeDefined();
  });

  it('rejects creation of duplicate collection name', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: createdName,
        additionalFields: {},
      },
    });

    await expect(executeCreateUniqCollection.call(fx, 0)).rejects.toThrow();
  });

  it('deletes a uniq collection', async () => {
    const fx = createE2EExecuteFunctions({
      params: { name: createdName, confirmDelete: 'delete' },
      inputData: [
        { json: { testField: 'keep-me' }, binary: {}, pairedItem: { item: 0, input: 0 } },
      ],
    });

    const result = await executeDeleteUniqCollection.call(fx, 0);

    expect(result.deleted).toBe(true);
    expect(result.collectionName).toBe(createdName);
    expect(result.testField).toBe('keep-me');
  });
});
