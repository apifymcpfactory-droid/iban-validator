import { describe, expect, it } from 'vitest';

import { bulkCheckIban, checkSingleIban, MAX_BULK_SIZE } from '../src/tools.js';

describe('checkSingleIban', () => {
    it('validates a real, checksum-valid IBAN', () => {
        const result = checkSingleIban('GB29NWBK60161331926819');
        expect(result.status).toBe('VALID');
        expect(result.valid).toBe(true);
        expect(result.sepaCountry).toBe(true);
    });

    it('distinguishes a bad checksum from a bad country, not a generic failure', () => {
        expect(checkSingleIban('GB00NWBK60161331926819').status).toBe('INVALID_CHECKSUM');
        expect(checkSingleIban('ZZ290000000000000000').status).toBe('INVALID_COUNTRY');
    });

    it('returns INVALID_INPUT without throwing for garbage input', () => {
        expect(checkSingleIban('').status).toBe('INVALID_INPUT');
        expect(checkSingleIban('not an iban!!').status).toBe('INVALID_INPUT');
    });
});

describe('bulkCheckIban', () => {
    it('rejects a batch larger than the hard cap with a clear message', () => {
        const tooMany = Array.from({ length: MAX_BULK_SIZE + 1 }, () => 'GB29NWBK60161331926819');
        expect(() => bulkCheckIban(tooMany)).toThrow(/at most 1000/);
    });

    it('preserves input order in the results array', () => {
        const ibans = ['GB29NWBK60161331926819', 'DE89370400440532013000', 'GB00NWBK60161331926819'];
        const { results } = bulkCheckIban(ibans);
        expect(results.map((r) => r.input)).toEqual(ibans);
    });

    it('never fails the whole batch on one bad entry, and the summary tallies correctly', () => {
        const { results, summary } = bulkCheckIban([
            'GB29NWBK60161331926819', // VALID
            'GB00NWBK60161331926819', // INVALID_CHECKSUM
            'ZZ290000000000000000', // INVALID_COUNTRY
            'not-an-iban!', // INVALID_INPUT
            'GB29NWBK6016133192681', // INVALID_LENGTH (one char short)
        ]);

        expect(results).toHaveLength(5);
        expect(summary).toEqual({
            total: 5,
            valid: 1,
            invalid_checksum: 1,
            invalid_structure: 0,
            invalid_length: 1,
            invalid_country: 1,
            invalid_input: 1,
        });
    });

    it('accepts exactly the cap with no error', () => {
        const ibans = Array.from({ length: MAX_BULK_SIZE }, () => 'GB29NWBK60161331926819');
        const { summary } = bulkCheckIban(ibans);
        expect(summary.total).toBe(MAX_BULK_SIZE);
        expect(summary.valid).toBe(MAX_BULK_SIZE);
    });
});
