import { executeListLookups } from '../../nodes/EightKit/operations/listLookups';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeListLookups', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should list lookups with default pagination', async () => {
    fx.getNodeParameter.mockReturnValueOnce({});
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { items: [{ id: '1', name: 'lkp' }], pagination: { page: 1, limit: 10 } },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeListLookups.call(fx, 0);

    expectSuccess(result);
    expect(result.items).toHaveLength(1);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/lookups\?page=1&limit=10$/),
      })
    );
  });

  it('should list lookups with custom pagination', async () => {
    fx.getNodeParameter.mockReturnValueOnce({
      pagination: { pagination: { page: 3, limit: 20, offset: 40 } },
    });
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { items: [], pagination: { page: 3, limit: 20, offset: 40 } },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeListLookups.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/page=3&limit=20&offset=40$/),
      })
    );
  });
});
