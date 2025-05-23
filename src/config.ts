export default {
  claims: {
    freeAccount: {
      MIN_RC_PCT: 90,
      MIN_RC: 5000000000,
    },
  },
  transactions: {
    expirationTimeInMinutes: 2,
    multisigExpirationTimeInMinutes: 24 * 60, // 24 hours
  },
  rpc: {
    defaultTimeout: 3000,
  },
};