import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EightKitHttpClient } from '../nodes/EightKit/utils/httpClient';

describe('EightKitHttpClient', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getCredentials: vi.fn().mockResolvedValue({
        hostUrl: 'https://api.example.com',
        apiKey: 'st_test_key',
      }),
      helpers: {
        httpRequest: vi.fn().mockResolvedValue({ success: true, data: {} }),
        httpRequestWithAuthentication: vi.fn().mockResolvedValue({ success: true, data: {} }),
      },
    };
  });

  describe('authentication', () => {
    it('does not manually read credentials for API key injection', async () => {
      const client = new EightKitHttpClient(mockExecuteFunctions, 0);
      await client.get('https://api.example.com/api/v1/test');
      expect(mockExecuteFunctions.getCredentials).not.toHaveBeenCalled();
    });

    it('uses httpRequestWithAuthentication instead of httpRequest', async () => {
      const client = new EightKitHttpClient(mockExecuteFunctions, 0);
      await client.get('https://api.example.com/api/v1/test');
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalled();
      expect(mockExecuteFunctions.helpers.httpRequest).not.toHaveBeenCalled();
    });

    it('passes eightKitApi as the credential type', async () => {
      const client = new EightKitHttpClient(mockExecuteFunctions, 0);
      await client.get('https://api.example.com/api/v1/test');
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
        'eightKitApi',
        expect.any(Object),
      );
    });
  });

  describe('retry logic', () => {
    it('retries on 5xx errors', async () => {
      const error = new Error('Server error');
      (error as any).response = { status: 500 };
      mockExecuteFunctions.helpers.httpRequestWithAuthentication
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true, data: {} });

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      const result = await client.get('https://api.example.com/api/v1/test');
      expect(result.success).toBe(true);
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx errors (except 429)', async () => {
      const error = new Error('Not found');
      (error as any).response = { status: 404, data: { error: 'Not found', code: 'NOT_FOUND' } };
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(error);

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      await expect(client.get('https://api.example.com/api/v1/test')).rejects.toThrow();
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 rate limit errors', async () => {
      const error = new Error('Rate limited');
      (error as any).response = { status: 429 };
      mockExecuteFunctions.helpers.httpRequestWithAuthentication
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true, data: {} });

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      const result = await client.get('https://api.example.com/api/v1/test');
      expect(result.success).toBe(true);
    });
  });

  describe('delay uses setTimeout not busy-loop', () => {
    it('delay resolves after specified time', async () => {
      const client = new EightKitHttpClient(mockExecuteFunctions, 0);
      const start = Date.now();
      await (client as any).delay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });
});
