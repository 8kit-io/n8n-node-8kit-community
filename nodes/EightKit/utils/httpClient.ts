import type { IExecuteFunctions } from 'n8n-workflow';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

export interface EightKitErrorData {
  status: number;
  message: string;
  code: string;
  details?: any;
}

export class EightKitError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly message: string;
  public readonly details: any;
  constructor(data: EightKitErrorData) {
    super(data.message);
    this.status = data.status;
    this.code = data.code;
    this.message = data.message;
    this.details = data.details
      ? formatErrors({ details: data.details }, { includeFieldPrefix: 'never' })
      : undefined;
  }
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
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    const { timeout = 30000, retryOnFailure = 3, retryDelay = 1000 } = this.options;
    let lastError: any;

    for (let attempt = 0; attempt <= retryOnFailure; attempt++) {
      try {
        // Get credentials for API key
        const credentials = await this.executeFunctions.getCredentials('eightKitApi');
        const apiKey = credentials.apiKey as string;

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

        return response as ApiResponse<T>;
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx) except for rate limiting
        if (
          error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429
        ) {
          throw this.formatError(error);
        }

        // Don't retry on last attempt
        if (attempt === retryOnFailure) {
          throw this.formatError(error);
        }

        // Wait before retrying
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

  private formatError(error: any): EightKitError {
    if (error.response?.data) {
      const apiError = error.response.data;
      const details = apiError.details;
      return new EightKitError({
        status: error.response.status || 500,
        message: apiError.error || 'Unknown error',
        code: apiError.code || 'UNKNOWN',
        details,
      });
    }

    if (error.code === 'ECONNABORTED') {
      return new EightKitError({
        status: 408,
        message: 'Request timeout - the server took too long to respond',
        code: 'TIMEOUT',
      });
    }

    if (error.code === 'ENOTFOUND') {
      return new EightKitError({
        status: 503,
        message: 'Host not found - check your Host URL configuration',
        code: 'HOST_NOT_FOUND',
      });
    }

    if (error.code === 'ECONNREFUSED') {
      return new EightKitError({
        status: 503,
        message: 'Connection refused - check if the server is running',
        code: 'CONNECTION_REFUSED',
      });
    }

    if (error.message?.includes('Invalid URL')) {
      return new EightKitError({
        status: 400,
        message: `Invalid URL: ${error.config?.url || 'Unknown URL'}`,
        code: 'INVALID_URL',
      });
    }

    const errorMessage = `Network error: ${error.message || 'Unknown error'}`;
    return new EightKitError({
      status: 500,
      message: errorMessage,
      code: 'NETWORK_ERROR',
    });
  }

  // Helper methods for common operations
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data);
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data);
  }
}

// Utility functions for building endpoints
export function buildUniqEndpoint(uniqName: string, operation?: string): string {
  if (!uniqName) {
    throw new Error('Uniq collection name is required to build endpoint');
  }

  const base = `/api/v1/uniqs/${encodeURIComponent(uniqName)}`;
  const endpoint = operation ? `${base}/${operation}` : base;

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
export function validateUniqName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Uniq collection name is required and must be a string');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      'Uniq collection name can only contain letters, numbers, hyphens, and underscores'
    );
  }

  if (name.length > 100) {
    throw new Error('Uniq collection name cannot exceed 100 characters');
  }
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
  if (!value || typeof value !== 'string') {
    throw new Error('Value is required and must be a string');
  }

  if (value.length > 255) {
    throw new Error('Value cannot exceed 255 characters');
  }
}

/**
 * Convert an API error payload into a list of user-friendly strings.
 *
 * @param {object} errorResponse - e.g. { details: [{ type, errors: [{ field, message }] }] }
 * @param {object} [opts]
 * @param {"auto"|"never"|"always"} [opts.includeFieldPrefix="auto"]
 *   - "auto": include the field only if the message doesn't already start with it
 *   - "never": never prefix with field
 *   - "always": always prefix with field (if present)
 * @param {string} [opts.defaultMessage="Something went wrong. Please try again."]
 *   - Returned as a single-item array when there are no details
 * @returns {string[]} e.g. ["Invalid email or password.", "Password must be at least 8 characters"]
 */
function formatErrors(
  errorResponse: any,
  opts: {
    includeFieldPrefix?: string;
    defaultMessage?: string;
  } = {}
) {
  const {
    includeFieldPrefix = 'auto',
    defaultMessage = 'Something went wrong. Please try again.',
  } = opts;

  const details = errorResponse?.details;
  if (!Array.isArray(details) || details.length === 0) {
    return [defaultMessage];
  }

  const out = [];
  const seen = new Set();

  for (const d of details) {
    const errs = Array.isArray(d?.errors) ? d.errors : [];
    for (const e of errs) {
      const msg = typeof e?.message === 'string' ? e.message.trim() : '';
      if (!msg) continue;

      const fieldPretty = e?.field ? prettifyField(e.field) : '';
      const startsWithField =
        fieldPretty && new RegExp(`^${escapeRegExp(fieldPretty)}\\b`, 'i').test(msg);

      let finalMsg = msg;

      if (fieldPretty) {
        if (includeFieldPrefix === 'always') {
          finalMsg = `${fieldPretty}: ${msg}`;
        } else if (includeFieldPrefix === 'auto' && !startsWithField) {
          finalMsg = `${fieldPretty}: ${msg}`;
        } // "never" → leave msg as-is
      }

      if (!seen.has(finalMsg)) {
        seen.add(finalMsg);
        out.push(finalMsg);
      }
    }
  }

  return out.length ? out : [defaultMessage];

  function prettifyField(s: string) {
    const spaced = String(s)
      .replace(/\[|\]/g, '')
      .replace(/[_.]/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
  function escapeRegExp(x: string) {
    return String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
