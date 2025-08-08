import type { IExecuteFunctions } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface GetLastUpdatedParams {
  key: string;
}

export async function executeGetLastUpdated(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);
  const response = await client.get<{
    success: boolean;
    data: {
      id: string;
      key: string;
      description: string | null;
      date: string;
      createdAt: string;
      updatedAt: string;
    } | null;
  }>(`${baseUrl}/api/v1/last-updated/key/${encodeURIComponent(key)}`);

  if (!response.success) {
    throw new Error(`Failed to get last updated record: ${response.error || 'Unknown error'}`);
  }

  return response.data;
}
