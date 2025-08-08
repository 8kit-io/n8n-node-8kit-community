import { executeGetLookupValues } from '../../nodes/EightKit/operations/getLookupValues';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetLookupValues', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should fetch lookup values with pagination', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('products') // name
      .mockReturnValueOnce({ pagination: { pagination: { page: 2, limit: 5, offset: 10 } } });

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { items: [{ left: 'A', right: '1' }], pagination: { page: 2, limit: 5, offset: 10 } },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeGetLookupValues.call(fx, 0);
    expectSuccess(result);
    expect(result.items).toHaveLength(1);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(
          /\/api\/v1\/lookups\/products\/values\?page=2&limit=5&offset=10$/
        ),
      })
    );
  });
});
