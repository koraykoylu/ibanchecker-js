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

/** The request was malformed (HTTP 400). A trial call over the trial size
 * also gets this: `errorCode` `"TOO_MANY_IBANS"` for bulk validation over 10
 * IBANs, `"TEXT_TOO_LONG"` for extraction over 5,000 characters. */
export class BadRequestError extends IbanCheckerError {}

/** The API key is missing, invalid, or inactive (HTTP 401). Validation, bulk
 * validation, extraction and BIC lookups raise this when no key was given: the
 * client sends the request without a key and the error comes from the API's
 * 401. Only country format lookups work without a key. */
export class AuthenticationError extends IbanCheckerError {}

/** The requested country code or BIC was not found (HTTP 404). */
export class NotFoundError extends IbanCheckerError {}

/** A limit was exceeded (HTTP 429): the key's monthly quota
 * (`errorCode` `"QUOTA_EXCEEDED"`, also when one call costs more than the
 * requests left this month) or, for country format lookups without a key, the
 * hourly per-IP limit (`"RATE_LIMIT_EXCEEDED"`). */
export class RateLimitError extends IbanCheckerError {}

/** An unexpected server-side error (HTTP 5xx), or any other status without a
 * class of its own. That includes HTTP 403 when the key's plan does not cover
 * the endpoint: `errorCode` is `"PLAN_REQUIRED"`, and `response.required_plan`
 * (`"basic"` or `"growth"`) and `response.upgrade_url` say which plan it needs
 * and where to get it. */
export class APIError extends IbanCheckerError {}
