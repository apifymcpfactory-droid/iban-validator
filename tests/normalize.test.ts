import { describe, expect, it } from 'vitest';

import { normalizeIban } from '../src/core/normalize.js';

describe('normalizeIban', () => {
    it('strips spaces and uppercases', () => {
        expect(normalizeIban('gb29 nwbk 6016 1331 9268 19')).toBe('GB29NWBK60161331926819');
    });

    it('strips tabs and newlines too', () => {
        expect(normalizeIban('GB29\tNWBK\n60161331926819')).toBe('GB29NWBK60161331926819');
    });

    it('rejects punctuation', () => {
        expect(normalizeIban('GB29-NWBK-6016')).toBeNull();
        expect(normalizeIban('GB29.NWBK')).toBeNull();
    });

    it('rejects empty or whitespace-only input', () => {
        expect(normalizeIban('')).toBeNull();
        expect(normalizeIban('   ')).toBeNull();
    });

    it('rejects non-string input', () => {
        // @ts-expect-error deliberately wrong type to prove the runtime guard
        expect(normalizeIban(null)).toBeNull();
        // @ts-expect-error deliberately wrong type to prove the runtime guard
        expect(normalizeIban(undefined)).toBeNull();
    });
});
