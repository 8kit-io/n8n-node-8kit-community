import { executeDeleteLookup } from '../../nodes/EightKit/operations/deleteLookup';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeDeleteLookup', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: { existingField: 'value' } }]),
    } as any);
  });

  describe('success case', () => {
    it('deletes a lookup collection when confirmation is correct', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await executeDeleteLookup.call(fx, 0);

      expectSuccess(result);
      expect(result.deleted).toBe(true);
      expect(result.collectionName).toBe('user-map');
      expect(result.message).toBe('Lookup collection deleted successfully');
      expect(result.existingField).toBe('value');
      expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.objectContaining({
          method: 'DELETE',
          url: 'https://api.example.com/api/v1/lookups/user-map',
        })
      );
    });
  });

  describe('confirmation rejection', () => {
    it('throws NodeOperationError when confirmDelete is not "delete"', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('not-delete'); // confirmDelete

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'You must type "delete" (without quotes) to confirm the deletion.'
      );
    });

    it('throws NodeOperationError when confirmDelete is empty string', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce(''); // confirmDelete

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow('Delete operation cancelled');
    });

    it('throws NodeOperationError when confirmDelete is "DELETE" (case sensitive)', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('DELETE'); // confirmDelete

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow('Delete operation cancelled');
    });
  });

  describe('missing hostUrl', () => {
    it('throws NodeOperationError when credentials have no hostUrl', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({ hostUrl: '' }));

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Host URL is not configured in credentials'
      );
    });

    it('throws NodeOperationError when hostUrl is null', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({ hostUrl: null }));

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Host URL is not configured in credentials'
      );
    });
  });

  describe('API returns success:false', () => {
    it('throws NodeOperationError when the API response has success=false', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: false,
        error: 'Collection not found',
      });

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Failed to delete lookup collection: Collection not found'
      );
    });

    it('uses "Unknown error" when API response has success=false without error message', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: false,
      });

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Failed to delete lookup collection: Unknown error'
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
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
        Object.assign(new Error('Network failure'), { status: 503, code: 'SERVICE_UNAVAILABLE' })
      );

      const result = await executeDeleteLookup.call(fx, 0);

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
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
        new Error('Unexpected server error')
      );

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow('Unexpected server error');
    });
  });

  describe('URL formatting', () => {
    it('trims trailing slash from hostUrl before building the request URL', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(
        createMockCredentials({ hostUrl: 'https://api.example.com/' })
      );

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      await executeDeleteLookup.call(fx, 0);

      expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.objectContaining({
          url: 'https://api.example.com/api/v1/lookups/user-map',
        })
      );
    });

    it('URL-encodes special characters in the lookup name', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('lookup-name') // name (valid chars only per validation)
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      await executeDeleteLookup.call(fx, 0);

      expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.objectContaining({
          url: 'https://api.example.com/api/v1/lookups/lookup-name',
        })
      );
    });
  });

  describe('input validation', () => {
    it('throws when the lookup name is empty', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Lookup name is required and must be a string'
      );
    });

    it('throws when the lookup name contains invalid characters', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('invalid name!') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Lookup name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('throws when the lookup name exceeds 100 characters', async () => {
      fx.getNodeParameter
        .mockReturnValueOnce('a'.repeat(101)) // name
        .mockReturnValueOnce('delete'); // confirmDelete

      await expect(executeDeleteLookup.call(fx, 0)).rejects.toThrow(
        'Lookup name cannot exceed 100 characters'
      );
    });
  });

  describe('input data preservation', () => {
    it('spreads original input data into the success result', async () => {
      fx = createMockExecuteFunctions({
        getInputData: jest.fn(() => [
          { json: { orderId: 'ORD-123', status: 'pending', tags: ['a', 'b'] } },
        ]),
      } as any);

      fx.getNodeParameter
        .mockReturnValueOnce('user-map') // name
        .mockReturnValueOnce('delete'); // confirmDelete

      fx.getCredentials.mockResolvedValue(createMockCredentials({}));

      fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await executeDeleteLookup.call(fx, 0);

      expect(result.orderId).toBe('ORD-123');
      expect(result.status).toBe('pending');
      expect(result.tags).toEqual(['a', 'b']);
      expect(result.deleted).toBe(true);
    });
  });
});
