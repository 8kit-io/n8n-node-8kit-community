import { executeCompleteLookupSet } from '../../nodes/EightKit/operations/completeLookupSet';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCompleteLookupSet', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: { requestId: 'req-1' } }]),
    } as any);
  });

  it('performs lookup and set additions when both resources exist', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('user-mapping')
      .mockReturnValueOnce('internal-123')
      .mockReturnValueOnce('external-456')
      .mockReturnValueOnce('processed-users')
      .mockReturnValueOnce('external-456')
      .mockReturnValueOnce({ metadata: { source: 'n8n' } });

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockImplementation(async (config: any) => {
      const { method, url, body } = config;

      if (method === 'GET' && url === 'https://api.example.com/api/v1/lookups/user-mapping') {
        return { success: true, data: { id: 'lookup-1' } };
      }

      if (method === 'GET' && url === 'https://api.example.com/api/v1/sets/processed-users') {
        return { success: true, data: { id: 'set-1' } };
      }

      if (
        method === 'POST' &&
        url === 'https://api.example.com/api/v1/lookups/user-mapping/values'
      ) {
        expect(body).toEqual({ left: 'internal-123', right: 'external-456' });
        return {
          success: true,
          data: {
            id: 'lookup-value-1',
            lookupId: 'lookup-1',
            left: 'internal-123',
            right: 'external-456',
            createdAt: '2024-03-01T12:00:00Z',
            updatedAt: '2024-03-01T12:00:00Z',
          },
        };
      }

      if (
        method === 'POST' &&
        url === 'https://api.example.com/api/v1/sets/processed-users/values'
      ) {
        expect(body).toEqual({ value: 'external-456', metadata: { source: 'n8n' } });
        return {
          success: true,
          data: {
            id: 'set-value-1',
            setId: 'set-1',
            value: 'external-456',
            createdAt: '2024-03-01T12:00:00Z',
            updatedAt: '2024-03-01T12:00:00Z',
          },
        };
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    const result = await executeCompleteLookupSet.call(fx, 0);

    expectSuccess(result);
    expect(result.lookupResult.id).toBe('lookup-value-1');
    expect(result.setResult.id).toBe('set-value-1');
    expect(fx.helpers.httpRequest).toHaveBeenCalledTimes(4);
  });

  it('throws when the target set is missing', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('user-mapping')
      .mockReturnValueOnce('internal-123')
      .mockReturnValueOnce('external-456')
      .mockReturnValueOnce('missing-set')
      .mockReturnValueOnce('external-456')
      .mockReturnValueOnce({});

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockImplementation(async (config: any) => {
      const { method, url } = config;

      if (method === 'GET' && url === 'https://api.example.com/api/v1/lookups/user-mapping') {
        return { success: true, data: { id: 'lookup-1' } };
      }

      if (method === 'GET' && url === 'https://api.example.com/api/v1/sets/missing-set') {
        throw new Error('SET_NOT_FOUND');
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    await expect(executeCompleteLookupSet.call(fx, 0)).rejects.toEqual(
      'Uniq collection "missing-set" not found.'
    );
  });
});
