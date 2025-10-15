import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { checkLookupExists, checkUniqExists } from '../utils/common';
import {
  buildLookupEndpoint,
  buildUniqEndpoint,
  EightKitHttpClient,
  validateLookupName,
  validateUniqName,
  validateValue,
} from '../utils/httpClient';

export interface CompleteLookupUniqParams {
  lookupName: string;
  leftValue: string;
  rightValue: string;
  uniqName: string;
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

interface AddUniqValueResult {
  id: string;
  uniqId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

interface CompleteLookupUniqResult {
  success: boolean;
  lookupResult: AddLookupValueResult;
  uniqResult: AddUniqValueResult;
}

export async function executeCompleteLookupUniq(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log(
    '🔥 [8kit] executeCompleteLookupUniq (Lookup + Uniq) called for itemIndex:',
    itemIndex
  );
  console.log('🔥 [8kit] Starting combined lookup + Uniq operation...');

  const lookupName = (this.getNodeParameter('lookupName', itemIndex) as string).trim();
  const leftValue = (this.getNodeParameter('leftValue', itemIndex) as string).trim();
  const rightValue = (this.getNodeParameter('rightValue', itemIndex) as string).trim();
  const uniqName = (this.getNodeParameter('uniqName', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex) as {
    metadata?: any;
  };

  // Extract metadata from advanced settings
  const metadata = advancedSettings?.metadata;

  console.log('🔥 [8kit] Parameters:', {
    lookupName,
    leftValue,
    rightValue,
    uniqName,
    value,
    metadata,
  });

  // Validate inputs
  validateLookupName(lookupName);
  validateUniqName(uniqName);
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
    // First, check if both lookup and uniq collection exist
    const [lookupExists, uniqExists] = await Promise.all([
      checkLookupExists(client, formattedBaseUrl, lookupName),
      checkUniqExists(client, formattedBaseUrl, uniqName),
    ]);

    console.log('🔥 [8kit] Lookup exists:', lookupExists);
    console.log('🔥 [8kit] Uniq collection exists:', uniqExists);

    // If lookup doesn't exist, throw error
    if (!lookupExists) {
      throw new Error(`Lookup "${lookupName}" not found.`);
    }

    // If uniq collection doesn't exist, throw error
    if (!uniqExists) {
      throw new Error(`Uniq collection "${uniqName}" not found.`);
    }

    // Perform both operations
    const [lookupResult, uniqResult] = await Promise.all([
      addValueToLookup(client, formattedBaseUrl, lookupName, leftValue, rightValue),
      addValueToUniq(client, formattedBaseUrl, uniqName, value, metadata),
    ]);

    console.log('🔥 [8kit] Lookup operation result:', lookupResult);
    console.log('🔥 [8kit] Uniq operation result:', uniqResult);

    const result: CompleteLookupUniqResult = {
      success: true,
      lookupResult: lookupResult.data,
      uniqResult: uniqResult.data,
    };

    // Return the combined result
    return result;
  } catch (error: any) {
    console.log('🔥 [8kit] Error in executeCompleteLookupUniq (Lookup + Uniq):', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      console.log('🔥 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    console.log('🔥 [8kit] Continuing on fail, returning error as output');
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

async function addValueToUniq(
  client: EightKitHttpClient,
  baseUrl: string,
  name: string,
  value: string,
  metadata?: any
): Promise<{ success: boolean; data: AddUniqValueResult }> {
  const endpoint = buildUniqEndpoint(name, 'values');
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

  const response = await client.post<AddUniqValueResult>(url, payload);

  if (!response.success) {
    throw new Error(`Failed to add value to Uniq collection: ${response.error || 'Unknown error'}`);
  }

  if (!response.data) {
    throw new Error('Add Uniq value response missing data field');
  }

  return { success: true, data: response.data };
}
