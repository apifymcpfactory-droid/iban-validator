Validate IBANs against the official ISO 13616 standard — check digits, country structure and SEPA membership — entirely offline. No bank API, no third-party lookup, and no account data leaves the run. Paste one IBAN or a whole supplier column and get a typed verdict for each.

## 1. Why use IBAN Validator

A mistyped IBAN is expensive in a way that is easy to underestimate. The payment does not silently disappear — it is rejected days later, someone has to work out why, the supplier chases, and the run is repeated. Occasionally a transposed digit produces a *structurally valid* IBAN belonging to somebody else, and recovery becomes a bank process rather than a correction.

The check that prevents this is arithmetic. ISO 13616 defines a mod-97 checksum precisely so that single-digit typos and transpositions fail before the payment is ever submitted. What it needs is applying consistently to every row — which is the part that gets skipped under deadline.

This Actor applies it to the whole list, and tells you *which* check failed rather than returning a bare "invalid".

## 2. Key features

- **Fully offline.** Validation is pure arithmetic against a bundled country registry. No bank API, no external service, no rate limit.
- **Six typed outcomes**, not a boolean — the fix for a wrong country code is different from the fix for a failed checksum.
- **Independent structure and checksum results.** Both are computed separately, so you can see an IBAN that is the right shape but has a bad check digit.
- **SEPA membership flag**, kept distinct from "has an IBAN format" — genuinely different questions.
- **Both ISO formats returned**: electronic (no spaces) for systems, print (grouped in fours) for humans.
- **Messy input tolerated.** Spaces, lower case and punctuation are normalised before validation.
- **Bulk validation** of a whole column in one run.
- **Nothing stored, nothing transmitted.**

## 3. Who it's for

**For finance teams.** Before a month-end SEPA payment run, paste in the supplier IBAN column and get a per-row pass/fail with the reason, so a transposed digit is caught before the bank rejects the batch.

**For accounts payable and operations.** Validate new supplier bank details at onboarding rather than at first payment, so the correction conversation happens while you still have the supplier's attention.

**For compliance and KYB.** Confirm a counterparty's stated IBAN is structurally genuine and note whether the country is a SEPA participant, as one input to an onboarding file.

**For developers and AI agents.** Call it inline in a vendor-onboarding flow: submit the IBAN, branch on `status`, and return the specific failure to the user's form rather than a generic "invalid".

## 4. How to use it

1. Open the Actor and click **Try for free**.
2. Paste your IBANs into the **IBANs** field, one per line. Spaces and lower case are fine.
3. Click **Start**.
4. Open the **Output** tab. Filter on `valid` to isolate failures, or on `status` to group them by cause.
5. Export as JSON, CSV or Excel.

## 5. Input parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `ibans` | array of strings | Yes | IBANs to validate, one per entry. Spaces, punctuation and lower case are normalised automatically. |

## 6. Output

```json
{
  "input": "IE29 AIBK 9311 5212 3456 78",
  "valid": true,
  "countryCode": "IE",
  "checkDigits": "29",
  "structureValid": true,
  "checkDigitsValid": true,
  "sepaCountry": true,
  "electronicFormat": "IE29AIBK93115212345678",
  "printFormat": "IE29 AIBK 9311 5212 3456 78",
  "status": "VALID"
}
```

Every submitted IBAN produces exactly one result, in order.

## 7. Output fields

| Field | Meaning |
|---|---|
| `input` | The IBAN exactly as you supplied it. |
| `valid` | `true` only when every check passed. |
| `countryCode` | The two-letter prefix, or null if it could not be parsed. |
| `checkDigits` | The two check digits following the country code. |
| `structureValid` | Whether the BBAN matches that country's official pattern. Computed independently of the checksum. |
| `checkDigitsValid` | Whether the mod-97 checksum passes. Computed independently of the structure. |
| `sepaCountry` | Whether the country participates in the SEPA scheme. Distinct from whether it uses IBANs at all. |
| `electronicFormat` | Normalised, uppercase, no spaces — the form to store and transmit. |
| `printFormat` | Grouped in blocks of four — the form to show a human. |
| `status` | The precise outcome. See below. |

### Status values

Statuses are evaluated in precedence order, and the first failure is the one reported:

| Status | Meaning | Typical fix |
|---|---|---|
| `VALID` | Every check passed. | — |
| `INVALID_INPUT` | Could not be parsed as an IBAN at all. | The field is empty or holds something else. |
| `INVALID_COUNTRY` | The two-letter prefix is not a known IBAN country. | Usually a typo in the first two characters. |
| `INVALID_LENGTH` | Wrong total length for that country. | A missing or duplicated character. |
| `INVALID_STRUCTURE` | Right length, but the BBAN does not match the country's pattern. | Letters and digits in the wrong positions. |
| `INVALID_CHECKSUM` | Correct shape, failing mod-97. | Almost always a single transposed or mistyped digit. |

