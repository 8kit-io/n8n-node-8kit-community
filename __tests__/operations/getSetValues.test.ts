import { executeGetSetValues } from '../../nodes/EightKit/operations/getSetValues';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetSetValues', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('fetches set values with default pagination', async () => {
    fx.getNodeParameter.mockReturnValueOnce('processed-users').mockReturnValueOnce({});
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        items: [{ id: 'value-1', value: 'user-1' }],
        page: 1,
        limit: 10,
      },
    });

    const result = await executeGetSetValues.call(fx, 0);

    expectSuccess(result);
    expect(result.items).toHaveLength(1);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/sets/processed-users/values?page=1&limit=10',
      })
    );
  });

  it('honours custom pagination parameters', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('processed-users')
      .mockReturnValueOnce({ pagination: { pagination: { page: 2, limit: 25, offset: 5 } } });
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        items: [],
        page: 2,
        limit: 25,
        offset: 5,
      },
    });

    await executeGetSetValues.call(fx, 0);

    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/sets/processed-users/values?page=2&limit=25&offset=5',
      })
    );
  });

  it('throws when the API call fails', async () => {
    fx.getNodeParameter.mockReturnValueOnce('processed-users').mockReturnValueOnce({});
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Set not found' });

    await expect(executeGetSetValues.call(fx, 0)).rejects.toThrow(
      'Failed to get Uniq values: Set not found'
    );
  });
});
