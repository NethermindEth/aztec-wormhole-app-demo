/**
 * EXAMPLE 1: Connecting to Aztec Devnet
 * 
 * This example demonstrates:
 * - How to create an Aztec node client
 * - How to connect to the remote devnet
 * - How to verify the connection and get network info
 * 
 * Prerequisites:
 * - Internet connection to reach devnet.aztec-labs.com
 * 
 * Learn more: https://docs.aztec.network/nightly/developers/docs/guides/aztec-js/how_to_connect_to_sandbox
 */

import { createAztecNodeClient } from '@aztec/aztec.js/node';

const DEVNET_URL = 'https://devnet.aztec-labs.com';

async function main() {
  console.log('🚀 EXAMPLE 1: Connecting to Aztec Devnet\n');
  
  // Step 1: Create a connection to the Aztec devnet
  console.log(`📡 Step 1: Connecting to Aztec devnet at ${DEVNET_URL}...`);
  const node = createAztecNodeClient(DEVNET_URL);
  
  try {
    // Step 2: Get node information
    console.log('📊 Step 2: Fetching node information...');
    const nodeInfo = await node.getNodeInfo();
    console.log('✅ Connected to Aztec Devnet:');
    console.log(`   - Node Version: ${nodeInfo.nodeVersion}`);
    console.log(`   - L1 Chain ID: ${nodeInfo.l1ChainId} (Sepolia)`);
    console.log(`   - Rollup Version: ${nodeInfo.rollupVersion}\n`);
    
    // Step 3: Get L1 contract addresses from the devnet
    console.log('📋 Step 3: Fetching L1 contract addresses...');
    const l1Contracts = await node.getL1ContractAddresses();
    console.log('✅ L1 Contracts (on Sepolia):');
    console.log(`   - Rollup: ${l1Contracts.rollupAddress.toString()}`);
    console.log(`   - Registry: ${l1Contracts.registryAddress.toString()}`);
    console.log(`   - Inbox: ${l1Contracts.inboxAddress.toString()}`);
    console.log(`   - Outbox: ${l1Contracts.outboxAddress.toString()}`);
    console.log(`   - Fee Juice: ${l1Contracts.feeJuiceAddress.toString()}\n`);
    
    // Step 4: Get protocol contract addresses
    console.log('📋 Step 4: Fetching protocol contract addresses...');
    const protocolContracts = nodeInfo.protocolContractAddresses;
    console.log('✅ Protocol Contracts:');
    console.log(`   - Class Registry: ${protocolContracts.classRegistry.toString()}`);
    console.log(`   - Instance Registry: ${protocolContracts.instanceRegistry.toString()}`);
    console.log(`   - Fee Juice: ${protocolContracts.feeJuice.toString()}`);
    console.log(`   - MultiCall Entrypoint: ${protocolContracts.multiCallEntrypoint.toString()}\n`);
    
    // Step 5: Get blockchain status
    console.log('🔗 Step 5: Checking blockchain status...');
    const blockNumber = await node.getBlockNumber();
    console.log('✅ Network Status:');
    console.log(`   - Current Block: ${blockNumber}`);
    console.log(`   - Network: Aztec Devnet`);
    console.log(`   - L1: Ethereum Sepolia (Chain ID: ${nodeInfo.l1ChainId})\n`);
    
    console.log('✨ Successfully connected to Aztec Devnet!\n');
    console.log('💡 Key Points:');
    console.log('   - This is a LIVE devnet with real state');
    console.log('   - You can deploy contracts and interact with them');
    console.log('   - State persists across sessions');
    console.log('   - Multiple users share this devnet\n');
    
    console.log('🔐 Next Steps:');
    console.log('   - Create or import accounts');
    console.log('   - Get Fee Juice for transactions');
    console.log('   - Deploy your contracts');
    console.log('   - Build amazing privacy-preserving dApps!\n');
    
    // Return the node for use in other examples
    return { node };
    
  } catch (error) {
    console.error('❌ Error connecting to devnet:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.error('\n💡 Troubleshooting:');
    console.error(`   - Check internet connection`);
    console.error(`   - Verify devnet is online: curl ${DEVNET_URL}`);
    console.error('   - Try again in a few moments\n');
    process.exit(1);
  }
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

export { main as connectToDevnet };

