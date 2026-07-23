// Strips whitespace and uppercases; rejects anything that isn't then plain
// alphanumeric (ISO 13616 IBANs are letters+digits only — no punctuation).
// Returns null for anything that can't even be normalized; callers must treat
// null as INVALID_INPUT without attempting a country/checksum lookup.
export function normalizeIban(input: string): string | null {
    if (typeof input !== 'string') return null;
    const stripped = input.replace(/\s+/g, '').toUpperCase();
    if (stripped.length === 0) return null;
    if (!/^[A-Z0-9]+$/.test(stripped)) return null;
    return stripped;
}
