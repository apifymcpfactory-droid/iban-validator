# IBAN Validator — offline ISO 13616 checksum & structure check, in bulk

Validate any IBAN **offline** against the official **ISO 13616** algorithm — the mod-97 checksum plus each country's own length and BBAN structure — and get back a clear, typed reason the moment one fails. Built for finance and ops teams cleaning a payment file, payment platforms validating an account before a payout, and AI agents that need an IBAN check as one step in a larger workflow.

**$5 per 1,000 validations flat** — with a low per-run start fee and nothing else. No bank API, no data ever leaves the run: the entire check is a deterministic, offline algorithm.

## Use with AI agents (MCP)

This Actor is also an **MCP tool** — AI agents like Claude and Cursor can run it for you. Your agent can call this tool directly; usage bills through your Apify account.

**MCP server URL:**

```
https://mcp.apify.com?tools=apifmcpfactory/iban-validator
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
    "mcpServers": {
        "iban-validator": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "https://mcp.apify.com?tools=apifmcpfactory/iban-validator",
                "--header",
                "Authorization: Bearer YOUR_APIFY_TOKEN"
            ]
        }
    }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
    "mcpServers": {
        "iban-validator": {
            "url": "https://mcp.apify.com?tools=apifmcpfactory/iban-validator",
            "headers": {
                "Authorization": "Bearer YOUR_APIFY_TOKEN"
            }
        }
    }
}
```

Replace `YOUR_APIFY_TOKEN` with your API token from [Apify Console](https://console.apify.com/settings/integrations). This same IBAN Validator is also published standalone on [MCPize](https://mcpize.com/mcp/iban-validator-mcp) as a free community MCP server.

## Why this Actor?

- **Offline and instant** — the ISO 13616 checksum and each country's IBAN structure are a pure algorithm plus a bundled reference table (the free, public IBAN registry). No bank API call, no network dependency, no per-provider rate limit — a 1,000-IBAN batch finishes in well under a second of actual compute.
- **Honest about *why* it failed** — most checkers return one flat `true`/`false`. This one reports `status`: `INVALID_CHECKSUM` (right shape, wrong check digits — likely a typo), `INVALID_STRUCTURE` (wrong BBAN pattern for that country), `INVALID_LENGTH`, `INVALID_COUNTRY` (unrecognized prefix), or `INVALID_INPUT` — so you know exactly what to fix, not just that something's wrong.
- **Bulk-safe by design** — up to 1,000 IBANs per run, one dataset row per input, in order. A single bad entry never fails the batch.
- **Input-tolerant** — accepts messy real-world formatting (`gb29 nwbk 6016 1331 9268 19`, mixed case) and normalizes it automatically before checking.
- **Validation only, honestly scoped** — this checks that an IBAN is *structurally and mathematically valid*. It does **not** look up the bank name, BIC, or confirm the account actually exists or is open — that needs a licensed bank directory this Actor deliberately doesn't claim to have.

## Input

```json
{
    "ibans": ["GB29NWBK60161331926819", "de89 3704 0044 0532 0130 00", "FR00INVALID"]
}
```

## Output

One dataset item per IBAN, in the same order as the input:

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

An invalid entry still returns every field it can determine — `countryCode` and `checkDigits` are populated even when `status` is `INVALID_CHECKSUM` or `INVALID_STRUCTURE`, so you always know which country and which check failed. You can download the dataset in various formats such as JSON, HTML, CSV, or Excel.

## What is an IBAN check digit?

The 2 digits right after the country code (e.g. the `29` in `GB29...`) are computed from the rest of the IBAN using the **ISO 7064 MOD 97-10** algorithm: the country code and check digits move to the end, letters become numbers (A=10 … Z=35), and the whole number must be divisible by 97 with remainder 1. A single mistyped digit anywhere in the IBAN almost always breaks this — which is exactly what `checkDigitsValid: false` catches, without ever contacting a bank.

## Does it cover SEPA?

Yes — every result includes `sepaCountry`, flagging whether the IBAN's country is one of the 36 official SEPA scheme participants (the EU plus the UK, Switzerland, Norway, Iceland, Liechtenstein, Monaco, San Marino, Andorra, and Vatican City). Useful for confirming an IBAN is eligible for a SEPA Credit Transfer before you submit a payment file.

## FAQ

**Is this IBAN valid?** Call this Actor with the IBAN in `ibans`. `valid: true` (and `status: "VALID"`) means it passed every check: recognized country, correct length, correct BBAN structure, and a passing checksum.

**Can I bulk validate a list of IBANs?** Yes — up to 1,000 per run, one result row per input, always in the same order, and a single bad entry never breaks the rest of the batch.

**Does it check that the account is real?** No. This validates the IBAN's *format* — structure and checksum — offline. Confirming the account actually exists and is open requires the receiving bank itself (e.g. a real payment or a bank's own account-verification service); no licensed data source for that is bundled here.

**Does it look up the bank name or BIC?** Not in this version — that needs a licensed BIC/bank directory. Planned as a future addition once a free, public data source is available; today this Actor is validation-only, and does not claim bank-lookup.

## GDPR & lawful use

IBANs are processed entirely in memory against a bundled, public reference table (the IBAN registry's country structures) — no external API call, nothing stored beyond your own run's dataset, no third-party enrichment.

## More tools from MCP Factory

- **[EU VAT Validator](https://apify.com/apifmcpfactory/eu-vat-validator)** — validate EU VAT numbers against the official VIES registry, with audit-evidence consultation numbers.
- **[Sanctions Screening](https://apify.com/apifmcpfactory/sanctions-screening)** — screen names against official OFAC, EU, UK and UN sanctions lists in bulk.
- **[Tech Stack Detector](https://apify.com/apifmcpfactory/tech-stack-detector)** — find out what any website is built with (CMS, ecommerce, frameworks, analytics).
