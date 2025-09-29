import { executeCreateLookup } from '../../nodes/EightKit/operations/createLookup';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCreateLookup', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('creates a lookup with optional description', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('user-map')
      .mockReturnValueOnce('Primary mapping table');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lookup-1',
        name: 'user-map',
        description: 'Primary mapping table',
      },
    });

    const result = await executeCreateLookup.call(fx, 0);

    expectSuccess(result);
    expect(result.name).toBe('user-map');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.example.com/api/v1/lookups',
        body: {
          name: 'user-map',
          description: 'Primary mapping table',
        },
      })
    );
  });

  it('throws when the API returns an error', async () => {
    fx.getNodeParameter.mockReturnValueOnce('user-map').mockReturnValueOnce('');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Already exists' });

    await expect(executeCreateLookup.call(fx, 0)).rejects.toThrow(
      'Failed to create lookup collection: Already exists'
    );
  });
});
