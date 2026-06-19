// Generic request validator. `schema` is an object that may contain Zod
// schemas for any of `body`, `query`, `params`. Parsed (and defaulted)
// values are written back onto `req` so controllers receive clean data.
// Throws a ZodError on failure, which error.middleware.js formats as a 400.
const validate = (schema) => (req, res, next) => {
  if (schema.body) {
    req.body = schema.body.parse(req.body);
  }
  if (schema.query) {
    req.query = schema.query.parse(req.query);
  }
  if (schema.params) {
    req.params = schema.params.parse(req.params);
  }
  next();
};

module.exports = validate;
