#!/usr/bin/env node
import { dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

import { copyArtifacts } from './utils/artifactCopier.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const tasks = [
  {
    id: 'emitter',
    label: 'Emitter contract artifacts',
    source: 'packages/aztec-contracts/emitter/target',
    destinations: ['packages/frontend/app/artifacts']
  },
  {
    id: 'wormhole',
    label: 'Wormhole contract artifacts',
    source: 'packages/aztec-contracts/wormhole-source/aztec/contracts/target',
    destinations: [
      'packages/frontend/app/artifacts',
      'packages/relayer/aztec-vaa-service/artifacts'
    ]
  },
  {
    id: 'token',
    label: 'Token contract artifacts',
    source: 'packages/aztec-contracts/token-artifacts',
    destinations: ['packages/frontend/app/artifacts']
  }
];

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/copy-artifacts.mjs [--only=taskId[,taskId...]]\n\n` +
    `Options:\n` +
    `  --only    Comma-separated list of task IDs to execute. Available IDs: ${tasks.map(task => task.id).join(', ')}\n` +
    `  -h, --help  Show this message.`);
  process.exit(0);
}

const onlyArg = args.find(arg => arg.startsWith('--only='));
const filterIds = onlyArg
  ? onlyArg.replace('--only=', '').split(',').map(value => value.trim()).filter(Boolean)
  : [];

const selectedTasks = filterIds.length
  ? tasks.filter(task => filterIds.includes(task.id))
  : tasks;

if (filterIds.length && selectedTasks.length === 0) {
  console.error(`No tasks matched the provided filter: ${filterIds.join(', ')}`);
  process.exit(1);
}

console.log('Copying Noir contract artifacts...');

for (const task of selectedTasks) {
  const source = resolve(repoRoot, task.source);
  console.log(`\n• ${task.label}`);
  console.log(`  source: ${relative(repoRoot, source)}`);
  for (const dest of Array.isArray(task.destinations) ? task.destinations : [task.destinations]) {
    console.log(`  target: ${relative(repoRoot, resolve(repoRoot, dest))}`);
  }
}

const copyLog = [];

const summary = copyArtifacts(selectedTasks, {
  cwd: repoRoot,
  onCopy: ({ label, file, destinationFile }) => {
    const relativeDestination = relative(repoRoot, destinationFile);
    const message = `    ✓ ${file} → ${relativeDestination}`;
    copyLog.push({ label, message });
  }
});

if (copyLog.length) {
  let currentLabel = null;
  for (const entry of copyLog) {
    if (entry.label !== currentLabel) {
      currentLabel = entry.label;
      console.log(`\n${currentLabel}:`);
    }
    console.log(entry.message);
  }
}

console.log('\nSummary:');

for (const result of summary.taskResults) {
  const uniqueFiles = new Set(result.copied.map(record => record.file));
  const hasErrors = result.errors.length > 0;

  if (hasErrors) {
    console.error(`  ✖ ${result.label}`);
    for (const error of result.errors) {
      console.error(`    • ${error}`);
    }
    continue;
  }

  if (!result.copied.length) {
    console.warn(`  ⚠️  ${result.label} (no artifacts copied)`);
    for (const warning of result.warnings) {
      console.warn(`    • ${warning}`);
    }
    continue;
  }

  console.log(`  ✅ ${result.label} (${uniqueFiles.size} artifact${uniqueFiles.size === 1 ? '' : 's'})`);
}

if (summary.errors.length > 0) {
  process.exit(1);
}

console.log(`\nDone. Total copies: ${summary.totalCopies}`);

