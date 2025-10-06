import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildUniqEndpoint, EightKitHttpClient, validateUniqName } from '../utils/httpClient';

export interface DeleteUniqCollectionParams {
  name: string;
  confirmDelete: string;
}

export async function executeDeleteUniqCollection(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log('🗑️ [8kit] executeDeleteUniqCollection called for itemIndex:', itemIndex);

  const name = (this.getNodeParameter('name', itemIndex) as string).trim();
  const confirmDelete = (this.getNodeParameter('confirmDelete', itemIndex) as string).trim();

  console.log('🗑️ [8kit] Parameters:', { name, confirmDelete });

  // Validate confirmation
  if (confirmDelete !== 'delete') {
    throw new Error(
      'Delete operation cancelled. You must type "delete" (without quotes) to confirm the deletion.'
    );
  }

  // Validate inputs
  validateUniqName(name);

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
    const endpoint = buildUniqEndpoint(name);
    const response = await client.delete(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to delete Uniq collection: ${response.error || 'Unknown error'}`);
    }

    console.log('🗑️ [8kit] Uniq collection deleted successfully');

    return {
      ...inputData,
      deleted: true,
      collectionName: name,
      message: 'Uniq collection deleted successfully',
    };
  } catch (error: any) {
    console.error('🗑️ [8kit] Error deleting Uniq collection:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      console.log('🗑️ [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), error, { itemIndex });
    }

    console.log('🗑️ [8kit] Continuing on fail, returning error as output');
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
