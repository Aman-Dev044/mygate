// Wraps async route handlers so errors go to the global error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = asyncHandler;
