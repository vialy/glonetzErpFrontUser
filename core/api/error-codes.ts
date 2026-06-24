/**
 * Miroir des codes d'erreur renvoyes par le backend dans l'enveloppe
 * { success, errorCode, errorMsg }. Source : src/config/index.js (ERROR_CODES).
 * Garde en un seul endroit pour eviter les nombres magiques dissemines.
 */
export const ERROR_CODES = Object.freeze({
  OK: 0,
  GENERIC: 1,
  VALIDATION: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  CONFLICT: 1005,
  RATE_LIMITED: 1006,
  INVALID_CREDENTIALS: 2001,
  PASSWORD_CHANGE_REQUIRED: 2002,
  INVALID_TOKEN: 2003,
  EXPIRED_TOKEN: 2004,
  GATEWAY_UNAVAILABLE: 3001,
  GATEWAY_ERROR: 3002,
  INSUFFICIENT_FUNDS: 3003,
  PAYMENT_NOT_FOUND: 3004,
  CLAIM_NOT_FOUND: 3005,
  OTP_INVALID: 4001,
  OTP_EXPIRED: 4002,
} as const)

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
