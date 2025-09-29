import { executeCreateSet } from '../../nodes/EightKit/operations/createSet';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCreateSet', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('creates a set with metadata', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('processed-users')
      .mockReturnValueOnce('Users we have processed');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'set-1',
        name: 'processed-users',
        description: 'Users we have processed',
      },
    });

    const result = await executeCreateSet.call(fx, 0);

    expectSuccess(result);
    expect(result.name).toBe('processed-users');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.example.com/api/v1/sets',
        body: {
          name: 'processed-users',
          description: 'Users we have processed',
        },
      })
    );
  });

  it('throws when the API returns an error', async () => {
    fx.getNodeParameter.mockReturnValueOnce('processed-users').mockReturnValueOnce('');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Set exists' });

    await expect(executeCreateSet.call(fx, 0)).rejects.toThrow(
      'Failed to create Uniq collection: Set exists'
    );
  });
});
