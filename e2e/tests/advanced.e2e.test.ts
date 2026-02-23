import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executeCompleteLookupUniq } from '../../nodes/EightKit/operations';
import * as api from '../helpers/api-client';
import { CleanupTracker } from '../helpers/cleanup';
import { lookupName, uniqName, value } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Advanced: completeLookupUniq (E2E)', () => {
  const cleanup = new CleanupTracker();
  const lookup = lookupName('combo');
  const uniq = uniqName('combo');

  beforeAll(async () => {
    await api.createLookup(lookup, { description: 'E2E combo test' });
    cleanup.track('lookup', lookup);
    await api.createUniq(uniq, 'E2E combo test');
    cleanup.track('uniq', uniq);
  });

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  it('performs combined lookup + uniq add', async () => {
    const leftVal = value('combo-left');
    const rightVal = value('combo-right');
    const uniqVal = value('combo-uniq');

    const fx = createE2EExecuteFunctions({
      params: {
        lookupName: lookup,
        leftValue: leftVal,
        rightValue: rightVal,
        uniqName: uniq,
        value: uniqVal,
        advancedSettings: {},
      },
      inputData: [{ json: { marker: 'combined' }, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    const result = await executeCompleteLookupUniq.call(fx, 0);

    expect(result.success).toBe(true);
    expect(result.lookupResult).toBeDefined();
    expect(result.lookupResult.left).toBe(leftVal);
    expect(result.lookupResult.right).toBe(rightVal);
    expect(result.uniqResult).toBeDefined();
    expect(result.uniqResult.value).toBe(uniqVal);
  });

  it('fails when lookup does not exist', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        lookupName: 'non-existent-lookup',
        leftValue: 'l',
        rightValue: 'r',
        uniqName: uniq,
        value: 'v',
        advancedSettings: {},
      },
      inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    await expect(executeCompleteLookupUniq.call(fx, 0)).rejects.toThrow(/not found/);
  });

  it('fails when uniq collection does not exist', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        lookupName: lookup,
        leftValue: 'l',
        rightValue: 'r',
        uniqName: 'non-existent-uniq',
        value: 'v',
        advancedSettings: {},
      },
      inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
    });

    await expect(executeCompleteLookupUniq.call(fx, 0)).rejects.toThrow(/not found/);
  });
});
