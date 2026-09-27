# @ibanchecker/client

Official JavaScript/TypeScript client for the [ibanchecker.cash](https://ibanchecker.cash) IBAN validation API.

Validate IBANs across 92 countries, validate up to 100 IBANs per request, extract IBANs from free text, look up country format specifications, and resolve SWIFT/BIC codes. No IBAN data is stored or logged; all validation runs in memory at the edge.

## Install

```bash
npm install @ibanchecker/client
```

Requires Node 18 or newer (for global `fetch`), or any modern browser bundler. There are no runtime dependencies. Ships both ESM and CommonJS builds plus TypeScript types.

## Quick start

```ts
import { IbanChecker } from "@ibanchecker/client";

const client = new IbanChecker(process.env.IBANCHECKER_API_KEY); // every method except getFormat needs a key

const result = await client.validate("DE89 3704 0044 0532 0130 00");
if (result.valid) {
  console.log(result.countryName); // "Germany"
  console.log(result.bankName); // "Commerzbank AG Cologne"
  console.log(result.bic); // "COBADEFFXXX"
} else {
  console.log(result.error); // human-readable reason
  console.log(result.errorCode); // e.g. "INVALID_COUNTRY"
}
```

CommonJS works the same way:

```js
const { IbanChecker } = require("@ibanchecker/client");
```

## Authentication

Every method except `getFormat()` needs an API key, `lookupBic()` included. Without one the API answers `401` and the client throws an `AuthenticationError`. The client does not check for a key before sending; the error comes from the API. Request a free key at [ibanchecker.cash/api-docs](https://ibanchecker.cash/api-docs) and it arrives by email in seconds. Paid plans with higher limits are at [ibanchecker.cash/pricing](https://ibanchecker.cash/pricing).

What a key can call follows its plan:

- A free key covers `validate()` only, with 100 requests a month.
- `validateBulk()` and `lookupBic()` need the Basic plan or above (Basic, Starter, Growth, Enterprise).
- `extract()` needs the Growth plan or above (Growth, Enterprise).

A call outside the key's plan gets `403` with `errorCode` `"PLAN_REQUIRED"`, which the client raises as an `APIError` (see [Error handling](#error-handling)).

A key whose email address has a verified account at [ibanchecker.cash/dashboard](https://ibanchecker.cash/dashboard) can try the methods its plan lacks, on any plan: `validateBulk()` with up to 10 IBANs per call, `lookupBic()`, and `extract()` with up to 5,000 characters per call. With the plan itself the limits are 100 IBANs per call and 50,000 characters per call. A trial call over the trial size gets `400`, raised as a `BadRequestError` with `errorCode` `"TOO_MANY_IBANS"` or `"TEXT_TOO_LONG"`.

`validate()` and `lookupBic()` count one request each. `validateBulk()` counts one request per IBAN in the call, and `extract()` one per IBAN it finds, at least one per call. A call that costs more than the requests left this month gets `429` with `errorCode` `"QUOTA_EXCEEDED"`.

`getFormat()` needs no key. Without one it is limited to 100 requests an hour per IP.

```ts
const client = new IbanChecker("iban_your_api_key");

// country format lookups only, no key
const formats = new IbanChecker();
```

## Methods

| Method | Description | API key |
| --- | --- | --- |
| `validate(iban: string)` | Validate a single IBAN. Returns a `ValidationResult`. | Required, any plan |
| `validateBulk(ibans: string[])` | Validate up to 100 IBANs. Returns a `BatchResult`. | Required, Basic or above |
| `extract(text: string)` | Find and validate IBANs in free text (up to 50,000 chars). Returns a `BatchResult`. | Required, Growth or above |
| `getFormat(country: string)` | IBAN format spec for an ISO country code. Returns a `FormatSpec`. | Not needed |
| `lookupBic(bic: string)` | Resolve an 8 or 11 character BIC. Returns a `BankRecord`. | Required, Basic or above |

### Bulk validation

```ts
const batch = await client.validateBulk([
  "DE89370400440532013000",
  "GB29NWBK60161331926819",
  "XX00",
]);

console.log(`${batch.validCount} of ${batch.count} valid`);

for (const result of batch.results) {
  // results come back in input order
  console.log(result.iban, result.valid ? "ok" : "bad");
}
```

### Extract from text

```ts
const batch = await client.extract("Please wire to DE89 3704 0044 0532 0130 00 by Friday.");

for (const result of batch.results) {
  console.log(result.iban, result.bankName);
}
```

### Country format and BIC lookup

`getFormat()` needs no API key (100 requests an hour per IP without one). `lookupBic()` needs a key on the Basic plan or above, or a key with a verified account to try it.

```ts
const format = await client.getFormat("DE");
console.log(format.length, format.example); // 22 DE89370400440532013000

for (const field of format.bbanFields) {
  console.log(field.label, field.length);
}

const bank = await client.lookupBic("DEUTDEFF");
console.log(bank.bankName, bank.city); // Deutsche Bank AG  FRANKFURT AM MAIN
```

### The national check digit

For a number of countries the API also runs the national account check digit on top of the ISO 13616 check, and reports it on `nationalCheckValid`. It is advisory: an IBAN with `valid: true` is a valid IBAN whatever this says. A `false` usually means a transcription error in the account number. It is `null` where the country has no such scheme.

```ts
const result = await client.validate("DE89370400440532013000");
if (result.valid && result.nationalCheckValid === false) {
  console.log("Valid IBAN, but the account number looks mistyped.");
}
```

## Error handling

A malformed IBAN is **not** an exception: `validate()` resolves to a `ValidationResult` with `valid: false`. Rejections happen only for transport, authentication, plan, quota, and server-side problems.

- `AuthenticationError` (401): the key is missing, invalid or inactive. Every method except `getFormat()` raises it when no key was given, `lookupBic()` included.
- `APIError` (403): `errorCode` is `"PLAN_REQUIRED"` when the key's plan does not cover the method. `err.response.required_plan` is `"basic"` or `"growth"`, and `err.response.upgrade_url` points to the pricing page. The client has no separate class for `403`, so check `err.status` or `err.errorCode`. `APIError` also covers server-side errors (5xx).
- `BadRequestError` (400): besides a malformed request, a trial call over the trial size gets this, with `errorCode` `"TOO_MANY_IBANS"` (bulk validation) or `"TEXT_TOO_LONG"` (extraction).
- `RateLimitError` (429): `errorCode` is `"QUOTA_EXCEEDED"` when a key has used its monthly requests or a call costs more than the requests left (the count resets on the 1st of the month, UTC), or `"RATE_LIMIT_EXCEEDED"` when format lookups without a key pass 100 an hour from one IP. `err.response.retry_after` gives the seconds until the limit resets, and a quota error also carries `err.response.upgrade_url`.

```ts
import { APIError, AuthenticationError, NotFoundError, RateLimitError } from "@ibanchecker/client";

try {
  const bank = await client.lookupBic("ZZZZZZZZ");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("No bank for that BIC");
  } else if (err instanceof APIError && err.errorCode === "PLAN_REQUIRED") {
    console.log("This key's plan does not include BIC lookup");
  } else if (err instanceof RateLimitError) {
    console.log(err.errorCode, err.message); // "QUOTA_EXCEEDED" or "RATE_LIMIT_EXCEEDED"
  } else if (err instanceof AuthenticationError) {
    console.log("Missing or invalid API key");
  } else {
    throw err;
  }
}
```

Every error extends `IbanCheckerError` and carries `.status`, `.errorCode`, and `.response`.

## Using your own HTTP stack

The client ships a `fetch`-based transport and needs nothing installed. If your application already routes requests through its own HTTP layer, implement the `Transport` interface and pass it in. This is also how the test suite runs without a network.

```ts
import { IbanChecker, type Transport } from "@ibanchecker/client";

const myTransport: Transport = {
  async send(method, url, headers, body) {
    // ... return { status: number, body: string }
  },
};

const client = new IbanChecker("iban_your_api_key", { transport: myTransport });
```

## Raw responses

Every result keeps the untouched response body on `.raw`, so a field added to the API later is reachable without waiting for a client release.

```ts
const result = await client.validate("DE89370400440532013000");
console.log(result.raw.transfer_type); // "SEPA+SWIFT"
```

## Tests

```bash
npm install
npm test
```

## Links

- Website: https://ibanchecker.cash
- API documentation: https://ibanchecker.cash/api-docs
- OpenAPI spec: https://ibanchecker.cash/openapi.json
- Free online tools: https://ibanchecker.cash/tools

## License

MIT
