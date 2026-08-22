# Changelog

## 0.1.0

Initial release.

- `IbanChecker` client: `validate`, `validateBulk`, `extract`, `getFormat`, `lookupBic`
- Zero runtime dependencies, native `fetch`-based transport, injectable `Transport` interface
- Dual ESM/CJS build with TypeScript type declarations
- Typed error hierarchy: `BadRequestError`, `AuthenticationError`, `NotFoundError`, `RateLimitError`, `APIError`
