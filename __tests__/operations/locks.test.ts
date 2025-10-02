import { executeAcquireLock } from '../../nodes/EightKit/operations/acquireLock';
import { executeReleaseLock } from '../../nodes/EightKit/operations/releaseLock';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('locks operations', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions({
      getInputData: jest.fn(() => [{ json: { testField: 'testValue' } }]),
    } as any);
  });

  it('should acquire a lock', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('job-1') // key
      .mockReturnValueOnce('test-workflow') // callingFn
      .mockReturnValueOnce(5000); // timeout

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: { key: 'job-1', acquired: true, timestamp: '2024-01-01T00:00:00Z' },
    });

    const result = await executeAcquireLock.call(fx, 0);
    expectSuccess(result);
    expect(result.result.testField).toBe('testValue'); // Verify input data is preserved
    expect(result.outputIndex).toBe(0); // 0 = yes (acquired)
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: expect.stringMatching(/\/api\/v1\/locks$/) })
    );
  });

  it('should release a lock', async () => {
    fx.getNodeParameter.mockReturnValueOnce('job-1'); // key

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: { key: 'job-1', released: true, timestamp: '2024-01-01T00:00:00Z' },
    });

    const result = await executeReleaseLock.call(fx, 0);
    expectSuccess(result);
    expect(result.released).toBe(true);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: expect.stringMatching(/\/api\/v1\/locks\/job-1$/),
      })
    );
  });
});
