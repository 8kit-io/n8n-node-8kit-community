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
  console.log('🔍 [8kit] executeCreateLookup (lookup collection) called for itemIndex:', itemIndex);

  const name = this.getNodeParameter('name', itemIndex) as string;
  const description = this.getNodeParameter('description', itemIndex, '') as string;
  const leftSystem = this.getNodeParameter('leftSystem', itemIndex, '') as string;
  const rightSystem = this.getNodeParameter('rightSystem', itemIndex, '') as string;
  const allowLeftDups = this.getNodeParameter('allowLeftDups', itemIndex, true) as boolean;
  const allowRightDups = this.getNodeParameter('allowRightDups', itemIndex, true) as boolean;
  const allowLeftRightDups = this.getNodeParameter(
    'allowLeftRightDups',
    itemIndex,
    true
  ) as boolean;
  const strictChecking = this.getNodeParameter('strictChecking', itemIndex, false) as boolean;

  console.log('🔍 [8kit] Parameters:', {
    name,
    description,
    leftSystem,
    rightSystem,
    allowLeftDups,
    allowRightDups,
    allowLeftRightDups,
    strictChecking,
  });

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
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
      throw new Error(`Failed to create lookup collection: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Lookup collection created successfully:', response.data);
    return response.data;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.error('🔍 [8kit] Error creating lookup collection:', message);

    if (!this.continueOnFail()) {
      console.log('🔍 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    console.log('🔍 [8kit] Continuing on fail, returning error as output');
    return { error: message };
  }
}
