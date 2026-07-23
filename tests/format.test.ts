import { describe, expect, it } from 'vitest';

import { toPrintFormat } from '../src/core/format.js';

describe('toPrintFormat', () => {
    it('groups into blocks of 4', () => {
        expect(toPrintFormat('GB29NWBK60161331926819')).toBe('GB29 NWBK 6016 1331 9268 19');
    });

    it('handles a length that is an exact multiple of 4', () => {
        expect(toPrintFormat('AAAABBBBCCCC')).toBe('AAAA BBBB CCCC');
    });

    it('handles an empty string', () => {
        expect(toPrintFormat('')).toBe('');
    });
});
