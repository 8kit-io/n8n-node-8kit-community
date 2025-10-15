import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildUniqEndpoint, EightKitHttpClient, validateUniqName } from '../utils/httpClient';

export async function executeGetUniqs(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  console.log('🔍 [8kit] executeGetUniqs (Uniq) called for itemIndex:', itemIndex);

  const name = (this.getNodeParameter('name', itemIndex) as string).trim();

  // Get pagination parameters from advanced settings
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex, {}) as any;
  const paginationSettings = advancedSettings.pagination?.pagination || {};
  const page = paginationSettings.page || 1;
  const limit = paginationSettings.limit || 10;
  const offset = paginationSettings.offset || 0;

  console.log('🔍 [8kit] Parameters (Uniq):', { name });
  console.log('🔍 [8kit] Pagination parameters (Uniq):', {
    page,
    limit,
    offset,
  });

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

  try {
    // Build query parameters for pagination
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (offset > 0) {
      queryParams.append('offset', offset.toString());
    }

    const endpoint = `${buildUniqEndpoint(name)}/values?${queryParams.toString()}`;
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to get Uniq values: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Uniq values retrieved successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('🔍 [8kit] Error getting Uniq values:', {
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
