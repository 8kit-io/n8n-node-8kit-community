import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CreateLastUpdatedParams {
  key: string;
  description?: string;
  date?: string;
}

export async function executeCreateLastUpdated(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const key = this.getNodeParameter('key', itemIndex) as string;
  const description = this.getNodeParameter('description', itemIndex, '') as string;
  const date =
    (this.getNodeParameter('date', itemIndex, null) as string | null) || new Date().toISOString();

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  const payload: any = {
    key,
  };

  if (description?.trim()) {
    payload.description = description.trim();
  }

  if (date?.trim()) {
    payload.date = date.trim();
  }

  try {
    const response = await client.post<{
      success: boolean;
      data: {
        id: string;
        key: string;
        description: string | null;
        date: string;
        createdAt: string;
        updatedAt: string;
      };
    }>(`${baseUrl}/api/v1/last-updated`, payload);

    if (!response.success) {
      throw new Error(`Failed to create last updated record: ${response.error || 'Unknown error'}`);
    }

    return response.data;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.log('⏰ [8kit] Error creating last updated record:', message);

    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    return { error: message };
  }
}
