import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { beforeEach, expect, vi } from 'vitest';

// Provide a Jest-compatible API for Vitest
// Allows tests to use jest.fn/clearAllMocks with Vitest under the hood
// Do not remove: many specs call jest.fn directly
// @ts-expect-error - we intentionally attach to global
(globalThis as any).jest = vi;
// @ts-expect-error - we intentionally attach to global
(globalThis as any).expect = expect;

// Global test utilities
export const createMockExecuteFunctions = (
  overrides: Partial<IExecuteFunctions> = {}
): IExecuteFunctions => {
  return {
    getNodeParameter: jest.fn(),
    getInputData: jest.fn(),
    getCredentials: jest.fn(),
    continueOnFail: jest.fn(() => false),
    getNode: jest.fn(() => ({ name: 'TestNode' })),
    helpers: {
      httpRequest: jest.fn(),
    },
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    ...overrides,
  } as unknown as IExecuteFunctions;
};

export const createMockItem = (data: any): INodeExecutionData => ({
  json: data,
  binary: {},
  pairedItem: { item: 0, input: 0 },
});

export const createMockCredentials = (credentials: any) => ({
  hostUrl: 'https://api.example.com',
  apiKey: 'st_test_api_key_12345',
  ...credentials,
});

// Common test data
export const testData = {
  validSetName: 'test-set',
  validLookupName: 'test-lookup',
  validValue: 'test-value-123',
  validLeftValue: 'left-123',
  validRightValue: 'right-456',
  validSearchValue: 'search-789',
};

// Mock HTTP responses
export const mockHttpResponses = {
  success: {
    success: true,
    data: { result: 'success' },
  },
  setExists: {
    success: true,
    data: { exists: true },
  },
  setNotExists: {
    success: true,
    data: { exists: false },
  },
  lookupResult: {
    success: true,
    data: {
      results: [
        {
          left: 'left-123',
          right: 'right-456',
          leftMetadata: { name: 'Test Item' },
          rightMetadata: { id: '456' },
        },
      ],
      totalFound: 1,
    },
  },
  appInfo: {
    success: true,
    data: {
      id: 'app-123',
      name: 'Test App',
      description: 'Test application',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
  healthCheck: {
    success: true,
    data: {
      status: 'healthy',
      timestamp: '2024-01-01T10:00:00Z',
      version: '1.0.0',
    },
  },
  error: {
    success: false,
    error: 'Test error message',
    code: 'TEST_ERROR',
  },
};

// Common assertions
export const expectSuccess = (result: any) => {
  expect(result).toBeDefined();
  expect(typeof result).toBe('object');
};

export const expectError = (error: any, expectedMessage?: string) => {
  expect(error).toBeInstanceOf(Error);
  if (expectedMessage) {
    expect(error.message).toContain(expectedMessage);
  }
};

// Setup global test environment
beforeEach(() => {
  jest.clearAllMocks();
});
