import express from 'express';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/aztec.js/fields';
import { Contract, getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts';
import { loadContractArtifact } from '@aztec/aztec.js/abi';
import { createAztecNodeClient } from '@aztec/aztec.js/node';
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee';
import { AccountManager } from '@aztec/aztec.js/wallet';
import { SchnorrAccountContract, getSchnorrAccountContractAddress } from '@aztec/accounts/schnorr';
import { deriveSigningKey } from '@aztec/stdlib/keys';
import { createPXE, getPXEConfig } from '@aztec/pxe/server';
import { createStore } from "@aztec/kv-store/lmdb"
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import WormholeJson from "./contracts/target/wormhole_contracts-Wormhole.json" with { type: "json" };
import { ProxyLogger } from './utils.mjs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// TESTNET CONFIGURATION
const NODE_URL = process.env.NODE_URL || 'https://devnet.aztec-labs.com/.';
const PRIVATE_KEY = process.env.PRIVATE_KEY; // owner-wallet secret key from .env
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x2f56338d0bf01e37b89edea0ee8e96474c89575aa5e6f35012789738a06ed0ac'; // Fresh Wormhole contract
const SALT = process.env.SALT || '0x0000000000000000000000000000000000000000000000000000000000000000'; // Salt used in deployment

let pxe, nodeClient, wormholeContract, paymentMethod, isReady = false;

// Helper function to get the SponsoredFPC instance
async function getSponsoredFPCInstance() {
  return await getContractInstanceFromInstantiationParams(SponsoredFPCContract.artifact, {
    salt: new Fr(SPONSORED_FPC_SALT),
  });
}

// Initialize Aztec for Testnet
async function init() {
  console.log('🔄 Initializing Aztec TESTNET connection...');
  
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required for testnet');
  }
  
  if (!CONTRACT_ADDRESS) {
    throw new Error('CONTRACT_ADDRESS environment variable is required for testnet');
  }
  
  try {
    // Create PXE and Node clients
    nodeClient = createAztecNodeClient(NODE_URL);
    const store = await createStore('pxe', {
      dataDirectory: 'store',
      dataStoreMapSizeKB: 1e6,
    });
    const config = getPXEConfig();
    ProxyLogger.create();
    const proxyLogger = ProxyLogger.getInstance();
    pxe = await createPXE(nodeClient, config, {
      store,
      loggers: {
        prover: proxyLogger.createLogger('pxe:bb:wasm:bundle:proxied'),
      } 
    });
    console.log('✅ Connected PXE to Aztec node and initialized');
    
    const sponsoredFPC = await getSponsoredFPCInstance();
    await pxe.registerContract({
      instance: sponsoredFPC,
      artifact: SponsoredFPCContract.artifact,
    });
    paymentMethod = new SponsoredFeePaymentMethod(sponsoredFPC.address);

    // Get contract instance from the node
    console.log('🔄 Fetching contract instance from node...');
    const contractAddress = AztecAddress.fromString(CONTRACT_ADDRESS);
    const contractInstance = await nodeClient.getContract(contractAddress);
    
    if (!contractInstance) {
      throw new Error(`Contract instance not found at address ${CONTRACT_ADDRESS}`);
    }
    
    console.log('✅ Contract instance retrieved from node');
    console.log(`📍 Retrieved contract address: ${contractInstance.address}`);
    console.log(`📍 Contract class ID: ${contractInstance.currentContractClassId}`);
    
    // Load contract artifact
    const contractArtifact = loadContractArtifact(WormholeJson);
    
    // Register the contract with PXE
    console.log('🔄 Registering contract with PXE...');
    await pxe.registerContract({
      instance: contractInstance,
      artifact: contractArtifact
    });
    
    console.log('✅ Contract registered with PXE');
    
    // Create account using the deployed owner-wallet credentials
    console.log('🔄 Setting up owner-wallet account...');
    const secretKey = Fr.fromString(PRIVATE_KEY);
    const salt = Fr.fromString(SALT);
    const signingKey = deriveSigningKey(secretKey);
    
    console.log(`🔑 Using secret key: ${secretKey.toString()}`);
    console.log(`🧂 Using salt: ${salt.toString()}`);
    
    // Create Schnorr account (this account is already deployed on testnet)
    const accountContract = new SchnorrAccountContract(signingKey);
    const walletContext = {
      getChainInfo: async () => {
        const { l1ChainId, rollupVersion } = await nodeClient.getNodeInfo();
        return {
          chainId: new Fr(l1ChainId),
          version: new Fr(rollupVersion),
        };
      },
    };
    const accountManager = await AccountManager.create(walletContext, secretKey, accountContract, salt);
    const completeAddress = await accountManager.getCompleteAddress();
    const accountAddress = completeAddress.address;
    await pxe.registerAccount(secretKey, completeAddress.partialAddress);

    const expectedAddress = await getSchnorrAccountContractAddress(secretKey, salt, signingKey);
    if (!accountAddress.equals(expectedAddress)) {
      console.warn(`⚠️ Derived account address ${accountAddress.toString()} differs from expectation ${expectedAddress.toString()}`);
    }
    console.log(`📍 Account address: ${accountAddress}`);
    
    // This account should already be registered with the PXE from the deployment
    const registeredAccounts = await pxe.getRegisteredAccounts();
    const isRegistered = registeredAccounts.some(acc => acc.address.equals(accountAddress));
    
    if (isRegistered) {
      console.log('✅ Account found in PXE (from aztec-wallet deployment)');
    } else {
      console.log('⚠️  Account not in PXE, but it exists on testnet. Getting wallet anyway...');
    }
    
    // Get wallet (this should work since the account exists on testnet)
    const wallet = await accountManager.getAccount();
    console.log(`✅ Using wallet: ${wallet.getAddress()}`);
    // Now create the contract object
    console.log(`🔄 Creating contract instance at ${contractAddress.toString()}...`);
    console.log(`📍 Contract artifact name: ${contractArtifact.name}`);
    
    try {
      wormholeContract = await Contract.at(contractAddress, contractArtifact, wallet);
      console.log(`✅ Contract instance created successfully`);
      console.log(`📍 Final contract address: ${wormholeContract.address.toString()}`);
      
    } catch (error) {
      console.error('❌ Failed to create contract instance:', error);
      throw error;
    }
    
    isReady = true;
    console.log(`✅ Connected to Wormhole contract on TESTNET: ${CONTRACT_ADDRESS}`);
    console.log(`✅ Node URL: ${NODE_URL}`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: isReady ? 'healthy' : 'initializing',
    network: 'testnet',
    timestamp: new Date().toISOString(),
    nodeUrl: NODE_URL,
    contractAddress: CONTRACT_ADDRESS,
    walletAddress: 'using PXE accounts'
  });
});

