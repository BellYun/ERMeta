module.exports = {
  claimRefresh: async () => ({ status: 'acquired', token: 'test-lease' }),
  recordRefreshFailure: async (_scope, _token, _failure, retryAfter = 1) => retryAfter,
  releaseRefresh: async () => {},
};
