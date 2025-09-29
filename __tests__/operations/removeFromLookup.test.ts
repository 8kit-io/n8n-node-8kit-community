import { executeRemoveFromLookup } from '../../nodes/EightKit/operations/removeFromLookup';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeRemoveFromLookup', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: { existing: true } }]),
    } as any);
  });

  it('removes a lookup value and augments the item', async () => {
    fx.getNodeParameter.mockReturnValueOnce('user-map').mockReturnValueOnce('external-456');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: { id: 'lookup-value-1', deleted: true },
    });

    const result = await executeRemoveFromLookup.call(fx, 0);

    expectSuccess(result);
    expect(result).toEqual({
      existing: true,
      removed: true,
      value: 'external-456',
      result: { id: 'lookup-value-1', deleted: true },
    });
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: 'https://api.example.com/api/v1/lookups/user-map/values/external-456',
      })
    );
  });

  it('throws when the API call fails', async () => {
    fx.getNodeParameter.mockReturnValueOnce('user-map').mockReturnValueOnce('external-456');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Lookup value missing' });

    await expect(executeRemoveFromLookup.call(fx, 0)).rejects.toThrow(
      'Failed to remove value from lookup: Lookup value missing'
    );
  });
});
