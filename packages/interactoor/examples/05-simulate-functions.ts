/**
 * EXAMPLE 5: Simulating Functions (View Functions)
 * 
 * This example demonstrates:
 * - Calling unconstrained (view) functions
 * - Simulating transactions before sending
 * - Reading public and private state
 * - Performance and cost differences
 * 
 * Prerequisites:
 * - Deployed contract (for real testing)
 * 
 * Learn more: https://docs.aztec.network/nightly/developers/docs/guides/aztec-js/how_to_simulate_function
 */

import { createPXEClient } from '@aztec/aztec.js/node';

const DEVNET_URL = 'https://devnet.aztec-labs.com';

async function main() {
  console.log('🚀 EXAMPLE 5: Simulating Functions\n');
  
  console.log('📡 Connecting to devnet...');
  const pxe = createPXEClient(DEVNET_URL);
  const nodeInfo = await pxe.getNodeInfo();
  console.log(`✅ Connected (version: ${nodeInfo.nodeVersion})\n`);
  
  // Types of Function Calls
  console.log('📋 Types of Function Calls\n');
  console.log('   1. UNCONSTRAINED (View Functions)');
  console.log('      - Read-only, no state changes');
  console.log('      - Execute instantly');
  console.log('      - Free (no gas)');
  console.log('      - Marked: unconstrained fn name()\n');
  
  console.log('   2. SIMULATION');
  console.log('      - Test transactions without sending');
  console.log('      - No state changes');
  console.log('      - Free (no gas)');
  console.log('      - Returns what would happen\n');
  
  console.log('   3. EXECUTION (send())');
  console.log('      - Actually changes state');
  console.log('      - Requires gas (Fee Juice)');
  console.log('      - Creates transaction');
  console.log('      - Updates blockchain\n');
  
  // Unconstrained Functions
  console.log('👁️  Unconstrained Functions (Views)\n');
  console.log('   Example from Counter contract:');
  console.log('   ```noir');
  console.log('   unconstrained fn get_public_count() -> pub u64 {');
  console.log('       storage.public_count.read()');
  console.log('   }');
  console.log('   ```\n');
  
  console.log('   Usage:');
  console.log('   ```typescript');
  console.log('   // Instant, free read');
  console.log('   const count = await contract.methods.get_public_count().simulate();');
  console.log('   console.log("Current count:", count);');
  console.log('   ```\n');
  
  console.log('   Perfect for:');
  console.log('   ✓ Reading balances');
  console.log('   ✓ Getting configuration');
  console.log('   ✓ Checking permissions');
  console.log('   ✓ Querying state\n');
  
  // Simulation
  console.log('🔮 Simulating Transactions\n');
  console.log('   Why simulate?');
  console.log('   ✓ Test if transaction will succeed');
  console.log('   ✓ Preview state changes');
  console.log('   ✓ Check return values');
  console.log('   ✓ Avoid wasting gas on failures\n');
  
  console.log('   Example:');
  console.log('   ```typescript');
  console.log('   // Test without changing state');
  console.log('   try {');
  console.log('     await contract.methods.increment_public().simulate();');
  console.log('     console.log("✅ Transaction would succeed");');
  console.log('   } catch (error) {');
  console.log('     console.log("❌ Transaction would fail:", error);');
  console.log('   }');
  console.log('   ```\n');
  
  // Comparison
  console.log('⚖️  simulate() vs send()\n');
  console.log('   Example showing the difference:');
  console.log('   ```typescript');
  console.log('   // Before');
  console.log('   const before = await contract.methods.get_public_count().simulate();');
  console.log('   console.log("Count:", before); // e.g., 5');
  console.log('   ');
  console.log('   // Simulate (no change)');
  console.log('   await contract.methods.increment_public().simulate();');
  console.log('   const after1 = await contract.methods.get_public_count().simulate();');
  console.log('   console.log("Count:", after1); // Still 5!');
  console.log('   ');
  console.log('   // Send (actual change)');
  console.log('   await contract.methods.increment_public().send().wait();');
  console.log('   const after2 = await contract.methods.get_public_count().simulate();');
  console.log('   console.log("Count:", after2); // Now 6!');
  console.log('   ```\n');
  
  // Reading Private State
  console.log('🔐 Reading Private State\n');
  console.log('   Private state is encrypted, but you can read YOUR private state:');
  console.log('   ```typescript');
  console.log('   // Read your private counter');
  console.log('   const myPrivateCount = await contract.methods');
  console.log('     .get_private_count(myAddress)');
  console.log('     .simulate();');
  console.log('   ');
  console.log('   // ❌ Cannot read someone else\'s private state');
  console.log('   // (It\'s encrypted with their keys)');
  console.log('   ```\n');
  
  // Performance
  console.log('⚡ Performance Comparison\n');
  console.log('   Typical timings:');
  console.log('   ┌─────────────────────┬──────────┬─────────┐');
  console.log('   │ Operation           │ Time     │ Cost    │');
  console.log('   ├─────────────────────┼──────────┼─────────┤');
  console.log('   │ Unconstrained       │ <100ms   │ Free    │');
  console.log('   │ Simulate            │ <500ms   │ Free    │');
  console.log('   │ Send (Public)       │ 30-60s   │ Gas     │');
  console.log('   │ Send (Private)      │ 30-60s   │ Gas     │');
  console.log('   └─────────────────────┴──────────┴─────────┘\n');
  
  // Best Practices
  console.log('✨ Best Practices\n');
  console.log('   DO:');
  console.log('   ✓ Use unconstrained for all reads');
  console.log('   ✓ Simulate complex transactions first');
  console.log('   ✓ Cache view function results');
  console.log('   ✓ Show loading states during send()');
  console.log('   ✓ Handle simulation errors gracefully\n');
  
  console.log('   DON\'T:');
  console.log('   ✗ Try to read others\' private state');
  console.log('   ✗ Use send() when simulate() works');
  console.log('   ✗ Forget to check simulation errors');
  console.log('   ✗ Assume simulation = send() result\n');
  
  // Common Patterns
  console.log('🎯 Common Patterns\n');
  console.log('   Pattern 1: Safe Transaction');
  console.log('   ```typescript');
  console.log('   // Simulate first');
  console.log('   await contract.methods.transfer(to, amount).simulate();');
  console.log('   ');
  console.log('   // If no error, send for real');
  console.log('   await contract.methods.transfer(to, amount).send().wait();');
  console.log('   ```\n');
  
  console.log('   Pattern 2: Optimistic UI Update');
  console.log('   ```typescript');
  console.log('   // Show optimistic state');
  console.log('   setCount(count + 1);');
  console.log('   ');
  console.log('   // Send transaction');
  console.log('   try {');
  console.log('     await contract.methods.increment().send().wait();');
  console.log('   } catch (error) {');
  console.log('     // Revert optimistic update');
  console.log('     setCount(count);');
  console.log('   }');
  console.log('   ```\n');
  
  console.log('   Pattern 3: Polling for Updates');
  console.log('   ```typescript');
  console.log('   // Poll every 5 seconds');
  console.log('   setInterval(async () => {');
  console.log('     const count = await contract.methods');
  console.log('       .get_public_count()');
  console.log('       .simulate();');
  console.log('     updateUI(count);');
  console.log('   }, 5000);');
  console.log('   ```\n');
  
  // Decision Tree
  console.log('🌳 Decision Tree: Which to Use?\n');
  console.log('   Want to READ state?');
  console.log('   └─→ Use unconstrained function (.simulate())\n');
  
  console.log('   Want to CHANGE state?');
  console.log('   ├─→ Test first? Simulate, then send()');
  console.log('   └─→ Direct send? Just send() and wait()\n');
  
  console.log('   Need return value?');
  console.log('   ├─→ From read? Unconstrained function');
  console.log('   └─→ From write? Wait for transaction, check events\n');
  
  console.log('📊 Summary:\n');
  console.log('   ✅ Unconstrained: Fast, free reads');
  console.log('   ✅ Simulate: Test before sending');
  console.log('   ✅ Send: Actually change state');
  console.log('   ✅ Choose wisely for best UX!\n');
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

export { main as simulateFunctions };
