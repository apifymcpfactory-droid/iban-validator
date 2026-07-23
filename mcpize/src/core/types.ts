// VALID means the IBAN is fully correct (known country, right length, matching BBAN
// structure, and a passing mod-97 checksum). Every other status names exactly which
// check failed first, in this precedence: INVALID_INPUT (couldn't even parse it) >
// INVALID_COUNTRY (unknown 2-letter prefix) > INVALID_LENGTH (wrong length for that
// country) > INVALID_STRUCTURE (wrong BBAN pattern) > INVALID_CHECKSUM (right shape,
// failing mod-97). Never collapsed into one generic "invalid" — the fix is different
// for each.
export type IbanStatus = 'VALID' | 'INVALID_CHECKSUM' | 'INVALID_STRUCTURE' | 'INVALID_LENGTH' | 'INVALID_COUNTRY' | 'INVALID_INPUT';

export interface CountryEntry {
    name: string;
    /** Total IBAN length for this country, including the 2-letter code + 2 check digits. */
    length: number;
    /** Matches only the BBAN portion (everything after the first 4 characters). */
    bbanRegex: RegExp;
    /** True for the 36 SEPA scheme participants (distinct from "has an IBAN format"). */
    sepa: boolean;
}

export interface IbanResult {
    [key: string]: unknown;
    input: string;
    valid: boolean;
    countryCode: string | null;
    checkDigits: string | null;
    /** Whether the BBAN matches this country's official structure — independent of checkDigitsValid. */
    structureValid: boolean;
    /** Whether the mod-97 checksum passes — computed independently of structureValid. */
    checkDigitsValid: boolean;
    sepaCountry: boolean;
    /** Normalized, no-spaces, uppercase form (ISO 13616 "electronic format"). */
    electronicFormat: string | null;
    /** Human-readable form grouped in blocks of 4 (ISO 13616 "print format"). */
    printFormat: string | null;
    status: IbanStatus;
}
