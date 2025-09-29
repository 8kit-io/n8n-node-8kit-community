import type { IExecuteFunctions } from 'n8n-workflow';
import { checkSetExists } from '../utils/common';
import {
  buildSetEndpoint,
  EightKitHttpClient,
  validateSetName,
  validateValue,
} from '../utils/httpClient';

export interface AddToSetParams {
  name: string;
  value: string;
  advancedSettings?: {
    metadata?: any;
  };
  createSetIfMissing: boolean;
}

interface AddSetValueResult {
  id: string;
  setId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export async function executeAddToSet(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  console.log('➕ [8kit] executeAddToSet (Uniq) called for itemIndex:', itemIndex);
  console.log('➕ [8kit] Starting Uniq add operation...');

  const name = this.getNodeParameter('name', itemIndex) as string;
  const value = this.getNodeParameter('value', itemIndex) as string;
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex) as {
    metadata?: any;
  };

  // Extract metadata from advanced settings
  const metadata = advancedSettings?.metadata;

  console.log('➕ [8kit] Parameters:', {
    name,
    value,
    metadata,
  });

  // Validate inputs
  validateSetName(name);

  const inputData: { [key: string]: any } = this.getInputData()[itemIndex].json;

  console.log('➕ [8kit] Input data:', { inputData, value, metadata });

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

  console.log('➕ [8kit] API Configuration:', {
    originalUrl: baseUrl,
    formattedUrl: formattedBaseUrl,
  });

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    // First, check if the set exists
    const setExists = await checkSetExists(client, formattedBaseUrl, name);
    console.log('➕ [8kit] Uniq collection exists:', setExists);

    // If set doesn't exist, throw error
    if (!setExists) {
      throw new Error(`Uniq collection "${name}" not found.`);
    }

    // Add value to the Uniq collection
    const result = await addValueToSet(client, formattedBaseUrl, name, value, metadata);
    console.log('➕ [8kit] Value added to Uniq collection:', result);

    // Return the enriched input data with operation result
    return result;
  } catch (error: any) {
    console.log('➕ [8kit] Error in executeAddToSet (Uniq):', error.message);

    // Return the input data with error information
    throw error.message;
  }
}

async function addValueToSet(
  client: EightKitHttpClient,
  baseUrl: string,
  name: string,
  value: string,
  metadata?: any
): Promise<{ success: boolean; data: AddSetValueResult }> {
  const endpoint = buildSetEndpoint(name, 'values');
  const url = `${baseUrl}${endpoint}`;

  console.log('➕ [8kit] Adding value to Uniq collection:', url);

  const payload: { value: string; metadata?: any } = { value };

  // Add metadata if provided
  if (metadata !== undefined && metadata !== null && metadata !== '') {
    // If metadata is a string, try to parse it as JSON
    if (typeof metadata === 'string') {
      try {
        payload.metadata = JSON.parse(metadata);
      } catch (error: any) {
        console.log(
          '➕ [8kit] Warning: Could not parse metadata as JSON, using as string:',
          metadata,
          error
        );
        payload.metadata = metadata;
      }
    } else {
      payload.metadata = metadata;
    }
  }

  console.log('➕ [8kit] Add Uniq value payload:', payload);

  const response = await client.post<AddSetValueResult>(url, payload);

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
