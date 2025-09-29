import { executeCheckLock } from '../../nodes/EightKit/operations/checkLock';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCheckLock', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('returns lock details when the lock exists', async () => {
    fx.getNodeParameter.mockReturnValueOnce('job-1');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        key: 'job-1',
        exists: true,
        lockInfo: {
          key: 'job-1',
          callingFn: 'workerA',
          timestamp: '2024-03-01T12:00:00Z',
          timeoutSeconds: 120,
          appId: 'app-123',
        },
        timestamp: '2024-03-01T12:00:05Z',
      },
    });

    const result = await executeCheckLock.call(fx, 0);

    expectSuccess(result);
    expect(result.key).toBe('job-1');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/locks/job-1',
      })
    );
  });

  it('throws when the API indicates failure', async () => {
    fx.getNodeParameter.mockReturnValueOnce('missing-lock');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Lock not found' });

    await expect(executeCheckLock.call(fx, 0)).rejects.toThrow(
      'Failed to check lock: Lock not found'
    );
  });
});
