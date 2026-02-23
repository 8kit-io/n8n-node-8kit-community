import type { IExecuteFunctions, INode } from 'n8n-workflow';
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

  // Validate inputs
  validateLookupName(lookupName, this.getNode(), itemIndex);
  validateUniqName(uniqName, this.getNode(), itemIndex);
  validateValue(value, this.getNode(), itemIndex);

  const _inputData: { [key: string]: any } = this.getInputData()[itemIndex].json;

  // Validate required values
  if (!leftValue) {
    throw new NodeOperationError(this.getNode(), 'Left value is required and cannot be empty', {
      itemIndex,
    });
  }
  if (!rightValue) {
    throw new NodeOperationError(this.getNode(), 'Right value is required and cannot be empty', {
      itemIndex,
    });
  }
  if (!value) {
    throw new NodeOperationError(this.getNode(), 'Value is required and cannot be empty', {
      itemIndex,
    });
  }

  // Validate value types
  if (typeof leftValue !== 'string') {
    throw new NodeOperationError(
      this.getNode(),
      `Left value must be a string, got ${typeof leftValue}`,
      { itemIndex }
    );
  }
  if (typeof rightValue !== 'string') {
    throw new NodeOperationError(
      this.getNode(),
      `Right value must be a string, got ${typeof rightValue}`,
      { itemIndex }
    );
  }
  if (typeof value !== 'string') {
    throw new NodeOperationError(this.getNode(), `Value must be a string, got ${typeof value}`, {
      itemIndex,
    });
  }

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new NodeOperationError(this.getNode(), 'Host URL is not configured in credentials', {
      itemIndex,
    });
  }

  // Ensure baseUrl is properly formatted
  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash if present

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    // First, check if both lookup and uniq collection exist
    const [lookupExists, uniqExists] = await Promise.all([
      checkLookupExists(client, formattedBaseUrl, lookupName),
      checkUniqExists(client, formattedBaseUrl, uniqName),
    ]);

    // If lookup doesn't exist, throw error
    if (!lookupExists) {
      throw new NodeOperationError(this.getNode(), `Lookup "${lookupName}" not found.`, {
        itemIndex,
      });
    }

    // If uniq collection doesn't exist, throw error
    if (!uniqExists) {
      throw new NodeOperationError(this.getNode(), `Uniq collection "${uniqName}" not found.`, {
        itemIndex,
      });
    }

    // Perform both operations
    const [lookupResult, uniqResult] = await Promise.all([
      addValueToLookup(
        client,
        formattedBaseUrl,
        lookupName,
        leftValue,
        rightValue,
        this.getNode(),
        itemIndex
      ),
      addValueToUniq(
        client,
        formattedBaseUrl,
        uniqName,
        value,
        metadata,
        this.getNode(),
        itemIndex
      ),
    ]);

    const result: CompleteLookupUniqResult = {
      success: true,
      lookupResult: lookupResult.data,
      uniqResult: uniqResult.data,
    };

    // Return the combined result
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

async function addValueToLookup(
  client: EightKitHttpClient,
  baseUrl: string,
  name: string,
  left: string,
  right: string,
  node: INode,
  itemIndex: number
): Promise<{ success: boolean; data: AddLookupValueResult }> {
  const endpoint = buildLookupEndpoint(name, 'values');
  const url = `${baseUrl}${endpoint}`;

  const payload = { left, right };

  const response = await client.post<AddLookupValueResult>(url, payload);

  if (!response.success) {
    throw new NodeOperationError(
      node,
      `Failed to add value pair to lookup: ${response.error || 'Unknown error'}`,
      { itemIndex }
    );
  }

  if (!response.data) {
    throw new NodeOperationError(node, 'Add lookup value response missing data field', {
      itemIndex,
    });
  }

  return { success: true, data: response.data };
}

async function addValueToUniq(
  client: EightKitHttpClient,
  baseUrl: string,
  name: string,
  value: string,
  metadata: any,
  node: INode,
  itemIndex: number
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
      } catch (_error: any) {
        payload.metadata = metadata;
      }
    } else {
      payload.metadata = metadata;
    }
  }

  const response = await client.post<AddUniqValueResult>(url, payload);

  if (!response.success) {
    throw new NodeOperationError(
      node,
      `Failed to add value to Uniq collection: ${response.error || 'Unknown error'}`,
      { itemIndex }
    );
  }

  if (!response.data) {
    throw new NodeOperationError(node, 'Add Uniq value response missing data field', { itemIndex });
  }

  return { success: true, data: response.data };
}
