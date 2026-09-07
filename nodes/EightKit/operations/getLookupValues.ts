import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { fetchAllPages, toNodeError } from '../utils/common';
import { buildLookupEndpoint, EightKitHttpClient, validateLookupName } from '../utils/httpClient';

export async function executeGetLookupValues(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const name = (this.getNodeParameter('name', itemIndex) as string).trim();

  // Get pagination parameters from advanced settings
  const advancedSettings = this.getNodeParameter('advancedSettings', itemIndex, {}) as any;
  try {
    validateLookupName(name, this.getNode(), itemIndex);
    const paginationSettings = advancedSettings.pagination?.pagination || {};
    const page = paginationSettings.page || 1;
    const limit: number | undefined = paginationSettings.limit; // undefined = read every page
    const offset = paginationSettings.offset || 0;

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

    // Build query parameters for pagination
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', String(limit ?? 10));
    if (offset > 0) {
      queryParams.append('offset', offset.toString());
    }

    const endpoint = `${buildLookupEndpoint(name)}/values?${queryParams.toString()}`;
    const askedForAPage =
      paginationSettings.limit !== undefined ||
      paginationSettings.page !== undefined ||
      paginationSettings.offset !== undefined;
    const response = askedForAPage
      ? await client.get(`${formattedBaseUrl}${endpoint}`)
      : await fetchAllPages(client, `${formattedBaseUrl}${buildLookupEndpoint(name)}/values`);

    if (!response.success) {
      throw new NodeOperationError(
        this.getNode(),
        `Failed to get lookup values: ${response.error || 'Unknown error'}`,
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
