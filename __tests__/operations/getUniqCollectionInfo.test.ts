import { NodeOperationError } from 'n8n-workflow';
import { executeGetUniqCollectionInfo } from '../../nodes/EightKit/operations/getUniqCollectionInfo';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeGetUniqCollectionInfo', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should fetch uniq collection info successfully', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { id: 'uniq-1', name: 'orders' },
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    const result = await executeGetUniqCollectionInfo.call(fx, 0);
    expectSuccess(result);
    expect(result.name).toBe('orders');
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders$/),
      })
    );
  });

  it('should throw NodeOperationError when hostUrl is empty', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({ hostUrl: '' }));

    await expect(executeGetUniqCollectionInfo.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should throw NodeOperationError when response.success is false', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: false,
      error: 'Collection not found',
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    await expect(executeGetUniqCollectionInfo.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should return error object when API throws and continueOnFail is true', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(true);

    // Simulate a structured API error response so formatError preserves status/code.
    // 4xx errors are not retried, so the error is returned on first attempt.
    const httpError = Object.assign(new Error('Not found'), {
      response: { status: 404, data: { error: 'Not found', code: 'NOT_FOUND' } },
    });
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

    const result = await executeGetUniqCollectionInfo.call(fx, 0);
    expect(result).toHaveProperty('error');
    expect(result.error.status).toBe(404);
    expect(result.error.message).toBe('Not found');
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('should throw NodeOperationError when API throws and continueOnFail is false', async () => {
    fx.getNodeParameter.mockReturnValueOnce('orders'); // name
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(false);

    // Use a 4xx status so the client does not retry, keeping the test fast
    const httpError = Object.assign(new Error('Bad request'), {
      response: { status: 400, data: { error: 'Bad request', code: 'BAD_REQUEST' } },
    });
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

    await expect(executeGetUniqCollectionInfo.call(fx, 0)).rejects.toThrow(NodeOperationError);
  });

  it('should trim whitespace from name and strip trailing slash from hostUrl', async () => {
    fx.getNodeParameter.mockReturnValueOnce('  products  '); // name with whitespace
    fx.getCredentials.mockResolvedValue(
      createMockCredentials({ hostUrl: 'https://api.example.com/' })
    );

    const apiResponse = {
      success: true,
      data: { id: 'uniq-2', name: 'products' },
    };
    fx.helpers.httpRequestWithAuthentication.mockResolvedValue(apiResponse);

    await executeGetUniqCollectionInfo.call(fx, 0);

    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        url: 'https://api.example.com/api/v1/uniqs/products',
      })
    );
  });
});
