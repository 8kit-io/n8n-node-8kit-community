import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildLookupEndpoint, EightKitHttpClient, validateLookupName } from '../utils/httpClient';

export async function executeGetLookupValues(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  console.log('🔍 [8kit] executeGetLookupValues called for itemIndex:', itemIndex);

  const name = this.getNodeParameter('name', itemIndex) as string;

  // Get pagination parameters from advanced settings
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex, {}) as any;
  const paginationSettings = advancedSettings.pagination?.pagination || {};
  const page = paginationSettings.page || 1;
  const limit = paginationSettings.limit || 10;
  const offset = paginationSettings.offset || 0;

  console.log('🔍 [8kit] Parameters:', { name });
  console.log('🔍 [8kit] Pagination parameters:', { page, limit, offset });

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

  try {
    // Build query parameters for pagination
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (offset > 0) {
      queryParams.append('offset', offset.toString());
    }

    const endpoint = `${buildLookupEndpoint(name)}/values?${queryParams.toString()}`;
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to get lookup values: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Lookup values retrieved successfully:', response.data);
    return response.data;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error ?? 'Unknown error');
    console.error('🔍 [8kit] Error getting lookup values:', message);

    if (!this.continueOnFail()) {
      console.log('🔍 [8kit] Not continuing on fail, throwing error');
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }

    console.log('🔍 [8kit] Continuing on fail, returning error as output');
    return { error: message };
  }
}
