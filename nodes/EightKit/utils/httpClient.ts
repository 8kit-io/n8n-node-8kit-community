import type { IExecuteFunctions } from 'n8n-workflow';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

export interface HttpClientOptions {
  timeout?: number;
  retryOnFailure?: number;
  retryDelay?: number;
}

export class EightKitHttpClient {
  constructor(
    private executeFunctions: IExecuteFunctions,
    _itemIndex: number,
    private options: HttpClientOptions = {}
  ) {}

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    console.log(
      `🔍 [Stratagems HTTP] ${method} ${endpoint}`,
      data ? `with data: ${JSON.stringify(data)}` : ''
    );

    const { timeout = 30000, retryOnFailure = 3, retryDelay = 1000 } = this.options;
    let lastError: any;

    for (let attempt = 0; attempt <= retryOnFailure; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔍 [Stratagems HTTP] Retry attempt ${attempt + 1}/${retryOnFailure + 1}`);
        }

        // Get credentials for API key
        const credentials = await this.executeFunctions.getCredentials('eightKitApi');
        const apiKey = credentials.apiKey as string;

        if (!apiKey) {
          console.log('🔍 [Stratagems HTTP] WARNING: No API key found in credentials!');
        } else {
          // Log masked API key for debugging (only show first 4 chars)
          const maskedKey = apiKey.length > 4 ? `${apiKey.substring(0, 4)}...` : '****';
          console.log(`🔍 [Stratagems HTTP] Using API Key: ${maskedKey}`);
        }

        const response = await this.executeFunctions.helpers.httpRequest({
          method,
          url: endpoint,
          body: data,
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey || '', // Add API key to headers
          },
        });

        console.log(`🔍 [Stratagems HTTP] Response status: ${response.status || 'N/A'}`);
        return response as ApiResponse<T>;
      } catch (error: any) {
        lastError = error;
        console.log(`🔍 [Stratagems HTTP] Error on attempt ${attempt + 1}:`, error.message);

        // Don't retry on client errors (4xx) except for rate limiting
        if (
          error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429
        ) {
          console.log(
            `🔍 [Stratagems HTTP] Client error (${error.response?.status}), not retrying`
          );
          throw this.formatError(error);
        }

        // Don't retry on last attempt
        if (attempt === retryOnFailure) {
          console.log(`🔍 [Stratagems HTTP] Max retries reached, giving up`);
          throw this.formatError(error);
        }

        // Wait before retrying
        console.log(`🔍 [Stratagems HTTP] Waiting ${retryDelay}ms before retry...`);
        await this.delay(retryDelay);
      }
    }

    throw this.formatError(lastError);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (Date.now() - start >= ms) {
          resolve();
        } else {
          // Use setImmediate for non-blocking delay
          setImmediate(check);
        }
      };
      check();
    });
  }

  private formatError(error: any): Error {
    console.log('🔍 [Stratagems HTTP] Formatting error:', error);

    if (error.response?.data) {
      const apiError = error.response.data;
      const errorMessage = `API Error (${error.response.status}): ${apiError.error || 'Unknown error'} - Code: ${apiError.code || 'UNKNOWN'}`;
      console.log('🔍 [Stratagems HTTP] Formatted API error:', errorMessage);
      return new Error(errorMessage);
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout - the server took too long to respond');
    }

    if (error.code === 'ENOTFOUND') {
      return new Error('Host not found - check your Host URL configuration');
    }

    if (error.code === 'ECONNREFUSED') {
      return new Error('Connection refused - check if the server is running');
    }

    if (error.message?.includes('Invalid URL')) {
      console.log('🔍 [Stratagems HTTP] Invalid URL error. URL details:', {
        error: error.message,
        url: error.config?.url || 'Unknown URL',
      });
      return new Error(`Invalid URL: ${error.config?.url || 'Unknown URL'} `);
    }

    const errorMessage = `Network error: ${error.message || 'Unknown error'} `;
    console.log('🔍 [Stratagems HTTP] Formatted network error:', errorMessage);
    return new Error(errorMessage);
  }

  // Helper methods for common operations
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    console.log(`🔍 [Stratagems HTTP] GET request to: ${endpoint}`);
    return this.request<T>('GET', endpoint);
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`🔍 [Stratagems HTTP] POST request to: ${endpoint}`);
    return this.request<T>('POST', endpoint, data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`🔍 [Stratagems HTTP] PUT request to: ${endpoint}`);
    return this.request<T>('PUT', endpoint, data);
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

// Utility functions for building endpoints
export function buildSetEndpoint(setName: string, operation?: string): string {
  console.log(
    `🔍 [Stratagems Endpoint] Building set endpoint for: "${setName}", operation: "${operation || 'none'}"`
  );

  if (!setName) {
    throw new Error('Set name is required to build endpoint');
  }

  const base = `/api/v1/sets/${encodeURIComponent(setName)}`;
  const endpoint = operation ? `${base}/${operation}` : base;

  console.log(`🔍 [Stratagems Endpoint] Built endpoint: "${endpoint}"`);
  return endpoint;
}

export function buildLookupEndpoint(lookupName: string, operation?: string): string {
  const base = `/api/v1/lookups/${encodeURIComponent(lookupName)}`;
  return operation ? `${base}/${operation}` : base;
}

export function buildAppEndpoint(operation?: string): string {
  const base = '/api/v1/apps';
  return operation ? `${base}/${operation}` : base;
}

// Utility functions for metadata handling
export function buildMetadata(
  item: any,
  includeTimestamp: boolean = true,
  additionalFields: string[] = []
): Record<string, any> {
  const metadata: Record<string, any> = {};

  if (includeTimestamp) {
    metadata.timestamp = new Date().toISOString();
  }

  for (const field of additionalFields) {
    if (item[field] !== undefined) {
      metadata[field] = item[field];
    }
  }

  return metadata;
}

// Utility functions for validation
export function validateSetName(name: string): void {
  console.log(`🔍 [Stratagems Validation] Validating set name: "${name}"`);

  if (!name || typeof name !== 'string') {
    throw new Error('Set name is required and must be a string');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Set name can only contain letters, numbers, hyphens, and underscores');
  }

  if (name.length > 100) {
    throw new Error('Set name cannot exceed 100 characters');
  }

  console.log(`🔍 [Stratagems Validation] Set name validation passed`);
}

export function validateLookupName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Lookup name is required and must be a string');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Lookup name can only contain letters, numbers, hyphens, and underscores');
  }

  if (name.length > 100) {
    throw new Error('Lookup name cannot exceed 100 characters');
  }
}

export function validateValue(value: string): void {
  console.log(`🔍 [Stratagems Validation] Validating value: "${value}"`);

  if (!value || typeof value !== 'string') {
    throw new Error('Value is required and must be a string');
  }

  if (value.length > 255) {
    throw new Error('Value cannot exceed 255 characters');
  }

  console.log(`🔍 [Stratagems Validation] Value validation passed`);
}
