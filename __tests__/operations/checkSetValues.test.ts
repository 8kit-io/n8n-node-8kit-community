// @ts-nocheck
import { executeCheckSetValues } from '../../nodes/EightKit/operations/checkSetValues';
import {
  createMockCredentials,
  createMockExecuteFunctions,
  createMockItem,
  expectSuccess,
  testData,
} from '../setup';

describe('executeCheckSetValues', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = createMockExecuteFunctions();
  });

  describe('successful operations', () => {
    it('returns the original input when value exists', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName) // name
        .mockReturnValueOnce(testData.validValue) // value
        .mockReturnValueOnce(false); // getSetValueData

      const originalItem = createMockItem({ value: testData.validValue, tag: 'original' });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        success: true,
        data: { exists: true },
      });

      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(0);
      expect(result.result).toEqual(originalItem.json);
    });

    it('routes to the non-existing output when value is absent', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(false);

      const originalItem = createMockItem({
        value: testData.validValue,
        note: 'should be missing',
      });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        success: true,
        data: { exists: false },
      });

      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(1);
      expect(result.result).toEqual(originalItem.json);
    });

    it('includes set value data when requested', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('setInfo');

      const originalItem = createMockItem({ value: testData.validValue });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        success: true,
        data: {
          exists: true,
          value: {
            id: 'value-123',
            metadata: { source: 'test' },
          },
        },
      });

      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex);

      expectSuccess(result);
      expect(result.outputIndex).toBe(0);
      expect(result.result).toEqual({
        value: testData.validValue,
        setInfo: {
          id: 'value-123',
          metadata: { source: 'test' },
        },
      });
    });

    it('falls back to default data field name when blank', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('   ');

      const originalItem = createMockItem({ value: testData.validValue });
      mockExecuteFunctions.getInputData.mockReturnValue([originalItem]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        success: true,
        data: {
          exists: true,
          value: { id: 'value-456' },
        },
      });

      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex);

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
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
        new Error('API Error: Set not found')
      );

      await expect(executeCheckSetValues.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'API Error: Set not found'
      );
    });

    it('validates presence of the set name', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('')
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      await expect(executeCheckSetValues.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Uniq collection name is required and must be a string'
      );
    });

    it('validates allowed characters in the set name', async () => {
      const itemIndex = 0;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('invalid set name!')
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      await expect(executeCheckSetValues.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Uniq collection name can only contain letters, numbers, hyphens, and underscores'
      );
    });
  });

  describe('parameter validation', () => {
    it('enforces the maximum set name length', async () => {
      const itemIndex = 0;
      const longSetName = 'a'.repeat(101);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(longSetName)
        .mockReturnValueOnce(testData.validValue)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      await expect(executeCheckSetValues.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Uniq collection name cannot exceed 100 characters'
      );
    });

    it('enforces the maximum value length', async () => {
      const itemIndex = 0;
      const longValue = 'a'.repeat(256);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce(longValue)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.getInputData.mockReturnValue([createMockItem({ value: longValue })]);
      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      await expect(executeCheckSetValues.call(mockExecuteFunctions, itemIndex)).rejects.toThrow(
        'Value cannot exceed 255 characters'
      );
    });
  });
});
