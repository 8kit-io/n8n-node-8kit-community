import { describe, expect, it } from 'vitest';
import { executeGetAppHealth, executeGetAppInfo } from '../../nodes/EightKit/operations';
import { createE2EExecuteFunctions } from '../helpers/test-harness';

describe('App operations (E2E)', () => {
  it('getAppInfo returns app metadata', async () => {
    const fx = createE2EExecuteFunctions({ params: {} });
    const result = await executeGetAppInfo.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it('getAppHealth returns healthy status', async () => {
    const fx = createE2EExecuteFunctions({ params: {} });
    const result = await executeGetAppHealth.call(fx, 0);

    expect(result).toBeDefined();
    expect(result.appId).toBeDefined();
    expect(result.status).toBe('healthy');
    expect(result.timestamp).toBeDefined();
  });
});
