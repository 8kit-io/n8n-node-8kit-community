import { executeAddToUniq } from '../../nodes/EightKit/operations/addToUniq';
import { createMockCredentials, createMockExecuteFunctions } from '../setup';

describe('executeAddToUniq', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: {} }]),
    } as any);
  });

  it('should add value to existing uniq collection', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('orders') // name
      .mockReturnValueOnce('ORD-1'); // value

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    // First GET to check uniq collection exists
    fx.helpers.httpRequest.mockResolvedValueOnce({ success: true, data: { id: 'uniq-1' } });
    // Then POST to add value
    fx.helpers.httpRequest.mockResolvedValueOnce({
      success: true,
      data: { id: 'val-1', value: 'ORD-1' },
    });

    const result = await executeAddToUniq.call(fx, 0);

    expect(result).toEqual({ success: true, data: { id: 'val-1', value: 'ORD-1' } });
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders$/),
      })
    );
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders\/values$/),
      })
    );
  });

  it('should throw when uniq collection does not exist', async () => {
    fx.getNodeParameter.mockReturnValueOnce('missing').mockReturnValueOnce('ORD-1');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    // Mock 404 response shape to trigger non-retry and formatted error
    fx.helpers.httpRequest.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error: 'Uniq collection not found', code: 'UNIQ_NOT_FOUND' },
      },
    });

    await expect(executeAddToUniq.call(fx, 0)).rejects.toThrow('Uniq collection not found');
  });
});
