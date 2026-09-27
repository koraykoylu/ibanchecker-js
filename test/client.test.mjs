import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IbanChecker,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APIError,
} from "../dist/index.js";

/** A Transport that returns pre-programmed responses instead of hitting the
 * network, and records every call it received. */
class MockTransport {
  constructor(status, body) {
    this.status = status;
    this.body = body;
    this.calls = [];
  }

  async send(method, url, headers, body) {
    this.calls.push({ method, url, headers, body });
    return { status: this.status, body: JSON.stringify(this.body) };
  }
}

test("validate() returns a valid result and does not throw", async () => {
  const transport = new MockTransport(200, {
    valid: true,
    iban: "DE89370400440532013000",
    formatted: "DE89 3704 0044 0532 0130 00",
    country: "DE",
    country_name: "Germany",
    bank_name: "Commerzbank AG Cologne",
    bic: "COBADEFFXXX",
    national_check_valid: true,
  });
  const client = new IbanChecker(undefined, { transport });

  const result = await client.validate("DE89 3704 0044 0532 0130 00");

  assert.equal(result.valid, true);
  assert.equal(result.countryName, "Germany");
  assert.equal(result.bankName, "Commerzbank AG Cologne");
  assert.equal(result.bic, "COBADEFFXXX");
  assert.equal(result.nationalCheckValid, true);
  assert.equal(result.raw.country_name, "Germany");

  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0].method, "POST");
  assert.match(transport.calls[0].url, /\/validate$/);
  assert.deepEqual(JSON.parse(transport.calls[0].body), { iban: "DE89 3704 0044 0532 0130 00" });
});

test("validate() returns valid:false for a malformed IBAN without throwing", async () => {
  const transport = new MockTransport(200, {
    valid: false,
    iban: "INVALIDIBAN123",
    country: "IN",
    country_name: "Unknown",
    error: '"IN" is not a recognized IBAN country code.',
    error_code: "INVALID_COUNTRY",
  });
  const client = new IbanChecker(undefined, { transport });

  const result = await client.validate("INVALIDIBAN123");

  assert.equal(result.valid, false);
  assert.equal(result.errorCode, "INVALID_COUNTRY");
});

test("validateBulk() maps count fields and the results array in order", async () => {
  const transport = new MockTransport(200, {
    count: 2,
    valid_count: 1,
    invalid_count: 1,
    results: [
      { valid: true, iban: "DE89370400440532013000" },
      { valid: false, iban: "XX00", error_code: "INVALID_COUNTRY" },
    ],
  });
  const client = new IbanChecker("iban_test_key", { transport });

  const batch = await client.validateBulk(["DE89370400440532013000", "XX00"]);

  assert.equal(batch.count, 2);
  assert.equal(batch.validCount, 1);
  assert.equal(batch.invalidCount, 1);
  assert.equal(batch.results.length, 2);
  assert.equal(batch.results[0].iban, "DE89370400440532013000");
  assert.equal(batch.results[1].errorCode, "INVALID_COUNTRY");

  assert.equal(transport.calls[0].headers.Authorization, "Bearer iban_test_key");
});

test("extract() shares the same BatchResult shape as validateBulk()", async () => {
  const transport = new MockTransport(200, {
    count: 1,
    valid_count: 1,
    invalid_count: 0,
    results: [{ valid: true, iban: "DE89370400440532013000", bank_name: "Commerzbank AG Cologne" }],
  });
  const client = new IbanChecker(undefined, { transport });

  const batch = await client.extract("Please pay DE89370400440532013000 by Friday");

  assert.equal(batch.count, 1);
  assert.equal(batch.results[0].bankName, "Commerzbank AG Cologne");
  assert.deepEqual(JSON.parse(transport.calls[0].body), {
    text: "Please pay DE89370400440532013000 by Friday",
  });
});

test("getFormat() maps bban_fields and lowercases the country code in the URL", async () => {
  const transport = new MockTransport(200, {
    country_code: "DE",
    country_name: "Germany",
    length: 22,
    example: "DE89370400440532013000",
    bban_fields: [{ label: "BLZ", length: 8, type: "numeric", description: "Bank routing code" }],
  });
  const client = new IbanChecker(undefined, { transport });

  const format = await client.getFormat("DE");

  assert.equal(format.length, 22);
  assert.equal(format.bbanFields.length, 1);
  assert.equal(format.bbanFields[0].label, "BLZ");
  assert.match(transport.calls[0].url, /\/formats\/de$/);
});

test("lookupBic() uppercases the BIC in the URL", async () => {
  const transport = new MockTransport(200, {
    bic: "COBADEFF",
    bic8: "COBADEFF",
    bank_name: "Commerzbank AG",
    city: "Frankfurt/Main",
  });
  const client = new IbanChecker(undefined, { transport });

  const bank = await client.lookupBic("cobadeff");

  assert.equal(bank.bankName, "Commerzbank AG");
  assert.match(transport.calls[0].url, /\/swift\/COBADEFF$/);
});

const statusCases = [
  [400, BadRequestError, "MISSING_IBAN"],
  [401, AuthenticationError, "UNAUTHORIZED"],
  [404, NotFoundError, "BIC_NOT_FOUND"],
  [429, RateLimitError, "QUOTA_EXCEEDED"],
  [500, APIError, undefined],
];

for (const [status, ErrorClass, errorCode] of statusCases) {
  test(`a ${status} response raises ${ErrorClass.name}`, async () => {
    const transport = new MockTransport(status, { error: "boom", error_code: errorCode });
    const client = new IbanChecker(undefined, { transport });

    await assert.rejects(() => client.lookupBic("ZZZZZZZZ"), (err) => {
      assert.ok(err instanceof ErrorClass);
      assert.equal(err.status, status);
      assert.equal(err.errorCode, errorCode);
      assert.equal(err.message, "boom");
      return true;
    });
  });
}

test("a transport-level failure raises the base IbanCheckerError", async () => {
  const client = new IbanChecker(undefined, {
    transport: {
      async send() {
        throw new Error("network down");
      },
    },
  });

  await assert.rejects(() => client.validate("DE89370400440532013000"), /network down/);
});
