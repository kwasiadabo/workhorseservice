const ApiError = require('../ApiError');

describe('ApiError', () => {
  it('badRequest produces a 400 with the given message and errors', () => {
    const err = ApiError.badRequest('Invalid input', [{ path: 'name', message: 'required' }]);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
    expect(err.errors).toEqual([{ path: 'name', message: 'required' }]);
    expect(err.isApiError).toBe(true);
  });

  it.each([
    ['unauthorized', 401, 'Unauthorized'],
    ['forbidden', 403, 'Forbidden'],
    ['notFound', 404, 'Not found'],
    ['conflict', 409, 'Conflict'],
  ])('%s() defaults to status %i with message "%s"', (method, status, defaultMessage) => {
    const err = ApiError[method]();
    expect(err.statusCode).toBe(status);
    expect(err.message).toBe(defaultMessage);
  });

  it('paymentRequired supports an optional machine-readable code', () => {
    const err = ApiError.paymentRequired('Trial expired', 'TRIAL_EXPIRED');
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe('TRIAL_EXPIRED');
  });
});
