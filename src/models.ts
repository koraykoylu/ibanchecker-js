/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BbanField {
  label?: string;
  length?: number;
  type?: string;
  description?: string;
  /** The untouched field object from the API response. */
  raw: Record<string, unknown>;
}

/** Result of validating one IBAN.
 *
 * `valid` is the primary flag. When it is `false`, only `iban`, `formatted`,
 * `country`, `countryName`, `error` and `errorCode` are populated.
 */
export interface ValidationResult {
  valid: boolean;
  iban: string;
  formatted?: string | null;
  checkDigits?: string | null;
  bban?: string | null;
  country?: string | null;
  countryName?: string | null;
  bankName?: string | null;
  bankType?: string | null;
  bic?: string | null;
  bankCity?: string | null;
  bankCode?: string | null;
  branchCode?: string | null;
  accountNumber?: string | null;
  /** Informational domestic account check digit beyond the IBAN's own MOD-97
   * (e.g. Germany's per-bank Pruefziffer, the UK sort-code + account modulus
   * check). `true` means it matches, `false` means a likely transcription
   * error, `null` means no such scheme applies to this country. This never
   * affects `valid`. */
  nationalCheckValid?: boolean | null;
  currency?: string | null;
  currencyName?: string | null;
  transferType?: string | null;
  sepa?: boolean | null;
  flag?: string | null;
  error?: string;
  errorCode?: string;
  /** The untouched response body. */
  raw: Record<string, unknown>;
}

/** Result of a bulk validation or text extraction call: the per-IBAN
 * {@link ValidationResult} list plus the summary counts. */
export interface BatchResult {
  count: number;
  validCount: number;
  invalidCount: number;
  results: ValidationResult[];
  raw: Record<string, unknown>;
}

/** IBAN format specification for a single country. */
export interface FormatSpec {
  countryCode?: string;
  countryName?: string;
  length?: number;
  currency?: string;
  currencyName?: string;
  sepa?: boolean;
  swift?: boolean;
  formatString?: string;
  example?: string;
  bbanFields: BbanField[];
  raw: Record<string, unknown>;
}

/** Bank identification for a SWIFT/BIC code. */
export interface BankRecord {
  bic?: string;
  bic8?: string;
  bankCode?: string;
  countryCode?: string;
  locationCode?: string;
  branchCode?: string | null;
  bankName?: string;
  city?: string | null;
  countryName?: string;
  sepa?: boolean | null;
  type?: string | null;
  status?: string | null;
  raw: Record<string, unknown>;
}

function bbanFieldFromApi(data: any): BbanField {
  return {
    label: data.label,
    length: data.length,
    type: data.type,
    description: data.description,
    raw: data,
  };
}

export function validationResultFromApi(data: any): ValidationResult {
  return {
    valid: Boolean(data.valid),
    iban: data.iban ?? "",
    formatted: data.formatted ?? null,
    checkDigits: data.check_digits ?? null,
    bban: data.bban ?? null,
    country: data.country ?? null,
    countryName: data.country_name ?? null,
    bankName: data.bank_name ?? null,
    bankType: data.bank_type ?? null,
    bic: data.bic ?? null,
    bankCity: data.bank_city ?? null,
    bankCode: data.bank_code ?? null,
    branchCode: data.branch_code ?? null,
    accountNumber: data.account_number ?? null,
    nationalCheckValid: data.national_check_valid ?? null,
    currency: data.currency ?? null,
    currencyName: data.currency_name ?? null,
    transferType: data.transfer_type ?? null,
    sepa: data.sepa ?? null,
    flag: data.flag ?? null,
    error: data.error,
    errorCode: data.error_code,
    raw: data,
  };
}

export function batchResultFromApi(data: any): BatchResult {
  const results = Array.isArray(data.results) ? data.results.map(validationResultFromApi) : [];
  return {
    count: data.count ?? 0,
    validCount: data.valid_count ?? 0,
    invalidCount: data.invalid_count ?? 0,
    results,
    raw: data,
  };
}

export function formatSpecFromApi(data: any): FormatSpec {
  return {
    countryCode: data.country_code,
    countryName: data.country_name,
    length: data.length,
    currency: data.currency,
    currencyName: data.currency_name,
    sepa: data.sepa,
    swift: data.swift,
    formatString: data.format_string,
    example: data.example,
    bbanFields: Array.isArray(data.bban_fields) ? data.bban_fields.map(bbanFieldFromApi) : [],
    raw: data,
  };
}

export function bankRecordFromApi(data: any): BankRecord {
  return {
    bic: data.bic,
    bic8: data.bic8,
    bankCode: data.bank_code,
    countryCode: data.country_code,
    locationCode: data.location_code,
    branchCode: data.branch_code ?? null,
    bankName: data.bank_name,
    city: data.city ?? null,
    countryName: data.country_name,
    sepa: data.sepa ?? null,
    type: data.type ?? null,
    status: data.status ?? null,
    raw: data,
  };
}
