import { executeRemoveFromUniqs } from '../../nodes/EightKit/operations/removeFromUniq';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeRemoveFromUniqs', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should remove a value from uniq collection', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('orders') // name
      .mockReturnValueOnce('ORD-1'); // value

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.getInputData.mockReturnValue([{ json: {} }]);

    fx.helpers.httpRequest.mockResolvedValue({ success: true, data: { removed: true } });

    const result = await executeRemoveFromUniqs.call(fx, 0);
    expectSuccess(result);
    expect(result.removed).toBe(true);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders\/values\/ORD-1$/),
      })
    );
  });
});
