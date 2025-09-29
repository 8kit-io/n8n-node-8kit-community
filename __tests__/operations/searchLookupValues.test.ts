import { executeSearchLookupValues } from '../../nodes/EightKit/operations/searchLookupValues';
import { createMockCredentials, createMockExecuteFunctions } from '../setup';

describe('executeSearchLookupValues', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = createMockExecuteFunctions();
    mockExecuteFunctions.getCredentials.mockResolvedValue(
      createMockCredentials({ hostUrl: 'https://api.example.com', apiKey: 'test-key' })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should search lookup values with general search', async () => {
    const mockResponse = {
      success: true,
      data: [
        { id: 1, left: 'user123', right: 'external456', createdAt: '2023-01-01' },
        { id: 2, left: 'user789', right: 'external123', createdAt: '2023-01-02' },
      ],
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('test-lookup') // name
      .mockReturnValueOnce('search') // searchType
      .mockReturnValueOnce('123'); // searchValue

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeSearchLookupValues.call(mockExecuteFunctions, 0);

    expect(result).toEqual({
      success: true,
      searchType: 'search',
      searchValue: '123',
      lookupName: 'test-lookup',
      results: mockResponse.data,
      count: 2,
    });

    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/lookups/test-lookup/search?search=123',
      })
    );
  });

  it('should search lookup values with left value exact match', async () => {
    const mockResponse = {
      success: true,
      data: [{ id: 1, left: 'user123', right: 'external456', createdAt: '2023-01-01' }],
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('test-lookup') // name
      .mockReturnValueOnce('left') // searchType
      .mockReturnValueOnce('user123'); // searchValue

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeSearchLookupValues.call(mockExecuteFunctions, 0);

    expect(result).toEqual({
      success: true,
      searchType: 'left',
      searchValue: 'user123',
      lookupName: 'test-lookup',
      results: mockResponse.data,
      count: 1,
    });

    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/lookups/test-lookup/search?left=user123',
      })
    );
  });

  it('should search lookup values with right value exact match', async () => {
    const mockResponse = {
      success: true,
      data: [{ id: 1, left: 'user123', right: 'external456', createdAt: '2023-01-01' }],
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('test-lookup') // name
      .mockReturnValueOnce('right') // searchType
      .mockReturnValueOnce('external456'); // searchValue

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeSearchLookupValues.call(mockExecuteFunctions, 0);

    expect(result).toEqual({
      success: true,
      searchType: 'right',
      searchValue: 'external456',
      lookupName: 'test-lookup',
      results: mockResponse.data,
      count: 1,
    });

    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.example.com/api/v1/lookups/test-lookup/search?right=external456',
      })
    );
  });

  it('should throw error when lookup name is missing', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('') // name (empty)
      .mockReturnValueOnce('search') // searchType
      .mockReturnValueOnce('123'); // searchValue

    await expect(executeSearchLookupValues.call(mockExecuteFunctions, 0)).rejects.toThrow(
      'Lookup name is required'
    );
  });

  it('should throw error when search value is missing', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('test-lookup') // name
      .mockReturnValueOnce('search') // searchType
      .mockReturnValueOnce(''); // searchValue (empty)

    await expect(executeSearchLookupValues.call(mockExecuteFunctions, 0)).rejects.toThrow(
      'Search value is required'
    );
  });

  it('should handle API errors gracefully', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('test-lookup') // name
      .mockReturnValueOnce('search') // searchType
      .mockReturnValueOnce('123'); // searchValue

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      success: false,
      error: 'Lookup not found',
    });

    await expect(executeSearchLookupValues.call(mockExecuteFunctions, 0)).rejects.toThrow(
      'Failed to search lookup values: Lookup not found'
    );
  });
});
