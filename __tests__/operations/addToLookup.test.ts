import { executeAddToLookup } from '../../nodes/EightKit/operations/addToLookup';
import { createMockCredentials, createMockExecuteFunctions } from '../setup';

describe('executeAddToLookup', () => {
  let fx: any;

  beforeEach(() => {
    fx = createMockExecuteFunctions();
  });

  it('should add pair to existing lookup', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('products') // name
      .mockReturnValueOnce('SKU-1') // leftValue
      .mockReturnValueOnce('ID-1'); // rightValue

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.getInputData.mockReturnValue([{ json: {} }]);

    // checkLookupExists -> true
    fx.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
      success: true,
      data: { id: 'lkp-1' },
    });
    // addValueToLookup -> success
    fx.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
      success: true,
      data: { id: 'pair-1', lookupId: 'lkp-1', left: 'SKU-1', right: 'ID-1' },
    });

    const result = await executeAddToLookup.call(fx, 0);
    expect(result).toEqual({ success: true, data: expect.objectContaining({ left: 'SKU-1' }) });
  });

  it('should error when lookup missing', async () => {
    fx.getNodeParameter
      .mockReturnValueOnce('missing')
      .mockReturnValueOnce('L')
      .mockReturnValueOnce('R');

    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    fx.getInputData.mockReturnValue([{ json: {} }]);
    // checkLookupExists -> 404 path
    fx.helpers.httpRequestWithAuthentication.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'Lookup not found', code: 'LOOKUP_NOT_FOUND' } },
    });

    await expect(executeAddToLookup.call(fx, 0)).rejects.toThrow('Lookup not found');
  });
});

describe('continue on fail covers validation', () => {
  // Validation ran before the try block, so with "continue on fail" a bad name still
  // stopped the whole run instead of landing on the error output.
  it('returns an error item instead of throwing', async () => {
    const fx = createMockExecuteFunctions();
    fx.continueOnFail = jest.fn(() => true);
    fx.getNodeParameter
      .mockReturnValueOnce('') // invalid lookup name
      .mockReturnValueOnce('L')
      .mockReturnValueOnce('R')
      .mockReturnValueOnce({})
      .mockReturnValueOnce(false);
    fx.getCredentials.mockResolvedValue(createMockCredentials({}));
    const result = await executeAddToLookup.call(fx, 0);
    expect(result.error).toBeDefined();
  });
});
