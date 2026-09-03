import { describe, expect, it } from 'vitest';
import { outputIndexFor } from '../../nodes/EightKit/utils/common';

describe('outputIndexFor', () => {
  it('sends error items to the second output so the success branch never sees them', () => {
    expect(outputIndexFor({ result: { error: { message: 'x' } }, outputIndex: 0 })).toBe(1);
  });
  it('keeps the operation choice otherwise', () => {
    expect(outputIndexFor({ result: { id: 'v' }, outputIndex: 0 })).toBe(0);
    expect(outputIndexFor({ result: { id: 'v' }, outputIndex: 1 })).toBe(1);
  });
});
