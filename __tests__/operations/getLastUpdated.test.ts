import { executeGetLastUpdated } from '../../nodes/EightKit/operations/getLastUpdated';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetLastUpdated', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('retrieves last updated record for a key', async () => {
    fx.getNodeParameter.mockReturnValueOnce('sync-job');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-1',
        key: 'sync-job',
        description: 'Nightly sync run',
        date: '2024-03-02T05:00:00Z',
        createdAt: '2024-03-02T05:00:01Z',
        updatedAt: '2024-03-02T05:00:01Z',
      },
    });

    const result = await executeGetLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(result?.key).toBe('sync-job');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/last-updated/key/sync-job',
      })
    );
  });

  it('throws when retrieval fails', async () => {
    fx.getNodeParameter.mockReturnValueOnce('sync-job');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Not found' });

    await expect(executeGetLastUpdated.call(fx, 0)).rejects.toThrow(
      'Failed to get last updated record: Not found'
    );
  });
});
