import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { checkLookupExists } from '../utils/common';
import { buildLookupEndpoint, EightKitHttpClient, validateLookupName } from '../utils/httpClient';

export interface AddToLookupParams {
  name: string;
  leftValue: string;
  rightValue: string;
  createLookupIfMissing: boolean;
}

interface AddLookupValueResult {
  id: string;
  lookupId: string;
  left: string;
  right: string;
  createdAt: string;
  updatedAt: string;
}

export async function executeAddToLookup(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  console.log('🔗 [8kit] executeAddToLookup called for itemIndex:', itemIndex);
  console.log('🔗 [8kit] Starting addToLookup operation...');

  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const leftValue = (this.getNodeParameter('leftValue', itemIndex) as string).trim();
  const rightValue = (this.getNodeParameter('rightValue', itemIndex) as string).trim();

  console.log('🔗 [8kit] Parameters:', {
    name,
    leftValue,
    rightValue,
  });

  // Validate inputs
  validateLookupName(name);

  const inputData: { [key: string]: any } = this.getInputData()[itemIndex].json;

  console.log('🔗 [8kit] Input data:', { inputData, leftValue, rightValue });

  if (!leftValue) {
    throw new Error(`Left value is required and cannot be empty`);
  }

  if (!rightValue) {
    throw new Error(`Right value is required and cannot be empty`);
  }

  // Validate the values
  if (typeof leftValue !== 'string') {
    throw new Error(`Left value must be a string, got ${typeof leftValue}`);
  }
  if (typeof rightValue !== 'string') {
    throw new Error(`Right value must be a string, got ${typeof rightValue}`);
  }

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }

  // Ensure baseUrl is properly formatted
  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash if present

  console.log('🔗 [8kit] API Configuration:', {
    originalUrl: baseUrl,
    formattedUrl: formattedBaseUrl,
  });

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    // First, check if the lookup exists
    const lookupExists = await checkLookupExists(client, formattedBaseUrl, name);
    console.log('🔗 [8kit] Lookup exists:', lookupExists);

    // If lookup doesn't exist, throw error
    if (!lookupExists) {
      throw new Error(`Lookup "${name}" not found.`);
    }

    // Add value pair to the lookup
    const result = await addValueToLookup(client, formattedBaseUrl, name, leftValue, rightValue);
    console.log('🔗 [8kit] Value pair added to lookup:', result);

    // Return the enriched input data with operation result
    return result;
  } catch (error: any) {
    console.log('🔗 [8kit] Error in executeAddToLookup:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      console.log('🔗 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    console.log('🔗 [8kit] Continuing on fail, returning error as output');
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

  console.log('🔗 [8kit] Adding value pair to lookup:', url);

  const payload = { left, right };

  console.log('🔗 [8kit] Add value pair payload:', payload);

  const response = await client.post<AddLookupValueResult>(url, payload);

  if (!response.success) {
    throw new Error(`Failed to add value pair to lookup: ${response.error || 'Unknown error'}`);
  }

  if (!response.data) {
    throw new Error('Add value pair response missing data field');
  }

  return { success: true, data: response.data };
}
