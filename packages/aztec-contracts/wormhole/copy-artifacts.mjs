#!/usr/bin/env node
import { copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, 'target');
const destDir = join(__dirname, '../../frontend/app/artifacts');

console.log('Copying Wormhole contract artifacts...');
console.log(`  From: ${sourceDir}`);
console.log(`  To: ${destDir}`);

try {
  const files = readdirSync(sourceDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    console.warn('⚠️  No JSON artifacts found in target directory');
    process.exit(0);
  }
  
  for (const file of jsonFiles) {
    const sourcePath = join(sourceDir, file);
    const destPath = join(destDir, file);
    copyFileSync(sourcePath, destPath);
    console.log(`  ✓ Copied ${file}`);
  }
  
  console.log(`✅ Successfully copied ${jsonFiles.length} artifact(s)`);
} catch (error) {
  console.error('❌ Error copying artifacts:', error.message);
  process.exit(1);
}

