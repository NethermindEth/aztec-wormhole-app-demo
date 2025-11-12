#!/usr/bin/env node
/**
 * Export Token contract artifact from @aztec/noir-contracts.js
 * to a local directory for use in frontend scripts
 * 
 * This script needs to run from the root, but imports from the frontend package
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

try {
  // Import TokenContract from the root node_modules (workspace setup)
  const tokenModulePath = resolve(repoRoot, 'node_modules/@aztec/noir-contracts.js/dest/Token.js');
  const { TokenContract } = await import(tokenModulePath);

  // Target directory for the exported artifact
  const targetDir = resolve(repoRoot, 'packages/aztec-contracts/token-artifacts');

  // Ensure target directory exists
  mkdirSync(targetDir, { recursive: true });

  // Get the Token contract artifact
  const tokenArtifact = TokenContract.artifact;

  // Write artifact to file
  const outputPath = resolve(targetDir, 'Token.json');
  writeFileSync(outputPath, JSON.stringify(tokenArtifact, null, 2));

  console.log(`✅ Token artifact exported to: ${outputPath}`);
} catch (error) {
  console.error('❌ Error exporting Token artifact:', error.message);
  console.error('   Make sure @aztec/noir-contracts.js is installed in packages/frontend');
  process.exit(1);
}

