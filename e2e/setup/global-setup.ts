/**
 * Vitest globalSetup — starts Docker containers before all tests.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const COMPOSE_FILE = path.resolve(__dirname, '../../docker-compose.e2e.yml');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3333';
const MAX_WAIT = 90_000; // 90s max wait for backend health
const POLL_INTERVAL = 2_000;

async function waitForHealth(): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        console.log(`[e2e] Backend healthy after ${Date.now() - start}ms`);
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error(`[e2e] Backend did not become healthy within ${MAX_WAIT}ms`);
}

export async function setup(): Promise<void> {
  // Skip Docker if E2E_SKIP_DOCKER is set (for running against external backend)
  if (process.env.E2E_SKIP_DOCKER) {
    console.log('[e2e] Skipping Docker (E2E_SKIP_DOCKER set), waiting for health...');
    await waitForHealth();
    return;
  }

  console.log('[e2e] Starting Docker containers...');
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', '--build', '--wait'], {
    stdio: 'inherit',
    timeout: 180_000,
  });

  console.log('[e2e] Waiting for backend health...');
  await waitForHealth();
  console.log('[e2e] Infrastructure ready.');
}

export async function teardown(): Promise<void> {
  if (process.env.E2E_SKIP_DOCKER) {
    return;
  }

  console.log('[e2e] Stopping Docker containers...');
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'down', '-v', '--remove-orphans'], {
    stdio: 'inherit',
    timeout: 60_000,
  });
  console.log('[e2e] Cleanup complete.');
}
