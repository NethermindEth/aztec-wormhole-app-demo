#!/usr/bin/env node

// send-message.mjs - Adapted for TESTNET
import { SponsoredFeePaymentMethod, getContractInstanceFromDeployParams, Contract, loadContractArtifact, createAztecNodeClient, Fr, AztecAddress } from '@aztec/aztec.js';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { deriveSigningKey } from '@aztec/stdlib/keys';
import { createPXEService, getPXEServiceConfig } from '@aztec/pxe/server';
import { createStore } from "@aztec/kv-store/lmdb"
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import WormholeJson from "./wormhole_contracts-Wormhole.json" with { type: "json" };
import EmitterJSON from "./emitter-ZKPassportCredentialEmitter.json" with { type: "json" };
import { createLogger } from '@aztec/foundation/log';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const EmitterContractArtifact = loadContractArtifact(EmitterJSON);

// TESTNET CONFIGURATION - Same as send-test-publish.mjs
const NODE_URL = 'https://aztec-alpha-testnet-fullnode.zkv.xyz/';
const PRIVATE_KEY = '0x9015e46f2e11a7784351ed72fc440d54d06a4a61c88b124f59892b27f9b91301'; // owner-wallet secret key
const CONTRACT_ADDRESS = '0x0848d2af89dfd7c0e171238f9216399e61e908cd31b0222a920f1bf621a16ed6'; // Fresh Wormhole contract
const TOKEN_ADDRESS = '0x037e5d19d6d27e2fb7c947cfe7c36459e27d35e46dd59f5f47373a64ff491d2c'; // Token contract address
const RECEIVER_ADDRESS = '0x0d071eec273fa0c82825d9c5d2096965a40bcc33ae942714cf6c683af9632504'; // Receiver address
const SALT = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Salt used in deployment

// ProxyLogger implementation (from send-test-publish.mjs)
const logLevel = ['silent', 'fatal', 'error', 'warn', 'info', 'verbose', 'debug', 'trace'];

export class ProxyLogger {
  static instance;
  logs = [];

  constructor() {}

  static create() {
    ProxyLogger.instance = new ProxyLogger();
  }

  static getInstance() {
    return ProxyLogger.instance;
  }

  createLogger(prefix) {
    return new Proxy(createLogger(prefix), {
      get: (target, prop) => {
        if (logLevel.includes(prop)) {
          return function (...data) {
            const loggingFn = prop;
            const args = [loggingFn, prefix, ...data];
            ProxyLogger.getInstance().handleLog(...args);
            target[loggingFn].call(this, ...[data[0], data[1]]);
          };
        } else {
          return target[prop];
        }
      },
    });
  }

  handleLog(type, prefix, message, data) {
    this.logs.unshift({ type, prefix, message, data, timestamp: Date.now() });
  }

  flushLogs() {
    this.logs = [];
  }

  getLogs() {
    return this.logs;
  }
}

// Global variables
let pxe, nodeClient, wormholeContract, tokenContract, paymentMethod, wallet;
let currentTokenNonce = 67n; // Starting token nonce
let currentWalletNonce = 100042n; // Starting wallet nonce

// Get the directory of the current module (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Save nonces next to this script file
const NONCE_FILE_PATH = join(__dirname, 'nonce.json');

function loadNoncesFromFile() {
  try {
    if (existsSync(NONCE_FILE_PATH)) {
      const nonceData = JSON.parse(readFileSync(NONCE_FILE_PATH, 'utf8'));
      const tokenNonce = nonceData.token_nonce ? BigInt(nonceData.token_nonce) : 67n;
      const walletNonce = nonceData.wallet_nonce ? BigInt(nonceData.wallet_nonce) : 100042n;
      console.log(`📄 Loaded nonces from file - Token: ${tokenNonce}, Wallet: ${walletNonce}`);
      return { tokenNonce, walletNonce };
    } else {
      console.log('📄 No nonce file found, starting with default nonces');
      return { tokenNonce: 67n, walletNonce: 100042n };
    }
  } catch (error) {
    console.error('❌ Error loading nonces from file:', error);
    return { tokenNonce: 67n, walletNonce: 100042n };
  }
}

function saveNoncesToFile(tokenNonce, walletNonce) {
  try {
    const nonceData = { 
      token_nonce: tokenNonce.toString(),
      wallet_nonce: walletNonce.toString()
    };
    writeFileSync(NONCE_FILE_PATH, JSON.stringify(nonceData, null, 2));
    console.log(`💾 Saved nonces to file - Token: ${tokenNonce}, Wallet: ${walletNonce}`);
  } catch (error) {
    console.error('❌ Error saving nonces to file:', error);
    throw error;
  }
}

