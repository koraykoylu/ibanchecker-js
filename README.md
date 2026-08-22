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

const client = new IbanChecker(); // no API key needed for light use (100 requests/hour per IP)

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

An API key is optional. Without one, requests are limited to 100 per hour per IP. With a key, requests count against your plan quota. Get a free key at [ibanchecker.cash/api-docs](https://ibanchecker.cash/api-docs).

```ts
const client = new IbanChecker("iban_your_api_key");
```

## Methods

| Method | Description |
| --- | --- |
| `validate(iban: string)` | Validate a single IBAN. Returns a `ValidationResult`. |
| `validateBulk(ibans: string[])` | Validate up to 100 IBANs. Returns a `BatchResult`. |
| `extract(text: string)` | Find and validate IBANs in free text (up to 50,000 chars). Returns a `BatchResult`. |
| `getFormat(country: string)` | IBAN format spec for an ISO country code. Returns a `FormatSpec`. |
| `lookupBic(bic: string)` | Resolve an 8 or 11 character BIC. Returns a `BankRecord`. |

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

A malformed IBAN is **not** an exception: `validate()` resolves to a `ValidationResult` with `valid: false`. Rejections happen only for transport, authentication, quota, and server-side problems.

```ts
import { AuthenticationError, NotFoundError, RateLimitError } from "@ibanchecker/client";

try {
  const bank = await client.lookupBic("ZZZZZZZZ");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("No bank for that BIC");
  } else if (err instanceof RateLimitError) {
    console.log("Slow down:", err.message);
  } else if (err instanceof AuthenticationError) {
    console.log("Check your API key");
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
