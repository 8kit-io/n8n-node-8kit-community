import { executeListSets } from '../../nodes/EightKit/operations/listSets';
import { createMockCredentials, createMockExecuteFunctions, expectSuccess } from '../setup';

describe('executeListSets', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should list sets with default pagination', async () => {
    // Arrange
    fx.getNodeParameter.mockReturnValueOnce({}); // advancedSettings

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { items: [{ id: '1', name: 'a' }], pagination: { page: 1, limit: 10 } },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    // Act
    const result = await executeListSets.call(fx, 0);

    // Assert
    expectSuccess(result);
    expect(result.items).toHaveLength(1);
    // Called with default page/limit
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringMatching(/\/api\/v1\/sets\?page=1&limit=10$/),
      })
    );
  });

  it('should list sets with custom pagination', async () => {
    // Arrange
    fx.getNodeParameter.mockReturnValueOnce({
      pagination: { pagination: { page: 2, limit: 5, offset: 10 } },
    });

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));

    const apiResponse = {
      success: true,
      data: { items: [{ id: '1' }], pagination: { page: 2, limit: 5, offset: 10 } },
    };
    fx.helpers.httpRequest.mockResolvedValue(apiResponse);

    // Act
    const result = await executeListSets.call(fx, 0);

    // Assert
    expectSuccess(result);
    expect(fx.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/page=2&limit=5&offset=10$/),
      })
    );
  });
});
