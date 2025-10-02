import { buildLookupEndpoint, buildSetEndpoint, type EightKitHttpClient } from './httpClient';

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

interface CreateSetResult {
  id: string;
  name: string;
  description?: string;
  allowDuplicates: boolean;
  strictChecking: boolean;
  createdAt: string;
  updatedAt: string;
}

async function createSet(
  client: EightKitHttpClient,
  baseUrl: string,
  setName: string
): Promise<CreateSetResult> {
  const url = `${baseUrl}/api/v1/uniqs`;

  console.log('➕ [8kit] Creating Uniq collection:', url);

  //ToDo: add more info about the app that created the set
  const payload = {
    name: setName,
    description: `Auto-created Uniq collection for ${setName} by n8n node`,
  };

  console.log('➕ [8kit] Create Uniq payload:', payload);

  const response = await client.post<CreateSetResult>(url, payload);

  if (!response.success) {
    throw new Error(`Failed to create Uniq collection: ${response.error || 'Unknown error'}`);
  }

  if (!response.data) {
    throw new Error('Create Uniq collection response missing data field');
  }

  return response.data;
}

async function checkSetExists(
  client: EightKitHttpClient,
  baseUrl: string,
  setName: string
): Promise<boolean> {
  try {
    const endpoint = buildSetEndpoint(setName, '');
    const url = `${baseUrl}${endpoint}`;

    console.log('➕ [8kit] Checking if Uniq collection exists:', url);

    const response = await client.get(url);
    return response.success && response.data;
  } catch (error: any) {
    console.log('➕ [8kit] Uniq collection check error:', error.message);

    // If 404 or SET_NOT_FOUND, the Uniq collection doesn't exist
    if (error.message.includes('404') || error.message.includes('SET_NOT_FOUND')) {
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

    console.log('🔗 [8kit] Checking if lookup exists:', url);

    const response = await client.get(url);
    return response.success && response.data;
  } catch (error: any) {
    console.log('🔗 [8kit] Lookup check error:', error.message);

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
  lookupName: string
): Promise<CreateLookupResult> {
  const url = `${baseUrl}/api/v1/lookups`;

  console.log('🔗 [8kit] Creating lookup collection:', url);

  const payload = {
    name: lookupName,
    description: `Auto-created lookup collection for ${lookupName} by n8n node`,
  };

  console.log('🔗 [8kit] Create lookup payload:', payload);

  const response = await client.post<CreateLookupResult>(url, payload);

  if (!response.success) {
    throw new Error(`Failed to create lookup collection: ${response.error || 'Unknown error'}`);
  }

  if (!response.data) {
    throw new Error('Create lookup response missing data field');
  }

  return response.data;
}

export { checkLookupExists, checkSetExists, createLookup, createSet };
