import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface ReleaseLockParams {
  key: string;
  includeLockData?: boolean;
  lockDataFieldName?: string;
}

export async function executeReleaseLock(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const key = (this.getNodeParameter('key', itemIndex) as string).trim();
  const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as Record<
    string,
    any
  >;
  const includeLockData = (additionalFields.getLockData as boolean) || false;
  const lockDataFieldName = includeLockData
    ? (additionalFields.lockDataFieldName as string)?.trim() || undefined
    : undefined;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  // Get input data to preserve in output
  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;

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
      throw new NodeOperationError(
        this.getNode(),
        `Failed to release lock: ${response.error || 'Unknown error'}`,
        { itemIndex }
      );
    }

    const outputJson: Record<string, any> = {
      ...inputData,
    };

    if (includeLockData) {
      const fieldName = (lockDataFieldName || '__lockData').trim();
      outputJson[fieldName || '__lockData'] = response.data;
    }

    return outputJson;
  } catch (error: any) {
    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    return {
      error: {
        status: error.status,
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
}
