import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      entry.name !== 'node_modules' &&
      entry.name !== 'dist' &&
      entry.name !== '__tests__'
    ) {
      files.push(...getTypeScriptFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('no console statements in production code', () => {
  const sourceDir = path.resolve(__dirname, '..', 'nodes');
  const files = getTypeScriptFiles(sourceDir);

  it('found source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    it(`${relativePath} has no console.log or console.error calls`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const consoleMatches = content.match(/console\.(log|error|warn|debug|info)\s*\(/g);
      expect(consoleMatches).toBeNull();
    });
  }
});
