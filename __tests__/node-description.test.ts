import { describe, it, expect } from 'vitest';
import { EightKit } from '../nodes/EightKit/EightKit.node';

describe('node description marketplace compliance', () => {
  const node = new EightKit();
  const properties = node.description.properties;

  function getTopLevelFields(resource: string, operation?: string): any[] {
    return properties.filter((p: any) => {
      if (p.name === 'resource' || p.name === 'operation') return false;
      if (p.type === 'collection' || p.type === 'fixedCollection') return false;
      const show = p.displayOptions?.show;
      if (!show) return false;
      const matchesResource = show.resource?.includes(resource);
      const matchesOperation = operation ? show.operation?.includes(operation) : true;
      return matchesResource && matchesOperation && !p.required;
    });
  }

  describe('optional fields are in collections', () => {
    it('lookup create has no top-level optional fields', () => {
      const fields = getTopLevelFields('lookup', 'createLookup');
      const names = fields.map((f: any) => f.name);
      expect(names, `Found top-level optional fields: ${names.join(', ')}`).toHaveLength(0);
    });

    it('uniqCollection create has no top-level optional fields', () => {
      const fields = getTopLevelFields('uniqCollection', 'createUniqCollection');
      const names = fields.map((f: any) => f.name);
      expect(names, `Found top-level optional fields: ${names.join(', ')}`).toHaveLength(0);
    });

    it('lastUpdated create has no top-level optional fields', () => {
      const fields = getTopLevelFields('lastUpdated', 'createLastUpdated');
      const names = fields.map((f: any) => f.name);
      expect(names, `Found top-level optional fields: ${names.join(', ')}`).toHaveLength(0);
    });

    it('lastUpdated get has no top-level optional fields', () => {
      const fields = getTopLevelFields('lastUpdated', 'getLastUpdated');
      const names = fields.map((f: any) => f.name);
      expect(names, `Found top-level optional fields: ${names.join(', ')}`).toHaveLength(0);
    });

    it('lock operations have no top-level optional fields', () => {
      for (const op of ['acquireLock', 'checkLock', 'releaseLock']) {
        const fields = getTopLevelFields('lock', op);
        const names = fields.map((f: any) => f.name);
        expect(names, `Lock ${op}: found top-level optional fields: ${names.join(', ')}`).toHaveLength(0);
      }
    });

    it('uniqs check has no top-level optional fields', () => {
      const fields = getTopLevelFields('uniqs', 'checkUniqs');
      const names = fields.map((f: any) => f.name);
      expect(names, `Found top-level optional fields: ${names.join(', ')}`).toHaveLength(0);
    });
  });
});
