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
  includeSetValueData: boolean;
  setValueDataFieldName?: string;
  createSetIfMissing?: boolean;
}

export async function executeCheckSetValues(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log('🔍 [8kit] executeCheckSetValues (Uniq) called for itemIndex:', itemIndex);
  console.log('🔍 [8kit] Starting Uniq check operation...');

  // Parameters (adapted to single-mode only)
  const name = this.getNodeParameter('name', itemIndex) as string;
  const value = this.getNodeParameter('value', itemIndex) as string;
  const includeSetValueData = this.getNodeParameter('getSetValueData', itemIndex, false) as boolean;
  const setValueDataFieldName = includeSetValueData
    ? (this.getNodeParameter('setValueDataFieldName', itemIndex) as string)
    : undefined;

  console.log('🔍 [8kit] Parameters (Uniq):', {
    name,
    value,
    includeSetValueData,
    setValueDataFieldName,
  });

  // Validate inputs
  validateSetName(name);

  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;
  console.log('🔍 [8kit] Input data:', { inputData, value });

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
    // Single mode only: validate value and perform check
    validateValue(value);

    console.log('🔍 [8kit] Single check URL:', url);
    console.log('🔍 [8kit] Single check payload:', { value });
    const response = await client.post<{ exists: boolean; value?: any }>(url, {
      value,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'API Error: Unknown');
    }

    const exists = response.data.exists;

    const outputJson: Record<string, any> = {
      ...inputData,
    };

    if (includeSetValueData) {
      const fieldName = (setValueDataFieldName || '__checkData').trim();
      outputJson[fieldName || '__checkData'] =
        response.data.value !== undefined ? response.data.value : response.data;
    }

    // Adapt to EightKit.node.ts router which expects { result, outputIndex }
    return {
      result: outputJson,
      outputIndex: exists ? 0 : 1,
    };
  } catch (error: any) {
    console.log('🔍 [8kit] Error in executeCheckSetValues (Uniq):', error.message);
    throw error;
  }
}

// Note: legacy helper removed; logic handled inline for clarity per tests
