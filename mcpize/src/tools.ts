/**
 * Pure tool functions — business logic only, no MCP dependency.
 * Each function is registered as an MCP tool in index.ts.
 *
 * This separation makes tools easy to unit test without MCP infrastructure.
 */

import { validateIban } from './core/index.js';
import type { IbanResult } from './core/index.js';
import type { BulkCheckResult, BulkCheckSummary } from './types.js';

// IBAN validation is a synchronous, deterministic, offline algorithm — no network,
// no I/O — so there is no worker pool here the way our network-bound sibling
// servers need; a cap plus a plain loop is all the safety this needs.
const MAX_BULK_SIZE = 1000;

// Validates one IBAN via the shared ISO 13616 core (mod-97 checksum + per-country
// BBAN structure). Never throws — every failure mode comes back as a typed status.
export function checkSingleIban(rawIban: string): IbanResult {
    return validateIban(rawIban);
}

// Validates up to MAX_BULK_SIZE IBANs in one call. A single bad entry never fails
// the batch — every input produces exactly one typed result, in order.
export function bulkCheckIban(ibans: string[]): BulkCheckResult {
    if (ibans.length > MAX_BULK_SIZE) {
        throw new Error(`bulk_check_iban accepts at most ${MAX_BULK_SIZE} IBANs per call; received ${ibans.length}. Split into smaller batches.`);
    }

    const results = ibans.map((iban) => validateIban(iban));

    const summary: BulkCheckSummary = {
        total: results.length,
        valid: 0,
        invalid_checksum: 0,
        invalid_structure: 0,
        invalid_length: 0,
        invalid_country: 0,
        invalid_input: 0,
    };
    for (const result of results) {
        if (result.status === 'VALID') summary.valid++;
        else if (result.status === 'INVALID_CHECKSUM') summary.invalid_checksum++;
        else if (result.status === 'INVALID_STRUCTURE') summary.invalid_structure++;
        else if (result.status === 'INVALID_LENGTH') summary.invalid_length++;
        else if (result.status === 'INVALID_COUNTRY') summary.invalid_country++;
        else summary.invalid_input++;
    }

    return { results, summary };
}

export { MAX_BULK_SIZE };
