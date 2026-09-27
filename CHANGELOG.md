# Changelog

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