// Verify VAA
app.post('/verify', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ 
      success: false, 
      error: 'Service not ready - Aztec testnet connection still initializing' 
    });
  }

  try {
    const { vaaBytes } = req.body;
    
    if (!vaaBytes) {
      return res.status(400).json({
        success: false,
        error: 'vaaBytes is required'
      });
    }
    
    // Convert hex to buffer
    const hexString = vaaBytes.startsWith('0x') ? vaaBytes.slice(2) : vaaBytes;
    const vaaBuffer = Buffer.from(hexString, 'hex');
    
    // Pad to 2000 bytes for contract but pass actual length
    const paddedVAA = Buffer.alloc(2000);
    vaaBuffer.copy(paddedVAA, 0, 0, Math.min(vaaBuffer.length, 2000));
    
    // Convert to array for Aztec contract
    const vaaArray = Array.from(paddedVAA);
    const actualLength = vaaBuffer.length;
    
    console.log(`🔍 Verifying VAA on TESTNET (${vaaBuffer.length} bytes actual, ${paddedVAA.length} bytes padded)`);
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`📍 Contract object address: ${wormholeContract.address.toString()}`);
    console.log(`📍 Wallet address: ${wormholeContract.wallet.getAddress().toString()}`);
    
    // Call verify_vaa function with padded bytes and actual length
    console.log('🔄 Calling contract method verify_vaa...');
    const tx = await wormholeContract.methods
      .verify_vaa(vaaArray, actualLength)
      .send({ 
        from: wormholeContract.wallet.getAddress(),
        fee: { paymentMethod } 
      })
      .wait();
    
    console.log(`✅ VAA verified successfully on TESTNET: ${tx.txHash}`);
    
    res.json({
      success: true,
      network: 'testnet',
      txHash: tx.txHash,
      contractAddress: CONTRACT_ADDRESS,
      message: 'VAA verified successfully on Aztec testnet',
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ VAA verification failed on TESTNET:', error.message);
    res.status(500).json({
      success: false,
      network: 'testnet',
      error: error.message,
      processedAt: new Date().toISOString()
    });
  }
});

