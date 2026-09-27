export interface IbanCheckerErrorOptions {
  status?: number;
  errorCode?: string;
  response?: unknown;
}

/** Base class for every error this client throws. */
export class IbanCheckerError extends Error {
  readonly status?: number;
  readonly errorCode?: string;
  readonly response?: unknown;

  constructor(message: string, options: IbanCheckerErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.response = options.response;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The request was malformed (HTTP 400). */
export class BadRequestError extends IbanCheckerError {}

/** The API key is missing, invalid, or inactive (HTTP 401). Validation, bulk
 * validation and extraction raise this when no key was given. */
export class AuthenticationError extends IbanCheckerError {}

/** The requested country code or BIC was not found (HTTP 404). */
export class NotFoundError extends IbanCheckerError {}

/** A limit was exceeded (HTTP 429): the key's monthly quota
 * (`errorCode` `"QUOTA_EXCEEDED"`) or, for format and BIC lookups, the hourly
 * per-IP limit (`"RATE_LIMIT_EXCEEDED"`). */
export class RateLimitError extends IbanCheckerError {}

/** An unexpected server-side error (HTTP 5xx or other). */
export class APIError extends IbanCheckerError {}
