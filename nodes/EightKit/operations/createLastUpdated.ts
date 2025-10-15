import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parseDateWithFormat } from '../utils/dateFormat';
import { EightKitHttpClient } from '../utils/httpClient';

export interface CreateLastUpdatedParams {
  key: string;
  description?: string;
  date?: string;
}

export async function executeCreateLastUpdated(
  this: IExecuteFunctions,
  itemIndex: number
): Promise<any> {
  const key = (this.getNodeParameter('key', itemIndex) as string).trim();
  const description = (
    (this.getNodeParameter('description', itemIndex, '') as string) || ''
  ).trim();

  const rawDateInput = this.getNodeParameter('dateString', itemIndex, '') as
    | string
    | number
    | Date
    | null;
  const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'iso8601-tz') as string;
  const rawInputCustomFormat =
    inputFormat === 'custom'
      ? (this.getNodeParameter('inputCustomFormat', itemIndex, '') as string)
      : undefined;
  const inputCustomFormat = rawInputCustomFormat?.trim() || undefined;

  let parsedDate: Date;

  if (rawDateInput === null || rawDateInput === undefined) {
    parsedDate = new Date();
  } else if (rawDateInput instanceof Date) {
    parsedDate = new Date(rawDateInput.getTime());
  } else {
    const dateValue =
      typeof rawDateInput === 'string' ? rawDateInput.trim() : String(rawDateInput).trim();

    if (dateValue === '') {
      parsedDate = new Date();
    } else {
      try {
        parsedDate = parseDateWithFormat(dateValue, inputFormat, inputCustomFormat);
      } catch (error: any) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to parse date string: ${error.message}`,
          { itemIndex }
        );
      }
    }
  }

  // Convert to API format (ISO 8601 UTC with milliseconds, matching admin UI format)
  const apiDate = parsedDate.toISOString();

  const credentials = await this.getCredentials('eightKitApi');
  const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

  const client = new EightKitHttpClient(this, itemIndex);

  const payload: any = {
    key,
    date: apiDate,
  };

  if (description?.trim()) {
    payload.description = description.trim();
  }

  try {
    const response = await client.post<{
      success: boolean;
      data: {
        id: string;
        key: string;
        description: string | null;
        date: string;
        createdAt: string;
        updatedAt: string;
      };
    }>(`${baseUrl}/api/v1/last-updated`, payload);

    if (!response.success || !response.data) {
      throw new Error(
        `Failed to create last updated record: ${(response as any).error || 'Unknown error'}`
      );
    }

    // Extract data after checking it exists - TypeScript needs explicit assertion via unknown
    const data = response.data as unknown as {
      id: string;
      key: string;
      description: string | null;
      date: string;
      createdAt: string;
      updatedAt: string;
    };

    return { ...data };
  } catch (error: any) {
    const message = error.message || 'Unknown error';
    const code = error.code || 'UNKNOWN';

    if (code === 'DUPLICATE_KEY' || message.includes('DUPLICATE_KEY')) {
      try {
        await client.delete<{
          success: boolean;
          data: {
            id: string;
            key: string;
            description: string | null;
            date: string;
            createdAt: string;
            updatedAt: string;
          };
        }>(`${baseUrl}/api/v1/last-updated/key/${encodeURIComponent(key)}`);

        const response = await client.post<{
          success: boolean;
          data: {
            id: string;
            key: string;
            description: string | null;
            date: string;
            createdAt: string;
            updatedAt: string;
          };
        }>(`${baseUrl}/api/v1/last-updated`, payload);
        if (!response.success || !response.data) {
          throw new Error(
            `Failed to touch last updated record: ${(response as any).error || 'Unknown error'}`
          );
        }

        // Extract data after checking it exists - TypeScript needs explicit assertion via unknown
        const data = response.data as unknown as {
          id: string;
          key: string;
          description: string | null;
          date: string;
          createdAt: string;
          updatedAt: string;
        };

        return { ...data };
      } catch (retryError: any) {
        if (!this.continueOnFail()) {
          throw new NodeOperationError(this.getNode(), retryError, {
            itemIndex,
          });
        }
        return {
          error: {
            status: retryError.status,
            message: retryError.message,
            code: retryError.code,
          },
        };
      }
    }

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
