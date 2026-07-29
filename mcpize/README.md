# IBAN Validator: Verify & Bulk-Check Bank IBANs

Validate any IBAN **offline** against the official **ISO 13616** algorithm — the mod-97 checksum plus each country's own length and BBAN structure — and get back a clear, typed reason the moment one fails.

An MCP server hosted on [MCPize](https://mcpize.com). Shares its validation core with the [IBAN Validator Apify Actor](https://apify.com/apifmcpfactory/iban-validator) — same ISO 13616 algorithm, same bundled country registry, two ways to call it.

## What it does

Every IBAN encodes a country-specific length and structure, plus a 2-digit checksum computed from the rest of the number (ISO 7064 MOD 97-10). This server checks both, entirely **offline**: no bank API, no network call, no data ever leaves the request. It's deterministic — the same input always returns the same result — and instant, since the whole check is arithmetic plus a lookup against a bundled, public reference table (the IBAN registry's per-country structures, ~76 countries).

**Who it's for:** finance and ops teams cleaning a payment or supplier IBAN list before a payment run, payment platforms validating an account before a payout, onboarding/KYB flows checking a counterparty's bank details, and AI agents that need an IBAN check as one step in a larger workflow.

## Why it's built this way

- **Honest about *why* it failed** — most checkers return one flat `true`/`false`. This one reports a `status` that names the exact failure: `INVALID_CHECKSUM` (right shape, wrong check digits — likely a typo), `INVALID_STRUCTURE` (wrong BBAN pattern for that country), `INVALID_LENGTH`, `INVALID_COUNTRY` (unrecognized prefix), or `INVALID_INPUT`.
- **Offline and instant** — no bank API, no rate limits, no per-provider dependency. A 1,000-IBAN batch is arithmetic, not network calls.
- **Input-tolerant** — accepts messy real-world formatting (`gb29 nwbk 6016 1331 9268 19`, mixed case) and normalizes it automatically.
- **Bulk-ready** — validate up to 1,000 IBANs in one call, one typed result per input, in order. A single bad entry never fails the batch.
- **Validation only, honestly scoped** — this confirms an IBAN is *structurally and mathematically valid*. It does **not** look up the bank name, BIC, or confirm the account actually exists — that needs a licensed bank directory this server deliberately doesn't claim to have. Planned as a future addition once a free, public data source exists.
- **Nothing stored** — every check is computed in memory against the bundled registry and discarded; nothing is logged or retained between calls.

## Who it's for

**For finance teams.** Before a SEPA payment run, validate the supplier IBAN column and get a per-row reason, so a transposed digit is caught before the bank rejects the batch.

**For compliance and KYB.** Confirm a counterparty's stated IBAN is structurally genuine and note whether the country is a SEPA participant, as one input to an onboarding file.

**For developers and AI agents.** Call `validate_iban` in a vendor-onboarding form and return the specific failure — wrong country, wrong length, failed checksum — rather than a generic "invalid".

### When to use it, and when not to

**Use it** to check that an IBAN is correctly formed for its country: checksum, length, structure and SEPA membership, offline and instantly.

**Do not use it** to confirm an account exists or belongs to a particular person. No offline check can establish that, and this one does not try. It also does not look up bank names or BICs.

## Tools

### `validate_iban`

Validate one IBAN against the ISO 13616 checksum and its country's BBAN structure.

Example call:

```json
{ "iban": "GB29NWBK60161331926819" }
```

Example output:

```json
{
  "input": "GB29NWBK60161331926819",
  "valid": true,
  "countryCode": "GB",
  "checkDigits": "29",
  "structureValid": true,
  "checkDigitsValid": true,
  "sepaCountry": true,
  "electronicFormat": "GB29NWBK60161331926819",
  "printFormat": "GB29 NWBK 6016 1331 9268 19",
  "status": "VALID"
}
```

`status` is one of `VALID`, `INVALID_CHECKSUM`, `INVALID_STRUCTURE`, `INVALID_LENGTH`, `INVALID_COUNTRY`, or `INVALID_INPUT` — never collapsed into one generic failure.

### `bulk_check_iban`

Validate up to 1,000 IBANs in one call; returns one result per IBAN plus a status-count summary. A single bad entry never fails the batch.

Example call:

```json
{ "ibans": ["GB29NWBK60161331926819", "DE89370400440532013000"] }
```

Output: `{ results: [ per-IBAN objects shaped like validate_iban ], summary: { total, valid, invalid_checksum, invalid_structure, invalid_length, invalid_country, invalid_input } }`.

## FAQ

**Is this IBAN valid?** Call `validate_iban` with the IBAN. `valid: true` (and `status: "VALID"`) means it passed every check: recognized country, correct length, correct BBAN structure, and a passing checksum. Check `status`, not just `valid` — it tells you exactly what's wrong when it isn't.

**Can I bulk validate a list of IBANs?** Yes — `bulk_check_iban` accepts up to 1,000 IBANs per call, always in the same order, with a summary tally. A single bad entry never fails the batch.

**What is an IBAN check digit?** The 2 digits right after the country code (e.g. the `29` in `GB29...`). They're computed from the rest of the IBAN via the ISO 7064 MOD 97-10 algorithm: the country code and check digits move to the end, letters become numbers (A=10 … Z=35), and the result must be divisible by 97 with remainder 1. A single mistyped character almost always breaks this — exactly what `checkDigitsValid: false` catches, offline.

**Does it cover SEPA?** Yes — every result includes `sepaCountry`, flagging whether the country is one of the 36 official SEPA scheme participants (the EU plus the UK, Switzerland, Norway, Iceland, Liechtenstein, Monaco, San Marino, Andorra, and Vatican City).

## Trust & limits

Every check runs entirely offline against a bundled, public reference table — no bank API, no external service, nothing stored beyond the response. This is **validation only**: it confirms an IBAN's structure and checksum are correct, not that the account exists, is open, or belongs to a particular name — that requires the receiving bank itself. It does not look up bank names or BICs (no licensed directory bundled here).

## Using this from an AI agent (MCP)

```json
// validate_iban
{ "iban": "GB29NWBK60161331926819" }

// bulk_check_iban
{ "ibans": ["GB29NWBK60161331926819", "DE89370400440532013000"] }
```

## Local development

```bash
npm install
npm run dev     # http://localhost:8080/mcp, hot reload
npm test        # vitest
npm run build   # tsc
```

## Deployment

```bash
mcpize login
mcpize deploy
mcpize publish --show
```

## License

MIT

— A Howth Technology Factory tool. Official sources, nothing stored.
