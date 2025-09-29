import type { IExecuteFunctions } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export async function executeListSets(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  console.log('🔍 [8kit] executeListSets (Uniq collections) called for itemIndex:', itemIndex);

  // Get pagination parameters from advanced settings
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex, {}) as any;
  const paginationSettings = advancedSettings.pagination?.pagination || {};
  const page = paginationSettings.page || 1;
  const limit = paginationSettings.limit || 10;
  const offset = paginationSettings.offset || 0;

  console.log('🔍 [8kit] Pagination parameters:', { page, limit, offset });

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

    const endpoint = `/api/v1/sets?${queryParams.toString()}`;
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to list Uniq collections: ${response.error || 'Unknown error'}`);
    }

    console.log('🔍 [8kit] Uniq collections listed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('🔍 [8kit] Error listing Uniq collections:', error);
    throw error;
  }
}
