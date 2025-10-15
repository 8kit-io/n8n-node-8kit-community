import { executeCreateUniqCollection } from '../../nodes/EightKit/operations/createUniqCollection';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeCreateUniqCollection', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('creates a uniq collection with metadata', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('processed-users')
      .mockReturnValueOnce('Users we have processed');
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    fx.helpers.httpRequest.mockResolvedValue({
      success: true,
      data: {
        id: 'uniq-1',
        name: 'processed-users',
        description: 'Users we have processed',
      },
    });

    const result = await executeCreateUniqCollection.call(fx, 0);

    expectSuccess(result);
    expect(result.name).toBe('processed-users');
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.example.com/api/v1/uniqs',
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

    fx.helpers.httpRequest.mockResolvedValue({ success: false, error: 'Uniq collection exists' });

    await expect(executeCreateUniqCollection.call(fx, 0)).rejects.toThrow(
      'Failed to create Uniq collection: Uniq collection exists'
    );
  });
});
