/**
 * Official JavaScript/TypeScript client for the ibanchecker.cash IBAN
 * validation API.
 *
 * See https://ibanchecker.cash/api-docs for the full API reference.
 */

export { VERSION } from "./version.js";
export { IbanChecker, DEFAULT_BASE_URL, type IbanCheckerOptions } from "./client.js";
export { type Transport, FetchTransport } from "./transport.js";
export {
  IbanCheckerError,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APIError,
} from "./errors.js";
export {
  type ValidationResult,
  type BatchResult,
  type FormatSpec,
  type BbanField,
  type BankRecord,
} from "./models.js";
