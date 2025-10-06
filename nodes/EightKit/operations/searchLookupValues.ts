import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

/**
 * Search lookup values by left value, right value, or general search
 * GET /api/v1/lookups/:lookup/search
 */
export async function executeSearchLookupValues(
  this: IExecuteFunctions,
  index: number
): Promise<any> {
  try {
    const credentials = await this.getCredentials('eightKitApi');
    const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

    // Get parameters
    const name = (this.getNodeParameter('name', index) as string).trim();
    const searchType = this.getNodeParameter('searchType', index) as 'left' | 'right' | 'search';
    const searchValue = (this.getNodeParameter('searchValue', index) as string).trim();

    if (!name?.trim()) {
      throw new Error('Lookup name is required');
    }

    if (!searchValue?.trim()) {
      throw new Error('Search value is required');
    }

    const client = new EightKitHttpClient(this, index);

    // Build query parameters based on search type
    const queryParams = new URLSearchParams();

    switch (searchType) {
      case 'left':
        queryParams.append('left', searchValue);
        break;
      case 'right':
        queryParams.append('right', searchValue);
        break;
      case 'search':
        queryParams.append('search', searchValue);
        break;
      default:
        throw new Error(`Invalid search type: ${searchType}`);
    }

    const url = `${baseUrl}/api/v1/lookups/${encodeURIComponent(
      name
    )}/search?${queryParams.toString()}`;
    const response = await client.get<any>(url);

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to search lookup values');
    }

    // Return the search results
    return {
      success: true,
      searchType,
      searchValue,
      lookupName: name,
      results: response.data || [],
      count: response.data?.length || 0,
    };
  } catch (error: any) {
    const message = error.message || 'Unknown error';
    const safeMessage = `Failed to search lookup values: ${message}`;

    console.log('🔍 [8kit] Error searching lookup values:', {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    });

    if (!this.continueOnFail()) {
      throw new NodeOperationError(this.getNode(), error, {
        itemIndex: index,
      });
    }

    return {
      error: {
        status: error.status,
        message: safeMessage,
        code: error.code,
        details: error.details,
      },
    };
  }
}
