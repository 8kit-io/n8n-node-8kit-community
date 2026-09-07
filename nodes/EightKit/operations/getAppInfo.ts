import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { toNodeError } from '../utils/common';
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
      throw new NodeOperationError(
        this.getNode(),
        `Failed to get app info: ${response.error || 'Unknown error'}`,
        { itemIndex }
      );
    }

    return response.data;
  } catch (error: any) {
    if (error?.status === 404 || error?.code === 'NETWORK_ERROR') {
      error.message = `No 8kit server answered at ${baseUrl}. Check the Host URL in the credential (it should point at the 8kit service root, e.g. http://8kit:3000).`;
    }
    if (!this.continueOnFail()) {
      throw toNodeError(this.getNode(), error, itemIndex);
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
