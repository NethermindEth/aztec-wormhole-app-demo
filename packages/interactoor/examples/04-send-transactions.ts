/**
 * EXAMPLE 4: Sending Transactions
 * 
 * This example demonstrates:
 * - Understanding transaction types
 * - Public vs private transactions
 * - Transaction lifecycle
 * - Gas and fee payment
 * 
 * Prerequisites:
 * - Deployed contract
 * - Account with Fee Juice
 * 
 * Learn more: https://docs.aztec.network/nightly/developers/docs/guides/aztec-js/how_to_send_transaction
 */

import { createPXEClient } from '@aztec/aztec.js/node';
import { TxStatus } from '@aztec/aztec.js/tx';

const DEVNET_URL = 'https://devnet.aztec-labs.com';

async function main() {
  console.log('🚀 EXAMPLE 4: Sending Transactions\n');
  
  console.log('📡 Connecting to devnet...');
  const pxe = createPXEClient(DEVNET_URL);
  const nodeInfo = await pxe.getNodeInfo();
  console.log(`✅ Connected (version: ${nodeInfo.nodeVersion})\n`);
  
  // Transaction Types Overview
  console.log('📋 Transaction Types on Aztec\n');
  console.log('   PUBLIC Transactions:');
  console.log('   ✓ Execute on the Aztec network');
  console.log('   ✓ State changes are visible to everyone');
  console.log('   ✓ Slower (requires network consensus)');
  console.log('   ✓ Use case: Shared state, token balances, governance\n');
  
  console.log('   PRIVATE Transactions:');
  console.log('   ✓ Execute locally, then proven');
  console.log('   ✓ State changes are encrypted');
  console.log('   ✓ Only you can see your private state');
  console.log('   ✓ Use case: Personal data, private balances, confidential logic\n');
  
  // Transaction Lifecycle
  console.log('🔄 Transaction Lifecycle\n');
  console.log('   1. CONSTRUCTION');
  console.log('      - Build transaction with contract method');
  console.log('      - Example: contract.methods.increment().send()\n');
  
  console.log('   2. SIMULATION (Optional)');
  console.log('      - Test locally without sending');
  console.log('      - Example: contract.methods.increment().simulate()\n');
  
  console.log('   3. SUBMISSION');
  console.log('      - Send to sequencer');
  console.log('      - Returns transaction hash immediately\n');
  
  console.log('   4. PENDING');
  console.log('      - Waiting in mempool');
  console.log('      - Sequencer selecting transactions\n');
  
  console.log('   5. MINED');
  console.log('      - Included in a block');
  console.log('      - State updated');
  console.log('      - Receipt available\n');
  
  // Example Code
  console.log('💻 Example: Sending Public Transaction\n');
  console.log('   ```typescript');
  console.log('   // Send and wait for confirmation');
  console.log('   const tx = await contract.methods.increment_public().send().wait();');
  console.log('   ');
  console.log('   console.log("Status:", TxStatus[tx.status]);');
  console.log('   console.log("Block:", tx.blockNumber);');
  console.log('   console.log("Hash:", tx.txHash);');
  console.log('   ```\n');
  
  console.log('💻 Example: Sending Private Transaction\n');
  console.log('   ```typescript');
  console.log('   // Private transaction - state encrypted');
  console.log('   const tx = await contract.methods.increment_private().send().wait();');
  console.log('   ');
  console.log('   // Only you can read your private state');
  console.log('   const myCount = await contract.methods');
  console.log('     .get_private_count(myAddress)');
  console.log('     .simulate();');
  console.log('   ```\n');
  
  // Gas and Fees
  console.log('⛽ Gas and Fees\n');
  console.log('   Fee Juice Token:');
  console.log('   - Used to pay for transaction gas');
  console.log('   - Required for all transactions');
  console.log('   - Address: 0x0000...0005 (protocol contract)\n');
  
  console.log('   Fee Calculation:');
  console.log('   - Based on computation complexity');
  console.log('   - Private functions: proof generation cost');
  console.log('   - Public functions: execution cost');
  console.log('   - Paid from your account balance\n');
  
  console.log('   Getting Fee Juice:');
  console.log('   - Devnet: From faucet or existing account');
  console.log('   - Testnet: From faucet');
  console.log('   - Mainnet: Purchase or earn\n');
  
  // Transaction Patterns
  console.log('🎯 Common Transaction Patterns\n');
  console.log('   Pattern 1: Send and Wait');
  console.log('   ```typescript');
  console.log('   const receipt = await contract.methods.func().send().wait();');
  console.log('   // Transaction is confirmed');
  console.log('   ```\n');
  
  console.log('   Pattern 2: Send and Monitor');
  console.log('   ```typescript');
  console.log('   const txHash = await contract.methods.func().send();');
  console.log('   console.log("Submitted:", txHash);');
  console.log('   // Do other work...');
  console.log('   const receipt = await pxe.getTxReceipt(txHash);');
  console.log('   ```\n');
  
  console.log('   Pattern 3: Simulate First');
  console.log('   ```typescript');
  console.log('   // Test if it will work');
  console.log('   await contract.methods.func().simulate();');
  console.log('   // If no error, send for real');
  console.log('   await contract.methods.func().send().wait();');
  console.log('   ```\n');
  
  // Error Handling
  console.log('❌ Error Handling\n');
  console.log('   Common Errors:');
  console.log('   - Insufficient Fee Juice: Get more Fee Juice');
  console.log('   - Simulation failed: Check function requirements');
  console.log('   - Timeout: Transaction took too long');
  console.log('   - Revert: Contract logic rejected transaction\n');
  
  console.log('   Example:');
  console.log('   ```typescript');
  console.log('   try {');
  console.log('     const tx = await contract.methods.func().send().wait();');
  console.log('   } catch (error) {');
  console.log('     if (error.message.includes("Insufficient")) {');
  console.log('       console.log("Need more Fee Juice!");');
  console.log('     }');
  console.log('   }');
  console.log('   ```\n');
  
  // Best Practices
  console.log('✨ Best Practices\n');
  console.log('   1. Always simulate complex transactions first');
  console.log('   2. Check Fee Juice balance before sending');
  console.log('   3. Handle errors gracefully');
  console.log('   4. Wait for confirmation before showing success');
  console.log('   5. Use private functions for sensitive data');
  console.log('   6. Batch related operations when possible\n');
  
  console.log('📊 Transaction Comparison\n');
  console.log('   ┌──────────────┬─────────────┬───────────────┬─────────────┐');
  console.log('   │ Aspect       │ Public      │ Private       │ Unconstrained│');
  console.log('   ├──────────────┼─────────────┼───────────────┼─────────────┤');
  console.log('   │ Visibility   │ Everyone    │ Encrypted     │ Read-only   │');
  console.log('   │ Speed        │ ~30-60s     │ ~30-60s       │ Instant     │');
  console.log('   │ Cost         │ Gas fees    │ Gas fees      │ Free        │');
  console.log('   │ Use Case     │ Public data │ Private data  │ Queries     │');
  console.log('   └──────────────┴─────────────┴───────────────┴─────────────┘\n');
  
  console.log('🎯 Summary:\n');
  console.log('   ✅ Understood transaction types');
  console.log('   ✅ Learned transaction lifecycle');
  console.log('   ✅ Explored gas and fees');
  console.log('   ✅ Ready to send transactions!\n');
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

export { main as sendTransactions };
