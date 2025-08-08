import type { IExecuteFunctions } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface ReleaseLockParams {
  key: string;
}

export async function executeReleaseLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);
  const response = await client.delete<{
    success: boolean;
    message: string;
    data: {
      key: string;
      released: boolean;
      timestamp: string;
    };
  }>(`${baseUrl}/api/v1/locks/${encodeURIComponent(key)}`);

  if (!response.success) {
    throw new Error(`Failed to release lock: ${response.error || 'Unknown error'}`);
  }

  return response.data;
}
