import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CheckLockParams {
  key: string;
}

export async function executeCheckLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  // Get input data to preserve in output
  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;

  try {
    const response = await client.get<{
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
    }>(`${baseUrl}/api/v1/locks/${encodeURIComponent(key)}`);

    if (!response.success || !response.data) {
      throw new Error(`Failed to check lock: ${response.error || 'Unknown error'}`);
    }

    const lockData = response.data;
    const exists = lockData.exists;

    // Return dual-output format
    return {
      result: {
        ...inputData,
      },
      outputIndex: exists ? 0 : 1, // 0 = yes (exists), 1 = no (doesn't exist)
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.log('🔒 [8kit] Error checking lock:', message);

    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    return {
      result: { error: message },
      outputIndex: 1, // Route errors to "no" branch
    };
  }
}
