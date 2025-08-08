import type { IExecuteFunctions } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CheckLockParams {
  key: string;
}

export async function executeCheckLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);
  const response = await client.get<{
    success: boolean;
    data: {
      key: string;
      exists: boolean;
      lockInfo: {
        key: string;
        callingFn: string;
        timestamp: string;
        timeoutSeconds: number;
        appId: string;
      } | null;
      timestamp: string;
    };
  }>(`${baseUrl}/api/v1/locks/${encodeURIComponent(key)}`);

  if (!response.success) {
    throw new Error(`Failed to check lock: ${response.error || 'Unknown error'}`);
  }

  return response.data;
}
