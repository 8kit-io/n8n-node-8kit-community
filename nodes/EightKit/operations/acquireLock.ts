import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface AcquireLockParams {
  key: string;
  callingFn: string;
  timeout?: number;
}

export async function executeAcquireLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;
  const callingFn = this.getNodeParameter('callingFn', itemIndex) as string;
  const timeout = this.getNodeParameter('timeout', itemIndex, null) as number | null;

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

    // Return dual-output format - success goes to "yes" branch
    return {
      result: {
        ...inputData,
      },
      outputIndex: 0, // 0 = yes (lock acquired)
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.log('🔒 [8kit] Error acquiring lock:', message);

    // Check if error is LOCK_CONFLICT
    const isLockConflict = message.includes('LOCK_CONFLICT');

    // If continueOnFail is false and not a LOCK_CONFLICT, throw error
    if (!this.continueOnFail() && !isLockConflict) {
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    // Return dual-output format - lock conflict or error goes to "no" branch
    return {
      result: {
        ...inputData,
        error: isLockConflict ? undefined : message,
      },
      outputIndex: 1, // 1 = no (lock not acquired)
    };
  }
}