`INVALID_CHECKSUM` is the one worth routing to a human: the IBAN looks right, so it is usually one character away from correct.

## 8. How it works

Each input is normalised — whitespace and punctuation removed, characters uppercased. The first two characters are looked up in a bundled registry covering roughly 76 IBAN-using countries, which supplies the expected total length, the BBAN pattern and SEPA membership.

Length is checked, then the BBAN pattern, then the ISO 13616 mod-97 checksum: the first four characters move to the end, letters convert to digits, and the resulting number must leave a remainder of 1 when divided by 97. Structure and checksum are evaluated independently so both results can be reported.

No network call is made at any point.

## 9. API & MCP usage

**cURL**

```bash
curl -X POST "https://api.apify.com/v2/acts/apifmcpfactory~iban-validator/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ibans":["IE29AIBK93115212345678","DE89370400440532013000"]}'
```

**As an Apify MCP tool.** This Actor is callable directly by AI agents such as Claude and Cursor. Usage bills through your own Apify account.

```
https://mcp.apify.com?tools=apifmcpfactory/iban-validator
```

Claude Desktop (`claude_desktop_config.json`):

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

**As a standalone MCP server.** The same validation also runs as a dedicated hosted MCP server, with `validate_iban` for a single IBAN and `bulk_check_iban` for up to 1,000. See the product page for that endpoint.

## 10. Pricing

$0.005 per IBAN validated, billed per IBAN written to the dataset.

A 1,000-row supplier list costs $5.00 — materially less than one rejected payment costs to investigate.

## 11. Limits & performance

| | |
|---|---|
| Memory | 256 MB |
| Network calls | None |
| Country coverage | Roughly 76 IBAN-using countries |
| Throughput | Bounded by list size only; validation is arithmetic |

## 12. Limitations

- **Structural validity is not account existence.** A `VALID` result means the IBAN is correctly formed for its country. It does not confirm the account is open, or that it belongs to the person you intend to pay. No offline check can establish that.
- **No bank name or branch lookup.** The bundled registry holds country structure rules, not institution directories.
- **Registry coverage is finite.** Countries outside the bundled registry return `INVALID_COUNTRY`, which means "not in our registry" rather than "not a real country".
- **SEPA flag is scheme membership**, not a statement about any particular payment's eligibility.
- **No name-matching.** Confirmation-of-Payee style checks require the bank's own service and are out of scope.

## 13. FAQ

**Does this connect to a bank or payment provider?** No. Validation is entirely offline, against the ISO 13616 standard and a bundled country registry.

**Does a `VALID` result mean the account exists?** No. It means the IBAN is correctly formed for its country. Account existence can only be confirmed by the bank.

**Can I validate a whole spreadsheet column?** Yes. Paste every IBAN into the `ibans` field; each produces its own result row.

**Why does an IBAN show `structureValid: true` but `valid: false`?** It has the right shape for its country but fails the mod-97 checksum — the classic single-digit typo. Its `status` will be `INVALID_CHECKSUM`.

**What is the difference between the electronic and print formats?** Electronic is the unspaced uppercase form used in systems and payment files. Print is the same IBAN grouped in fours for human reading. Both are returned.

**Does it handle IBANs with spaces or lower case?** Yes, both are normalised before validation.

**What does the SEPA flag tell me?** Whether that country participates in the SEPA scheme. Some countries use IBANs without being SEPA participants, which is why the two are reported separately.

**Is any of my data stored?** No — nothing is transmitted anywhere in the first place.

## GDPR & lawful use

IBANs are processed entirely in memory against a bundled, public reference table (the IBAN registry's country structures) — no external API call, nothing stored beyond your own run's dataset, no third-party enrichment.

## More tools from MCP Factory

- **[EU VAT Validator](https://apify.com/apifmcpfactory/eu-vat-validator)** — validate EU VAT numbers against the official VIES registry.
- **[Email & Domain Auth Checker](https://apify.com/apifmcpfactory/email-domain-checker)** — MX, SPF, DKIM and DMARC checks from DNS.
- **[Sanctions Screening](https://apify.com/apifmcpfactory/sanctions-screening)** — screen names against official OFAC, EU, UK and UN sanctions lists in bulk.

— A Howth Technology Factory tool. Official sources, nothing stored.
