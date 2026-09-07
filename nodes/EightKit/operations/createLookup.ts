import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { toNodeError } from '../utils/common';
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
  const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as Record<
    string,
    any
  >;
  const description = ((additionalFields.description as string) || '').trim();
  const leftSystem = ((additionalFields.leftSystem as string) || '').trim();
  const rightSystem = ((additionalFields.rightSystem as string) || '').trim();
  const allowLeftDups =
    additionalFields.allowLeftDups !== undefined
      ? (additionalFields.allowLeftDups as boolean)
      : true;
  const allowRightDups =
    additionalFields.allowRightDups !== undefined
      ? (additionalFields.allowRightDups as boolean)
      : true;
  const allowLeftRightDups =
    additionalFields.allowLeftRightDups !== undefined
      ? (additionalFields.allowLeftRightDups as boolean)
      : true;
  const strictChecking = (additionalFields.strictChecking as boolean) || false;

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
      throw new NodeOperationError(
        this.getNode(),
        `Failed to create lookup collection: ${response.error || 'Unknown error'}`,
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
