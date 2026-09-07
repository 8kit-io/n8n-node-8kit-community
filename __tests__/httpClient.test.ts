import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EightKitHttpClient } from '../nodes/EightKit/utils/httpClient';
import { createMockExecuteFunctions } from './setup';

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
        expect.any(Object)
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

  describe('writes are not replayed', () => {
    // add-to-uniq routes DUPLICATE_VALUE to the "Duplicate" output, which workflows
    // treat as "already handled, skip". If a POST is replayed after its response was
    // lost, the retry sees the row the first attempt wrote and reports a duplicate,
    // so a value that was never processed gets skipped.
    it('does not replay a POST whose response was lost to a 5xx', async () => {
      const error = new Error('Bad gateway');
      (error as any).response = { status: 502 };
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(error);

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      await expect(
        client.post('https://api.example.com/api/v1/uniqs/orders/values', { value: 'o1' })
      ).rejects.toThrow();
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
    });

    it('does not replay a POST that timed out', async () => {
      const error = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(error);

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      await expect(
        client.post('https://api.example.com/api/v1/uniqs/orders/values', { value: 'o1' })
      ).rejects.toThrow();
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
    });

    it('still retries a POST the server refused outright', async () => {
      // A 429 is rejected before anything is written, so replaying it is safe.
      const error = new Error('Rate limited');
      (error as any).response = { status: 429 };
      mockExecuteFunctions.helpers.httpRequestWithAuthentication
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true, data: {} });

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      const result = await client.post('https://api.example.com/api/v1/uniqs/orders/values', {
        value: 'o1',
      });
      expect(result.success).toBe(true);
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
    });

    it('still retries a POST that never reached the server', async () => {
      const error = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
      mockExecuteFunctions.helpers.httpRequestWithAuthentication
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true, data: {} });

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      const result = await client.post('https://api.example.com/api/v1/uniqs/orders/values', {
        value: 'o1',
      });
      expect(result.success).toBe(true);
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
    });

    it('still retries reads on a 5xx', async () => {
      const error = new Error('Server error');
      (error as any).response = { status: 503 };
      mockExecuteFunctions.helpers.httpRequestWithAuthentication
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true, data: {} });

      const client = new EightKitHttpClient(mockExecuteFunctions, 0, { retryDelay: 1 });
      const result = await client.get('https://api.example.com/api/v1/uniqs');
      expect(result.success).toBe(true);
      expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
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

describe('EightKitHttpClient with n8n-wrapped errors', () => {
  // n8n's httpRequestWithAuthentication rejects with a NodeApiError: the status is on
  // `httpCode` and the JSON body on `context.data`; the axios error is not kept.
  const wrapped = (status: number, data: unknown) =>
    Object.assign(new Error('Your request is invalid or could not be processed by the service'), {
      httpCode: String(status),
      context: { data },
    });

  it('surfaces the server error code and message for a wrapped 4xx', async () => {
    const fx = createMockExecuteFunctions();
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
      wrapped(409, {
        success: false,
        error: 'Value "ORD-1" already exists',
        code: 'DUPLICATE_VALUE',
      })
    );
    const client = new EightKitHttpClient(fx, 0, { retryDelay: 1 });

    await expect(client.post('https://api.example.com/api/v1/x')).rejects.toMatchObject({
      status: 409,
      code: 'DUPLICATE_VALUE',
      message: 'Value "ORD-1" already exists',
    });
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
  });
});

describe('a paywall answer keeps its way out', () => {
  // A 402 carries renewal_url. formatError dropped it, so the workflow author saw
  // "licence limit exceeded" with no idea where to go.
  it('puts the renewal URL in the message', async () => {
    const fx = createMockExecuteFunctions();
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
      Object.assign(new Error('x'), {
        httpCode: '402',
        context: {
          data: {
            success: false,
            error: 'Licence limit exceeded',
            code: 'LICENSE_LIMIT_EXCEEDED',
            renewal_url: 'https://8kit.io/pricing',
          },
        },
      })
    );
    const client = new EightKitHttpClient(fx, 0, { retryDelay: 1 });
    await expect(client.get('https://api.example.com/api/v1/uniqs')).rejects.toMatchObject({
      status: 402,
      message: expect.stringContaining('https://8kit.io/pricing'),
    });
  });
});
