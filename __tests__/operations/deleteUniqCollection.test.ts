import { executeDeleteUniqCollection } from '../../nodes/EightKit/operations/deleteUniqCollection';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeDeleteUniqCollection', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: { existingField: 'value' } }]),
    } as any);
  });

  describe('success case', () => {
    it('deletes a uniq collection when confirmation is correct', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await executeDeleteUniqCollection.call(fx, 0);

      expectSuccess(result);
      expect(result.deleted).toBe(true);
      expect(result.collectionName).toBe('processed-users');
      expect(result.message).toBe('Uniq collection deleted successfully');
      expect(result.existingField).toBe('value');
      expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.objectContaining({
          method: 'DELETE',
          url: 'https://api.example.com/api/v1/uniqs/processed-users',
        })
      );
    });
  });

  describe('confirmation rejection', () => {
    it('throws NodeOperationError when confirmDelete is not "delete"', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('not-delete'); // confirmDelete

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'You must type "delete" (without quotes) to confirm the deletion.'
      );
    });

    it('throws NodeOperationError when confirmDelete is empty string', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce(''); // confirmDelete

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Delete operation cancelled'
      );
    });

    it('throws NodeOperationError when confirmDelete is "DELETE" (case sensitive)', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('DELETE'); // confirmDelete

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Delete operation cancelled'
      );
    });
  });

  describe('missing hostUrl', () => {
    it('throws NodeOperationError when credentials have no hostUrl', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({ hostUrl: '' }));

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Host URL is not configured in credentials'
      );
    });

    it('throws NodeOperationError when hostUrl is null', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({ hostUrl: null }));

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Host URL is not configured in credentials'
      );
    });
  });

  describe('API returns success:false', () => {
    it('throws NodeOperationError when the API response has success=false', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: false,
        error: 'Collection not found',
      });

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Failed to delete Uniq collection: Collection not found'
      );
    });

    it('uses "Unknown error" when API response has success=false without error message', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: false,
      });

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Failed to delete Uniq collection: Unknown error'
      );
    });
  });

  describe('API error with continueOnFail=true', () => {
    it('returns error object instead of throwing when continueOnFail is true', async () => {
      fx = createMockExecuteFunctions({
        getInputData: jest.fn(() => [{ json: { existingField: 'value' } }]),
        continueOnFail: jest.fn(() => true),
      } as any);

      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
        Object.assign(new Error('Network failure'), { status: 503, code: 'SERVICE_UNAVAILABLE' })
      );

      const result = await executeDeleteUniqCollection.call(fx, 0);

      expectSuccess(result);
      expect(result.existingField).toBe('value');
      expect(result.error).toBeDefined();
      // EightKitHttpClient.formatError wraps unrecognised errors as "Network error: <message>"
      expect(result.error.message).toBe('Network error: Network failure');
      expect(result.error.code).toBe('NETWORK_ERROR');
      expect(result.deleted).toBeUndefined();
    });
  });

  describe('API error with continueOnFail=false', () => {
    it('throws NodeOperationError when continueOnFail is false', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
        new Error('Unexpected server error')
      );

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Unexpected server error'
      );
    });
  });

  describe('URL formatting', () => {
    it('trims trailing slash from hostUrl before building the request URL', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(
        createMockCredentials({ hostUrl: 'https://api.example.com/' })
      );

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      await executeDeleteUniqCollection.call(fx, 0);

      expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.objectContaining({
          url: 'https://api.example.com/api/v1/uniqs/processed-users',
        })
      );
    });

    it('builds the correct endpoint path using buildUniqEndpoint', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('my-collection') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      await executeDeleteUniqCollection.call(fx, 0);

      expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.objectContaining({
          url: 'https://api.example.com/api/v1/uniqs/my-collection',
        })
      );
    });
  });

  describe('input validation', () => {
    it('throws when the uniq collection name is empty', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Uniq collection name is required and must be a string'
      );
    });

    it('throws when the uniq collection name contains invalid characters', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('invalid name!') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Uniq collection name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('throws when the uniq collection name exceeds 100 characters', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('a'.repeat(101)) // name
        .mockReturnValueOnce('delete'); // confirmDelete

      await expect(executeDeleteUniqCollection.call(fx, 0)).rejects.toThrow(
        'Uniq collection name cannot exceed 100 characters'
      );
    });
  });

  describe('input data preservation', () => {
    it('spreads original input data into the success result', async () => {
      fx = createMockExecuteFunctions({
        getInputData: jest.fn(() => [
          { json: { userId: 'USR-456', status: 'active', roles: ['admin', 'user'] } },
        ]),
      } as any);

      fx.getNodeParameter
        .mockReturnValueOnce('processed-users') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await executeDeleteUniqCollection.call(fx, 0);

      expect(result.userId).toBe('USR-456');
      expect(result.status).toBe('active');
      expect(result.roles).toEqual(['admin', 'user']);
      expect(result.deleted).toBe(true);
    });
  });
});
