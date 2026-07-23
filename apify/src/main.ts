// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor, log } from 'apify';

import { validateIban } from './core/index.js';

interface Input {
    ibans: string[];
}

// Used when no "ibans" field is provided at all (e.g. the platform's automated test
// run). Both real, checksum-valid example IBANs (UK NatWest, Deutsche Bank example).
const DEFAULT_IBANS = ['GB29NWBK60161331926819', 'DE89370400440532013000'];

await Actor.init();

const input = (await Actor.getInput<Input>()) ?? ({} as Input);
const ibans = input.ibans ?? DEFAULT_IBANS;

// An explicitly provided empty list is an error — the user asked for nothing.
if (ibans.length === 0) {
    await Actor.fail('Input must include a non-empty "ibans" array.');
}

// Validation is pure, synchronous, and instant — no network, no concurrency needed.
for (const rawIban of ibans) {
    const result = validateIban(rawIban);
    log.info(`${rawIban}: ${result.status}`);
    await Actor.pushData(result);
}

log.info(`Done — ${ibans.length} IBAN(s) processed.`);

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()
await Actor.exit();
