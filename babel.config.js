// Only used by Jest to transform the handful of ESM-only node_modules
// packages (currently: uuid, a transitive Sequelize dependency) so tests can
// require service files normally. Has no effect on the actual running app —
// production code runs as plain CommonJS via `node server.js`.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
