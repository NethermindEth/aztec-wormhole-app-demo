/**
 * EXAMPLE 2: Creating and Managing Accounts
 * 
 * This example demonstrates:
 * - Creating new account keys
 * - Deploying accounts on devnet
 * - Understanding account derivation
 * - Managing account secrets
 * 
 * Prerequisites:
 * - Internet connection to devnet.aztec-labs.com
 * 
 * Note: On devnet, you need to deploy your own accounts and obtain Fee Juice
 * 
 * Learn more: https://docs.aztec.network/nightly/developers/docs/guides/aztec-js/how_to_create_account
 */

import { Fr, GrumpkinScalar } from '@aztec/aztec.js/fields';
import { createAztecNodeClient, createPXEClient } from '@aztec/aztec.js/node';
import { getSchnorrAccount } from '@aztec/aztec.js/account';

const DEVNET_URL = 'https://devnet.aztec-labs.com';

async function main() {
  console.log('🚀 EXAMPLE 2: Creating and Managing Accounts\n');
  
  // Step 1: Connect to devnet
  console.log('📡 Step 1: Connecting to devnet...');
  const pxe = createPXEClient(DEVNET_URL);
  const nodeInfo = await pxe.getNodeInfo();
  console.log(`✅ Connected to devnet (version: ${nodeInfo.nodeVersion})\n`);
  
  // Step 2: Understanding Aztec Accounts
  console.log('🔐 Step 2: Understanding Aztec Accounts\n');
  console.log('   On Aztec, accounts are smart contracts with:');
  console.log('   - Secret Key: Derives encryption/nullifier keys for private state');
  console.log('   - Signing Key: Signs transactions');
  console.log('   - Salt: Makes the account address unique\n');
  
  // Step 3: Generate account keys
  console.log('🔑 Step 3: Generating New Account Keys\n');
  
  const secretKey = Fr.random();
  const signingKey = GrumpkinScalar.random();
  const salt = Fr.random();
  
  console.log('✅ Generated keys (keep these secret!):');
  console.log(`   Secret Key: ${secretKey.toString()}`);
  console.log(`   Signing Key: ${signingKey.toString()}`);
  console.log(`   Salt: ${salt.toString()}\n`);
  
  // Step 4: Derive account address (before deployment)
  console.log('🔮 Step 4: Calculating Account Address\n');
  console.log('   Account addresses are deterministic!');
  console.log('   Same keys + salt = same address\n');
  
  const account = getSchnorrAccount(pxe, secretKey, signingKey, salt);
  const address = account.getAddress();
  
  console.log(`✅ Account address (not deployed yet):`);
  console.log(`   ${address.toString()}\n`);
  
  // Step 5: Deployment explanation
  console.log('🚀 Step 5: Account Deployment\n');
  console.log('   To deploy this account, you would:');
  console.log('   1. Send Fee Juice to the account address');
  console.log('   2. Call: await account.deploy().wait()');
  console.log('   3. The account contract is created on-chain\n');
  
  console.log('   ⚠️  IMPORTANT: Account deployment requires Fee Juice!');
  console.log('   On devnet, you need to:');
  console.log('   - Get Fee Juice from a faucet (if available)');
  console.log('   - Or have another funded account send you Fee Juice\n');
  
  // Step 6: Best practices
  console.log('💡 Step 6: Account Management Best Practices\n');
  console.log('   Security:');
  console.log('   ✓ Never share your secret key');
  console.log('   ✓ Store keys encrypted');
  console.log('   ✓ Use environment variables or secure vaults');
  console.log('   ✓ Back up your keys safely\n');
  
  console.log('   Development:');
  console.log('   ✓ Use different accounts for testing');
  console.log('   ✓ Keep track of which accounts have Fee Juice');
  console.log('   ✓ Save deployment info for reuse');
  console.log('   ✓ Test on sandbox before devnet\n');
  
  // Step 7: Account types
  console.log('📋 Step 7: Account Types on Aztec\n');
  console.log('   Aztec supports various account contracts:');
  console.log('   - SchnorrAccount: Default, uses Schnorr signatures');
  console.log('   - ECDSAAccount: Compatible with Ethereum wallets');
  console.log('   - MultiSigAccount: Requires multiple signatures');
  console.log('   - Custom: Build your own account logic!\n');
  
  // Step 8: Checking existing accounts
  console.log('👥 Step 8: Checking Registered Accounts\n');
  const registeredAccounts = await pxe.getRegisteredAccounts();
  console.log(`   Found ${registeredAccounts.length} registered accounts in this PXE:`);
  registeredAccounts.forEach((acc, i) => {
    console.log(`   ${i + 1}. ${acc.address.toString()}`);
  });
  
  if (registeredAccounts.length === 0) {
    console.log('   (No accounts registered yet)\n');
  } else {
    console.log();
  }
  
  // Step 9: Summary
  console.log('📊 Summary:\n');
  console.log('   ✅ Connected to Aztec devnet');
  console.log('   ✅ Generated new account keys');
  console.log('   ✅ Calculated account address');
  console.log(`   ✅ Address: ${address.toString()}\n`);
  
  console.log('🎯 Next Steps:\n');
  console.log('   To actually use this account:');
  console.log('   1. Save the keys securely');
  console.log('   2. Get Fee Juice for the address');
  console.log('   3. Deploy the account with account.deploy()');
  console.log('   4. Start building your dApp!\n');
  
  console.log('💡 Example Code to Deploy:');
  console.log('   ```typescript');
  console.log('   const wallet = await account.waitSetup();');
  console.log('   const tx = await account.deploy().wait();');
  console.log('   console.log("Deployed at:", wallet.getAddress());');
  console.log('   ```\n');
  
  return { pxe, account, address };
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

export { main as createAccounts };
