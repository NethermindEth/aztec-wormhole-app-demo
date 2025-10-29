/**
 * EXAMPLE 6: Using the Emitter Contract
 * 
 * This example demonstrates:
 * - Working with existing deployed contracts
 * - Understanding contract interaction patterns
 * - Reading deployed contract addresses
 * - Contract composition and imports
 * 
 * Prerequisites:
 * - Aztec sandbox running
 * - Emitter contract deployed (from aztec-contracts package)
 * 
 * Note: This example explains the emitter contract structure
 * but doesn't execute it due to its complexity (requires proof data)
 */

import { 
  createAztecNodeClient, 
  waitForPXE,
  Contract,
  AztecAddress,
} from '@aztec/aztec.js';
import { createStore } from '@aztec/kv-store/lmdb';
import { createPXE, getPXEConfig } from '@aztec/pxe/server';
import { TestWallet } from '@aztec/test-wallet/server';
import { getInitialTestAccountsData } from '@aztec/accounts/testing';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🚀 EXAMPLE 6: Understanding the Emitter Contract\n');
  
  // Step 1: Set up
  console.log('📡 Step 1: Setting up connection...');
  const node = createAztecNodeClient('http://localhost:8080');
  const l1Contracts = await node.getL1ContractAddresses();
  
  const config = getPXEConfig();
  const fullConfig = { ...config, l1Contracts };
  fullConfig.proverEnabled = false;
  
  const store = await createStore('pxe-emitter', {
    dataDirectory: './data-emitter',
    dataStoreMapSizeKb: 1e6,
  });
  
  const pxe = await createPXE(node, fullConfig, { store });
  await waitForPXE(pxe);
  
  const wallet = await TestWallet.create(pxe, node);
  const testAccounts = await getInitialTestAccountsData();
  await wallet.createSchnorrAccount(testAccounts[0].secret, testAccounts[0].salt);
  const alice = wallet.getAccount(0);
  console.log(`✅ Connected as Alice\n`);
  
  // Step 2: Load emitter contract artifact
  console.log('📦 Step 2: Loading Emitter Contract Information\n');
  
  const emitterArtifactPath = join(__dirname, '../../aztec-contracts/emitter/target/emitter-ZKPassportCredentialEmitter.json');
  const emitterAddressPath = join(__dirname, '../../aztec-contracts/emitter/addresses.json');
  
  if (!existsSync(emitterArtifactPath)) {
    console.log('⚠️  Emitter contract not compiled yet.\n');
    console.log('   To compile it, run:');
    console.log('   cd ../aztec-contracts/emitter && npm run build\n');
  } else {
    const artifact = JSON.parse(readFileSync(emitterArtifactPath, 'utf-8'));
    console.log(`✅ Loaded: ${artifact.name}`);
    console.log(`   Functions: ${artifact.functions.length}\n`);
    
    // Explain the contract structure
    console.log('📋 Contract Structure:\n');
    console.log('   The ZKPassportCredentialEmitter is an advanced contract that:');
    console.log('   1. Verifies zero-knowledge passport proofs');
    console.log('   2. Performs private token transfers (donations)');
    console.log('   3. Publishes messages via Wormhole bridge\n');
    
    console.log('   Main Function: verify_and_publish()');
    console.log('   ├─ Input: Contract proof data (6 proofs + verification keys)');
    console.log('   ├─ Input: Message payload (7 x 31-byte arrays)');
    console.log('   ├─ Input: Wormhole contract address');
    console.log('   ├─ Input: Token address and amount');
    console.log('   └─ Input: Nonce for replay protection\n');
    
    console.log('   Complex Data Structures:');
    console.log('   ├─ vkeys: Verification keys for each proof (6 keys x 128 fields)');
    console.log('   ├─ proofs: ZK proofs (6 proofs x 456 fields each)');
    console.log('   ├─ vkey_hashes: Hash of each verification key');
    console.log('   └─ public_inputs: Public inputs for each proof\n');
  }
  
  // Step 3: Understanding contract interactions
  console.log('🔗 Step 3: Contract Interaction Patterns\n');
  console.log('   The Emitter demonstrates several advanced patterns:\n');
  
  console.log('   1. Multi-Proof Verification:');
  console.log('      - Uses std::verify_proof_with_type()');
  console.log('      - Verifies 6 separate ZK proofs in one transaction');
  console.log('      - Each proof validates different passport data\n');
  
  console.log('   2. Cross-Contract Calls:');
  console.log('      - Calls Token contract for private transfers');
  console.log('      - Calls Wormhole contract to publish messages');
  console.log('      - Uses contract composition pattern\n');
  
  console.log('   3. Private Data Handling:');
  console.log('      - Function is marked #[private]');
  console.log('      - Transfers tokens privately using transfer_in_private');
  console.log('      - Publishes to Wormhole from private context\n');
  
  // Step 4: Reading deployed addresses
  console.log('📍 Step 4: Deployed Contract Addresses\n');
  
  if (existsSync(emitterAddressPath)) {
    const addresses = JSON.parse(readFileSync(emitterAddressPath, 'utf-8'));
    console.log('   Emitter contract addresses:');
    for (const [network, address] of Object.entries(addresses)) {
      console.log(`   ${network}: ${address}`);
    }
    console.log();
  } else {
    console.log('   ℹ️  No deployment addresses found yet.\n');
  }
  
  // Step 5: Contract dependencies
  console.log('📚 Step 5: Contract Dependencies\n');
  console.log('   The Emitter imports and uses:');
  console.log('   - Wormhole Contract: For cross-chain messaging');
  console.log('   - Token Contract: For private token transfers');
  console.log('   - Aztec stdlib: For proof verification\n');
  
  console.log('   Example of how to interact with external contracts:');
  console.log('   ```noir');
  console.log('   let _ = Token::at(token_address).transfer_in_private(');
  console.log('       from,');
  console.log('       to,');
  console.log('       amount,');
  console.log('       nonce');
  console.log('   ).call(&mut context);');
  console.log('   ```\n');
  
  // Step 6: Comparison with Counter contract
  console.log('⚖️  Step 6: Comparing Emitter vs Counter\n');
  console.log('   Counter Contract (Learning):');
  console.log('   ✓ Simple state management');
  console.log('   ✓ Basic public/private functions');
  console.log('   ✓ Easy to understand and test');
  console.log('   ✓ Self-contained logic\n');
  
  console.log('   Emitter Contract (Production):');
  console.log('   ✓ Complex proof verification');
  console.log('   ✓ Multi-contract composition');
  console.log('   ✓ Advanced cryptographic operations');
  console.log('   ✓ Cross-chain integration\n');
  
  // Step 7: Educational takeaways
  console.log('💡 Key Takeaways:\n');
  console.log('   Contract Development Progression:');
  console.log('   1. Start with simple contracts (Counter)');
  console.log('   2. Learn state management and function types');
  console.log('   3. Progress to contract composition');
  console.log('   4. Add advanced features (proof verification, bridges)\n');
  
  console.log('   Advanced Features to Study:');
  console.log('   • Zero-knowledge proof verification');
  console.log('   • Cross-contract calls and composition');
  console.log('   • Private token transfers');
  console.log('   • Message passing and bridges');
  console.log('   • Complex data structure handling\n');
  
  console.log('📖 Next Steps:\n');
  console.log('   1. Master the Counter contract basics');
  console.log('   2. Study the Emitter contract source code');
  console.log('   3. Learn about Wormhole cross-chain messaging');
  console.log('   4. Understand ZK proof systems');
  console.log('   5. Build your own advanced contracts!\n');
  
  return { pxe, wallet, alice };
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('✅ Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}

export { main as useEmitter };

