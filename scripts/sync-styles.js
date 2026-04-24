#!/usr/bin/env node
/*
 * sync-styles.js
 * Copies the authoritative global CSS from src/styles/ into public/assets/css/
 * so that the hand-built static HTML chapter pages (public/*.html) render with
 * the same design tokens, resets, and theme as the React SPA.
 *
 * Source of truth: src/styles/*.css (imported by src/index.js)
 * Mirror:          public/assets/css/*.css (loaded via <link> by static HTML)
 *
 * Run automatically before `npm start` and `npm run build` via npm script
 * hooks (see package.json). To run manually: `npm run sync-styles`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'src', 'styles');
const targetDir = path.join(projectRoot, 'public', 'assets', 'css');

const files = ['win95-tokens.css', 'win95-base.css', 'theme-tokens.css'];

fs.mkdirSync(targetDir, { recursive: true });

let changed = 0;
for (const file of files) {
  const src = path.join(sourceDir, file);
  const dst = path.join(targetDir, file);

  const srcContent = fs.readFileSync(src);
  let dstContent = null;
  try {
    dstContent = fs.readFileSync(dst);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (dstContent && Buffer.compare(srcContent, dstContent) === 0) {
    console.log(`  ✓ ${file} (already in sync)`);
    continue;
  }

  fs.writeFileSync(dst, srcContent);
  changed += 1;
  console.log(`  → ${file} synced (${srcContent.length.toLocaleString()} bytes)`);
}

console.log(`sync-styles: ${changed} file(s) updated in public/assets/css/`);
