import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CheckLockParams {
  key: string;
  includeLockData?: boolean;
  lockDataFieldName?: string;
}

export async function executeCheckLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = (this.getNodeParameter('key', itemIndex) as string).trim();
  const includeLockData = this.getNodeParameter('getLockData', itemIndex, false) as boolean;
  const lockDataFieldName = includeLockData
    ? (this.getNodeParameter('lockDataFieldName', itemIndex) as string)?.trim() || undefined
    : undefined;

  console.log('🔒 [8kit] Parameters:', {
    key,
    includeLockData,
    lockDataFieldName,
  });

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

    const outputJson: Record<string, any> = {
      ...inputData,
    };

    if (includeLockData && lockData.lockInfo) {
      const fieldName = (lockDataFieldName || '__lockData').trim();
      outputJson[fieldName || '__lockData'] = lockData.lockInfo;
    }

    // Return dual-date format
    return {
      result: outputJson,
      outputIndex: exists ? 0 : 1, // 0 = yes (exists), 1 = no (doesn't exist)
    };
  } catch (error: any) {
    console.log('🔒 [8kit] Error checking lock:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    return {
      result: {
        error: {
          status: error.status,
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      outputIndex: 1, // Route errors to "no" branch
    };
  }
}
