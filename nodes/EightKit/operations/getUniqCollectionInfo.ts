import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { toNodeError } from '../utils/common';
import { buildUniqEndpoint, EightKitHttpClient } from '../utils/httpClient';

export async function executeGetUniqCollectionInfo(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();

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
    const endpoint = buildUniqEndpoint(name);
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new NodeOperationError(
        this.getNode(),
        `Failed to get Uniq collection info: ${response.error || 'Unknown error'}`,
        { itemIndex }
      );
    }

    return response.data;
  } catch (error: any) {
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
