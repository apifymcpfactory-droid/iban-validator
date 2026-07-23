#!/usr/bin/env node
// Copies the canonical shared core (src/core/) into each deployable surface's own
// src/core/ directory, verbatim. Both surfaces' build/deploy tooling (Apify's
// `apify push`, MCPize's `mcpize deploy`) only ever sees ITS OWN directory as the
// Docker build context, so the core must be physically present inside each surface
// for a self-contained build — hence this copy step instead of a cross-directory
// relative import.
//
// src/core/ is the ONLY place to hand-edit the validation logic. Run this script
// (npm run sync-core) after any change there, before building/testing/deploying
// either surface, and commit the result.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, 'src', 'core');
const targets = [path.join(root, 'apify', 'src', 'core'), path.join(root, 'mcpize', 'src', 'core')];

for (const target of targets) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true });
    const files = readdirSync(target);
    console.log(`Synced ${files.length} file(s) -> ${path.relative(root, target)}`);
}
