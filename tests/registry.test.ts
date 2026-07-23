import { describe, expect, it } from 'vitest';

import { REGISTRY, SUPPORTED_COUNTRIES } from '../src/core/registry.js';

describe('REGISTRY', () => {
    it('covers roughly 70 countries', () => {
        expect(SUPPORTED_COUNTRIES.length).toBeGreaterThanOrEqual(70);
        expect(SUPPORTED_COUNTRIES.length).toBeLessThan(90);
    });

    it('every entry has a positive length greater than 4 and a working regex', () => {
        for (const code of SUPPORTED_COUNTRIES) {
            const entry = REGISTRY[code];
            expect(entry.length).toBeGreaterThan(4);
            expect(entry.bbanRegex).toBeInstanceOf(RegExp);
            expect(typeof entry.sepa).toBe('boolean');
            expect(entry.name.length).toBeGreaterThan(0);
        }
    });

    it('marks exactly the 36 official SEPA participants', () => {
        const sepaCodes = SUPPORTED_COUNTRIES.filter((code) => REGISTRY[code].sepa).sort();
        expect(sepaCodes).toHaveLength(36);
        // Spot-check a few from each side of the EU/non-EU split.
        expect(sepaCodes).toContain('DE');
        expect(sepaCodes).toContain('GB'); // non-EU SEPA participant
        expect(sepaCodes).toContain('CH'); // non-EU SEPA participant
        expect(sepaCodes).toContain('BG');
    });

    it('does not mark common non-SEPA countries', () => {
        expect(REGISTRY.US).toBeUndefined(); // US has no IBAN at all
        expect(REGISTRY.AE.sepa).toBe(false);
        expect(REGISTRY.BR.sepa).toBe(false);
    });

    it('country codes are 2 uppercase letters', () => {
        for (const code of SUPPORTED_COUNTRIES) {
            expect(code).toMatch(/^[A-Z]{2}$/);
        }
    });
});
