// Static IBAN country registry — derived from the publicly published SWIFT/ECBS IBAN
// Registry structure notation (the same free reference data widely used by open-source
// IBAN libraries): `n` = digit, `a` = upper-case letter, `c` = alphanumeric, each
// followed by its run length. Only the BBAN portion (after the 2-letter country code
// + 2 check digits) is encoded here; `length` is the TOTAL IBAN length.
//
// No external API, no licensed data — this table changes only when a country adopts
// or amends its national IBAN format, which happens rarely and publicly.
import type { CountryEntry } from './types.js';

type Segment = readonly [count: number, kind: 'n' | 'a' | 'c'];

const CLASS: Record<Segment[1], string> = { n: '0-9', a: 'A-Z', c: 'A-Z0-9' };

const bban = (...segments: Segment[]): { length: number; regex: RegExp } => {
    const length = segments.reduce((sum, [count]) => sum + count, 0);
    const pattern = segments.map(([count, kind]) => `[${CLASS[kind]}]{${count}}`).join('');
    return { length, regex: new RegExp(`^${pattern}$`) };
};

// [ISO 3166-1 alpha-2, country name, SEPA participant?, ...BBAN segments]
const RAW: Array<[string, string, boolean, ...Segment[]]> = [
    ['AD', 'Andorra', true, [4, 'n'], [4, 'n'], [12, 'c']],
    ['AE', 'United Arab Emirates', false, [3, 'n'], [16, 'n']],
    ['AL', 'Albania', false, [8, 'n'], [16, 'c']],
    ['AT', 'Austria', true, [5, 'n'], [11, 'n']],
    ['AZ', 'Azerbaijan', false, [4, 'a'], [20, 'c']],
    ['BA', 'Bosnia and Herzegovina', false, [3, 'n'], [3, 'n'], [8, 'n'], [2, 'n']],
    ['BE', 'Belgium', true, [3, 'n'], [7, 'n'], [2, 'n']],
    ['BG', 'Bulgaria', true, [4, 'a'], [4, 'n'], [2, 'n'], [8, 'c']],
    ['BH', 'Bahrain', false, [4, 'a'], [14, 'c']],
    ['BR', 'Brazil', false, [8, 'n'], [5, 'n'], [10, 'n'], [1, 'a'], [1, 'c']],
    ['BY', 'Belarus', false, [4, 'c'], [4, 'n'], [16, 'c']],
    ['CH', 'Switzerland', true, [5, 'n'], [12, 'c']],
    ['CR', 'Costa Rica', false, [4, 'n'], [14, 'n']],
    ['CY', 'Cyprus', true, [3, 'n'], [5, 'n'], [16, 'c']],
    ['CZ', 'Czechia', true, [4, 'n'], [6, 'n'], [10, 'n']],
    ['DE', 'Germany', true, [8, 'n'], [10, 'n']],
    ['DK', 'Denmark', true, [4, 'n'], [9, 'n'], [1, 'n']],
    ['DO', 'Dominican Republic', false, [4, 'c'], [20, 'n']],
    ['EE', 'Estonia', true, [2, 'n'], [2, 'n'], [11, 'n'], [1, 'n']],
    ['EG', 'Egypt', false, [4, 'n'], [4, 'n'], [17, 'n']],
    ['ES', 'Spain', true, [4, 'n'], [4, 'n'], [1, 'n'], [1, 'n'], [10, 'n']],
    ['FI', 'Finland', true, [6, 'n'], [7, 'n'], [1, 'n']],
    ['FO', 'Faroe Islands', false, [4, 'n'], [9, 'n'], [1, 'n']],
    ['FR', 'France', true, [5, 'n'], [5, 'n'], [11, 'c'], [2, 'n']],
    ['GB', 'United Kingdom', true, [4, 'a'], [6, 'n'], [8, 'n']],
    ['GE', 'Georgia', false, [2, 'a'], [16, 'n']],
    ['GI', 'Gibraltar', false, [4, 'a'], [15, 'c']],
    ['GL', 'Greenland', false, [4, 'n'], [9, 'n'], [1, 'n']],
    ['GR', 'Greece', true, [3, 'n'], [4, 'n'], [16, 'c']],
    ['GT', 'Guatemala', false, [4, 'c'], [20, 'c']],
    ['HR', 'Croatia', true, [7, 'n'], [10, 'n']],
    ['HU', 'Hungary', true, [3, 'n'], [4, 'n'], [1, 'n'], [15, 'n'], [1, 'n']],
    ['IE', 'Ireland', true, [4, 'a'], [6, 'n'], [8, 'n']],
    ['IL', 'Israel', false, [3, 'n'], [3, 'n'], [13, 'n']],
    ['IQ', 'Iraq', false, [4, 'a'], [3, 'n'], [12, 'n']],
    ['IS', 'Iceland', true, [4, 'n'], [2, 'n'], [6, 'n'], [10, 'n']],
    ['IT', 'Italy', true, [1, 'a'], [5, 'n'], [5, 'n'], [12, 'c']],
    ['JO', 'Jordan', false, [4, 'a'], [4, 'n'], [18, 'c']],
    ['KW', 'Kuwait', false, [4, 'a'], [22, 'c']],
    ['KZ', 'Kazakhstan', false, [3, 'n'], [13, 'c']],
    ['LB', 'Lebanon', false, [4, 'n'], [20, 'c']],
    ['LC', 'Saint Lucia', false, [4, 'a'], [24, 'c']],
    ['LI', 'Liechtenstein', true, [5, 'n'], [12, 'c']],
    ['LT', 'Lithuania', true, [5, 'n'], [11, 'n']],
    ['LU', 'Luxembourg', true, [3, 'n'], [13, 'c']],
    ['LV', 'Latvia', true, [4, 'a'], [13, 'c']],
    ['LY', 'Libya', false, [3, 'n'], [3, 'n'], [15, 'n']],
    ['MC', 'Monaco', true, [5, 'n'], [5, 'n'], [11, 'c'], [2, 'n']],
    ['MD', 'Moldova', false, [2, 'c'], [18, 'c']],
    ['ME', 'Montenegro', false, [3, 'n'], [13, 'n'], [2, 'n']],
    ['MK', 'North Macedonia', false, [3, 'n'], [10, 'c'], [2, 'n']],
    ['MR', 'Mauritania', false, [5, 'n'], [5, 'n'], [11, 'n'], [2, 'n']],
    ['MT', 'Malta', true, [4, 'a'], [5, 'n'], [18, 'c']],
    ['MU', 'Mauritius', false, [4, 'a'], [2, 'n'], [2, 'n'], [12, 'n'], [3, 'n'], [3, 'a']],
    ['NL', 'Netherlands', true, [4, 'a'], [10, 'n']],
    ['NO', 'Norway', true, [4, 'n'], [6, 'n'], [1, 'n']],
    ['OM', 'Oman', false, [3, 'n'], [16, 'c']],
    ['PK', 'Pakistan', false, [4, 'a'], [16, 'c']],
    ['PL', 'Poland', true, [8, 'n'], [16, 'n']],
    ['PS', 'Palestine', false, [4, 'a'], [21, 'c']],
    ['PT', 'Portugal', true, [4, 'n'], [4, 'n'], [11, 'n'], [2, 'n']],
    ['QA', 'Qatar', false, [4, 'a'], [21, 'c']],
    ['RO', 'Romania', true, [4, 'a'], [16, 'c']],
    ['RS', 'Serbia', false, [3, 'n'], [13, 'n'], [2, 'n']],
    ['SA', 'Saudi Arabia', false, [2, 'n'], [18, 'c']],
    ['SC', 'Seychelles', false, [4, 'a'], [2, 'n'], [2, 'n'], [16, 'n'], [3, 'a']],
    ['SD', 'Sudan', false, [2, 'n'], [12, 'n']],
    ['SE', 'Sweden', true, [3, 'n'], [16, 'n'], [1, 'n']],
    ['SI', 'Slovenia', true, [5, 'n'], [8, 'n'], [2, 'n']],
    ['SK', 'Slovakia', true, [4, 'n'], [6, 'n'], [10, 'n']],
    ['SM', 'San Marino', true, [1, 'a'], [5, 'n'], [5, 'n'], [12, 'c']],
    ['SO', 'Somalia', false, [4, 'n'], [3, 'n'], [12, 'n']],
    ['ST', 'São Tomé and Príncipe', false, [4, 'n'], [4, 'n'], [11, 'n'], [2, 'n']],
    ['SV', 'El Salvador', false, [4, 'a'], [20, 'n']],
    ['TL', 'Timor-Leste', false, [3, 'n'], [14, 'n'], [2, 'n']],
    ['TN', 'Tunisia', false, [2, 'n'], [3, 'n'], [13, 'n'], [2, 'n']],
    ['TR', 'Turkey', false, [5, 'n'], [1, 'n'], [16, 'c']],
    ['UA', 'Ukraine', false, [6, 'n'], [19, 'c']],
    ['VA', 'Vatican City', true, [3, 'n'], [15, 'n']],
    ['VG', 'British Virgin Islands', false, [4, 'a'], [16, 'n']],
    ['XK', 'Kosovo', false, [4, 'n'], [10, 'n'], [2, 'n']],
];

export const REGISTRY: Record<string, CountryEntry> = Object.fromEntries(
    RAW.map(([code, name, sepa, ...segments]) => {
        const { length, regex } = bban(...segments);
        return [code, { name, length: length + 4, bbanRegex: regex, sepa }];
    }),
);

export const SUPPORTED_COUNTRIES = Object.keys(REGISTRY).sort();
