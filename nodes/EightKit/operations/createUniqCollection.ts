import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CreateUniqCollectionParams {
  name: string;
  description?: string;
}

export async function executeCreateUniqCollection(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as Record<
    string,
    any
  >;
  const description = ((additionalFields.description as string) || '').trim();

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new NodeOperationError(this.getNode(), 'Host URL is not configured in credentials', {
      itemIndex,
    });
  }

  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const client = new EightKitHttpClient(this, itemIndex);

  try {
    const endpoint = '/api/v1/uniqs';
    const data = {
      name: name,
      description: description || undefined,
    };

    const response = await client.post(`${formattedBaseUrl}${endpoint}`, data);

    if (!response.success) {
      throw new NodeOperationError(
        this.getNode(),
        `Failed to create Uniq collection: ${response.error || 'Unknown error'}`,
        { itemIndex }
      );
    }

    return response.data;
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
