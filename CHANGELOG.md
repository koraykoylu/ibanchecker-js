# Changelog

## 0.1.2

Documentation only, following changes in the API.

- `lookupBic` now needs an API key: the API answers `401` without one, which the client raises as `AuthenticationError`. `getFormat` is the only method that works without a key, limited to 100 requests an hour per IP
- What a key can call follows its plan: a free key covers `validate` only, `validateBulk` and `lookupBic` need the Basic plan or above, and `extract` needs the Growth plan or above
- A call outside the key's plan gets `403` with `error_code` `PLAN_REQUIRED`, which the client raises as `APIError`
- A key with a verified account can try the methods its plan lacks: bulk validation up to 10 IBANs per call, BIC lookup, and extraction up to 5,000 characters per call. Over that size the API answers `400` with `TOO_MANY_IBANS` or `TEXT_TOO_LONG`, raised as `BadRequestError`
- `validateBulk` counts one request per IBAN and `extract` one per IBAN found (at least one per call); a call that costs more than the requests left this month gets `429` `QUOTA_EXCEEDED`
- README and doc comments updated to match

The client's behaviour does not change.

## 0.1.1

Documentation only; the client's behaviour is unchanged.

- `validate`, `validateBulk` and `extract` now need an API key: the API answers `401` without one, which the client raises as `AuthenticationError`
- A free key covers 100 requests a month; over the limit the API answers `429` with `error_code` `QUOTA_EXCEEDED`, raised as `RateLimitError`
- `getFormat` and `lookupBic` still need no key, limited to 100 requests an hour per IP
- README, doc comments and test fixtures updated to match

## 0.1.0

Initial release.

- `IbanChecker` client: `validate`, `validateBulk`, `extract`, `getFormat`, `lookupBic`
- Zero runtime dependencies, native `fetch`-based transport, injectable `Transport` interface
- Dual ESM/CJS build with TypeScript type declarations
- Typed error hierarchy: `BadRequestError`, `AuthenticationError`, `NotFoundError`, `RateLimitError`, `APIError`
