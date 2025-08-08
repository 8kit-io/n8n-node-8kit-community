import { executeRemoveFromSet } from '../../nodes/EightKit/operations/removeFromSet';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeRemoveFromSet', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should remove a value from set', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('orders') // name
      .mockReturnValueOnce('ORD-1'); // value

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.getInputData.mockReturnValue([{ json: {} }]);

    fx.helpers.httpRequest.mockResolvedValue({ success: true, data: { removed: true } });

    const result = await executeRemoveFromSet.call(fx, 0);
    expectSuccess(result);
    expect(result.removed).toBe(true);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: expect.stringMatching(/\/api\/v1\/sets\/orders\/values\/ORD-1$/),
      })
    );
  });
});
