import type { IExecuteFunctions } from 'n8n-workflow';
import { checkLookupExists, checkSetExists } from '../utils/common';
import {
  buildLookupEndpoint,
  buildSetEndpoint,
  EightKitHttpClient,
  validateLookupName,
  validateSetName,
  validateValue,
} from '../utils/httpClient';

export interface CompleteLookupSetParams {
  lookupName: string;
  leftValue: string;
  rightValue: string;
  setName: string;
  value: string;
  advancedSettings?: {
    metadata?: any;
  };
}

interface AddLookupValueResult {
  id: string;
  lookupId: string;
  left: string;
  right: string;
  createdAt: string;
  updatedAt: string;
}

interface AddSetValueResult {
  id: string;
  setId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

interface CompleteLookupSetResult {
  success: boolean;
  lookupResult: AddLookupValueResult;
  setResult: AddSetValueResult;
}

export async function executeCompleteLookupSet(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log(
    '🔥 [8kit] executeCompleteLookupSet (Lookup + Uniq) called for itemIndex:',
    itemIndex
  );
  console.log('🔥 [8kit] Starting combined lookup + Uniq operation...');

  const lookupName = this.getNodeParameter('lookupName', itemIndex) as string;
  const leftValue = this.getNodeParameter('leftValue', itemIndex) as string;
  const rightValue = this.getNodeParameter('rightValue', itemIndex) as string;
  const setName = this.getNodeParameter('setName', itemIndex) as string;
  const value = this.getNodeParameter('value', itemIndex) as string;
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex) as {
    metadata?: any;
  };

  // Extract metadata from advanced settings
  const metadata = advancedSettings?.metadata;

  console.log('🔥 [8kit] Parameters:', {
    lookupName,
    leftValue,
    rightValue,
    setName,
    value,
    metadata,
  });

  // Validate inputs
  validateLookupName(lookupName);
  validateSetName(setName);
  validateValue(value);

  const inputData: { [key: string]: any } = this.getInputData()[itemIndex].json;

  console.log('🔥 [8kit] Input data:', { inputData });

  // Validate required values
  if (!leftValue) {
    throw new Error('Left value is required and cannot be empty');
  }
  if (!rightValue) {
    throw new Error('Right value is required and cannot be empty');
  }
  if (!value) {
    throw new Error('Value is required and cannot be empty');
  }

  // Validate value types
  if (typeof leftValue !== 'string') {
    throw new Error(`Left value must be a string, got ${typeof leftValue}`);
  }
  if (typeof rightValue !== 'string') {
    throw new Error(`Right value must be a string, got ${typeof rightValue}`);
  }
  if (typeof value !== 'string') {
    throw new Error(`Value must be a string, got ${typeof value}`);
  }

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }

  // Ensure baseUrl is properly formatted
  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash if present

  console.log('🔥 [8kit] API Configuration:', {
    originalUrl: baseUrl,
    formattedUrl: formattedBaseUrl,
  });

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    // First, check if both lookup and set exist
    const [lookupExists, setExists] = await Promise.all([
      checkLookupExists(client, formattedBaseUrl, lookupName),
      checkSetExists(client, formattedBaseUrl, setName),
    ]);

    console.log('🔥 [8kit] Lookup exists:', lookupExists);
    console.log('🔥 [8kit] Uniq collection exists:', setExists);

    // If lookup doesn't exist, throw error
    if (!lookupExists) {
      throw new Error(`Lookup "${lookupName}" not found.`);
    }

    // If set doesn't exist, throw error
    if (!setExists) {
      throw new Error(`Uniq collection "${setName}" not found.`);
    }

    // Perform both operations
    const [lookupResult, setResult] = await Promise.all([
      addValueToLookup(client, formattedBaseUrl, lookupName, leftValue, rightValue),
      addValueToSet(client, formattedBaseUrl, setName, value, metadata),
    ]);

    console.log('🔥 [8kit] Lookup operation result:', lookupResult);
    console.log('🔥 [8kit] Uniq operation result:', setResult);

    const result: CompleteLookupSetResult = {
      success: true,
      lookupResult: lookupResult.data,
      setResult: setResult.data,
    };

    // Return the combined result
    return result;
  } catch (error: any) {
    console.log('🔥 [8kit] Error in executeCompleteLookupSet (Lookup + Uniq):', error.message);

    // Return the input data with error information
    throw error.message;
  }
}

async function addValueToLookup(
  client: EightKitHttpClient,
  baseUrl: string,
  name: string,
  left: string,
  right: string
): Promise<{ success: boolean; data: AddLookupValueResult }> {
  const endpoint = buildLookupEndpoint(name, 'values');
  const url = `${baseUrl}${endpoint}`;

  console.log('🔥 [8kit] Adding value pair to lookup:', url);

  const payload = { left, right };

  console.log('🔥 [8kit] Add lookup value payload:', payload);

  const response = await client.post<AddLookupValueResult>(url, payload);

  if (!response.success) {
    throw new Error(`Failed to add value pair to lookup: ${response.error || 'Unknown error'}`);
  }

  if (!response.data) {
    throw new Error('Add lookup value response missing data field');
  }

  return { success: true, data: response.data };
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

  console.log('🔥 [8kit] Adding value to Uniq collection:', url);

  const payload: { value: string; metadata?: any } = { value };

  // Add metadata if provided
  if (metadata !== undefined && metadata !== null && metadata !== '') {
    // If metadata is a string, try to parse it as JSON
    if (typeof metadata === 'string') {
      try {
        payload.metadata = JSON.parse(metadata);
      } catch (error: any) {
        console.log(
          '🔥 [8kit] Warning: Could not parse metadata as JSON, using as string:',
          metadata,
          error
        );
        payload.metadata = metadata;
      }
    } else {
      payload.metadata = metadata;
    }
  }

  console.log('🔥 [8kit] Add Uniq value payload:', payload);

  const response = await client.post<AddSetValueResult>(url, payload);

  if (!response.success) {
    throw new Error(`Failed to add value to Uniq collection: ${response.error || 'Unknown error'}`);
  }

  if (!response.data) {
    throw new Error('Add Uniq value response missing data field');
  }

  return { success: true, data: response.data };
}
