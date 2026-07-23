export type { CountryEntry, IbanResult, IbanStatus } from './core/index.js';
import type { IbanResult } from './core/index.js';

export interface BulkCheckSummary {
    [key: string]: unknown;
    total: number;
    valid: number;
    invalid_checksum: number;
    invalid_structure: number;
    invalid_length: number;
    invalid_country: number;
    invalid_input: number;
}

export interface BulkCheckResult {
    [key: string]: unknown;
    results: IbanResult[];
    summary: BulkCheckSummary;
}
