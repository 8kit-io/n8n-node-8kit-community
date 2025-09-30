import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export async function executeGetAppInfo(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    const response = await client.get<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description?: string;
        createdAt: string;
        updatedAt: string;
      };
    }>(`${baseUrl}/api/v1/apps/me`);

    if (!response.success) {
      throw new Error(`Failed to get app info: ${response.error || 'Unknown error'}`);
    }

    return response.data;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.log('ℹ️ [8kit] Error getting app info:', message);

    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    return { error: message };
  }
}
