import { afterAll, describe, expect, it } from 'vitest';
import {
  executeCreateLastUpdated,
  executeGetLastUpdated,
} from '../../nodes/EightKit/operations';
import { CleanupTracker } from '../helpers/cleanup';
import { lastUpdatedKey } from '../helpers/fixtures';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('Last Updated operations (E2E)', () => {
  const cleanup = new CleanupTracker();
  const autoDateKey = lastUpdatedKey('auto');
  const explicitDateKey = lastUpdatedKey('explicit');
  const upsertKey = lastUpdatedKey('upsert');
  const fallbackKey = lastUpdatedKey('fallback');

  afterAll(async () => {
    await cleanup.cleanAll();
  });

  it('creates a last-updated record with auto date (now)', async () => {
    cleanup.track('last-updated', autoDateKey);

    const fx = createE2EExecuteFunctions({
      params: {
        key: autoDateKey,
        additionalFields: { description: 'Auto date test' },
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.key).toBe(autoDateKey);
    expect(result.date).toBeDefined();

    // Date should be close to now (within 30 seconds)
    const dateMs = new Date(result.date).getTime();
    const nowMs = Date.now();
    expect(Math.abs(nowMs - dateMs)).toBeLessThan(30_000);
  });

  it('creates a last-updated record with explicit date', async () => {
    cleanup.track('last-updated', explicitDateKey);
    const explicitDate = '2024-06-15T10:30:00.000Z';

    const fx = createE2EExecuteFunctions({
      params: {
        key: explicitDateKey,
        additionalFields: {
          dateString: explicitDate,
          inputFormat: 'iso8601-tz',
        },
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expect(result.key).toBe(explicitDateKey);
    expect(result.date).toBeDefined();
    // The stored date should represent the same instant
    const storedDate = new Date(result.date).getTime();
    const inputDate = new Date(explicitDate).getTime();
    expect(storedDate).toBe(inputDate);
  });

  it('upserts on duplicate key (delete + re-create)', async () => {
    cleanup.track('last-updated', upsertKey);
    const firstDate = '2024-01-01T00:00:00.000Z';
    const secondDate = '2024-12-25T12:00:00.000Z';

    // First create
    const fx1 = createE2EExecuteFunctions({
      params: {
        key: upsertKey,
        additionalFields: { dateString: firstDate, inputFormat: 'iso8601-tz' },
      },
    });
    const result1 = await executeCreateLastUpdated.call(fx1, 0);
    expect(result1.key).toBe(upsertKey);

    // Second create with same key — should upsert (DUPLICATE_KEY → delete + re-create)
    const fx2 = createE2EExecuteFunctions({
      params: {
        key: upsertKey,
        additionalFields: { dateString: secondDate, inputFormat: 'iso8601-tz' },
      },
    });
    const result2 = await executeCreateLastUpdated.call(fx2, 0);
    expect(result2.key).toBe(upsertKey);

    const storedDate = new Date(result2.date).getTime();
    const expectedDate = new Date(secondDate).getTime();
    expect(storedDate).toBe(expectedDate);
  });

  it('gets a last-updated record by key', async () => {
    const fx = createE2EExecuteFunctions({
      params: {
        key: autoDateKey,
        additionalFields: {},
      },
    });

    const result = await executeGetLastUpdated.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.key).toBe(autoDateKey);
    expect(result.date).toBeDefined();
  });

  it('returns fallback date when key does not exist', async () => {
    const fallbackDate = '2023-01-01T00:00:00.000Z';
    const fx = createE2EExecuteFunctions({
      params: {
        key: fallbackKey,
        additionalFields: {
          defaultDateString: fallbackDate,
          outputFormat: 'iso8601-tz',
        },
      },
    });

    const result = await executeGetLastUpdated.call(fx, 0);

    expect(result.date).toBeDefined();
    // Should contain the fallback date
    expect(result.date).toContain('2023');
  });

  it('returns null date when key does not exist and no fallback', async () => {
    const noFallbackKey = lastUpdatedKey('nofallback');

    const fx = createE2EExecuteFunctions({
      params: {
        key: noFallbackKey,
        additionalFields: {},
      },
    });

    const result = await executeGetLastUpdated.call(fx, 0);

    expect(result.date).toBeNull();
  });
});
