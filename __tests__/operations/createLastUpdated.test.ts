import { executeCreateLastUpdated } from '../../nodes/EightKit/operations/createLastUpdated';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCreateLastUpdated', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('creates a last updated record with trimmed metadata', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        description: '  Nightly sync run  ',
        dateString: ' 2024-03-02T05:00:00Z ',
        inputFormat: 'iso8601-tz',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
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
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({}); // additionalFields (empty = defaults)
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
      success: false,
      error: 'Duplicate key',
    });

    await expect(executeCreateLastUpdated.call(fx, 0)).rejects.toThrow(
      'Failed to create last updated record: Duplicate key'
    );
  });

  it('handles Unix timestamp (number) as date input', async () => {
    const testTimestamp = 1704175200000; // Unix timestamp in milliseconds
    const expectedDate = new Date(testTimestamp).toISOString();

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        description: 'Test description',
        dateString: testTimestamp,
        inputFormat: 'unix-ms',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        body: expect.objectContaining({
          key: 'sync-job',
          date: expectedDate,
        }),
      })
    );
  });

  it('handles Unix timestamp (string) as date input', async () => {
    const testTimestamp = '1704175200000'; // String timestamp
    const expectedDate = new Date(Number.parseInt(testTimestamp, 10)).toISOString();

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        description: 'Test description',
        dateString: testTimestamp,
        inputFormat: 'unix-ms',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        body: expect.objectContaining({
          date: expectedDate,
        }),
      })
    );
  });

  it('handles ISO 8601 date string', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        dateString: '2024-03-15T14:30:00Z',
        inputFormat: 'iso8601-tz',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-03-15T14:30:00.000Z',
        }),
      })
    );
  });

  it('uses current time when date is empty string', async () => {
    const mockNow = new Date('2024-04-20T12:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        dateString: '',
        inputFormat: 'iso8601-tz',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-04-20T12:00:00.000Z',
        }),
      })
    );

    jest.restoreAllMocks();
  });

  it('uses current time when date is null', async () => {
    const mockNow = new Date('2024-04-20T12:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        dateString: null,
        inputFormat: 'iso8601-tz',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-04-20T12:00:00.000Z',
        }),
      })
    );

    jest.restoreAllMocks();
  });

  it('handles various ISO 8601 formats', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({
        dateString: '2024-05-10T08:30:45.123Z',
        inputFormat: 'iso8601-tz',
      }); // additionalFields

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequestWithAuthentication.mockResolvedValue({
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
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        body: expect.objectContaining({
          date: '2024-05-10T08:30:45.123Z',
        }),
      })
    );
  });
});

describe('updating an existing watermark', () => {
  // The old path was DELETE then POST. If the POST failed, the watermark was gone for
  // good and the next incremental sync reprocessed everything — the exact failure the
  // product exists to prevent. One PUT replaces both calls.
  it('updates in place with a single PUT and never deletes', async () => {
    const fx = createMockExecuteFunctions();
    fx.getNodeParameter
      .mockReturnValueOnce('sync-job') // key
      .mockReturnValueOnce({ description: '', date: '2026-09-07T10:00:00.000Z' });
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    const dup = Object.assign(new Error('DUPLICATE_KEY'), {
      httpCode: '409',
      context: { data: { success: false, error: 'exists', code: 'DUPLICATE_KEY' } },
    });
    fx.helpers.httpRequestWithAuthentication
      .mockRejectedValueOnce(dup) // POST → already exists
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'w1',
          key: 'sync-job',
          description: null,
          date: '2026-09-07T10:00:00.000Z',
          createdAt: 'x',
          updatedAt: 'y',
        },
      });

    const result = await executeCreateLastUpdated.call(fx, 0);

    const calls = fx.helpers.httpRequestWithAuthentication.mock.calls.map(
      (c: any) => `${c[1].method} ${c[1].url}`
    );
    expect(calls.some((c: string) => c.startsWith('DELETE'))).toBe(false);
    expect(
      calls.some(
        (c: string) => c === 'PUT https://api.example.com/api/v1/last-updated/key/sync-job'
      )
    ).toBe(true);
    expect(result.key).toBe('sync-job');
  });
});
