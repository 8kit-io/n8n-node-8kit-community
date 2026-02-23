import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { checkUniqExists } from '../utils/common';
import {
  buildUniqEndpoint,
  EightKitHttpClient,
  validateUniqName,
  validateValue,
} from '../utils/httpClient';

export interface AddToUniqParams {
  name: string;
  value: string;
  advancedSettings?: {
    metadata?: any;
  };
  createUniqIfMissing: boolean;
}

interface AddUniqValueResult {
  id: string;
  uniqId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export async function executeAddToUniq(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex) as {
    metadata?: any;
  };

  // Extract metadata from advanced settings
  const metadata = advancedSettings?.metadata;

  // Validate inputs
  validateUniqName(name);

  const inputData: { [key: string]: any } = this.getInputData()[itemIndex].json;

  if (!value) {
    throw new Error(`Value is required and cannot be empty`);
  }

  // Validate the value
  if (typeof value !== 'string') {
    throw new Error(`Value must be a string, got ${typeof value}`);
  }
  validateValue(value);

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }

  // Ensure baseUrl is properly formatted
  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash if present

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    // First, check if the uniq collection exists
    const uniqExists = await checkUniqExists(client, formattedBaseUrl, name);

    // If uniq collection doesn't exist, throw error
    if (!uniqExists) {
      throw new Error(`Uniq collection "${name}" not found.`);
    }

    // Add value to the Uniq collection
    const result = await addValueToUniq(client, formattedBaseUrl, name, value, metadata);

    // Return the enriched input data with operation result
    return result;
  } catch (error: any) {
    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    return {
      error: {
        status: error.status,
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
}

async function addValueToUniq(
  client: EightKitHttpClient,
  baseUrl: string,
  name: string,
  value: string,
  metadata?: any
): Promise<{ success: boolean; data: AddUniqValueResult }> {
  const endpoint = buildUniqEndpoint(name, 'values');
  const url = `${baseUrl}${endpoint}`;

  const payload: { value: string; metadata?: any } = { value };

  // Add metadata if provided
  if (metadata !== undefined && metadata !== null && metadata !== '') {
    // If metadata is a string, try to parse it as JSON
    if (typeof metadata === 'string') {
      try {
        payload.metadata = JSON.parse(metadata);
      } catch (error: any) {
        payload.metadata = metadata;
      }
    } else {
      payload.metadata = metadata;
    }
  }

  const response = await client.post<AddUniqValueResult>(url, payload);

  if (!response.success) {
    throw new Error(
      `Failed to add value to the Uniq collection: ${response.error || 'Unknown error'}`
    );
  }

  if (!response.data) {
    throw new Error('Add Uniq value response missing data field');
  }

  return { success: true, data: response.data };
}
