// Confirms the synced local copy of the shared core (src/core/, see
// ../../scripts/sync-core.mjs) behaves identically to the canonical one — the
// canonical copy's full test suite lives at the repo root and is not repeated here.
import { describe, expect, it } from 'vitest';

import { validateIban } from '../src/core/index.js';

describe('synced core — smoke test', () => {
    it('validates the actor\'s own default demo IBANs', () => {
        expect(validateIban('GB29NWBK60161331926819').status).toBe('VALID');
        expect(validateIban('DE89370400440532013000').status).toBe('VALID');
    });

    it('still distinguishes a bad checksum from a bad country', () => {
        expect(validateIban('GB00NWBK60161331926819').status).toBe('INVALID_CHECKSUM');
        expect(validateIban('ZZ290000000000000000').status).toBe('INVALID_COUNTRY');
    });
});
