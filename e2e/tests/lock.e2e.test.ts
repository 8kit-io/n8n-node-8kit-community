import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
  executeAcquireLock,
  executeCheckLock,
  executeReleaseLock,
} from '../../nodes/EightKit/operations';
import * as api from '../helpers/api-client';
import { CleanupTracker } from '../helpers/cleanup';
import { lockKey } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Lock operations (E2E)', () => {
  const cleanup = new CleanupTracker();
  const key1 = lockKey('acquire');
  const key2 = lockKey('check');

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  describe('acquire lock', () => {
    it('acquires a free lock — routes to Yes (outputIndex 0)', async () => {
      cleanup.track('lock', key1);

      const fx = createE2EExecuteFunctions({
        params: {
          key: key1,
          callingFn: 'e2e-test-workflow',
          additionalFields: { timeout: 300 },
        },
        inputData: [{ json: { jobId: 'j1' }, binary: {}, pairedItem: { item: 0, input: 0 } }],
      });

      const result = await executeAcquireLock.call(fx, 0);

      expect(result.outputIndex).toBe(0); // Yes — acquired
      expect(result.result.jobId).toBe('j1'); // Input preserved
    });

    it('conflicts on already-acquired lock — routes to No (outputIndex 1)', async () => {
      // key1 is already locked from previous test
      const fx = createE2EExecuteFunctions({
        params: {
          key: key1,
          callingFn: 'e2e-test-another',
          additionalFields: {},
        },
        inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
      });

      const result = await executeAcquireLock.call(fx, 0);

      expect(result.outputIndex).toBe(1); // No — conflict
    });
  });

  describe('check lock', () => {
    it('checks an existing lock — routes to Yes (outputIndex 0)', async () => {
      const fx = createE2EExecuteFunctions({
        params: {
          key: key1,
          additionalFields: { getLockData: true, lockDataFieldName: 'lockInfo' },
        },
        inputData: [{ json: { test: true }, binary: {}, pairedItem: { item: 0, input: 0 } }],
      });

      const result = await executeCheckLock.call(fx, 0);

      expect(result.outputIndex).toBe(0); // Yes — lock exists
      expect(result.result.test).toBe(true); // Input preserved
      expect(result.result.lockInfo).toBeDefined();
    });

    it('checks a non-existent lock — routes to No (outputIndex 1)', async () => {
      const freeKey = lockKey('free');

      const fx = createE2EExecuteFunctions({
        params: {
          key: freeKey,
          additionalFields: {},
        },
        inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
      });

      const result = await executeCheckLock.call(fx, 0);

      expect(result.outputIndex).toBe(1); // No — lock doesn't exist
    });
  });

  describe('release lock', () => {
    it('releases an acquired lock', async () => {
      const fx = createE2EExecuteFunctions({
        params: {
          key: key1,
          additionalFields: { getLockData: true },
        },
        inputData: [{ json: { released: 'yes' }, binary: {}, pairedItem: { item: 0, input: 0 } }],
      });

      const result = await executeReleaseLock.call(fx, 0);

      expect(result.released).toBe('yes'); // Input preserved
    });

    it('confirms lock is gone after release', async () => {
      const fx = createE2EExecuteFunctions({
        params: {
          key: key1,
          additionalFields: {},
        },
        inputData: [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
      });

      const result = await executeCheckLock.call(fx, 0);
      expect(result.outputIndex).toBe(1); // No — lock was released
    });
  });
});
