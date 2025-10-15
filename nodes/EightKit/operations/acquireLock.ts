import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface AcquireLockParams {
  key: string;
  callingFn: string;
  timeout?: number;
  includeLockData?: boolean;
  lockDataFieldName?: string;
}

export async function executeAcquireLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = (this.getNodeParameter('key', itemIndex) as string).trim();
  const callingFn = (this.getNodeParameter('callingFn', itemIndex) as string).trim();
  const timeout = this.getNodeParameter('timeout', itemIndex, null) as number | null;
  const includeLockData = this.getNodeParameter('getLockData', itemIndex, false) as boolean;
  const lockDataFieldName = includeLockData
    ? (this.getNodeParameter('lockDataFieldName', itemIndex) as string)?.trim() || undefined
    : undefined;

  console.log('🔒 [8kit] Parameters:', {
    key,
    callingFn,
    timeout,
    includeLockData,
    lockDataFieldName,
  });

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  // Get input data to preserve in output
  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;

  const payload: any = {
    key,
    callingFn,
  };

  if (timeout !== null && timeout !== undefined) {
    payload.timeout = timeout;
  }

  try {
    const response = await client.post<{
      success: boolean;
      message: string;
      data: {
        key: string;
        callingFn: string;
        acquired: boolean;
        timestamp: string;
        timeout?: number;
      };
    }>(`${baseUrl}/api/v1/locks`, payload);

    if (!response.success) {
      throw new Error(`Failed to acquire lock: ${response.error || 'Unknown error'}`);
    }

    const outputJson: Record<string, any> = {
      ...inputData,
    };

    if (includeLockData) {
      const fieldName = (lockDataFieldName || '__lockData').trim();
      outputJson[fieldName || '__lockData'] = response.data;
    }

    // Return dual-date format - success goes to "yes" branch
    return {
      result: outputJson,
      outputIndex: 0, // 0 = yes (lock acquired)
    };
  } catch (error: any) {
    console.log('🔒 [8kit] Error acquiring lock:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    // Check if error is LOCK_CONFLICT
    const isLockConflict =
      error.code === 'LOCK_CONFLICT' || error.message?.includes('LOCK_CONFLICT');

    // If continueOnFail is false and not a LOCK_CONFLICT, throw error
    if (!this.continueOnFail() && !isLockConflict) {
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    const outputJson: Record<string, any> = {
      ...inputData,
      error: isLockConflict
        ? undefined
        : {
            status: error.status,
            message: error.message,
            code: error.code,
            details: error.details,
          },
    };

    // Include lock conflict data if requested
    if (includeLockData && isLockConflict && error.details?.lockInfo) {
      const fieldName = (lockDataFieldName || '__lockData').trim();
      outputJson[fieldName || '__lockData'] = error.details.lockInfo;
    }

    // Return dual-date format - lock conflict or error goes to "no" branch
    return {
      result: outputJson,
      outputIndex: 1, // 1 = no (lock not acquired)
    };
  }
}
