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

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
      success: true,
      data: { id: 'lookup-value-1', deleted: true },
    });

    const result = await executeRemoveFromLookup.call(fx, 0);

    expectSuccess(result);
    expect(result).toEqual({
      existing: true,
      removed: true,
      removedCount: 1,
      value: 'external-456',
      result: { id: 'lookup-value-1', deleted: true },
    });
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        method: 'DELETE',
        url: 'https://api.example.com/api/v1/lookups/user-map/values/external-456',
      })
    );
  });

  it('throws when the API call fails', async () => {
    fx.getNodeParameter.mockReturnValueOnce('user-map').mockReturnValueOnce('external-456');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
      success: false,
      error: 'Lookup value missing',
    });

    await expect(executeRemoveFromLookup.call(fx, 0)).rejects.toThrow(
      'Failed to remove value from lookup: Lookup value missing'
    );
  });
});

describe('executeRemoveFromLookup by left value', () => {
  it('finds the rows by left value and deletes each by id', async () => {
    const fx = createMockExecuteFunctions({ getInputData: jest.fn(() => [{ json: {} }]) } as any);
    fx.getNodeParameter
      .mockReturnValueOnce('user-map') // name
      .mockReturnValueOnce('A1') // value
      .mockReturnValueOnce('left'); // removeBy
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.helpers.httpRequestWithAuthentication
      .mockResolvedValueOnce({ success: true, data: [{ id: 'row-1' }, { id: 'row-2' }] })
      .mockResolvedValueOnce({ success: true, data: { id: 'row-1' } })
      .mockResolvedValueOnce({ success: true, data: { id: 'row-2' } });

    const result = await executeRemoveFromLookup.call(fx, 0);

    expect(result.removedCount).toBe(2);
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
      1,
      'eightKitApi',
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/lookups\/user-map\/search\?left=A1$/),
      })
    );
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
      2,
      'eightKitApi',
      expect.objectContaining({ method: 'DELETE', url: expect.stringMatching(/\/values\/row-1$/) })
    );
  });
});
