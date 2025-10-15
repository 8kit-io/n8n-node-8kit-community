import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildUniqEndpoint, EightKitHttpClient } from '../utils/httpClient';

export async function executeGetUniqCollectionInfo(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log(
    '🔍 [8kit] executeGetUniqCollectionInfo (Uniq collection) called for itemIndex:',
    itemIndex
  );

  const name = (this.getNodeParameter('name', itemIndex) as string).trim();

  console.log('🔍 [8kit] Parameters:', { name });

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }

  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const client = new EightKitHttpClient(this, itemIndex);

  try {
    const endpoint = buildUniqEndpoint(name);
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to get Uniq collection info: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Uniq collection info retrieved successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('🔍 [8kit] Error getting Uniq collection info:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      console.log('🔍 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    console.log('🔍 [8kit] Continuing on fail, returning error as output');
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
