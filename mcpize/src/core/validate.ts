// Pure ISO 13616 validation — mod-97 checksum (ISO 7064 MOD 97-10) plus per-country
// length/BBAN-structure checks against the static registry. Deterministic, zero
// network, zero external data beyond the bundled registry.
import { REGISTRY } from './registry.js';
import { normalizeIban } from './normalize.js';
import { toPrintFormat } from './format.js';
import type { IbanResult, IbanStatus } from './types.js';

const emptyResult = (input: string): IbanResult => ({
    input,
    valid: false,
    countryCode: null,
    checkDigits: null,
    structureValid: false,
    checkDigitsValid: false,
    sepaCountry: false,
    electronicFormat: null,
    printFormat: null,
    status: 'INVALID_INPUT',
});

// Moves the first 4 characters (country + check digits) to the end, converts each
// letter to its two-digit value (A=10 .. Z=35), and checks the resulting number mod
// 97 equals 1. Uses BigInt for exact arbitrary-precision arithmetic — the longest
// IBAN (34 chars, all letters) expands to only 68 digits, trivial for BigInt.
function mod97IsValid(value: string): boolean {
    const rearranged = value.slice(4) + value.slice(0, 4);
    let numeric = '';
    for (let i = 0; i < rearranged.length; i += 1) {
        const code = rearranged.charCodeAt(i);
        numeric += code >= 65 && code <= 90 ? String(code - 55) : rearranged[i];
    }
    try {
        return BigInt(numeric) % 97n === 1n;
    } catch {
        return false;
    }
}

const PREFIX_RE = /^[A-Z]{2}[0-9]{2}/;

export function validateIban(rawInput: string): IbanResult {
    const input = rawInput ?? '';
    const value = normalizeIban(input);

    if (!value || value.length < 4 || !PREFIX_RE.test(value)) {
        return emptyResult(input);
    }

    const countryCode = value.slice(0, 2);
    const checkDigits = value.slice(2, 4);
    const electronicFormat = value;
    const printFormat = toPrintFormat(value);
    const checkDigitsValid = mod97IsValid(value);

    const entry = REGISTRY[countryCode];
    if (!entry) {
        return {
            input,
            valid: false,
            countryCode,
            checkDigits,
            structureValid: false,
            checkDigitsValid,
            sepaCountry: false,
            electronicFormat,
            printFormat,
            status: 'INVALID_COUNTRY',
        };
    }

    const lengthValid = value.length === entry.length;
    const bban = value.slice(4);
    const structureValid = lengthValid && entry.bbanRegex.test(bban);

    let status: IbanStatus;
    if (!lengthValid) status = 'INVALID_LENGTH';
    else if (!structureValid) status = 'INVALID_STRUCTURE';
    else if (!checkDigitsValid) status = 'INVALID_CHECKSUM';
    else status = 'VALID';

    return {
        input,
        valid: status === 'VALID',
        countryCode,
        checkDigits,
        structureValid,
        checkDigitsValid,
        sepaCountry: entry.sepa,
        electronicFormat,
        printFormat,
        status,
    };
}
