import type { IExecuteFunctions } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export async function executeGetAppHealth(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);
  const response = await client.get<{
    success: boolean;
    data: {
      appId: string;
      appName: string;
      status: string;
      timestamp: string;
    };
  }>(`${baseUrl}/api/v1/apps/health`);

  if (!response.success) {
    throw new Error(`Failed to get app health: ${response.error || 'Unknown error'}`);
  }

  return response.data;
}
