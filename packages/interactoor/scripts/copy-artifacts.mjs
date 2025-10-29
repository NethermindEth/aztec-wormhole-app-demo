#!/usr/bin/env node
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const artifactsDir = `${__dirname}/../src/artifacts`;
mkdirSync(artifactsDir, { recursive: true });

// Copy counter contract artifact
try {
  copyFileSync(
    `${__dirname}/../contracts/counter/target/counter-Counter.json`,
    `${artifactsDir}/Counter.json`
  );
  console.log('✅ Copied Counter.json to src/artifacts/');
} catch (e) {
  console.error('❌ Failed to copy Counter.json:', e.message);
  process.exit(1);
}

