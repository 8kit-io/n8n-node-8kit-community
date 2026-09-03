import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  buildLookupEndpoint,
  EightKitHttpClient,
  validateLookupName,
  validateValue,
} from '../utils/httpClient';

export async function executeRemoveFromLookup(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();
  const removeBy =
    (this.getNodeParameter('removeBy', itemIndex, 'id') as 'id' | 'left' | 'right') || 'id';

  // Validate inputs
  validateLookupName(name, this.getNode(), itemIndex);

  const inputData = this.getInputData()[itemIndex].json;

  if (!value) {
    throw new NodeOperationError(this.getNode(), 'Value is required and cannot be empty', {
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

  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const client = new EightKitHttpClient(this, itemIndex);

  try {
    return await executeSingleRemove.call(
      this,
      itemIndex,
      {
        name,
        value,
        removeBy,
        client,
        baseUrl: formattedBaseUrl,
      },
      inputData
    );
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

async function executeSingleRemove(
  this: IExecuteFunctions,
  _itemIndex: number,
  params: {
    name: string;
    value: any;
    removeBy: 'id' | 'left' | 'right';
    client: EightKitHttpClient;
    baseUrl: string;
  },
  inputData: any
): Promise<any> {
  const { name, value, removeBy, client, baseUrl } = params;
  validateValue(value, this.getNode(), _itemIndex);

  if (removeBy !== 'id') {
    // Resolve the rows first; a left/right value can match several pairs
    const search = await client.get<any[]>(
      `${baseUrl}${buildLookupEndpoint(name)}/search?${removeBy}=${encodeURIComponent(value)}`
    );
    const rows: Array<{ id: string }> = Array.isArray(search.data) ? search.data : [];
    for (const row of rows) {
      await client.delete(
        `${baseUrl}${buildLookupEndpoint(name)}/values/${encodeURIComponent(row.id)}`
      );
    }
    return { ...inputData, removed: rows.length > 0, removedCount: rows.length, [removeBy]: value };
  }

  const endpoint = `${buildLookupEndpoint(name)}/values/${encodeURIComponent(value)}`;
  const response = await client.delete(`${baseUrl}${endpoint}`);

  if (!response.success) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to remove value from lookup: ${response.error || 'Unknown error'}`,
      { itemIndex: _itemIndex }
    );
  }

  return {
    ...inputData,
    removed: true,
    removedCount: 1,
    value,
    result: response.data,
  };
}
