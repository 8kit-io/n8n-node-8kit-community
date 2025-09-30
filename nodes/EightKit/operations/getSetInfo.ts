import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildSetEndpoint, EightKitHttpClient } from '../utils/httpClient';

export async function executeGetSetInfo(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  console.log('🔍 [8kit] executeGetSetInfo (Uniq collection) called for itemIndex:', itemIndex);

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
      throw new Error(`Failed to get Uniq collection info: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Uniq collection info retrieved successfully:', response.data);
    return response.data;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.error('🔍 [8kit] Error getting Uniq collection info:', message);

    if (!this.continueOnFail()) {
      console.log('🔍 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    console.log('🔍 [8kit] Continuing on fail, returning error as output');
    return { error: message };
  }
}
