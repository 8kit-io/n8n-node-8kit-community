/**
 * Direct API client for test setup/teardown.
 * Bypasses the n8n operation functions to create/delete resources directly.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3333';
const API_KEY = process.env.E2E_API_KEY || 'st_XXXXXXXXXXXXXXXXXXXXX';

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
): Promise<{ status: number; data: T }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Key': API_KEY,
  };

  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ── Health ────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ── Uniq Collections ─────────────────────────────────────────────

export async function createUniq(name: string, description?: string) {
  return request('POST', '/api/v1/uniqs', { name, description });
}

export async function deleteUniq(name: string) {
  return request('DELETE', `/api/v1/uniqs/${encodeURIComponent(name)}`);
}

export async function getUniq(name: string) {
  return request('GET', `/api/v1/uniqs/${encodeURIComponent(name)}`);
}

export async function listUniqs() {
  return request('GET', '/api/v1/uniqs');
}

// ── Uniq Values ──────────────────────────────────────────────────

export async function addUniqValue(name: string, value: string, metadata?: any) {
  return request('POST', `/api/v1/uniqs/${encodeURIComponent(name)}/values`, {
    value,
    metadata,
  });
}

export async function removeUniqValue(name: string, value: string) {
  return request(
    'DELETE',
    `/api/v1/uniqs/${encodeURIComponent(name)}/values/${encodeURIComponent(value)}`,
  );
}

// ── Lookup Collections ───────────────────────────────────────────

export async function createLookup(name: string, options?: {
  description?: string;
  leftSystem?: string;
  rightSystem?: string;
}) {
  return request('POST', '/api/v1/lookups', { name, ...options });
}

export async function deleteLookup(name: string) {
  return request('DELETE', `/api/v1/lookups/${encodeURIComponent(name)}`);
}

export async function getLookup(name: string) {
  return request('GET', `/api/v1/lookups/${encodeURIComponent(name)}`);
}

// ── Lookup Values ────────────────────────────────────────────────

export async function addLookupValue(name: string, left: string, right: string) {
  return request('POST', `/api/v1/lookups/${encodeURIComponent(name)}/values`, {
    left,
    right,
  });
}

export async function removeLookupValue(name: string, valueId: string) {
  return request(
    'DELETE',
    `/api/v1/lookups/${encodeURIComponent(name)}/values/${encodeURIComponent(valueId)}`,
  );
}

// ── Locks ────────────────────────────────────────────────────────

export async function acquireLock(key: string, callingFn: string, timeout = 600) {
  return request('POST', '/api/v1/locks', { key, callingFn, timeout });
}

export async function releaseLock(key: string) {
  return request('DELETE', `/api/v1/locks/${encodeURIComponent(key)}`);
}

export async function releaseAllLocks() {
  return request('DELETE', '/api/v1/locks/app');
}

// ── Last Updated ─────────────────────────────────────────────────

export async function createLastUpdated(key: string, date?: string, description?: string) {
  const body: any = { key };
  if (date) body.date = date;
  if (description) body.description = description;
  return request('POST', '/api/v1/last-updated', body);
}

export async function deleteLastUpdatedByKey(key: string) {
  return request('DELETE', `/api/v1/last-updated/key/${encodeURIComponent(key)}`);
}
