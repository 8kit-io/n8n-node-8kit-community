import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { toNodeError } from '../../nodes/EightKit/utils/common';
import { EightKitError } from '../../nodes/EightKit/utils/httpClient';

describe('toNodeError', () => {
  const node = { name: 'n', type: 't', typeVersion: 1, position: [0, 0], parameters: {} } as any;
  // Every catch threw NodeOperationError, so a 404, a 402 and a 500 looked the same
  // in n8n and the HTTP status was lost.
  it('keeps the HTTP status for server answers', () => {
    const e = toNodeError(
      node,
      new EightKitError({ status: 404, message: 'Uniq not found', code: 'UNIQ_NOT_FOUND' }),
      0
    );
    expect(e).toBeInstanceOf(NodeApiError);
    expect((e as NodeApiError).httpCode).toBe('404');
  });
  it('stays an operation error for local failures', () => {
    expect(toNodeError(node, new Error('bad input'), 0)).toBeInstanceOf(NodeOperationError);
  });
});
