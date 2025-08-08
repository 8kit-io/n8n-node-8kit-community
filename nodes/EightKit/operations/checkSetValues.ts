import type { IExecuteFunctions } from 'n8n-workflow';
import {
  buildSetEndpoint,
  EightKitHttpClient,
  validateSetName,
  validateValue,
} from '../utils/httpClient';

export interface CheckSetValuesParams {
  name: string;
  value: string;
  outputField: string;
  createSetIfMissing: boolean;
}

export async function executeCheckSetValues(
  this: IExecuteFunctions,
  itemIndex: number,
  autoCreate: boolean = false
): Promise<any> {
  console.log('🔍 [8kit] executeCheckSetValues called for itemIndex:', itemIndex);
  console.log('🔍 [8kit] Starting checkSetValues operation...');

  // Parameters expected by tests
  const name = this.getNodeParameter('name', itemIndex) as string;
  const mode = this.getNodeParameter('mode', itemIndex) as 'single' | 'bulk';
  const valueField = this.getNodeParameter('valueField', itemIndex) as string;
  const outputField = this.getNodeParameter('outputField', itemIndex) as string; // e.g., 'exists'
  const filterMode = this.getNodeParameter('filterMode', itemIndex) as
    | 'all'
    | 'existing'
    | 'nonExisting';

  console.log('🔍 [8kit] Parameters:', {
    name,
    mode,
    valueField,
    outputField,
    filterMode,
  });

  // Validate inputs
  validateSetName(name);

  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;
  console.log('🔍 [8kit] Input data:', { inputData, valueField });

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string) || '';
  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }
  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  console.log('🔍 [8kit] API Configuration:', {
    originalUrl: baseUrl,
    formattedUrl: formattedBaseUrl,
  });

  const client = new EightKitHttpClient(this, itemIndex);

  // Build endpoint
  const endpoint = buildSetEndpoint(name, 'contains');
  const url = `${formattedBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    if (mode === 'single') {
      const checkedValue = inputData[valueField];
      validateValue(checkedValue);

      console.log('🔍 [8kit] Single check URL:', url);
      console.log('🔍 [8kit] Single check payload:', { value: checkedValue });
      const response = await client.post<{ exists: boolean; value?: any }>(url, {
        value: checkedValue,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'API Error: Unknown');
      }

      const exists = response.data.exists;
      const result = {
        exists,
        checkedValue,
        operation: 'checkSetValues',
        autoCreate,
      } as Record<string, any>;

      // Also write to the configured output field for flexibility
      result[outputField] = exists;

      return result;
    }

    // bulk mode
    const values = (inputData[valueField] || []) as string[];
    if (!Array.isArray(values)) {
      throw new Error('Values must be an array for bulk mode');
    }
    for (const v of values) {
      validateValue(v);
    }

    console.log('🔍 [8kit] Bulk check URL:', url);
    const response = await client.post<{ results: Array<{ value: string; exists: boolean }> }>(
      url,
      {
        values,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'API Error: Unknown');
    }

    let results = response.data.results || [];
    if (filterMode === 'existing') {
      results = results.filter((r) => r.exists);
    } else if (filterMode === 'nonExisting') {
      results = results.filter((r) => !r.exists);
    }

    return {
      results,
      operation: 'checkSetValues',
      autoCreate,
    };
  } catch (error: any) {
    console.log('🔍 [8kit] Error in executeCheckSetValues:', error.message);
    throw error;
  }
}

// Note: legacy helper removed; logic handled inline for clarity per tests