function getNextTokenNonce() {
  currentTokenNonce = currentTokenNonce + 1n;
  saveNoncesToFile(currentTokenNonce, currentWalletNonce);
  return currentTokenNonce;
}

function getNextWalletNonce() {
  currentWalletNonce = currentWalletNonce + 1n;
  saveNoncesToFile(currentTokenNonce, currentWalletNonce);
  return currentWalletNonce;
}

// Helper function to get the SponsoredFPC instance
async function getSponsoredFPCInstance() {
  return await getContractInstanceFromDeployParams(SponsoredFPCContract.artifact, {
    salt: new Fr(SPONSORED_FPC_SALT),
  });
}

// Initialize Aztec for Testnet
async function init() {
  console.log('🔄 Initializing Aztec TESTNET connection...');
  
  // Load nonces from file first
  const { tokenNonce, walletNonce } = loadNoncesFromFile();
  currentTokenNonce = tokenNonce;
  currentWalletNonce = walletNonce;
  console.log(`🎫 Initialized with nonces - Token: ${currentTokenNonce}, Wallet: ${currentWalletNonce}`);
  
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
    const config = getPXEServiceConfig();

    const l1Contracts = await nodeClient.getL1ContractAddresses();
    const configWithContracts = {
      ...config,
      l1Contracts,
    };
    ProxyLogger.create();
    const proxyLogger = ProxyLogger.getInstance();
    pxe = await createPXEService(nodeClient, configWithContracts, { 
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

    // Get Wormhole contract instance from the node
    console.log('🔄 Fetching Wormhole contract instance from node...');
    const wormholeAddress = AztecAddress.fromString(CONTRACT_ADDRESS);
    const wormholeInstance = await nodeClient.getContract(wormholeAddress);
    
    if (!wormholeInstance) {
      throw new Error(`Wormhole contract instance not found at address ${CONTRACT_ADDRESS}`);
    }
    
    console.log('✅ Wormhole contract instance retrieved from node');
    console.log(`📍 Retrieved Wormhole contract address: ${wormholeInstance.address}`);
    console.log(`📍 Wormhole contract class ID: ${wormholeInstance.currentContractClassId}`);
    
    // Get Token contract instance from the node
    console.log('🔄 Fetching Token contract instance from node...');
    const tokenAddress = AztecAddress.fromString(TOKEN_ADDRESS);
    const tokenInstance = await nodeClient.getContract(tokenAddress);
    
    if (!tokenInstance) {
      throw new Error(`Token contract instance not found at address ${TOKEN_ADDRESS}`);
    }
    
    console.log('✅ Token contract instance retrieved from node');
    
    // Load contract artifacts
    const wormholeArtifact = loadContractArtifact(WormholeJson);
    
    // Register contracts with PXE
    console.log('🔄 Registering contracts with PXE...');
    await pxe.registerContract({
      instance: wormholeInstance,
      artifact: wormholeArtifact
    });
    
    await pxe.registerContract({
      instance: tokenInstance,
      artifact: TokenContract.artifact
    });
    
    console.log('✅ Contracts registered with PXE');
    
    // Create account using the deployed owner-wallet credentials
    console.log('🔄 Setting up owner-wallet account...');
    const secretKey = Fr.fromString(PRIVATE_KEY);
    const salt = Fr.fromString(SALT);
    const signingKey = deriveSigningKey(secretKey);
    
    console.log(`🔑 Using secret key: ${secretKey.toString()}`);
    console.log(`🧂 Using salt: ${salt.toString()}`);
    
    // Create Schnorr account (this account is already deployed on testnet)
    const schnorrAccount = await getSchnorrAccount(pxe, secretKey, signingKey, salt);
    const accountAddress = schnorrAccount.getAddress();
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
    wallet = await schnorrAccount.register();
    console.log(`✅ Using wallet: ${wallet.getAddress()}`);
    
    // Create contract objects
    console.log(`🔄 Creating contract instances...`);
    console.log(`📍 Wormhole artifact name: ${wormholeArtifact.name}`);
    
    try {
      wormholeContract = await Contract.at(wormholeAddress, wormholeArtifact, wallet);
      tokenContract = await Contract.at(tokenAddress, TokenContract.artifact, wallet);
      console.log(`✅ Contract instances created successfully`);
      console.log(`📍 Wormhole contract address: ${wormholeContract.address.toString()}`);
      console.log(`📍 Token contract address: ${tokenContract.address.toString()}`);
      
    } catch (error) {
      console.error('❌ Failed to create contract instances:', error);
      throw error;
    }
    
    console.log(`✅ Connected to Wormhole contract on TESTNET: ${CONTRACT_ADDRESS}`);
    console.log(`✅ Node URL: ${NODE_URL}`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// Read verification data passed from the API route
function getVerificationData() {
  if (!process.env.VERIFICATION_DATA) {
    console.log("No verification data found in environment variables");
    return null;
  }
  
  try {
    const encodedData = process.env.VERIFICATION_DATA;
    const jsonStr = Buffer.from(encodedData, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error parsing verification data:", error);
    return null;
  }
}

// Function to log formatted proofs in detail
function logFormattedProofs(formattedProofs) {
  if (!formattedProofs) {
    console.log("❌ No formatted proofs available");
    return;
  }

  console.log("\n" + "=".repeat(60));
  console.log("🔐 FORMATTED ZK PROOFS FOR CONTRACT");
  console.log("=".repeat(60));

  // Log verification keys
  console.log("\n📋 VERIFICATION KEYS:");
  console.log(`  vkey_a length: ${formattedProofs.vkeys.vkey_a.length}`);
  console.log(`  vkey_b length: ${formattedProofs.vkeys.vkey_b.length}`);
  console.log(`  vkey_c length: ${formattedProofs.vkeys.vkey_c.length}`);
  console.log(`  vkey_d length: ${formattedProofs.vkeys.vkey_d.length}`);

  // Log proofs
  console.log("\n🔑 PROOFS:");
  console.log(`  proof_a length: ${formattedProofs.proofs.proof_a.length}`);
  console.log(`  proof_b length: ${formattedProofs.proofs.proof_b.length}`);
  console.log(`  proof_c length: ${formattedProofs.proofs.proof_c.length}`);
  console.log(`  proof_d length: ${formattedProofs.proofs.proof_d.length}`);

  // Log verification key hashes
  console.log("\n#️⃣ VERIFICATION KEY HASHES:");
  console.log(`  vkey_hash_a: ${formattedProofs.vkey_hashes.vkey_hash_a.toString()}`);
  console.log(`  vkey_hash_b: ${formattedProofs.vkey_hashes.vkey_hash_b.toString()}`);
  console.log(`  vkey_hash_c: ${formattedProofs.vkey_hashes.vkey_hash_c.toString()}`);
  console.log(`  vkey_hash_d: ${formattedProofs.vkey_hashes.vkey_hash_d.toString()}`);

  // Log public inputs
  console.log("\n📊 PUBLIC INPUTS:");
  console.log(`  input_a: [${formattedProofs.public_inputs.input_a.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_b: [${formattedProofs.public_inputs.input_b.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_c: [${formattedProofs.public_inputs.input_c.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_d: [${formattedProofs.public_inputs.input_d.map(x => x.toString()).join(', ')}]`);

  // Log first few elements of each proof and vkey for debugging
  console.log("\n🔍 SAMPLE DATA (first 3 elements):");
  console.log(`  vkey_a sample: [${formattedProofs.vkeys.vkey_a}`);
  console.log(`  vkey_a length: [${formattedProofs.vkeys.vkey_a.length}`);
  console.log(`  proof_a sample: [${formattedProofs.proofs.proof_a.slice(0, 3).map(x => x.toString()).join(', ')}...]`);

  console.log("=".repeat(60) + "\n");
}

// Convert a string to a Uint8Array of specific length
function stringToUint8Array(str, length) {
  const buf = new Uint8Array(length);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  
  // Copy as much as we can
  for (let i = 0; i < Math.min(encoded.length, length); i++) {
    buf[i] = encoded[i];
  }
  
  return buf;
}

// Convert hex string address to Uint8Array of 31 bytes (padded with zeros)
function hexAddressToUint8Array(hexAddress) {
  // Remove 0x prefix if present
  if (hexAddress.startsWith('0x')) {
    hexAddress = hexAddress.substring(2);
  }
  
  // Ensure the hex string is the right length (40 characters for 20 bytes)
  if (hexAddress.length !== 40) {
    throw new Error(`Invalid address length: ${hexAddress.length} chars, expected 40`);
  }
  
  // Create a new Uint8Array to hold the address (31 bytes total)
  const addressBytes = new Uint8Array(31);
  addressBytes.fill(0); // Fill with zeros initially
  
  // Convert each pair of hex characters to a byte (first 20 bytes)
  for (let i = 0; i < 20; i++) {
    const byteHex = hexAddress.substring(i*2, i*2+2);
    addressBytes[i] = parseInt(byteHex, 16);
  }
  
  return addressBytes;
}

// Convert chain ID to a 31-byte array in the expected format
function chainIdToUint8Array(chainId) {
  const chainIdBytes = new Uint8Array(31);
  chainIdBytes.fill(0); // Fill with zeros initially
  
  // Place chain ID at the beginning in little-endian format
  chainIdBytes[0] = chainId & 0xff;        // Lower byte (0x14 for 10004)
  chainIdBytes[1] = (chainId >> 8) & 0xff; // Upper byte (0x27 for 10004)
  
  // Add the array index at the end for debugging
  chainIdBytes[30] = 2;  // This is the second array
  
  return chainIdBytes;
}

// Helper function to debug a Uint8Array
function debugArray(name, array) {
  console.log(`${name} - Length: ${array.length}, First 5 bytes: [${Array.from(array.slice(0, 5)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}], as hex: 0x${Buffer.from(array).toString('hex').substring(0, 10)}...`);
}

function createMessageArrays(donationAddress, arbChainId, verificationData) {
  // Create arrays: [donationAddress, arbChainId, msg1, msg2, msg3, msg4, msg5]
  const msgArrays = [donationAddress, arbChainId];
  
  // Create 5 additional arrays for user data
  for (let i = 0; i < 5; i++) {
    const arr = new Uint8Array(31);
    arr.fill(0);
    msgArrays.push(arr);
  }

  // For debugging, add a distinctive byte to the end of each array
  for (let i = 0; i < msgArrays.length; i++) {
    msgArrays[i][30] = i + 1;  // Last byte of each array = array index + 1
  }
  
  return msgArrays;
}

async function main() {
  console.log('🚀 Starting send-message script for TESTNET...');
  console.log('🌐 Network: TESTNET');
  console.log('📡 Node:', NODE_URL);
  console.log('📄 Wormhole Contract:', CONTRACT_ADDRESS);
  console.log('🪙 Token Contract:', TOKEN_ADDRESS);
  console.log('📮 Receiver Address:', RECEIVER_ADDRESS);
  console.log('');
  
  try {
    // Initialize Aztec connection for testnet
    await init();
    
    // Get user verification data from environment variable
    const verificationData = getVerificationData();
    
    // Extract amount from user data, default to 35 if not provided
    const userAmount = verificationData?.amount || 35;
    console.log(`Using amount from user input: ${userAmount}`);
    
    // Log the formatted proofs if they exist
    if (verificationData?.formattedProofs) {
      logFormattedProofs(verificationData.formattedProofs);
    } else {
      console.log("⚠️  No formatted proofs found in verification data");
    }
    
    // Load addresses from file or use hardcoded defaults
    let addresses;
    try {
      const addressesPath = join(__dirname, 'addresses.json');
      addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));
      console.log("Using addresses from addresses.json:", addresses);
    } catch (error) {
      // Fallback to hardcoded addresses
      addresses = { 
        emitter: "0x054aba4606088823379606da36c8f6c770bcfe1b38ed663256bec4eca8e0125c" 
      };
      console.log("Using hardcoded addresses:", addresses);
    }

    const emitterAddress = AztecAddress.fromString(addresses.emitter);
    console.log(`Using emitter at ${emitterAddress.toString()}`);

    // Get Emitter contract instance from the node and register it
    console.log('🔄 Fetching Emitter contract instance from node...');
    const emitterInstance = await nodeClient.getContract(emitterAddress);
    
    if (!emitterInstance) {
      throw new Error(`Emitter contract instance not found at address ${addresses.emitter}`);
    }
    
    console.log('✅ Emitter contract instance retrieved from node');
    
    // Register Emitter contract with PXE
    console.log('🔄 Registering Emitter contract with PXE...');
    await pxe.registerContract({
      instance: emitterInstance,
      artifact: EmitterContractArtifact
    });
    
    console.log('✅ Emitter contract registered with PXE');

    // Use testnet contract addresses
    const wormhole_address = AztecAddress.fromString(CONTRACT_ADDRESS);
    const token_address = AztecAddress.fromString(TOKEN_ADDRESS);

    console.log("Getting token contract...");
    const token = await TokenContract.at(token_address, wallet);

    // Use the new nonce management system
    const token_nonce = getNextTokenNonce();
    console.log(`Using token nonce: ${token_nonce}`);
    
    const ownerAddress = wallet.getAddress();
    const receiverAddress = AztecAddress.fromString(RECEIVER_ADDRESS);
    
    // First, set up the private auth witness for the Wormhole contract
    const tokenTransferAction = token.methods.transfer_in_private(
      ownerAddress, 
      receiverAddress,
      2n,
      token_nonce  
    ); 

    console.log("Generating private authwit for token transfer...");
    const wormholeWitness = await wallet.createAuthWit(
      {
        caller: wormhole_address,
        action: tokenTransferAction
      },
      true
    );

    // Now create the donation action and private auth witness with dynamic amount
    const donationAction = token.methods.transfer_in_private(
      ownerAddress,
      receiverAddress,
      BigInt(userAmount), // Use dynamic amount instead of hardcoded 35n
      token_nonce 
    );
    console.log(`Generating private authwit for donation of ${userAmount} tokens...`);

    const donationWitness = await wallet.createAuthWit({ 
      caller: emitterAddress, 
      action: donationAction 
    });

    console.log("Getting emitter contract...");
    const contract = await Contract.at(emitterAddress, EmitterContractArtifact, wallet);
    
    // The vault address we want to appear in the logs
    const targetVaultAddress = "0x009cbB8f91d392856Cb880d67c806Aa731E3d686";
    console.log(`Target vault address: ${targetVaultAddress}`);
    
    // Create arbitrum address and vault address - these are passed directly to the contract
    const vault_address = hexAddressToUint8Array(targetVaultAddress);
    
    const arb_chain_id = 10_004; // Arbitrum chain ID
    const arb_chain_id_as_u8_31 = chainIdToUint8Array(arb_chain_id);
    
    // Create message arrays with user data (5 arrays of 31 bytes each)
    const msgArrays = createMessageArrays(vault_address, arb_chain_id_as_u8_31, verificationData);  

    // Log what's going to be sent
    console.log("About to send transaction with:");
    console.log("- Vault address (20 bytes- padded to 31 bytes)");
    console.log("- Arbitrum ChainID (31 bytes including padding)");
    console.log(`- Amount: ${userAmount} (from user input)`);
    console.log("- 5 message arrays of 31 bytes each");
    console.log("  The contract will create 8 arrays of 31 bytes total (first 3 for addresses + 5 from us)");
    console.log("  Total bytes in final payload should be: 8 * 31 = 248 bytes");

    // If we have formatted proofs, we could potentially use them here
    // For now, we're just logging them, but you could extend the contract
    // to accept and verify the proofs as well
    if (verificationData?.formattedProofs) {
      console.log("\n🎯 ZK PROOFS READY FOR CONTRACT VERIFICATION");
      console.log("   These proofs could be used for on-chain verification");
      console.log("   if the contract supports ZK proof verification.");
    }

    console.log("Calling emitter verify_and_publish...");
    
    try {
      const tx = await contract.methods.verify_and_publish(
        verificationData?.formattedProofs,
        msgArrays,            // Message arrays (5 arrays of 31 bytes each)
        wormhole_address,     // Wormhole contract address
        token_address,        // Token contract address
        BigInt(userAmount),   // Amount
        token_nonce           // Token nonce
      ).send({ 
        authWitnesses: [wormholeWitness, donationWitness],
        fee: { paymentMethod } 
      }).wait();

      console.log("Transaction sent! Hash:", tx.txHash);
      console.log("Block number:", tx.blockNumber);
      
      console.log("Transaction completed successfully!");
      console.log(`✅ Amount ${userAmount} sent successfully via cross-chain transaction on TESTNET`);
      
      // Final summary of what was processed
      if (verificationData?.formattedProofs) {
        console.log("\n✅ SUMMARY:");
        console.log("   - User data sent to contract");
        console.log(`   - Amount ${userAmount} transferred`);
        console.log("   - ZK proofs formatted and logged");
        console.log("   - Ready for future ZK verification integration");
        console.log("   - Network: TESTNET");
      }
      
      return tx;
    } catch (txError) {
      console.error("Error sending transaction:", txError);
      if (txError.message) {
        console.error("Error message:", txError.message);
      }
      if (txError.stack) {
        console.error("Error stack:", txError.stack);
      }
      throw txError;
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
}

// Cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up resources...');
  try {
    if (pxe) {
      await pxe.close();
      console.log('✅ PXE service closed');
    }
    if (nodeClient) {
      // Node client doesn't have a close method, but we can set it to null
      nodeClient = null;
      console.log('✅ Node client cleaned up');
    }
  } catch (error) {
    console.error('⚠️  Error during cleanup:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await cleanup();
  process.exit(0);
});

// Run the main function
main().catch(async (error) => {
  console.error('\n💥 Unhandled error:', error);
  await cleanup();
  process.exit(1);
});