import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { formatDateWithFormat } from '../utils/dateFormat';
import { EightKitHttpClient } from '../utils/httpClient';

export interface GetLastUpdatedParams {
  key: string;
}

export async function executeGetLastUpdated(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const key = (this.getNodeParameter('key', itemIndex) as string).trim();
  const useUtcTimezone = this.getNodeParameter('useUtcTimezone', itemIndex, false) as boolean;
  const outputFormat = this.getNodeParameter('outputFormat', itemIndex, 'iso8601-tz') as string;
  const rawOutputCustomFormat =
    outputFormat === 'custom'
      ? (this.getNodeParameter('outputCustomFormat', itemIndex, '') as string)
      : undefined;
  const outputCustomFormat = rawOutputCustomFormat?.trim() || undefined;

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const n8nTomezone = this.getTimezone();

  const client = new EightKitHttpClient(this, itemIndex);

  try {
    const response = await client.get<{
      success: boolean;
      data: {
        id: string;
        key: string;
        description: string | null;
        date: string;
        createdAt: string;
        updatedAt: string;
      } | null;
    }>(`${baseUrl}/api/v1/last-updated/key/${encodeURIComponent(key)}`);

    if (!response.success) {
      throw new Error(`Failed to get last updated record: ${response.error || 'Unknown error'}`);
    }

    if (!response.data) {
      return { date: null };
    }

    const result = response.data as unknown as {
      id: string;
      key: string;
      description: string | null;
      date: string;
      createdAt: string;
      updatedAt: string;
    };

    const resultDate = result.date ? new Date(result.date) : null;
    const formatted = resultDate
      ? formatDateWithFormat(
          resultDate,
          outputFormat,
          outputCustomFormat,
          useUtcTimezone,
          n8nTomezone
        )
      : null;

    return { ...result, date: formatted };
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
