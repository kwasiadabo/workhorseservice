const { parsePagination, buildPaginationMeta } = require('../pagination');

describe('parsePagination', () => {
  it('defaults to page 1, limit 20, no explicit order', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, offset: 0, order: undefined });
  });

  it('computes offset from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({
      page: 3,
      limit: 10,
      offset: 20,
      order: undefined,
    });
  });

  it('clamps limit to the max of 100 even if a larger value is requested', () => {
    expect(parsePagination({ limit: '500' }).limit).toBe(100);
  });

  it('clamps page to at least 1 for invalid/negative input', () => {
    expect(parsePagination({ page: '-5' }).page).toBe(1);
    expect(parsePagination({ page: 'not-a-number' }).page).toBe(1);
  });

  it('parses a plain sort field as ascending', () => {
    expect(parsePagination({ sort: 'name' }).order).toEqual([['name', 'ASC']]);
  });

  it('parses a "-" prefixed sort field as descending', () => {
    expect(parsePagination({ sort: '-createdAt' }).order).toEqual([['createdAt', 'DESC']]);
  });
});

describe('buildPaginationMeta', () => {
  it('computes totalPages from count and limit', () => {
    expect(buildPaginationMeta({ page: 2, limit: 20, count: 45 })).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('never reports zero total pages, even with zero results', () => {
    expect(buildPaginationMeta({ page: 1, limit: 20, count: 0 }).totalPages).toBe(1);
  });
});
