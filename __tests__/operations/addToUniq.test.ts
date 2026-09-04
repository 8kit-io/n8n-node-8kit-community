import { executeAddToUniq } from '../../nodes/EightKit/operations/addToUniq';
import { createMockCredentials, createMockExecuteFunctions } from '../setup';

describe('executeAddToUniq', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: {} }]),
    } as any);
  });

  it('should add value to existing uniq collection', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('orders') // name
      .mockReturnValueOnce('ORD-1'); // value

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    // First GET to check uniq collection exists
    fx.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
      success: true,
      data: { id: 'uniq-1' },
    });
    // Then POST to add value
    fx.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
      success: true,
      data: { id: 'val-1', value: 'ORD-1' },
    });

    const result = await executeAddToUniq.call(fx, 0);

    expect(result).toEqual({ result: { id: 'val-1', value: 'ORD-1' }, outputIndex: 0 });
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders$/),
      })
    );
    expect(fx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
      'eightKitApi',
      expect.objectContaining({
        method: 'POST',
        url: expect.stringMatching(/\/api\/v1\/uniqs\/orders\/values$/),
      })
    );
  });

  it('should throw when uniq collection does not exist', async () => {
    fx.getNodeParameter.mockReturnValueOnce('missing').mockReturnValueOnce('ORD-1');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    // Mock 404 response shape to trigger non-retry and formatted error
    fx.helpers.httpRequestWithAuthentication.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error: 'Uniq collection not found', code: 'UNIQ_NOT_FOUND' },
      },
    });

    await expect(executeAddToUniq.call(fx, 0)).rejects.toThrow('Uniq collection not found');
  });
});

describe('executeAddToUniq output routing', () => {
  const setup = () => {
    const fx = createMockExecuteFunctions({ getInputData: jest.fn(() => [{ json: {} }]) } as any);
    fx.getNodeParameter.mockReturnValueOnce('orders').mockReturnValueOnce('ORD-1');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
      success: true,
      data: { id: 'uniq-1' },
    });
    return fx;
  };

  it('sends a newly added value to the first output', async () => {
    const fx = setup();
    fx.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
      success: true,
      data: { id: 'val-1', value: 'ORD-1' },
    });

    await expect(executeAddToUniq.call(fx, 0)).resolves.toEqual({
      result: { id: 'val-1', value: 'ORD-1' },
      outputIndex: 0,
    });
  });

  it('sends a duplicate value to the second output with the existing record', async () => {
    const fx = setup();
    fx.helpers.httpRequestWithAuthentication.mockRejectedValueOnce(
      Object.assign(new Error('request failed'), {
        httpCode: '409',
        context: {
          data: {
            success: false,
            error: 'Value "ORD-1" already exists',
            code: 'DUPLICATE_VALUE',
            data: { existingValue: { id: 'val-0', value: 'ORD-1' } },
          },
        },
      })
    );

    await expect(executeAddToUniq.call(fx, 0)).resolves.toEqual({
      result: { id: 'val-0', value: 'ORD-1' },
      outputIndex: 1,
    });
  });
});

describe('executeAddToUniq with Continue on fail', () => {
  const setup = (value: string, metadata?: string) => {
    const fx = createMockExecuteFunctions({ getInputData: jest.fn(() => [{ json: {} }]) } as any);
    fx.getNodeParameter
      .mockReturnValueOnce('orders')
      .mockReturnValueOnce(value)
      .mockReturnValueOnce(metadata === undefined ? {} : { metadata });
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.continueOnFail.mockReturnValue(true);
    return fx;
  };

  it('turns an empty value into an error item on the second output instead of stopping', async () => {
    const fx = setup('   ');
    const result = await executeAddToUniq.call(fx, 0);
    expect(result.outputIndex).toBe(1);
    expect(result.result.error.message).toMatch(/Value is required/);
    expect(fx.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
  });

  it('rejects metadata that is not a JSON object before calling the server', async () => {
    const fx = setup('ORD-9', '{not json');
    const result = await executeAddToUniq.call(fx, 0);
    expect(result.outputIndex).toBe(1);
    expect(result.result.error.message).toMatch(/Metadata must be a JSON object/);
    expect(fx.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
  });
});
