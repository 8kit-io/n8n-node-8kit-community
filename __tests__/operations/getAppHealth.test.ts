import { executeGetAppHealth } from '../../nodes/EightKit/operations/getAppHealth';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetAppHealth', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should fetch app health successfully', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: {
        appId: 'app-123',
        appName: 'Test App',
        status: 'healthy',
        timestamp: '2024-01-01T10:00:00Z',
      },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    const result = await executeGetAppHealth.call(fx, 0);
    expectSuccess(result);
    expect(result.status).toBe('healthy');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/apps\/health$/),
      })
    );
  });
});
