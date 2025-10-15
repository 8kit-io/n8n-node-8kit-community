import { executeCreateLastUpdated } from '../../nodes/EightKit/operations/createLastUpdated';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCreateLastUpdated', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('creates a last updated record with trimmed metadata', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('  Nightly sync run  ')
      .mockReturnValueOnce(' 2024-03-02T05:00:00Z ')
      .mockReturnValueOnce('iso8601-tz');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-1',
        key: 'sync-job',
        description: 'Nightly sync run',
        date: '2024-03-02T05:00:00.000Z',
        createdAt: '2024-03-02T05:00:01Z',
        updatedAt: '2024-03-02T05:00:01Z',
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(result.key).toBe('sync-job');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.example.com/api/v1/last-updated',
        body: {
          key: 'sync-job',
          description: 'Nightly sync run',
          date: '2024-03-02T05:00:00.000Z',
        },
      })
    );
  });

  it('throws when the API reports failure', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('iso8601-tz');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Duplicate key' });

    await expect(executeCreateLastUpdated.call(fx, 0)).rejects.toThrow(
      'Failed to create last updated record: Duplicate key'
    );
  });

  it('handles Unix timestamp (number) as date input', async () => {
    const testTimestamp = 1704175200000; // Unix timestamp in milliseconds
    const expectedDate = new Date(testTimestamp).toISOString();

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('Test description')
      .mockReturnValueOnce(testTimestamp)
      .mockReturnValueOnce('unix-ms');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-2',
        key: 'sync-job',
        description: 'Test description',
        date: expectedDate,
        createdAt: expectedDate,
        updatedAt: expectedDate,
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          key: 'sync-job',
          date: expectedDate, // Now includes milliseconds
        }),
      })
    );
  });

  it('handles Unix timestamp (string) as date input', async () => {
    const testTimestamp = '1704175200000'; // String timestamp
    const expectedDate = new Date(Number.parseInt(testTimestamp, 10)).toISOString();

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('Test description')
      .mockReturnValueOnce(testTimestamp)
      .mockReturnValueOnce('unix-ms');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-3',
        key: 'sync-job',
        description: 'Test description',
        date: expectedDate,
        createdAt: expectedDate,
        updatedAt: expectedDate,
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          date: expectedDate, // Now includes milliseconds
        }),
      })
    );
  });

  it('handles ISO 8601 date string', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('2024-03-15T14:30:00Z')
      .mockReturnValueOnce('iso8601-tz');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-4',
        key: 'sync-job',
        date: '2024-03-15T14:30:00.000Z',
        createdAt: '2024-03-15T14:30:00.000Z',
        updatedAt: '2024-03-15T14:30:00.000Z',
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-03-15T14:30:00.000Z', // Now includes milliseconds
        }),
      })
    );
  });

  it('uses current time when date is empty string', async () => {
    const mockNow = new Date('2024-04-20T12:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('') // Empty string
      .mockReturnValueOnce('iso8601-tz');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-5',
        key: 'sync-job',
        date: '2024-04-20T12:00:00.000Z',
        createdAt: '2024-04-20T12:00:00.000Z',
        updatedAt: '2024-04-20T12:00:00.000Z',
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-04-20T12:00:00.000Z', // Now includes milliseconds
        }),
      })
    );

    jest.restoreAllMocks();
  });

  it('uses current time when date is null', async () => {
    const mockNow = new Date('2024-04-20T12:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('')
      .mockReturnValueOnce(null) // null value
      .mockReturnValueOnce('iso8601-tz');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-6',
        key: 'sync-job',
        date: '2024-04-20T12:00:00.000Z',
        createdAt: '2024-04-20T12:00:00.000Z',
        updatedAt: '2024-04-20T12:00:00.000Z',
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-04-20T12:00:00.000Z', // Now includes milliseconds
        }),
      })
    );

    jest.restoreAllMocks();
  });

  it('handles various ISO 8601 formats', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('2024-05-10T08:30:45.123Z')
      .mockReturnValueOnce('iso8601-tz');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'lu-7',
        key: 'sync-job',
        date: '2024-05-10T08:30:45.123Z',
        createdAt: '2024-05-10T08:30:45.123Z',
        updatedAt: '2024-05-10T08:30:45.123Z',
      },
    });

    const result = await executeCreateLastUpdated.call(fx, 0);

    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-05-10T08:30:45.123Z', // Now includes milliseconds
        }),
      })
    );
  });
});
