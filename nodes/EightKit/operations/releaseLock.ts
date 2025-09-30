import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface ReleaseLockParams {
  key: string;
}

export async function executeReleaseLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  try {
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
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.log('🔓 [8kit] Error releasing lock:', message);

    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    return { error: message };
  }
}
