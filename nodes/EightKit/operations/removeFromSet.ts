import type { IExecuteFunctions } from 'n8n-workflow';
import {
  buildSetEndpoint,
  EightKitHttpClient,
  validateSetName,
  validateValue,
} from '../utils/httpClient';

export async function executeRemoveFromSet(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log('🔍 [8kit] executeRemoveFromSet called for itemIndex:', itemIndex);

  const name = this.getNodeParameter('name', itemIndex) as string;
  const value = this.getNodeParameter('value', itemIndex) as string;

  console.log('🔍 [8kit] Parameters:', { name, value });

  // Validate inputs
  validateSetName(name);

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
  } catch (error) {
    console.error('🔍 [8kit] Error removing from set:', error);
    throw error;
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

  const endpoint = `${buildSetEndpoint(name)}/values/${encodeURIComponent(value)}`;
  const response = await client.delete(`${baseUrl}${endpoint}`);

  if (!response.success) {
    throw new Error(`Failed to remove value from set: ${response.error || 'Unknown error'}`);
  }

  console.log('🔍 [8kit] Value removed successfully:', response.data);
  return {
    ...inputData,
    removed: true,
    value,
    result: response.data,
  };
}
