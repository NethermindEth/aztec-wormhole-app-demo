/**
 * Quick Test: Connect to Aztec Devnet
 * 
 * This script tests the connection to the devnet and displays key information.
 * Run with: node test-devnet.mjs
 */

import { createAztecNodeClient } from '@aztec/aztec.js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = join(__dirname, '..');

// Default devnet URL
const DEFAULT_DEVNET_URL = 'https://devnet.aztec-labs.com';

// Load environment variables from .env if it exists
const envPath = join(parentDir, '.env');
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf-8');
  env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length && !line.trim().startsWith('#')) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const DEVNET_URL = process.env.AZTEC_DEVNET_URL || DEFAULT_DEVNET_URL;

console.log('🚀 Testing Connection to Aztec Devnet\n');
console.log(`📡 Connecting to: ${DEVNET_URL}...\n`);

try {
  const node = createAztecNodeClient(DEVNET_URL);
  
  // Get node information
  console.log('📊 Fetching node information...');
  const nodeInfo = await node.getNodeInfo();
  
  console.log('\n✅ Successfully connected to Aztec Devnet!\n');
  console.log('═'.repeat(60));
  console.log('NODE INFORMATION');
  console.log('═'.repeat(60));
  console.log(`Node Version:    ${nodeInfo.nodeVersion}`);
  console.log(`L1 Chain ID:     ${nodeInfo.l1ChainId} (Ethereum Sepolia)`);
  console.log(`Rollup Version:  ${nodeInfo.rollupVersion}`);
  
  // Get L1 contracts
  console.log('\n' + '═'.repeat(60));
  console.log('L1 CONTRACT ADDRESSES (on Sepolia)');
  console.log('═'.repeat(60));
  
  const l1Contracts = await node.getL1ContractAddresses();
  console.log(`Rollup Address:           ${l1Contracts.rollupAddress.toString()}`);
  console.log(`Registry Address:         ${l1Contracts.registryAddress.toString()}`);
  console.log(`Inbox Address:            ${l1Contracts.inboxAddress.toString()}`);
  console.log(`Outbox Address:           ${l1Contracts.outboxAddress.toString()}`);
  console.log(`Fee Juice Address:        ${l1Contracts.feeJuiceAddress.toString()}`);
  console.log(`Fee Juice Portal:         ${l1Contracts.feeJuicePortalAddress.toString()}`);
  
  // Get protocol contracts
  console.log('\n' + '═'.repeat(60));
  console.log('PROTOCOL CONTRACT ADDRESSES');
  console.log('═'.repeat(60));
  
  const protocolContracts = nodeInfo.protocolContractAddresses;
  console.log(`Class Registry:           ${protocolContracts.classRegistry.toString()}`);
  console.log(`Instance Registry:        ${protocolContracts.instanceRegistry.toString()}`);
  console.log(`Fee Juice:                ${protocolContracts.feeJuice.toString()}`);
  console.log(`MultiCall Entrypoint:     ${protocolContracts.multiCallEntrypoint.toString()}`);
  
  // Get current block number
  console.log('\n' + '═'.repeat(60));
  console.log('NETWORK STATUS');
  console.log('═'.repeat(60));
  
  const blockNumber = await node.getBlockNumber();
  console.log(`Current Block Number:     ${blockNumber}`);
  console.log(`Network:                  Aztec Devnet`);
  console.log(`Status:                   Online ✓`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n✨ Connection test successful!\n');
  console.log('💡 You can now:');
  console.log('   - Deploy contracts to this devnet');
  console.log('   - Create and fund accounts');
  console.log('   - Send transactions');
  console.log('   - Build privacy-preserving dApps!\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Connection failed!\n');
  console.error('Error:', error.message);
  console.error('\n💡 Troubleshooting:');
  console.error('   - Check your internet connection');
  console.error('   - Verify devnet is online: curl https://devnet.aztec-labs.com');
  console.error('   - Try again in a few moments\n');
  process.exit(1);
}

