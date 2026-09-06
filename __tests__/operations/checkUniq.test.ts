// @ts-nocheck
import { executeCheckUniqs } from '../../nodes/EightKit/operations/checkUniq';
import {
  createMockCredentials,
  createMockExecuteFunctions,
  createMockItem,
  expectSuccess,
  testData,
} from '../setup';

describe('executeCheckUniqs', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = createMockExecuteFunctions();
  });

  describe('successful operations', () => {
    it('returns the original input when value exists', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validUniqName) // name
        .mockReturnValueOnce(testData.validValue) // value
        .mockReturnValueOnce({}); // additionalFields (empty = defaults)

      const originalItem = createMockItem({ value: testData.validValue, tag: 'original' });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: { exists: true },
      });

      const result = await executeCheckUniqs.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(0);
      expect(result.result).toEqual(originalItem.json);
    });

    it('routes to the non-existing output when value is absent', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validUniqName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({}); // additionalFields (empty = defaults)

      const originalItem = createMockItem({
        value: testData.validValue,
        note: 'should be missing',
      });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: { exists: false },
      });

      const result = await executeCheckUniqs.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(1);
      expect(result.result).toEqual(originalItem.json);
    });

    it('includes uniq value data when requested', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validUniqName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({ getUniqValueData: true, uniqValueDataFieldName: 'uniqInfo' }); // additionalFields

      const originalItem = createMockItem({ value: testData.validValue });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {
          exists: true,
          value: {
            id: 'value-123',
            metadata: { source: 'test' },
          },
        },
      });

      const result = await executeCheckUniqs.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(0);
      expect(result.result).toEqual({
        value: testData.validValue,
        uniqInfo: {
          id: 'value-123',
          metadata: { source: 'test' },
        },
      });
    });

    it('falls back to default data field name when blank', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validUniqName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({ getUniqValueData: true, uniqValueDataFieldName: '   ' }); // additionalFields

      const originalItem = createMockItem({ value: testData.validValue });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
        success: true,
        data: {
          exists: true,
          value: { id: 'value-456' },
        },
      });

      const result = await executeCheckUniqs.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(0);
      expect(result.result).toEqual({
        value: testData.validValue,
        __checkData: { id: 'value-456' },
      });
    });
  });

  describe('error handling', () => {
    it('throws when the API request fails', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validUniqName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({}); // additionalFields

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(
        new Error('API Error: Uniq collection not found')
      );

      await expect(executeCheckUniqs.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'API Error: Uniq collection not found'
      );
    });

    it('validates presence of the uniq collection name', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('')
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({}); // additionalFields

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      await expect(executeCheckUniqs.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Uniq collection name is required and must be a string'
      );
    });

    it('validates allowed characters in the uniq collection name', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('invalid uniq name!')
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({}); // additionalFields

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      await expect(executeCheckUniqs.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Uniq collection name can only contain letters, numbers, hyphens, and underscores'
      );
    });
  });

  describe('parameter validation', () => {
    it('enforces the maximum uniq collection name length', async () => {
      const itemIndex = 0;
      const longUniqName = 'a'.repeat(101);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(longUniqName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce({}); // additionalFields

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      await expect(executeCheckUniqs.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Uniq collection name cannot exceed 100 characters'
      );
    });

    it('enforces the maximum value length', async () => {
      const itemIndex = 0;
      const longValue = 'a'.repeat(256);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validUniqName)
        .mockReturnValueOnce(longValue)
        .mockReturnValueOnce({}); // additionalFields

      mockExecuteFunctions.getInputData.mockReturnValue([createMockItem({ value: longValue })]);
      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      await expect(executeCheckUniqs.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Value cannot exceed 255 characters'
      );
    });
  });
});

describe('a failed item keeps its own data', () => {
  // The success path returns { ...inputData }. On error the item was replaced by a
  // bare { error }, so with "continue on fail" the workflow could not tell which
  // record had failed or route it anywhere useful.
  it('carries the input through when the call fails', async () => {
    const fx = createMockExecuteFunctions();
    fx.continueOnFail = jest.fn(() => true);
    fx.getNodeParameter
      .mockReturnValueOnce(testData.validUniqName)
      .mockReturnValueOnce(testData.validValue)
      .mockReturnValueOnce({});

    const originalItem = createMockItem({ value: testData.validValue, orderId: 'ORD-9' });
    fx.getInputData.mockReturnValue([originalItem]);
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.helpers.httpRequestWithAuthentication.mockRejectedValue(
      Object.assign(new Error('boom'), { httpCode: '500', context: { data: { error: 'boom' } } })
    );

    const result = await executeCheckUniqs.call(fx, 0);

    expect(result.result.orderId).toBe('ORD-9');
    expect(result.result.error).toBeDefined();
  });
});
