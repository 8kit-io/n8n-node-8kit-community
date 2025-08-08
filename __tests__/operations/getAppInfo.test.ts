import { executeGetAppInfo } from '../../nodes/EightKit/operations/getAppInfo';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetAppInfo', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should fetch app info successfully', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: {
        id: 'app-123',
        name: 'Test App',
        description: 'Desc',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeGetAppInfo.call(fx, 0);
    expectSuccess(result);
    expect(result.id).toBe('app-123');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/apps\/me$/),
      })
    );
  });
});
