import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { EightKitHttpClient } from '../utils/httpClient';

export async function executeListLookups(this: IExecuteFunctions, itemIndex: number): Promise<any> {
  // Get pagination parameters from advanced settings
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex, {}) as any;
  const paginationSettings = advancedSettings.pagination?.pagination || {};
  const page = paginationSettings.page || 1;
  const limit = paginationSettings.limit || 10;
  const offset = paginationSettings.offset || 0;

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

    const endpoint = `/api/v1/lookups?${queryParams.toString()}`;
    const response = await client.get(`${formattedBaseUrl}${endpoint}`);

    if (!response.success) {
      throw new Error(`Failed to list lookup collections: ${response.error || 'Unknown error'}`);
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
