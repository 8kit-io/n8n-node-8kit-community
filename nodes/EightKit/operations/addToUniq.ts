import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { checkUniqExists, toNodeError } from '../utils/common';
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

/**
 * Adds a value to a Uniq collection.
 * Output 0 ("Added") receives newly stored values; output 1 ("Duplicate") receives the
 * existing record when the value was already there, so workflows branch instead of failing.
 */
export async function executeAddToUniq(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<{ result: any; outputIndex: number }> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex) as {
    metadata?: any;
  };

  // Extract metadata from advanced settings
  const metadata = advancedSettings?.metadata;

  const fail = (message: string) => {
    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }
    return {
      result: { error: { status: 400, message, code: 'VALIDATION_ERROR' } },
      outputIndex: 1,
    };
  };

  // Validate inputs (with Continue on fail these become error items instead of stopping the run)
  try {
    validateUniqName(name, this.getNode(), itemIndex);
  } catch (error: any) {
    return fail(error.message);
  }
  if (!value) {
    return fail('Value is required and cannot be empty');
  }
  if (typeof value !== 'string') {
    return fail(`Value must be a string, got ${typeof value}`);
  }
  try {
    validateValue(value, this.getNode(), itemIndex);
  } catch (error: any) {
    return fail(error.message);
  }
  if (typeof metadata === 'string' && metadata.trim() !== '') {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return fail('Metadata must be a JSON object, e.g. {"source":"shopify"}');
      }
    } catch {
      return fail('Metadata must be a JSON object, e.g. {"source":"shopify"}');
    }
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
    // First, check if the uniq collection exists
    const uniqExists = await checkUniqExists(client, formattedBaseUrl, name);

    // If uniq collection doesn't exist, throw error
    if (!uniqExists) {
      throw new NodeOperationError(this.getNode(), `Uniq collection "${name}" not found.`, {
        itemIndex,
      });
    }

    // Add value to the Uniq collection
    const result = await addValueToUniq(
      client,
      formattedBaseUrl,
      name,
      value,
      metadata,
      this.getNode(),
      itemIndex
    );

    return { result: result.data, outputIndex: 0 };
  } catch (error: any) {
    if (error?.code === 'DUPLICATE_VALUE') {
      return { result: error.data?.existingValue ?? { value }, outputIndex: 1 };
    }

    if (!this.continueOnFail()) {
      throw toNodeError(this.getNode(), error, itemIndex);
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
      `Failed to add value to the Uniq collection: ${response.error || 'Unknown error'}`,
      { itemIndex }
    );
  }

  if (!response.data) {
    throw new NodeOperationError(
      node,
      'The 8kit server accepted the Uniq value but sent nothing back, so it may not have been saved - check the Uniq collection in the 8kit dashboard before retrying.',
      { itemIndex }
    );
  }

  return { success: true, data: response.data };
}
