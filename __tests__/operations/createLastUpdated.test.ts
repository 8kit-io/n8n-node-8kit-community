import { executeCreateLastUpdated } from '../../nodes/EightKit/operations/createLastUpdated';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCreateLastUpdated', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('creates a last updated record with trimmed metadata', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('  Nightly sync run  ')
      .mockReturnValueOnce(' 2024-03-02T05:00:00Z ');

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

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(result.key).toBe('sync-job');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.example.com/api/v1/last-updated',
        body: {
          key: 'sync-job',
          description: 'Nightly sync run',
          date: '2024-03-02T05:00:00Z',
        },
      })
    );
  });

  it('throws when the API reports failure', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('')
      .mockReturnValueOnce(null);
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Duplicate key' });

    await expect(executeCreateLastUpdated.call(fx, 0)).rejects.toThrow(
      'Failed to create last updated record: Duplicate key'
    );
  });
});
