import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildLookupEndpoint, buildUniqEndpoint, type EightKitHttpClient } from './httpClient';

interface CreateLookupResult {
  id: string;
  name: string;
  description?: string;
  leftSystem?: string;
  rightSystem?: string;
  allowLeftDups: boolean;
  allowRightDups: boolean;
  allowLeftRightDups: boolean;
  strictChecking: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateUniqResult {
  id: string;
  name: string;
  description?: string;
  allowDuplicates: boolean;
  strictChecking: boolean;
  createdAt: string;
  updatedAt: string;
}

async function createUniq(
  client: EightKitHttpClient,
  baseUrl: string,
  uniqName: string,
  node: INode,
  itemIndex: number
): Promise<CreateUniqResult> {
  const url = `${baseUrl}/api/v1/uniqs`;

  //ToDo: add more info about the app that created the uniq collection
  const payload = {
    name: uniqName,
    description: `Auto-created Uniq collection for ${uniqName} by n8n node`,
  };

  const response = await client.post<CreateUniqResult>(url, payload);

  if (!response.success) {
    throw new NodeOperationError(
      node,
      `Failed to create Uniq collection: ${response.error || 'Unknown error'}`,
      { itemIndex }
    );
  }

  if (!response.data) {
    throw new NodeOperationError(node, 'Create Uniq collection response missing data field', {
      itemIndex,
    });
  }

  return response.data;
}

async function checkUniqExists(
  client: EightKitHttpClient,
  baseUrl: string,
  uniqName: string
): Promise<boolean> {
  try {
    const endpoint = buildUniqEndpoint(uniqName, '');
    const url = `${baseUrl}${endpoint}`;

    const response = await client.get(url);
    return response.success && response.data;
  } catch (error: any) {
    // If 404 or UNIQ_NOT_FOUND, the Uniq collection doesn't exist
    if (error.message.includes('404') || error.message.includes('UNIQ_NOT_FOUND')) {
      return false;
    }

    // For other errors, re-throw
    throw error;
  }
}

async function checkLookupExists(
  client: EightKitHttpClient,
  baseUrl: string,
  lookupName: string
): Promise<boolean> {
  try {
    const endpoint = buildLookupEndpoint(lookupName, '');
    const url = `${baseUrl}${endpoint}`;

    const response = await client.get(url);
    return response.success && response.data;
  } catch (error: any) {
    // If 404 or LOOKUP_NOT_FOUND, the lookup doesn't exist
    if (error.message.includes('404') || error.message.includes('LOOKUP_NOT_FOUND')) {
      return false;
    }

    // For other errors, re-throw
    throw error;
  }
}

async function createLookup(
  client: EightKitHttpClient,
  baseUrl: string,
  lookupName: string,
  node: INode,
  itemIndex: number
): Promise<CreateLookupResult> {
  const url = `${baseUrl}/api/v1/lookups`;

  const payload = {
    name: lookupName,
    description: `Auto-created lookup collection for ${lookupName} by n8n node`,
  };

  const response = await client.post<CreateLookupResult>(url, payload);

  if (!response.success) {
    throw new NodeOperationError(
      node,
      `Failed to create lookup collection: ${response.error || 'Unknown error'}`,
      { itemIndex }
    );
  }

  if (!response.data) {
    throw new NodeOperationError(node, 'Create lookup response missing data field', { itemIndex });
  }

  return response.data;
}

export { checkLookupExists, checkUniqExists, createLookup, createUniq };

/**
 * Which output an item goes to. Error items (Continue on fail) always take the second
 * output so a branch built on "Added" / "Yes" never processes a failure as a success.
 */
export function outputIndexFor(result: { result?: any; outputIndex?: number }): number {
  if (result?.result && typeof result.result === 'object' && 'error' in result.result) {
    return 1;
  }
  return result?.outputIndex ?? 0;
}

/**
 * Reads a whole paginated listing. Used when the workflow did not ask for a specific
 * page: "get all" used to mean ten rows and no warning. Follows the server's
 * pagination.totalPages; if a response carries none, a short page ends the walk.
 */
export async function fetchAllPages<T = any>(
  client: { get: (url: string) => Promise<any> },
  urlWithoutPaging: string,
  pageSize = 100
): Promise<any> {
  const sep = urlWithoutPaging.includes('?') ? '&' : '?';
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  let totalCount = 0;
  for (;;) {
    const response = await client.get(`${urlWithoutPaging}${sep}page=${page}&limit=${pageSize}`);
    if (!response?.success) {
      // Hand the failed response back unchanged so each operation composes its own
      // message, exactly as it does for a single-page request.
      return response;
    }
    const data = response.data ?? {};
    const chunk: T[] = data.items ?? data.values ?? [];
    items.push(...chunk);
    const meta = data.pagination;
    totalPages = meta?.totalPages ?? (chunk.length < pageSize ? page : page + 1);
    totalCount = meta?.totalCount ?? items.length;
    if (page >= totalPages || chunk.length === 0) break;
    page += 1;
  }
  return {
    success: true,
    data: { items, pagination: { page: 1, limit: items.length, totalCount, totalPages } },
  };
}
