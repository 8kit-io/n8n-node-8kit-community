// @ts-nocheck
import { executeCheckSetValues } from '../../nodes/EightKit/operations/checkSetValues';
import {
  createMockCredentials,
  createMockExecuteFunctions,
  createMockItem,
  expectSuccess,
  mockHttpResponses,
  testData,
} from '../setup';

describe('executeCheckSetValues', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = createMockExecuteFunctions();
  });

  describe('successful operations', () => {
    it('should check if value exists in set', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName) // setName
        .mockReturnValueOnce('single') // mode
        .mockReturnValueOnce('value') // valueField
        .mockReturnValueOnce('exists') // outputField
        .mockReturnValueOnce('all'); // filterMode

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockHttpResponses.setExists);

      // Act
      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate);

      // Assert
      expectSuccess(result);
      expect(result.exists).toBe(true);
      expect(result.checkedValue).toBe(testData.validValue);
      expect(result.operation).toBe('checkSetValues');
      expect(result.autoCreate).toBe(false);
    });

    it('should handle value not found in set', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockHttpResponses.setNotExists);

      // Act
      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate);

      // Assert
      expectSuccess(result);
      expect(result.exists).toBe(false);
      expect(result.checkedValue).toBe(testData.validValue);
    });

    it('should handle bulk mode', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = true;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce('bulk')
        .mockReturnValueOnce('values')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({
          values: [testData.validValue, 'value-2', 'value-3'],
        }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        success: true,
        data: {
          results: [
            { value: testData.validValue, exists: true },
            { value: 'value-2', exists: false },
            { value: 'value-3', exists: true },
          ],
        },
      });

      // Act
      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate);

      // Assert
      expectSuccess(result);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].exists).toBe(true);
      expect(result.results[1].exists).toBe(false);
      expect(result.autoCreate).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
        new Error('API Error: Set not found')
      );

      // Act & Assert
      await expect(
        executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate)
      ).rejects.toThrow('API Error: Set not found');
    });

    it('should handle missing required parameters', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('') // Empty setName
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      // Act & Assert
      await expect(
        executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate)
      ).rejects.toThrow('Set name is required');
    });

    it('should handle invalid set name format', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('invalid set name!') // Invalid characters
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      // Act & Assert
      await expect(
        executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate)
      ).rejects.toThrow('Set name can only contain letters, numbers, hyphens, and underscores');
    });
  });

  describe('parameter validation', () => {
    it('should validate set name length', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;
      const longSetName = 'a'.repeat(101); // 101 characters

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(longSetName)
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      // Act & Assert
      await expect(
        executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate)
      ).rejects.toThrow('Set name cannot exceed 100 characters');
    });

    it('should validate value length', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;
      const longValue = 'a'.repeat(256); // 256 characters

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('all');

      mockExecuteFunctions.getInputData.mockReturnValue([createMockItem({ value: longValue })]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      // Act & Assert
      await expect(
        executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate)
      ).rejects.toThrow('Value cannot exceed 255 characters');
    });
  });

  describe('filter modes', () => {
    it('should handle existing filter mode', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('existing');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockHttpResponses.setExists);

      // Act
      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate);

      // Assert
      expectSuccess(result);
      expect(result.exists).toBe(true);
    });

    it('should handle non-existing filter mode', async () => {
      // Arrange
      const itemIndex = 0;
      const autoCreate = false;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(testData.validSetName)
        .mockReturnValueOnce('single')
        .mockReturnValueOnce('value')
        .mockReturnValueOnce('exists')
        .mockReturnValueOnce('nonExisting');

      mockExecuteFunctions.getInputData.mockReturnValue([
        createMockItem({ value: testData.validValue }),
      ]);

      mockExecuteFunctions.getCredentials.mockResolvedValue(createMockCredentials({}));

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockHttpResponses.setNotExists);

      // Act
      const result = await executeCheckSetValues.call(mockExecuteFunctions, itemIndex, autoCreate);

      // Assert
      expectSuccess(result);
      expect(result.exists).toBe(false);
    });
  });
});
