import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  buildUniqEndpoint,
  EightKitHttpClient,
  validateUniqName,
  validateValue,
} from '../utils/httpClient';

export async function executeRemoveFromUniqs(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();

  // Validate inputs
  validateUniqName(name, this.getNode(), itemIndex);

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
    client: EightKitHttpClient;
    baseUrl: string;
  },
  inputData: any
): Promise<any> {
  const { name, value, client, baseUrl } = params;

  validateValue(value, this.getNode(), _itemIndex);

  const endpoint = `${buildUniqEndpoint(name)}/values/${encodeURIComponent(value)}`;
  const response = await client.delete(`${baseUrl}${endpoint}`);

  if (!response.success) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to remove value from Uniq collection: ${response.error || 'Unknown error'}`,
      { itemIndex: _itemIndex }
    );
  }

  return {
    ...inputData,
    removed: true,
    value,
    result: response.data,
  };
}
