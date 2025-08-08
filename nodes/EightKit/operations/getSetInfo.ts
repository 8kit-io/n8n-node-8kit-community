import type { IExecuteFunctions } from 'n8n-workflow';
import { buildSetEndpoint, EightKitHttpClient } from '../utils/httpClient';

export async function executeGetSetInfo(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  console.log('🔍 [8kit] executeGetSetInfo called for itemIndex:', itemIndex);

  const name = this.getNodeParameter('name', itemIndex) as string;

  console.log('🔍 [8kit] Parameters:', { name });

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }

  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const client = new EightKitHttpClient(this, itemIndex);

  try {
    const endpoint = buildSetEndpoint(name);
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to get set info: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Set info retrieved successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('🔍 [8kit] Error getting set info:', error);
    throw error;
  }
}
