import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  buildUniqEndpoint,
  EightKitHttpClient,
  validateUniqName,
  validateValue,
} from '../utils/httpClient';

export interface CheckUniqValuesParams {
  name: string;
  value: string;
  includeUniqValueData: boolean;
  uniqValueDataFieldName?: string;
  createUniqIfMissing?: boolean;
}

export async function executeCheckUniqs(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  // Parameters (adapted to single-mode only)
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();
  const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as Record<string, any>;
  const includeUniqValueData = (additionalFields.getUniqValueData as boolean) || false;
  const uniqValueDataFieldName = includeUniqValueData
    ? (additionalFields.uniqValueDataFieldName as string)?.trim() || undefined
    : undefined;

  // Validate inputs
  validateUniqName(name, this.getNode(), itemIndex);

  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string) || '';
  if (!baseUrl) {
    throw new NodeOperationError(this.getNode(), 'Host URL is not configured in credentials', { itemIndex });
  }
  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  // Build endpoint
  const endpoint = buildUniqEndpoint(name, 'contains');
  const url = `${formattedBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    // Single mode only: validate value and perform check
    validateValue(value, this.getNode(), itemIndex);

    const response = await client.post<{ exists: boolean; value?: any }>(url, {
      value,
    });

    if (!response.success || !response.data) {
      throw new NodeOperationError(this.getNode(), response.error || 'API Error: Unknown', { itemIndex });
    }

    const exists = response.data.exists;

    const outputJson: Record<string, any> = {
      ...inputData,
    };

    if (includeUniqValueData) {
      const fieldName = (uniqValueDataFieldName || '__checkData').trim();
      outputJson[fieldName || '__checkData'] =
        response.data.value !== undefined ? response.data.value : response.data;
    }

    // Adapt to EightKit.node.ts router which expects { result, outputIndex }
    return {
      result: outputJson,
      outputIndex: exists ? 0 : 1,
    };
  } catch (error: any) {
    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    return {
      result: {
        error: {
          status: error.status,
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      outputIndex: 0,
    };
  }
}

// Note: legacy helper removed; logic handled inline for clarity per tests
