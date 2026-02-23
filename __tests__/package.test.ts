import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

describe('package.json marketplace compliance', () => {
  it('has n8n-workflow in peerDependencies', () => {
    expect(pkg.peerDependencies).toBeDefined();
    expect(pkg.peerDependencies['n8n-workflow']).toBeDefined();
  });

  it('has no runtime dependencies', () => {
    expect(pkg.dependencies).toBeUndefined();
  });

  it('has license set to MIT', () => {
    expect(pkg.license).toBe('MIT');
  });

  it('has n8n-community-node-package keyword', () => {
    expect(pkg.keywords).toContain('n8n-community-node-package');
  });

  it('has n8nNodesApiVersion as a number', () => {
    expect(typeof pkg.n8n.n8nNodesApiVersion).toBe('number');
  });

  it('files only includes dist', () => {
    expect(pkg.files).toEqual(['dist']);
  });
});
