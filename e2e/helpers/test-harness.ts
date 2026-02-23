/**
 * E2E Test Harness — creates a real IExecuteFunctions that makes HTTP calls via fetch.
 *
 * Instead of mocking httpRequestWithAuthentication, we provide one that
 * actually calls the community backend running in Docker.
 */
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3333';
const API_KEY = process.env.E2E_API_KEY || 'st_XXXXXXXXXXXXXXXXXXXXX';

interface HarnessOptions {
  /** Node parameters keyed by name. Use arrays for sequential calls to getNodeParameter. */
  params: Record<string, any>;
  /** Input data items. Defaults to [{ json: {} }] */
  inputData?: INodeExecutionData[];
  /** Whether continueOnFail returns true */
  continueOnFail?: boolean;
  /** n8n workflow timezone */
  timezone?: string;
}

/**
 * Creates a real IExecuteFunctions where helpers.httpRequestWithAuthentication
 * makes actual HTTP requests via fetch to the E2E backend.
 */
export function createE2EExecuteFunctions(options: HarnessOptions): IExecuteFunctions {
  const {
    params,
    inputData = [{ json: {}, binary: {}, pairedItem: { item: 0, input: 0 } }],
    continueOnFail = false,
    timezone = 'UTC',
  } = options;

  // Track call counts per parameter name for sequential mock values
  const paramCallCounts: Record<string, number> = {};

  const getNodeParameter = (name: string, _itemIndex: number, fallback?: any): any => {
    if (!(name in params)) {
      return fallback;
    }
    const value = params[name];
    // Support array values for sequential calls (like the mock pattern)
    if (Array.isArray(value)) {
      const count = paramCallCounts[name] || 0;
      paramCallCounts[name] = count + 1;
      return count < value.length ? value[count] : fallback;
    }
    return value;
  };

  const httpRequestWithAuthentication = async (
    _credentialType: string,
    requestOptions: {
      method: string;
      url: string;
      body?: any;
      headers?: Record<string, string>;
      timeout?: number;
    },
  ): Promise<any> => {
    const { method, url, body, headers = {} } = requestOptions;

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
      ...headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      // Mimic n8n's error format when httpRequestWithAuthentication fails
      const error: any = new Error(responseData?.error || `HTTP ${response.status}`);
      error.response = {
        status: response.status,
        data: responseData,
      };
      error.code = responseData?.code;
      throw error;
    }

    return responseData;
  };

  return {
    getNodeParameter,
    getInputData: () => inputData,
    getCredentials: async () => ({
      hostUrl: BASE_URL,
      apiKey: API_KEY,
    }),
    continueOnFail: () => continueOnFail,
    getNode: () => ({ name: 'E2E-TestNode', type: 'n8n-nodes-8kit.eightKit', typeVersion: 1 }),
    getTimezone: () => timezone,
    helpers: {
      httpRequest: httpRequestWithAuthentication.bind(null, ''),
      httpRequestWithAuthentication,
    },
    logger: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {},
    },
  } as unknown as IExecuteFunctions;
}
