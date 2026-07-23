# IBAN Validator

Offline ISO 13616 IBAN validation — mod-97 checksum + per-country BBAN structure, published as **two surfaces from one shared core**:

- **[`apify/`](apify/)** — an Apify Actor ([listing](https://apify.com/apifmcpfactory/iban-validator)), pay-per-event, dataset output.
- **[`mcpize/`](mcpize/)** — an MCPize-hosted MCP server ([listing](https://mcpize.com/mcp/iban-validator-mcp)), Streamable HTTP, free community server.

Both surfaces call the exact same validation logic. No external API, no licensed data — pure ISO 13616.

## Architecture

```
src/core/         <- canonical, hand-edited validation core + its own test suite
  types.ts        <- IbanResult / IbanStatus shapes
  registry.ts      <- ~76-country IBAN structure table (length + BBAN regex + SEPA flag)
  normalize.ts       <- strip/uppercase/reject non-alphanumeric
  validate.ts          <- mod-97 checksum + structure checks -> IbanResult
  format.ts              <- electronic/print format helpers

apify/src/core/    <- verbatim copy, synced from src/core/ (see below)
mcpize/src/core/   <- verbatim copy, synced from src/core/ (see below)
```

**Why a copy, not a shared package or a relative import across directories:** both Apify's `apify push` and MCPize's `mcpize deploy` build a Docker image using *only the directory you run them from* as the build context — nothing outside `apify/` or `mcpize/` is visible to that build. A relative import reaching up to a repo-root `src/core/` would work fine locally but silently fail (or never even get copied) inside either platform's isolated build. Physically duplicating the core into each surface keeps every deploy fully self-contained and reproducible.

**`src/core/` is the only place to hand-edit the validation logic.** After any change there:

```bash
npm install        # once, at the repo root
npm test            # run the canonical core test suite
npm run sync-core      # copies src/core/ -> apify/src/core/ and mcpize/src/core/
```

Then rebuild/retest/redeploy whichever surface(s) changed. The copies are committed to git (not regenerated at build time) so that cloning the repo and running `apify push` or `mcpize deploy` from either subdirectory works immediately, with no extra build step.

## Status codes

Both surfaces report the same six statuses, honestly distinguished — never collapsed into one generic "invalid":

| Status | Meaning |
| --- | --- |
| `VALID` | Recognized country, correct length, correct BBAN structure, passing mod-97 checksum. |
| `INVALID_CHECKSUM` | Right shape, but the check digits don't add up — likely a typo. |
| `INVALID_STRUCTURE` | The BBAN doesn't match this country's official pattern. |
| `INVALID_LENGTH` | Wrong total length for this country. |
| `INVALID_COUNTRY` | The 2-letter prefix isn't a recognized IBAN country. |
| `INVALID_INPUT` | Not parseable at all — empty, non-alphanumeric, or too short. |

## What this is not

Validation only — **no bank-name or BIC enrichment**. Confirming an IBAN's structure and checksum is not the same as confirming the account exists, is open, or belongs to a given name. Bank-name/BIC lookup would need a licensed BIC directory; it's noted as a possible future addition once a free, public source exists, and is never claimed in either surface's listing copy today.

## Repo layout

- [`apify/`](apify/) — Apify Actor: `.actor/` config, `src/main.ts`, its own `package.json`/`Dockerfile`/tests/README.
- [`mcpize/`](mcpize/) — MCPize server: `src/index.ts` + `src/tools.ts`, its own `package.json`/`mcpize.yaml`/`Dockerfile`/tests/README.
- [`src/core/`](src/core/) + [`tests/`](tests/) — the canonical shared core and its test suite.
- [`scripts/sync-core.mjs`](scripts/sync-core.mjs) — propagates `src/core/` into both surfaces.

## License

MIT
