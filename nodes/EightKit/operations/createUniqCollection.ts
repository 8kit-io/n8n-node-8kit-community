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
  console.log(
    '🔍 [8kit] executeCreateUniqCollection (Uniq collection) called for itemIndex:',
    itemIndex
  );

  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const description = (
    (this.getNodeParameter('description', itemIndex, '') as string) || ''
  ).trim();

  console.log('🔍 [8kit] Parameters:', { name, description });

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
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
      throw new Error(`Failed to create Uniq collection: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Uniq collection created successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('🔍 [8kit] Error creating Uniq collection:', {
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
