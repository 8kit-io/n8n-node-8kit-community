import { NodeOperationError } from 'n8n-workflow';
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
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    const result = await executeGetAppInfo.call(fx, 0);
    expectSuccess(result);
    expect(result.id).toBe('app-123');
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/apps\/me$/),
      })
    );
  });

  it('should throw NodeOperationError when response.success is false', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: false,
      error: 'App not found',
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    await expect(executeGetAppInfo.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should return error object when API throws and continueOnFail is true', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(true);

    // Simulate a structured API error response so formatError preserves status/code.
    // 4xx errors are not retried, so the error is returned on first attempt.
    const httpError = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { error: 'Unauthorized', code: 'AUTH_FAILED' } },
    });
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

    const result = await executeGetAppInfo.call(fx, 0);
    expect(result).toHaveProperty('error');
    expect(result.error.status).toBe(401);
    expect(result.error.message).toBe('Unauthorized');
    expect(result.error.code).toBe('AUTH_FAILED');
  });

  it('should throw NodeOperationError when API throws and continueOnFail is false', async () => {
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(false);

    // Use a 4xx status so the client does not retry, keeping the test fast
    const httpError = Object.assign(new Error('Bad request'), {
      response: { status: 400, data: { error: 'Bad request', code: 'BAD_REQUEST' } },
    });
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

    await expect(executeGetAppInfo.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should trim whitespace and strip trailing slash from hostUrl', async () => {
    fx.getCredentials.mockResolvedValue(
      createMockCredentials({ hostUrl: '  https://api.example.com/  ' })
    );

    const apiResponse = {
      success: true,
      data: {
        id: 'app-1',
        name: 'App',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    await executeGetAppInfo.call(fx, 0);

    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        url: 'https://api.example.com/api/v1/apps/me',
      })
    );
  });
});
