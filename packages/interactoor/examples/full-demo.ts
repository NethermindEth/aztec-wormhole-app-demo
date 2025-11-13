/**
 * FULL DEMO: Complete Aztec.js Walkthrough
 * 
 * This combines key examples into one comprehensive demonstration:
 * 1. Connect to devnet
 * 2. Understand accounts
 * 3. Learn deployment
 * 4. Understand transactions
 * 5. Master simulations
 * 
 * Run this to see the full Aztec development flow!
 */

import { connectToDevnet } from './01-connect-sandbox.js';
import { createAccounts } from './02-create-accounts.js';
import { deployContract } from './03-deploy-contract.js';
import { sendTransactions } from './04-send-transactions.js';
import { simulateFunctions } from './05-simulate-functions.js';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║          🎓 AZTEC.JS COMPLETE WALKTHROUGH 🎓             ║');
  console.log('║                                                           ║');
  console.log('║  Learn Aztec development step by step!                   ║');
  console.log('║  Connected to: Aztec Devnet                              ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  console.log('This demo will teach you about:');
  console.log('  ✓ Connecting to Aztec devnet');
  console.log('  ✓ Creating and managing accounts');
  console.log('  ✓ Deploying smart contracts');
  console.log('  ✓ Sending public and private transactions');
  console.log('  ✓ Simulating and reading contract state');
  console.log('\n');
  
  console.log('💡 Note: This demo uses the LIVE devnet at devnet.aztec-labs.com');
  console.log('   Actual deployment and transactions require a funded account.\n');
  
  console.log('Press Ctrl+C at any time to stop.\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  // Wait a moment for user to read
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Example 1: Connect
    await connectToDevnet();
    console.log('\n' + '═'.repeat(60) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Example 2: Accounts
    await createAccounts();
    console.log('\n' + '═'.repeat(60) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Example 3: Deploy
    await deployContract();
    console.log('\n' + '═'.repeat(60) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Example 4: Transactions
    await sendTransactions();
    console.log('\n' + '═'.repeat(60) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Example 5: Simulate
    await simulateFunctions();
    console.log('\n' + '═'.repeat(60) + '\n');
    
    // Final summary
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║                  🎉 DEMO COMPLETE! 🎉                    ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    console.log('🎓 What you learned:\n');
    console.log('  ✅ How to connect to Aztec devnet');
    console.log('  ✅ Account management and key generation');
    console.log('  ✅ Smart contract deployment process');
    console.log('  ✅ Public vs private transactions');
    console.log('  ✅ State reading and simulation\n');
    
    console.log('📚 Next steps:\n');
    console.log('  • Get a funded account on devnet');
    console.log('  • Deploy your own Counter contract');
    console.log('  • Explore the example files individually');
    console.log('  • Modify the Counter contract');
    console.log('  • Build your own Aztec application\n');
    
    console.log('📖 Resources:\n');
    console.log('  • Docs: https://docs.aztec.network');
    console.log('  • Discord: https://discord.gg/aztec');
    console.log('  • Forum: https://forum.aztec.network');
    console.log('  • Twitter: https://twitter.com/aztecnetwork\n');
    
    console.log('Happy building! 🚀\n');
    
  } catch (error) {
    console.error('\n❌ Demo encountered an error:');
    console.error(error);
    console.error('\n💡 Tips:');
    console.error('  - Check internet connection to devnet');
    console.error('  - Run "pnpm build" to compile contracts');
    console.error('  - Check that all dependencies are installed');
    console.error('  - Visit https://devnet.aztec-labs.com to check devnet status\n');
    process.exit(1);
  }
}

// Run the demo
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
