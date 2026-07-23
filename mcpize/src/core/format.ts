// ISO 13616 defines two standard presentations: "electronic format" (no spaces,
// as stored/transmitted) and "print format" (grouped in blocks of 4 for humans).
export const toPrintFormat = (electronicFormat: string): string => (electronicFormat.match(/.{1,4}/g) ?? []).join(' ');
