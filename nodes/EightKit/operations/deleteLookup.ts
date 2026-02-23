import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
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

  // Validate confirmation
  if (confirmDelete !== 'delete') {
    throw new Error(
      'Delete operation cancelled. You must type "delete" (without quotes) to confirm the deletion.'
    );
  }

  // Validate inputs
  validateLookupName(name);

  // Initialize HTTP client
  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = credentials.hostUrl as string;

  if (!baseUrl) {
    throw new Error('Host URL is not configured in credentials');
  }

  const formattedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const client = new EightKitHttpClient(this, itemIndex);

  // Get input data to preserve in output
  const inputData = this.getInputData()[itemIndex].json as Record<string, any>;

  try {
    const endpoint = buildLookupEndpoint(name);
    const response = await client.delete(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to delete lookup collection: ${response.error || 'Unknown error'}`);
    }

    return {
      ...inputData,
      deleted: true,
      collectionName: name,
      message: 'Lookup collection deleted successfully',
    };
  } catch (error: any) {
    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
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
