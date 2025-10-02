import { executeGetSetInfo } from '../../nodes/EightKit/operations/getSetInfo';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetSetInfo', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should fetch set info', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { id: 'set-1', name: 'orders' },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeGetSetInfo.call(fx, 0);
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
