/**
 * DEPLOY COUNTER CONTRACT TO DEVNET
 * 
 * This script deploys the Counter contract to Aztec devnet using Sponsored Fee Payment.
 * It automatically handles account creation and deployment.
 * 
 * Prerequisites:
 * 1. Counter contract compiled (run: pnpm build)
 * 
 * Usage:
 * node deploy-counter.mjs
 * 
 * Optional: Set custom keys in .env or environment variables
 */

import { 
  createPXEClient,
  Contract, 
  Fr, 
  AztecAddress,
  getContractInstanceFromInstantiationParams,
  SponsoredFeePaymentMethod,
  loadContractArtifact
} from '@aztec/aztec.js';
import { getInitialTestAccountsWallets } from '@aztec/accounts/testing';
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = join(__dirname, '..');

// Default configuration (works out of the box!)
const DEFAULTS = {
  AZTEC_DEVNET_URL: 'https://devnet.aztec-labs.com',
  // Default keys - safe for testing on devnet!
  AZTEC_PRIVATE_KEY: '0x0d34977000cf302b5c3ef9da48a6d1efbfe736c109eaa3400a8e533630465b7d',
  AZTEC_SIGNING_KEY: '0x2aa548d67c5273e5ab03ae994146060767e40a6b2a83a2968dd6b31814f4796a',
};

// Load environment variables from .env if it exists
const envPath = join(parentDir, '.env');
try {
  const env = readFileSync(envPath, 'utf-8');
  env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length && !line.trim().startsWith('#')) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
} catch (e) {
  // .env doesn't exist, use defaults
}

// Get configuration with fallbacks to defaults
function getConfig(key) {
  return process.env[key] || DEFAULTS[key];
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║        DEPLOY COUNTER TO AZTEC DEVNET (SPONSORED FPC)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const devnetUrl = getConfig('AZTEC_DEVNET_URL');
  
  console.log(`📡 Connecting to Aztec PXE at: ${devnetUrl}`);
  const pxe = createPXEClient(devnetUrl);
  console.log('✅ Connected to PXE\n');

  // Get pre-registered test accounts from the PXE (like wormhole does)
  console.log('🔑 Getting initial test accounts from PXE...');
  const [wallet] = await getInitialTestAccountsWallets(pxe);
  const accountAddress = wallet.getAddress();
  
  console.log(`   Account address: ${accountAddress.toString()}\n`);

  // Get Sponsored FPC instance
  console.log('💰 Setting up Sponsored Fee Payment Contract...');
  const sponsoredFPCInstance = await getContractInstanceFromInstantiationParams(
    SponsoredFPCContract.artifact,
    { salt: new Fr(0) }
  );
  
  console.log(`   Sponsored FPC address: ${sponsoredFPCInstance.address.toString()}`);
  
  // Create payment method (FPC is already deployed on devnet)
  const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(sponsoredFPCInstance.address);
  
  console.log('   ✅ Sponsored FPC payment method created\n');

  // Account is already registered in PXE (test accounts)
  console.log('✅ Using pre-registered test account from PXE\n');

  // Load Counter contract artifact
  console.log('📦 Loading Counter contract artifact...');
  const counterArtifactPath = join(parentDir, 'src/artifacts/Counter.json');
  const counterJson = JSON.parse(readFileSync(counterArtifactPath, 'utf-8'));
  const counterArtifact = loadContractArtifact(counterJson);
  console.log('   ✅ Counter artifact loaded\n');

  // Deploy Counter contract (like wormhole does - just .send().deployed())
  console.log('🚀 Deploying Counter contract...');
  console.log('   Admin will be set to: ' + accountAddress.toString());
  
  const counter = await Contract.deploy(
    wallet,
    counterArtifact,
    [accountAddress], // Constructor args: admin address
    "constructor"
  )
    .send()
    .deployed();
  
  console.log('   ✅ Counter contract deployed!\n');

  // Save deployment info
  const deploymentInfo = {
    contractAddress: counter.address.toString(),
    adminAddress: accountAddress.toString(),
    devnetUrl: devnetUrl,
    sponsoredFPCAddress: sponsoredFPCInstance.address.toString(),
    deployedAt: new Date().toISOString(),
    accountKeys: {
      note: "These keys are for testing only. Never use in production!",
      privateKey: privateKeyHex,
      signingKey: signingKeyHex
    }
  };

  const deploymentPath = join(parentDir, 'deployment.json');
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              DEPLOYMENT SUCCESSFUL! 🎉                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('📝 Deployment Details:');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Contract Address:    ${counter.address.toString()}`);
  console.log(`   Admin Address:       ${accountAddress.toString()}`);
  console.log(`   Sponsored FPC:       ${sponsoredFPCInstance.address.toString()}`);
  console.log(`   Network:             ${devnetUrl}`);
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💾 Deployment info saved to: deployment.json\n');
  console.log('🎯 Next steps:');
  console.log('   - Call counter.methods.increment() to increment the counter');
  console.log('   - Call counter.methods.get_count() to read the current value');
  console.log('   - Call counter.methods.reset() to reset (admin only)');
  console.log('   - Check examples/ directory for interaction patterns\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  });
