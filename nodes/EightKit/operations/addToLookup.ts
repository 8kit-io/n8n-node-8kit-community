import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { checkLookupExists, toNodeError } from '../utils/common';
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
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const leftValue = (this.getNodeParameter('leftValue', itemIndex) as string).trim();
  const rightValue = (this.getNodeParameter('rightValue', itemIndex) as string).trim();
  try {
    validateLookupName(name, this.getNode(), itemIndex);

    // Validate inputs

    const _inputData: { [key: string]: any } = this.getInputData()[itemIndex].json;

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

    // Validate the values
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

    // First, check if the lookup exists
    const lookupExists = await checkLookupExists(client, formattedBaseUrl, name);

    // If lookup doesn't exist, throw error
    if (!lookupExists) {
      throw new NodeOperationError(this.getNode(), `Lookup "${name}" not found.`, { itemIndex });
    }

    // Add value pair to the lookup
    const result = await addValueToLookup(
      client,
      formattedBaseUrl,
      name,
      leftValue,
      rightValue,
      this.getNode(),
      itemIndex
    );

    // Return the enriched input data with operation result
    return result;
  } catch (error: any) {
    if (!this.continueOnFail()) {
      throw toNodeError(this.getNode(), error, itemIndex);
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
    throw new NodeOperationError(
      node,
      'The 8kit server accepted the lookup mapping but sent nothing back, so it may not have been saved - check the lookup in the 8kit dashboard before retrying.',
      { itemIndex }
    );
  }

  return { success: true, data: response.data };
}
