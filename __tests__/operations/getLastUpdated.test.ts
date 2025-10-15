import { NodeOperationError } from 'n8n-workflow';
import { executeGetLastUpdated } from '../../nodes/EightKit/operations/getLastUpdated';
import * as dateFormat from '../../nodes/EightKit/utils/dateFormat';
import { EightKitHttpClient } from '../../nodes/EightKit/utils/httpClient';
import { createMockCredentials, createMockExecuteFunctions } from '../setup';

describe('executeGetLastUpdated', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
    jest.clearAllMocks();
  });

  const mockCreds = createMockCredentials({
    hostUrl: 'https://api.example.com',
    apiKey: 'test_key',
  });

  test('retrieves record and formats date using default outputFormat (iso8601-tz)', async () => {
    // getNodeParameter calls:
    // 1) key
    // 2) useUtcTimezone
    // 3) outputFormat (default if not provided)
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce(false) // useUtcTimezone
      .mockReturnValueOnce('iso8601-tz'); // outputFormat
    fx.getCredentials.mockResolvedValue(mockCreds);

    const httpSpy = jest.spyOn(EightKitHttpClient.prototype, 'get').mockResolvedValue({
      success: true,
      data: {
        id: 'lu-1',
        key: 'sync-job',
        description: 'Nightly sync run',
        date: '2024-03-02T05:00:00Z',
        createdAt: '2024-03-02T05:00:01Z',
        updatedAt: '2024-03-02T05:00:01Z',
      },
    });

    const fmtSpy = jest
      .spyOn(dateFormat, 'formatDateWithFormat')
      .mockImplementation((_date, format, custom) => `__FORMATTED__(${format}|${custom ?? ''})`);

    const result = await executeGetLastUpdated.call(fx, 0);

    expect(httpSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/last-updated/key/sync-job'
    );
    expect(fmtSpy).toHaveBeenCalledWith(
      new Date('2024-03-02T05:00:00Z'),
      'iso8601-tz', // default when not provided
      undefined,
      false, // useUtcTimezone
      'America/New_York' // n8nTomezone from mock
    );
    expect(result).toMatchObject({
      id: 'lu-1',
      key: 'sync-job',
      description: 'Nightly sync run',
      date: '__FORMATTED__(iso8601-tz|)',
    });
  });

  test('honors explicit outputFormat = iso8601-utc', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce(false) // useUtcTimezone
      .mockReturnValueOnce('iso8601-utc'); // outputFormat
    fx.getCredentials.mockResolvedValue(mockCreds);

    jest.spyOn(EightKitHttpClient.prototype, 'get').mockResolvedValue({
      success: true,
      data: {
        id: 'lu-2',
        key: 'sync-job',
        description: null,
        date: '2025-10-10T13:37:11.000Z',
        createdAt: '2025-10-10T13:37:12.000Z',
        updatedAt: '2025-10-10T13:37:12.000Z',
      },
    });

    const fmtSpy = jest
      .spyOn(dateFormat, 'formatDateWithFormat')
      .mockImplementation((_d, f) => `F(${f})`);

    const result = await executeGetLastUpdated.call(fx, 0);
    expect(fmtSpy).toHaveBeenCalledWith(
      expect.any(Date),
      'iso8601-utc',
      undefined,
      false, // useUtcTimezone
      'America/New_York' // n8nTomezone from mock
    );
    expect(result.date).toBe('F(iso8601-utc)');
  });

  test('supports custom format (outputFormat = custom + outputCustomFormat)', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce(false) // useUtcTimezone
      .mockReturnValueOnce('custom') // outputFormat
      .mockReturnValueOnce('yyyy/MM/dd HH:mm:ss'); // outputCustomFormat
    fx.getCredentials.mockResolvedValue(mockCreds);

    jest.spyOn(EightKitHttpClient.prototype, 'get').mockResolvedValue({
      success: true,
      data: {
        id: 'lu-3',
        key: 'sync-job',
        description: null,
        date: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:01Z',
        updatedAt: '2024-01-01T00:00:01Z',
      },
    });

    const fmtSpy = jest
      .spyOn(dateFormat, 'formatDateWithFormat')
      .mockImplementation((_d, f, c) => `F(${f}|${c})`);

    const result = await executeGetLastUpdated.call(fx, 0);
    expect(fmtSpy).toHaveBeenCalledWith(
      new Date('2024-01-01T00:00:00Z'),
      'custom',
      'yyyy/MM/dd HH:mm:ss',
      false, // useUtcTimezone
      'America/New_York' // n8nTomezone from mock
    );
    expect(result.date).toBe('F(custom|yyyy/MM/dd HH:mm:ss)');
  });

  test('returns { date: null } when API returns data: null', async () => {
    fx.getNodeParameter.mockReturnValueOnce('sync-job'); // key
    fx.getCredentials.mockResolvedValue(mockCreds);

    jest.spyOn(EightKitHttpClient.prototype, 'get').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await executeGetLastUpdated.call(fx, 0);
    expect(result).toEqual({ date: null });
  });

  test('URL-encodes key in request path', async () => {
    // key includes spaces and slashes
    fx.getNodeParameter.mockReturnValueOnce('job/2025 run A'); // key
    fx.getCredentials.mockResolvedValue(mockCreds);

    const httpSpy = jest.spyOn(EightKitHttpClient.prototype, 'get').mockResolvedValue({
      success: true,
      data: {
        id: 'lu-4',
        key: 'job/2025 run A',
        description: null,
        date: '2025-01-01T00:00:00Z',
        createdAt: '2025-01-01T00:00:01Z',
        updatedAt: '2025-01-01T00:00:01Z',
      },
    });

    // Stub formatter to avoid timezone differences
    jest.spyOn(dateFormat, 'formatDateWithFormat').mockReturnValue('X');

    await executeGetLastUpdated.call(fx, 0);

    // Expect the encoded segment "job%2F2025%20run%20A"
    expect(httpSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/last-updated/key/job%2F2025%20run%20A'
    );
  });

  test('throws NodeOperationError when success=false (and continueOnFail is false)', async () => {
    fx.getNodeParameter.mockReturnValueOnce('sync-job'); // key
    fx.getCredentials.mockResolvedValue(mockCreds);
    fx.continueOnFail.mockReturnValue(false);

    jest.spyOn(EightKitHttpClient.prototype, 'get').mockResolvedValue({
      success: false,
      error: 'Not found',
    });

    await expect(executeGetLastUpdated.call(fx, 0)).rejects.toBeInstanceOf(NodeOperationError);
  });

  test('returns error payload when success=false but continueOnFail=true', async () => {
    fx.getNodeParameter.mockReturnValueOnce('sync-job'); // key
    fx.getCredentials.mockResolvedValue(mockCreds);
    fx.continueOnFail.mockReturnValue(true);

    // Force the code path through catch by throwing an Error
    jest
      .spyOn(EightKitHttpClient.prototype, 'get')
      .mockResolvedValue({ success: false, error: 'Not found' });

    const result = await executeGetLastUpdated.call(fx, 0);

    // When continueOnFail() is true, function returns an error object instead of throwing
    expect(result).toHaveProperty('error');
    expect(result.error?.message).toContain('Failed to get last updated record: Not found');
  });
});
