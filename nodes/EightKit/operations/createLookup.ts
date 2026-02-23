import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CreateLookupParams {
  name: string;
  description?: string;
  leftSystem?: string;
  rightSystem?: string;
  allowLeftDups?: boolean;
  allowRightDups?: boolean;
  allowLeftRightDups?: boolean;
  strictChecking?: boolean;
}

export async function executeCreateLookup(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const description = (
    (this.getNodeParameter('description', itemIndex, '') as string) || ''
  ).trim();
  const leftSystem = ((this.getNodeParameter('leftSystem', itemIndex, '') as string) || '').trim();
  const rightSystem = (
    (this.getNodeParameter('rightSystem', itemIndex, '') as string) || ''
  ).trim();
  const allowLeftDups = this.getNodeParameter('allowLeftDups', itemIndex, true) as boolean;
  const allowRightDups = this.getNodeParameter('allowRightDups', itemIndex, true) as boolean;
  const allowLeftRightDups = this.getNodeParameter(
    'allowLeftRightDups',
    itemIndex,
    true
  ) as boolean;
  const strictChecking = this.getNodeParameter('strictChecking', itemIndex, false) as boolean;

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new NodeOperationError(this.getNode(), 'Host URL is not configured in credentials', { itemIndex });
  }

  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const client = new EightKitHttpClient(this, itemIndex);

  try {
    const endpoint = '/api/v1/lookups';
    const data: any = {
      name,
      allowLeftDups,
      allowRightDups,
      allowLeftRightDups,
      strictChecking,
    };

    // Add optional string fields only if they have values
    if (description) {
      data.description = description;
    }
    if (leftSystem) {
      data.leftSystem = leftSystem;
    }
    if (rightSystem) {
      data.rightSystem = rightSystem;
    }

    const response = await client.post(`${formattedBaseUrl}${endpoint}`, data);

    if (!response.success) {
      throw new NodeOperationError(this.getNode(), `Failed to create lookup collection: ${response.error || 'Unknown error'}`, { itemIndex });
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
