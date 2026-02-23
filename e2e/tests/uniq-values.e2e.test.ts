import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  executeAddToUniq,
  executeCheckUniqs,
  executeGetUniqs,
  executeRemoveFromUniqs,
} from '../../nodes/EightKit/operations';
import * as api from '../helpers/api-client';
import { CleanupTracker } from '../helpers/cleanup';
import { uniqName, value } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Uniq Values operations (E2E)', () => {
  const cleanup = new CleanupTracker();
  const collectionName = uniqName('values');
  const testValue = value('item');

  beforeAll(async () => {
    await api.createUniq(collectionName, 'E2E values test');
    cleanup.track('uniq', collectionName);
  });

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  it('adds a value to a uniq collection', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        value: testValue,
        advancedSettings: {},
      },
    });

    const result = await executeAddToUniq.call(fx, 0);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.value).toBe(testValue);
    expect(result.data.id).toBeDefined();
  });

  it('checks an existing value — routes to Yes (outputIndex 0)', async () => {
    const inputItem = { json: { orderId: '123' }, binary: {}, pairedItem: { item: 0, input: 0 } };
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        value: testValue,
        additionalFields: {},
      },
      inputData: [inputItem],
    });

    const result = await executeCheckUniqs.call(fx, 0);

    expect(result.outputIndex).toBe(0); // Yes — value exists
    expect(result.result.orderId).toBe('123'); // Input data preserved
  });

  it('checks a missing value — routes to No (outputIndex 1)', async () => {
    const missingValue = value('missing');
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        value: missingValue,
        additionalFields: {},
      },
      inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeCheckUniqs.call(fx, 0);

    expect(result.outputIndex).toBe(1); // No — value does not exist
  });

  it('checks with getUniqValueData enabled', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        value: testValue,
        additionalFields: {
          getUniqValueData: true,
          uniqValueDataFieldName: 'checkInfo',
        },
      },
      inputData: [{ json: { tag: 'enriched' }, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeCheckUniqs.call(fx, 0);

    expect(result.outputIndex).toBe(0);
    expect(result.result.tag).toBe('enriched');
    expect(result.result.checkInfo).toBeDefined();
  });

  it('gets all values from a uniq collection', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        advancedSettings: { pagination: { pagination: { page: 1, limit: 50 } } },
      },
    });

    const result = await executeGetUniqs.call(fx, 0);

    // API returns paginated: { items: [...], meta: {...} }
    const items = Array.isArray(result) ? result : result.items;
    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const found = items.find((v: any) => v.value === testValue);
    expect(found).toBeDefined();
  });

  it('removes a value from a uniq collection', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        value: testValue,
      },
      inputData: [{ json: { keep: true }, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeRemoveFromUniqs.call(fx, 0);

    expect(result.removed).toBe(true);
    expect(result.value).toBe(testValue);
    expect(result.keep).toBe(true); // Input data preserved
  });

  it('confirms value is gone after removal', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        name: collectionName,
        value: testValue,
        additionalFields: {},
      },
      inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeCheckUniqs.call(fx, 0);
    expect(result.outputIndex).toBe(1); // No — value removed
  });
});
