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
  console.log('🔍 [8kit] executeRemoveFromUniqs (Uniq) called for itemIndex:', itemIndex);

  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const value = (this.getNodeParameter('value', itemIndex) as string).trim();

  console.log('🔍 [8kit] Parameters (Uniq):', { name, value });

  // Validate inputs
  validateUniqName(name);

  const inputData = this.getInputData()[itemIndex].json;

  console.log('🔍 [8kit] Input data:', { inputData, value });

  if (!value) {
    throw new Error(`Value is required and cannot be empty`);
  }

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
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
    console.error('🔍 [8kit] Error removing from Uniq collection:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      console.log('🔍 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    console.log('🔍 [8kit] Continuing on fail, returning error as output');
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

  validateValue(value);

  const endpoint = `${buildUniqEndpoint(name)}/values/${encodeURIComponent(value)}`;
  const response = await client.delete(`${baseUrl}${endpoint}`);

  if (!response.success) {
    throw new Error(
      `Failed to remove value from Uniq collection: ${response.error || 'Unknown error'}`
    );
  }

  console.log('🔍 [8kit] Value removed from Uniq collection successfully:', response.data);
  return {
    ...inputData,
    removed: true,
    value,
    result: response.data,
  };
}
