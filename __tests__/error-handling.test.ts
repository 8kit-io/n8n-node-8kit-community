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
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('error handling compliance', () => {
  const nodesDir = path.resolve(__dirname, '..', 'nodes', 'EightKit');

  const operationsDir = path.join(nodesDir, 'operations');
  const operationFiles = getTypeScriptFiles(operationsDir);

  for (const file of operationFiles) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    it(`${relativePath} does not use raw "throw new Error"`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const rawErrors: string[] = [];
      lines.forEach((line, i) => {
        if (line.match(/throw\s+new\s+Error\s*\(/) && !line.includes('// allowed')) {
          rawErrors.push(`  Line ${i + 1}: ${line.trim()}`);
        }
      });
      expect(rawErrors, `Raw Error throws found:\n${rawErrors.join('\n')}`).toHaveLength(0);
    });
  }

  it('EightKit.node.ts does not use raw "throw new Error"', () => {
    const mainFile = path.join(nodesDir, 'EightKit.node.ts');
    const content = fs.readFileSync(mainFile, 'utf-8');
    const lines = content.split('\n');
    const rawErrors: string[] = [];
    lines.forEach((line, i) => {
      if (line.match(/throw\s+new\s+Error\s*\(/) && !line.includes('// allowed')) {
        rawErrors.push(`  Line ${i + 1}: ${line.trim()}`);
      }
    });
    expect(rawErrors, `Raw Error throws found:\n${rawErrors.join('\n')}`).toHaveLength(0);
  });

  // Also check utility files
  const utilsDir = path.join(nodesDir, 'utils');
  const utilFiles = getTypeScriptFiles(utilsDir);

  for (const file of utilFiles) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    it(`${relativePath} does not use raw "throw new Error"`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const rawErrors: string[] = [];
      lines.forEach((line, i) => {
        if (line.match(/throw\s+new\s+Error\s*\(/) && !line.includes('// allowed')) {
          rawErrors.push(`  Line ${i + 1}: ${line.trim()}`);
        }
      });
      expect(rawErrors, `Raw Error throws found:\n${rawErrors.join('\n')}`).toHaveLength(0);
    });
  }
});
