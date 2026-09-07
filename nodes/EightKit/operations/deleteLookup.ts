import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { toNodeError } from '../utils/common';
import { buildLookupEndpoint, EightKitHttpClient, validateLookupName } from '../utils/httpClient';

export interface DeleteLookupParams {
  name: string;
  confirmDelete: string;
}

export async function executeDeleteLookup(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const confirmDelete = (this.getNodeParameter('confirmDelete', itemIndex) as string).trim();
  let inputData: Record<string, any> = {};
  try {
    validateLookupName(name, this.getNode(), itemIndex);

    // Validate confirmation
    if (confirmDelete !== 'delete') {
      throw new NodeOperationError(
        this.getNode(),
        'Delete operation cancelled. You must type "delete" (without quotes) to confirm the deletion.',
        { itemIndex }
      );
    }

    // Validate inputs

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

    // Get input data to preserve in output
    inputData = this.getInputData()[itemIndex].json as Record<string, any>;

    const endpoint = buildLookupEndpoint(name);
    const response = await client.delete(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new NodeOperationError(
        this.getNode(),
        `Failed to delete lookup collection: ${response.error || 'Unknown error'}`,
        { itemIndex }
      );
    }

    return {
      ...inputData,
      deleted: true,
      collectionName: name,
      message: 'Lookup collection deleted successfully',
    };
  } catch (error: any) {
    if (!this.continueOnFail()) {
      throw toNodeError(this.getNode(), error, itemIndex);
    }

    return {
      ...inputData,
      error: {
        status: error.status,
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
}
