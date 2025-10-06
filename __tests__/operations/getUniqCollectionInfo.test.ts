import { executeGetUniqCollectionInfo } from '../../nodes/EightKit/operations/getUniqCollectionInfo';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetUniqCollectionInfo', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should fetch uniq collection info', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { id: 'uniq-1', name: 'orders' },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeGetUniqCollectionInfo.call(fx, 0);
    expectSuccess(result);
    expect(result.name).toBe('orders');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders$/),
      })
    );
  });
});
