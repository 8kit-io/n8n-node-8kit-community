import { NodeOperationError } from 'n8n-workflow';
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
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    const result = await executeGetAppHealth.call(fx, 0);
    expectSuccess(result);
    expect(result.status).toBe('healthy');
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/apps\/health$/),
      })
    );
  });

  it('should throw NodeOperationError when response.success is false', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: false,
      error: 'App is unavailable',
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    await expect(executeGetAppHealth.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should return error object when API throws and continueOnFail is true', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(true);

    // Simulate a structured API error response so formatError preserves status/code
    const httpError = Object.assign(new Error('Server error'), {
      response: { status: 500, data: { error: 'Server error', code: 'INTERNAL' } },
    });
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

    const result = await executeGetAppHealth.call(fx, 0);
    expect(result).toHaveProperty('error');
    expect(result.error.status).toBe(500);
    expect(result.error.message).toBe('Server error');
    expect(result.error.code).toBe('INTERNAL');
  });

  it('should throw NodeOperationError when API throws and continueOnFail is false', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(false);

    // Use a 4xx status so the client does not retry, keeping the test fast
    const httpError = Object.assign(new Error('Service unavailable'), {
      response: { status: 400, data: { error: 'Service unavailable', code: 'SERVICE_DOWN' } },
    });
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

    await expect(executeGetAppHealth.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should trim whitespace and strip trailing slash from hostUrl', async () => {
    fx.getCredentials.mockResolvedValue(
      createMockCredentials({ hostUrl: '  https://api.example.com/  ' })
    );

    const apiResponse = {
      success: true,
      data: {
        appId: 'app-1',
        appName: 'App',
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00Z',
      },
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    await executeGetAppHealth.call(fx, 0);

    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        url: 'https://api.example.com/api/v1/apps/health',
      })
    );
  });
});
