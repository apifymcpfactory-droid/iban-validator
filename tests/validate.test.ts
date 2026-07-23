import { describe, expect, it } from 'vitest';

import { validateIban } from '../src/core/validate.js';

// Well-known, widely-published example IBANs (Wikipedia's IBAN article, national bank
// documentation) — real, checksum-valid numbers used ubiquitously to test IBAN
// validators. Each one exercises both the mod-97 math and this country's registry
// entry (length + BBAN structure) against a real-world value, not just synthetic data.
const KNOWN_VALID: Array<[string, string]> = [
    ['GB29NWBK60161331926819', 'GB'],
    ['DE89370400440532013000', 'DE'],
    ['FR1420041010050500013M02606', 'FR'],
    ['NL91ABNA0417164300', 'NL'],
    ['BE68539007547034', 'BE'],
    ['CH9300762011623852957', 'CH'],
    ['AT611904300234573201', 'AT'],
    ['NO9386011117947', 'NO'],
    ['SE4550000000058398257466', 'SE'],
    ['IE29AIBK93115212345678', 'IE'],
    ['ES9121000418450200051332', 'ES'],
    ['IT60X0542811101000000123456', 'IT'],
    ['LU280019400644750000', 'LU'],
    ['DK5000400440116243', 'DK'],
    ['FI2112345600000785', 'FI'],
    ['PL61109010140000071219812874', 'PL'],
    ['PT50000201231234567890154', 'PT'],
    ['GR1601101250000000012300695', 'GR'],
    ['CY17002001280000001200527600', 'CY'],
    ['MT84MALT011000012345MTLCAST001S', 'MT'],
];

describe('validateIban — known-valid real IBANs', () => {
    for (const [iban, country] of KNOWN_VALID) {
        it(`accepts ${country}: ${iban}`, () => {
            const result = validateIban(iban);
            expect(result.status).toBe('VALID');
            expect(result.valid).toBe(true);
            expect(result.countryCode).toBe(country);
            expect(result.structureValid).toBe(true);
            expect(result.checkDigitsValid).toBe(true);
        });
    }
});

describe('validateIban — formatting', () => {
    it('accepts lowercase and internal whitespace, normalizing both', () => {
        const result = validateIban('gb29 nwbk 6016 1331 9268 19');
        expect(result.status).toBe('VALID');
        expect(result.electronicFormat).toBe('GB29NWBK60161331926819');
        expect(result.printFormat).toBe('GB29 NWBK 6016 1331 9268 19');
    });

    it('reports checkDigits as the literal 2-digit substring', () => {
        expect(validateIban('GB29NWBK60161331926819').checkDigits).toBe('29');
    });

    it('flags SEPA participants correctly', () => {
        expect(validateIban('GB29NWBK60161331926819').sepaCountry).toBe(true); // SEPA
        expect(validateIban('AE070331234567890123456').sepaCountry).toBe(false); // not SEPA
    });
});

describe('validateIban — dishonest checksum (bad check digits, right shape)', () => {
    it('flips VALID to INVALID_CHECKSUM when check digits are wrong, structure still valid', () => {
        // Same as the canonical GB example but with the check digits changed 29 -> 00.
        const result = validateIban('GB00NWBK60161331926819');
        expect(result.status).toBe('INVALID_CHECKSUM');
        expect(result.valid).toBe(false);
        expect(result.structureValid).toBe(true);
        expect(result.checkDigitsValid).toBe(false);
    });
});

describe('validateIban — bad structure (right length, wrong BBAN shape)', () => {
    it('flags INVALID_STRUCTURE when the BBAN does not match the country pattern', () => {
        // GB requires 4 letters then 14 digits; here the bank-code letters are digits instead.
        const result = validateIban('GB2912345601613319268191'.slice(0, 22));
        expect(result.countryCode).toBe('GB');
        expect(result.status).not.toBe('VALID');
        expect(['INVALID_STRUCTURE', 'INVALID_CHECKSUM']).toContain(result.status);
    });

    it('flags INVALID_STRUCTURE distinctly from INVALID_LENGTH', () => {
        // Correct GB length (22) but BBAN is all digits, not 4 letters + 14 digits.
        const iban = 'GB29123456789012345678';
        expect(iban).toHaveLength(22);
        const result = validateIban(iban);
        expect(result.countryCode).toBe('GB');
        expect(result.status).toBe('INVALID_STRUCTURE');
    });
});

describe('validateIban — bad length', () => {
    it('flags INVALID_LENGTH when the IBAN is too short for its country', () => {
        const result = validateIban('GB29NWBK6016133192681'); // one char short of 22
        expect(result.countryCode).toBe('GB');
        expect(result.status).toBe('INVALID_LENGTH');
        expect(result.structureValid).toBe(false);
    });

    it('flags INVALID_LENGTH when the IBAN is too long for its country', () => {
        const result = validateIban('GB29NWBK601613319268190'); // one char over 22
        expect(result.status).toBe('INVALID_LENGTH');
    });
});

describe('validateIban — unknown country', () => {
    it('flags INVALID_COUNTRY for a well-formed but unrecognized 2-letter prefix', () => {
        const result = validateIban('ZZ290000000000000000');
        expect(result.status).toBe('INVALID_COUNTRY');
        expect(result.countryCode).toBe('ZZ');
        expect(result.sepaCountry).toBe(false);
        // Checksum is still computed honestly even though the country is unknown.
        expect(typeof result.checkDigitsValid).toBe('boolean');
    });
});

describe('validateIban — invalid input', () => {
    it('rejects an empty string', () => {
        expect(validateIban('').status).toBe('INVALID_INPUT');
    });

    it('rejects punctuation/non-alphanumeric characters', () => {
        expect(validateIban('GB29-NWBK-6016-1331-9268-19').status).toBe('INVALID_INPUT');
        expect(validateIban('GB29NWBK6016133192681#').status).toBe('INVALID_INPUT');
    });

    it('rejects a string too short to contain a country code + check digits', () => {
        expect(validateIban('GB2').status).toBe('INVALID_INPUT');
    });

    it('rejects a prefix that is not 2 letters + 2 digits', () => {
        expect(validateIban('123456789012').status).toBe('INVALID_INPUT');
        expect(validateIban('GBAB60161331926819').status).toBe('INVALID_INPUT');
    });

    it('every INVALID_INPUT result has null formatting/country fields', () => {
        const result = validateIban('');
        expect(result).toMatchObject({
            countryCode: null,
            checkDigits: null,
            electronicFormat: null,
            printFormat: null,
            structureValid: false,
            checkDigitsValid: false,
            sepaCountry: false,
            valid: false,
        });
    });
});
