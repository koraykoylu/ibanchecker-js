import { VERSION } from "./version.js";
import { FetchTransport, type Transport } from "./transport.js";
import {
  APIError,
  AuthenticationError,
  BadRequestError,
  IbanCheckerError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";
import {
  bankRecordFromApi,
  batchResultFromApi,
  formatSpecFromApi,
  validationResultFromApi,
  type BankRecord,
  type BatchResult,
  type FormatSpec,
  type ValidationResult,
} from "./models.js";

export const DEFAULT_BASE_URL = "https://ibanchecker.cash/api/v1";

const STATUS_ERRORS: Record<number, new (message: string, options?: any) => IbanCheckerError> = {
  400: BadRequestError,
  401: AuthenticationError,
  404: NotFoundError,
  429: RateLimitError,
};

export interface IbanCheckerOptions {
  /** Defaults to {@link DEFAULT_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number;
  /** Inject a custom {@link Transport} instead of the default fetch-based one. */
  transport?: Transport;
}

/**
 * Client for the ibanchecker.cash IBAN validation API.
 *
 * Validate IBANs across 92 countries, validate up to 100 IBANs per request,
 * extract IBANs from free text, look up country format specifications, and
 * resolve SWIFT/BIC codes.
 *
 * Every method except `getFormat` needs an API key; without one the API
 * answers 401 and the call rejects with an {@link AuthenticationError}. What a
 * key can call follows its plan: a free key (100 requests a month) covers
 * `validate` only, `validateBulk` and `lookupBic` need the Basic plan or above,
 * and `extract` needs the Growth plan or above. A call outside the key's plan
 * rejects with an {@link APIError} whose `errorCode` is `"PLAN_REQUIRED"`
 * (HTTP 403). A key whose email address has a verified account at
 * https://ibanchecker.cash/dashboard can try the methods its plan lacks: bulk
 * validation up to 10 IBANs per call, BIC lookup, and extraction up to 5,000
 * characters per call. Get a free key at https://ibanchecker.cash/api-docs.
 * `getFormat` needs no key and is then limited to 100 requests an hour per IP.
 *
 * @example
 * ```ts
 * import { IbanChecker } from "@ibanchecker/client";
 *
 * const client = new IbanChecker(process.env.IBANCHECKER_API_KEY);
 * const result = await client.validate("DE89 3704 0044 0532 0130 00");
 * if (result.valid) {
 *   console.log(result.bankName, result.bic);
 * }
 * ```
 */
export class IbanChecker {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly transport: Transport;

  constructor(apiKey?: string, options: IbanCheckerOptions = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.transport = options.transport ?? new FetchTransport(options.timeoutMs ?? 10_000);
  }

  /** Validate a single IBAN. Needs an API key on any plan, including a free
   * key; counts one request. Returns a result with `valid: false` for a
   * malformed IBAN (this is not an error); it rejects only on transport, auth,
   * quota, or server problems. */
  async validate(iban: string): Promise<ValidationResult> {
    const data = await this.request("POST", "/validate", { iban });
    return validationResultFromApi(data);
  }

  /** Validate up to 100 IBANs in one request. Needs an API key on the Basic
   * plan or above; a key with a verified account can try it with up to 10
   * IBANs per call. Counts one request per IBAN. Results come back in the same
   * order as the input. */
  async validateBulk(ibans: readonly string[]): Promise<BatchResult> {
    const data = await this.request("POST", "/validate/bulk", { ibans });
    return batchResultFromApi(data);
  }

  /** Scan free text (emails, invoices) for IBAN-shaped strings and validate
   * each candidate. Up to 50,000 characters per request. Needs an API key on
   * the Growth plan or above; a key with a verified account can try it with up
   * to 5,000 characters per call. Counts one request per IBAN found, at least
   * one per call. */
  async extract(text: string): Promise<BatchResult> {
    const data = await this.request("POST", "/extract", { text });
    return batchResultFromApi(data);
  }

  /** Return the IBAN format specification for an ISO 3166-1 alpha-2 country
   * code (e.g. `"DE"`). The only method that needs no API key; without one it
   * is limited to 100 requests an hour per IP. */
  async getFormat(country: string): Promise<FormatSpec> {
    const data = await this.request("GET", `/formats/${country.toLowerCase()}`);
    return formatSpecFromApi(data);
  }

  /** Resolve an 8 or 11 character ISO 9362 BIC to a bank record. Needs an API
   * key on the Basic plan or above, or a key with a verified account to try
   * it; counts one request. Without a key the API answers 401, raised as
   * {@link AuthenticationError}. */
  async lookupBic(bic: string): Promise<BankRecord> {
    const data = await this.request("GET", `/swift/${bic.toUpperCase()}`);
    return bankRecordFromApi(data);
  }

  private async request(
    method: string,
    path: string,
    jsonBody?: Record<string, unknown>,
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "User-Agent": `ibanchecker-js/${VERSION}`,
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    let body: string | null = null;
    if (jsonBody !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(jsonBody);
    }

    let response: { status: number; body: string };
    try {
      response = await this.transport.send(method, url, headers, body);
    } catch (err) {
      throw new IbanCheckerError(`Request to ${url} failed: ${(err as Error).message}`);
    }

    let parsed: any = {};
    try {
      parsed = response.body ? JSON.parse(response.body) : {};
    } catch {
      parsed = {};
    }

    if (response.status >= 400) {
      const message =
        (typeof parsed === "object" && parsed?.error) || `HTTP ${response.status}`;
      const errorCode = typeof parsed === "object" ? parsed?.error_code : undefined;
      const ErrorClass = STATUS_ERRORS[response.status] ?? APIError;
      throw new ErrorClass(message, {
        status: response.status,
        errorCode,
        response: parsed,
      });
    }

    return parsed;
  }
}