// Test endpoint with a real Arbitrum Sepolia VAA
app.post('/test', async (req, res) => {
  // A real VAA from Arbitrum Sepolia that uses Guardian 0x13947Bd48b18E53fdAeEe77F3473391aC727C638
  // This VAA contains "Hello Wormhole!" message and has been verified on Wormholescan
  // Link: https://wormholescan.io/#/tx/0xf93fd41efeb09ff28174824d4abf6dbc06ac408953a9975aa4a403d434051efc?network=Testnet&view=advanced
  const realVAA = "010000000001004682bc4d5ff2e54dc2ee5e0eb64f5c6c07aa449ac539abc63c2be5c306a48f233e9300170a82adf3c3b7f43f23176fb079174a58d67d142477f646675d86eb6301684bfad4499602d22713000000000000000000000000697f31e074bf2c819391d52729f95506e0a72ffb0000000000000000c8000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000e48656c6c6f20576f726d686f6c6521000000000000000000000000000000000000";
  
  console.log('🧪 Testing with real Arbitrum Sepolia VAA on TESTNET');
  console.log('📍 Guardian: 0x13947Bd48b18E53fdAeEe77F3473391aC727C638');
  console.log('📍 Signature: 0x4682bc4d5ff2e54dc2ee5e0eb64f5c6c07aa449ac539abc63c2be5c306a48f233e9300170a82adf3c3b7f43f23176fb079174a58d67d142477f646675d86eb6301');
  console.log('📍 Expected message hash: 0xe64320fba193c98f2d0acf3a8c7479ec9b163192bfc19d4024497d4e4159758c');
  console.log('📍 WormholeScan: https://wormholescan.io/#/tx/0xf93fd41efeb09ff28174824d4abf6dbc06ac408953a9975aa4a403d434051efc?network=Testnet&view=advanced');
  
  // Debug contract state before calling verify
  console.log('🔍 Pre-verification debug:');
  console.log(`   - Service ready: ${isReady}`);
  console.log(`   - Contract object exists: ${!!wormholeContract}`);
  if (wormholeContract) {
    console.log(`   - Contract address: ${wormholeContract.address.toString()}`);
    console.log(`   - Expected address: ${CONTRACT_ADDRESS}`);
  }
  
  // Set up request body and call verify logic directly
  const testReq = { 
    body: { vaaBytes: realVAA },
    // Add debug flag
    isTest: true
  };
  
  // Call verify logic directly instead of using the router
  if (!isReady) {
    return res.status(503).json({ 
      success: false, 
      error: 'Service not ready - Aztec testnet connection still initializing' 
    });
  }

  try {
  const { vaaBytes } = testReq.body;
  
  // Convert hex to buffer
  const hexString = vaaBytes.startsWith('0x') ? vaaBytes.slice(2) : vaaBytes;
  const vaaBuffer = Buffer.from(hexString, 'hex');
  
  // Debug the VAA data
  console.log('🔍 VAA Debug Info:');
  console.log(`   Raw hex length: ${hexString.length}`);
  console.log(`   Buffer length: ${vaaBuffer.length}`);
  console.log(`   First 20 bytes: ${vaaBuffer.slice(0, 20).toString('hex')}`);
  console.log(`   Last 20 bytes: ${vaaBuffer.slice(-20).toString('hex')}`);
  
  // Back to padded version (contract expects fixed size)
  const paddedVAA = Buffer.alloc(2000);
  vaaBuffer.copy(paddedVAA, 0, 0, Math.min(vaaBuffer.length, 2000));
  const vaaArray = Array.from(paddedVAA);
  const actualLength = vaaBuffer.length;
  
  console.log('🔍 Using PADDED version (contract expects fixed size):');
  console.log(`   Padded array length: ${vaaArray.length}`);
  console.log(`   Actual VAA length param: ${actualLength}`);
  console.log(`   First few padded elements: [${vaaArray.slice(0, 10).join(', ')}]`);
  console.log(`   Elements around actual length: [${vaaArray.slice(actualLength-5, actualLength+10).join(', ')}]`);
  
  console.log(`🔍 Verifying VAA on TESTNET (${vaaBuffer.length} bytes actual, ${paddedVAA.length} bytes padded)`);
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`📍 Contract object address: ${wormholeContract.address.toString()}`);
  console.log(`📍 Wallet address: ${wormholeContract.wallet.getAddress().toString()}`);
  
  // Call verify_vaa function with padded bytes and actual length
  console.log('🔄 Calling contract method verify_vaa with PADDED data...');
  const interaction = await wormholeContract.methods
      .verify_vaa(vaaArray, actualLength);

  //console.log('🔄 Capturing interaction profile...');
  //await captureProfile('verify_vaa', interaction);

  console.log('🔄 Sending transaction...');
  const tx = await interaction.send({ 
    from: wormholeContract.wallet.getAddress(),
    fee: { paymentMethod } 
  }).wait();
  
  console.log(`✅ VAA verified successfully on TESTNET: ${tx.txHash}`);
  
  res.json({
    success: true,
    network: 'testnet',
    txHash: tx.txHash,
    contractAddress: CONTRACT_ADDRESS,
    message: 'VAA verified successfully on Aztec testnet (TEST ENDPOINT)',
    processedAt: new Date().toISOString()
  });
  } catch (error) {
    console.error('❌ VAA verification failed on TESTNET:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      success: false,
      network: 'testnet',
      error: error.message,
      processedAt: new Date().toISOString()
    });
  }
});

// Start server
init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 VAA Verification Service running on port ${PORT}`);
    console.log(`🌐 Network: TESTNET`);
    console.log(`📡 Node: ${NODE_URL}`);
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
    console.log('Available endpoints:');
    console.log('  GET  /health - Health check');
    console.log('  POST /verify - Verify VAA on testnet');
    console.log('  POST /test   - Test with Jorge\'s real Arbitrum Sepolia VAA');
  });
}).catch(error => {
  console.error('❌ Failed to start testnet service:', error);
  console.log('\n📝 Required environment variables:');
  console.log('  PRIVATE_KEY=your_testnet_private_key');
  console.log('  CONTRACT_ADDRESS=your_deployed_contract_address');
  process.exit(1);
});