import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { toNodeError } from '../utils/common';
import { formatDateWithFormat, parseDateWithFormat } from '../utils/dateFormat';
import { EightKitHttpClient } from '../utils/httpClient';

export interface GetLastUpdatedParams {
  key: string;
}

export async function executeGetLastUpdated(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const key = (this.getNodeParameter('key', itemIndex) as string).trim();
  const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as Record<
    string,
    any
  >;
  const useUtcTimezone = (additionalFields.useUtcTimezone as boolean) || false;
  const outputFormat = (additionalFields.outputFormat as string) || 'iso8601-tz';
  const rawOutputCustomFormat =
    outputFormat === 'custom' ? (additionalFields.outputCustomFormat as string) || '' : undefined;
  const outputCustomFormat = rawOutputCustomFormat?.trim() || undefined;

  // Get default date parameter
  const rawDefaultDateString = (additionalFields.defaultDateString as string) || '';
  const defaultDateString = rawDefaultDateString?.trim() || null;

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
      throw new NodeOperationError(
        this.getNode(),
        `Failed to get last updated record: ${response.error || 'Unknown error'}`,
        { itemIndex }
      );
    }

    if (!response.data) {
      // If no data exists, use the default date if provided
      if (!defaultDateString) {
        return { date: null };
      }

      try {
        // Parse the default date using the same format as the output format
        const parsedDefaultDate = parseDateWithFormat(
          defaultDateString,
          outputFormat,
          outputCustomFormat
        );
        // Format it again using the output format (to ensure consistency with timezone settings)
        const formatted = formatDateWithFormat(
          parsedDefaultDate,
          outputFormat,
          outputCustomFormat,
          useUtcTimezone,
          n8nTomezone
        );
        return { date: formatted };
      } catch (error: any) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to parse default date string: ${error.message}`,
          { itemIndex }
        );
      }
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
