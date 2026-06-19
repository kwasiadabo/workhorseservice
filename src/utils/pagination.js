const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Parses `?page=&limit=&sort=` query params into Sequelize findAndCountAll
// options plus pagination metadata for the response.
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  let order;
  if (query.sort) {
    const direction = query.sort.startsWith('-') ? 'DESC' : 'ASC';
    const field = query.sort.replace(/^-/, '');
    order = [[field, direction]];
  }

  return { page, limit, offset, order };
};

const buildPaginationMeta = ({ page, limit, count }) => ({
  page,
  limit,
  total: count,
  totalPages: Math.ceil(count / limit) || 1,
});

module.exports = { parsePagination, buildPaginationMeta };
