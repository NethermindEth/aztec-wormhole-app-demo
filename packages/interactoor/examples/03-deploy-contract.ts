/**
 * EXAMPLE 3: Deploying Smart Contracts
 * 
 * This example demonstrates:
 * - Loading contract artifacts
 * - Deploying contracts to Aztec devnet
 * - Calculating contract addresses
 * - Understanding deployment transactions
 * 
 * Prerequisites:
 * - Contract compiled (pnpm build)
 * - Account with Fee Juice (for deployment gas)
 * 
 * Note: This example shows the deployment process but requires a funded account to execute
 * 
 * Learn more: https://docs.aztec.network/nightly/developers/docs/guides/aztec-js/how_to_deploy_contract
 */

import { createPXEClient } from '@aztec/aztec.js/node';
import { Contract } from '@aztec/aztec.js/contracts';
import { Fr } from '@aztec/aztec.js/fields';
import { getSchnorrAccount } from '@aztec/aztec.js/account';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEVNET_URL = 'https://devnet.aztec-labs.com';

async function main() {
  console.log('🚀 EXAMPLE 3: Deploying Smart Contracts\n');
  
  // Step 1: Connect to devnet
  console.log('📡 Step 1: Connecting to devnet...');
  const pxe = createPXEClient(DEVNET_URL);
  const nodeInfo = await pxe.getNodeInfo();
  console.log(`✅ Connected (version: ${nodeInfo.nodeVersion})\n`);
  
  // Step 2: Load contract artifact
  console.log('📦 Step 2: Loading Counter contract artifact...');
  let artifact;
  try {
    const artifactPath = join(__dirname, '../src/artifacts/Counter.json');
    const artifactJson = readFileSync(artifactPath, 'utf-8');
    artifact = JSON.parse(artifactJson);
    console.log(`✅ Loaded artifact for: ${artifact.name}`);
    console.log(`   Contract ABI Version: ${artifact.fileMap ? 'Present' : 'N/A'}`);
    console.log(`   Functions: ${artifact.functions.length}\n`);
  } catch (error) {
    console.error('❌ Failed to load artifact. Did you run "pnpm build"?');
    throw error;
  }
  
  // Step 3: Set up deployer account (example - you need real keys)
  console.log('🔑 Step 3: Account Setup\n');
  console.log('   ⚠️  To actually deploy, you need:');
  console.log('   1. A deployed account with Fee Juice');
  console.log('   2. Your account\'s secret and signing keys\n');
  
  console.log('   Example account setup:');
  console.log('   ```typescript');
  console.log('   const secretKey = Fr.fromString("0x...");');
  console.log('   const signingKey = GrumpkinScalar.fromString("0x...");');
  console.log('   const account = getSchnorrAccount(pxe, secretKey, signingKey);');
  console.log('   const wallet = await account.waitSetup();');
  console.log('   ```\n');
  
  // Step 4: Calculate deployment address
  console.log('🔮 Step 4: Calculating Contract Address\n');
  console.log('   Contract addresses are deterministic!');
  console.log('   Factors that determine address:');
  console.log('   - Contract artifact');
  console.log('   - Constructor arguments');
  console.log('   - Deployer\'s public key');
  console.log('   - Salt (optional, for multiple instances)\n');
  
  // We'll use a dummy account to show address calculation
  const dummySecretKey = Fr.random();
  const dummySigningKey = Fr.random();
  const dummyAccount = getSchnorrAccount(pxe, dummySecretKey, dummySigningKey);
  const dummyWallet = await dummyAccount.getWallet();
  const adminAddress = dummyWallet.getAddress();
  
  console.log('   Example: Calculating address for Counter contract...');
  const deploymentTx = Contract.deploy(dummyWallet, artifact, [adminAddress]);
  const calculatedAddress = deploymentTx.getInstance().address;
  
  console.log(`✅ Contract would be deployed at:`);
  console.log(`   ${calculatedAddress.toString()}\n`);
  
  // Step 5: Deployment process explanation
  console.log('🚀 Step 5: Deployment Process\n');
  console.log('   To deploy a contract:');
  console.log('   ```typescript');
  console.log('   // 1. Create deployment transaction');
  console.log('   const deployTx = Contract.deploy(wallet, artifact, [args]);');
  console.log('   ');
  console.log('   // 2. Send and wait for deployment');
  console.log('   const { contract, txReceipt } = await deployTx.send().wait();');
  console.log('   ');
  console.log('   // 3. Contract is now deployed and ready!');
  console.log('   console.log("Deployed at:", contract.address);');
  console.log('   ```\n');
  
  console.log('   What happens during deployment:');
  console.log('   1️⃣  Contract class registered (if first deployment)');
  console.log('   2️⃣  Contract instance created with constructor');
  console.log('   3️⃣  Deployment transaction mined');
  console.log('   4️⃣  Contract registered in PXE for interaction\n');
  
  // Step 6: Show contract information
  console.log('📋 Step 6: Contract Information\n');
  console.log('   Counter Contract Functions:');
  artifact.functions
    .filter((f: any) => !f.isInternal)
    .forEach((func: any) => {
      const type = func.functionType === 'unconstrained' ? '[VIEW]' : 
                   func.functionType === 'private' ? '[PRIVATE]' : '[PUBLIC]';
      const params = func.parameters.map((p: any) => `${p.name}: ${p.type.kind}`).join(', ');
      console.log(`   ${type} ${func.name}(${params})`);
    });
  
  console.log('\n💡 Key Concepts:\n');
  console.log('   Deterministic Addresses:');
  console.log('   - Same artifact + args = same address');
  console.log('   - Enables "counterfactual" deployments');
  console.log('   - Can send assets before deployment\n');
  
  console.log('   Constructor Arguments:');
  console.log('   - Passed during deployment');
  console.log('   - Initialize contract state');
  console.log('   - Example: admin address for Counter\n');
  
  console.log('   Deployment Cost:');
  console.log('   - Requires Fee Juice for gas');
  console.log('   - First deployment of a class costs more');
  console.log('   - Subsequent instances are cheaper\n');
  
  // Step 7: Example of actual deployment (commented)
  console.log('💻 Step 7: Complete Deployment Example\n');
  console.log('   Here\'s a complete example to deploy on devnet:');
  console.log('   ```typescript');
  console.log('   import { createPXEClient, getSchnorrAccount, Fr, Contract } from "@aztec/aztec.js";');
  console.log('   ');
  console.log('   const pxe = createPXEClient("https://devnet.aztec-labs.com");');
  console.log('   ');
  console.log('   // Your account keys (keep secret!)');
  console.log('   const secretKey = Fr.fromString(process.env.AZTEC_SECRET_KEY!);');
  console.log('   const signingKey = Fr.fromString(process.env.AZTEC_SIGNING_KEY!);');
  console.log('   ');
  console.log('   // Set up account');
  console.log('   const account = getSchnorrAccount(pxe, secretKey, signingKey);');
  console.log('   const wallet = await account.waitSetup();');
  console.log('   ');
  console.log('   // Deploy Counter');
  console.log('   const adminAddress = wallet.getAddress();');
  console.log('   const { contract } = await Contract.deploy(');
  console.log('     wallet,');
  console.log('     counterArtifact,');
  console.log('     [adminAddress]');
  console.log('   ).send().wait();');
  console.log('   ');
  console.log('   console.log("🎉 Deployed at:", contract.address.toString());');
  console.log('   ```\n');
  
  console.log('📊 Summary:\n');
  console.log(`   ✅ Loaded Counter contract artifact`);
  console.log(`   ✅ Calculated deployment address`);
  console.log(`   ✅ Understood deployment process`);
  console.log(`   ✅ Ready to deploy with a funded account!\n`);
  
  console.log('🎯 Next Steps:\n');
  console.log('   1. Get a funded account on devnet');
  console.log('   2. Set up environment variables with keys');
  console.log('   3. Run actual deployment');
  console.log('   4. Interact with your deployed contract\n');
  
  return { pxe, artifact };
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

export { main as deployContract };
