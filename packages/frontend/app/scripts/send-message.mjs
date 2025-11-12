// src/send-message.mjs
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/aztec.js/fields';
import { Contract } from '@aztec/aztec.js/contracts';
import { loadContractArtifact } from '@aztec/aztec.js/abi';
import { createAztecNodeClient } from '@aztec/aztec.js/node';
import { createPXE, getPXEConfig } from '@aztec/pxe/server';
import { createStore } from "@aztec/kv-store/lmdb";
import { AccountManager, BaseWallet } from '@aztec/aztec.js/wallet';
import { SchnorrAccountContract, getSchnorrAccountContractAddress } from '@aztec/accounts/schnorr';
import { deriveSigningKey } from '@aztec/stdlib/keys';
import EmitterJSON from "../artifacts/emitter-ZKPassportCredentialEmitter.json" with { type: "json" };
import TokenJSON from "../artifacts/Token.json" with { type: "json" };
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const EmitterContractArtifact = loadContractArtifact(EmitterJSON);

const { PXE_URL = 'https://devnet.aztec-labs.com' } = process.env;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SALT = process.env.SALT || '0x0000000000000000000000000000000000000000000000000000000000000000';

class PXEWallet extends BaseWallet {
  constructor(account, pxeInstance, aztecNode) {
    super(pxeInstance, aztecNode);
    this.account = account;
  }

  getAddress() {
    return this.account.getAddress();
  }

  get address() {
    return this.account.getAddress();
  }

  async getAccounts() {
    const registered = await this.pxe.getRegisteredAccounts();
    return registered.map(({ address }) => ({ item: address, alias: '' }));
  }

  async getAccountFromAddress(address) {
    if (address.equals(this.account.getAddress())) {
      return this.account;
    }
    throw new Error(`Account ${address.toString()} not loaded in wallet`);
  }

  async createAuthWit(intent, isPrivate) {
    return await this.account.createAuthWit(intent, isPrivate);
  }
}

// Ensure proof data structure matches contract requirements (NESTED)
function ensureValidProofData(formattedProofs) {
  // Helper to ensure array has exact length
  const ensureFieldArray = (arr, targetLength) => {
    if (!arr || !Array.isArray(arr)) {
      return Array(targetLength).fill(0);
    }
    const result = arr.slice(0, targetLength);
    while (result.length < targetLength) {
      result.push(0);
    }
    return result.map(v => v ?? 0);
  };

  const ensureField = (value) => {
    if (value === null || value === undefined) return 0;
    return value;
  };

  // Return nested structure to match contract's nested structs
  return {
    vkeys: {
      vkey_a: ensureFieldArray(formattedProofs?.vkeys?.vkey_a, 115),
      vkey_b: ensureFieldArray(formattedProofs?.vkeys?.vkey_b, 115),
      vkey_c: ensureFieldArray(formattedProofs?.vkeys?.vkey_c, 115),
      vkey_d: ensureFieldArray(formattedProofs?.vkeys?.vkey_d, 115),
      vkey_e: ensureFieldArray(formattedProofs?.vkeys?.vkey_e, 115),
    },
    proofs: {
      proof_a: ensureFieldArray(formattedProofs?.proofs?.proof_a, 508),
      proof_b: ensureFieldArray(formattedProofs?.proofs?.proof_b, 508),
      proof_c: ensureFieldArray(formattedProofs?.proofs?.proof_c, 508),
      proof_d: ensureFieldArray(formattedProofs?.proofs?.proof_d, 508),
      proof_e: ensureFieldArray(formattedProofs?.proofs?.proof_e, 508),
    },
    vkey_hashes: {
      vkey_hash_a: ensureField(formattedProofs?.vkey_hashes?.vkey_hash_a),
      vkey_hash_b: ensureField(formattedProofs?.vkey_hashes?.vkey_hash_b),
      vkey_hash_c: ensureField(formattedProofs?.vkey_hashes?.vkey_hash_c),
      vkey_hash_d: ensureField(formattedProofs?.vkey_hashes?.vkey_hash_d),
      vkey_hash_e: ensureField(formattedProofs?.vkey_hashes?.vkey_hash_e),
    },
    public_inputs: {
      input_a: ensureFieldArray(formattedProofs?.public_inputs?.input_a, 2),
      input_b: ensureFieldArray(formattedProofs?.public_inputs?.input_b, 2),
      input_c: ensureFieldArray(formattedProofs?.public_inputs?.input_c, 10),
      input_d: ensureFieldArray(formattedProofs?.public_inputs?.input_d, 5),
      input_e: ensureFieldArray(formattedProofs?.public_inputs?.input_e, 5),
    }
  };
}

// Read verification data passed from the API route
function getVerificationData() {
  const { VERIFICATION_DATA_PATH, VERIFICATION_DATA } = process.env ?? {};

  if (VERIFICATION_DATA_PATH) {
    try {
      const fileContents = readFileSync(VERIFICATION_DATA_PATH, 'utf8');
      return JSON.parse(fileContents);
    } catch (error) {
      console.error("Error reading verification data file:", error);
      return null;
    }
  }

  if (!VERIFICATION_DATA) {
    console.log("No verification data found in environment variables");
    return null;
  }

  try {
    const encodedData = VERIFICATION_DATA;
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
  console.log(`  vkey_e length: ${formattedProofs.vkeys.vkey_e.length}`);

  // Log proofs
  console.log("\n🔑 PROOFS:");
  console.log(`  proof_a length: ${formattedProofs.proofs.proof_a.length}`);
  console.log(`  proof_b length: ${formattedProofs.proofs.proof_b.length}`);
  console.log(`  proof_c length: ${formattedProofs.proofs.proof_c.length}`);
  console.log(`  proof_d length: ${formattedProofs.proofs.proof_d.length}`);
  console.log(`  proof_e length: ${formattedProofs.proofs.proof_e.length}`);

  // Log verification key hashes
  console.log("\n#️⃣ VERIFICATION KEY HASHES:");
  console.log(`  vkey_hash_a: ${formattedProofs.vkey_hashes.vkey_hash_a.toString()}`);
  console.log(`  vkey_hash_b: ${formattedProofs.vkey_hashes.vkey_hash_b.toString()}`);
  console.log(`  vkey_hash_c: ${formattedProofs.vkey_hashes.vkey_hash_c.toString()}`);
  console.log(`  vkey_hash_d: ${formattedProofs.vkey_hashes.vkey_hash_d.toString()}`);
  console.log(`  vkey_hash_e: ${formattedProofs.vkey_hashes.vkey_hash_e.toString()}`);

  // Log public inputs
  console.log("\n📊 PUBLIC INPUTS:");
  console.log(`  input_a: [${formattedProofs.public_inputs.input_a.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_b: [${formattedProofs.public_inputs.input_b.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_c: [${formattedProofs.public_inputs.input_c.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_d: [${formattedProofs.public_inputs.input_d.map(x => x.toString()).join(', ')}]`);
  console.log(`  input_e: [${formattedProofs.public_inputs.input_e.map(x => x.toString()).join(', ')}]`);

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
  // Convert Uint8Arrays to regular arrays for contract serialization
  const msgArrays = [
    Array.from(donationAddress),
    Array.from(arbChainId)
  ];
  
  // Create 5 additional arrays for user data
  for (let i = 0; i < 5; i++) {
    const arr = new Array(31).fill(0);
    msgArrays.push(arr);
  }

  // For debugging, add a distinctive byte to the end of each array
  for (let i = 0; i < msgArrays.length; i++) {
    msgArrays[i][30] = i + 1;  // Last byte of each array = array index + 1
  }
  
  return msgArrays;
}

async function main() {
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
  
  // Connect to PXE
  console.log('🔄 Connecting to Aztec node...');
  const nodeClient = createAztecNodeClient(PXE_URL);
  const store = await createStore('pxe', {
    dataDirectory: 'store',
    dataStoreMapSizeKB: 1e6,
  });
  const config = getPXEConfig();
  const pxe = await createPXE(nodeClient, config, {
    store,
  });
  console.log(`✅ Connected to PXE at ${PXE_URL}`);

  // Set up account wallet
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  console.log('🔄 Setting up account...');
  const secretKey = Fr.fromString(PRIVATE_KEY);
  const salt = Fr.fromString(SALT);
  const signingKey = deriveSigningKey(secretKey);
  
  // Create Schnorr account
  const accountContract = new SchnorrAccountContract(signingKey);
  const accountManager = await AccountManager.create({
    getChainInfo: async () => {
      const { l1ChainId, rollupVersion } = await nodeClient.getNodeInfo();
      return {
        chainId: new Fr(l1ChainId),
        version: new Fr(rollupVersion),
      };
    },
    registerContract: async (instanceData, artifact) =>
      pxe.registerContract({ instance: instanceData, artifact }),
  }, secretKey, accountContract, salt);
  
  const completeAddress = await accountManager.getCompleteAddress();
  const accountAddress = completeAddress.address;
  const accountInstance = accountManager.getInstance();
  const accountArtifact = await accountContract.getContractArtifact();
  await pxe.registerContract({ instance: accountInstance, artifact: accountArtifact });
  await pxe.registerAccount(secretKey, completeAddress.partialAddress);

  const expectedAddress = await getSchnorrAccountContractAddress(secretKey, salt, signingKey);
  if (!accountAddress.equals(expectedAddress)) {
    console.warn(`⚠️ Derived account address ${accountAddress.toString()} differs from expectation ${expectedAddress.toString()}`);
  }
  
  // Get wallet
  const account = await accountManager.getAccount();
  const ownerWallet = new PXEWallet(account, pxe, nodeClient);
  const ownerAddress = ownerWallet.address;
  console.log(`✅ Owner address: ${ownerAddress}`);
  
  // For receiver, we'll use the same address for now (you can add a second account if needed)
  const receiverAddress = ownerAddress;
  console.log(`✅ Receiver address: ${receiverAddress}`);
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Load addresses from file or use hardcoded defaults
  let addresses;
  try {
    const addressesPath = join(__dirname, '../assets/addresses.json');
    addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));
    console.log("Using addresses from addresses.json:", addresses);
  } catch (error) {
    // Fallback to hardcoded addresses
    addresses = {
      emitter:
        "0x03ac6e7ab598eceed84e36acf3513d5cb610b08c0b7c5641754b5acf11bbd954",
    };
    console.log("Using hardcoded addresses:", addresses);
  }

  const emitterAddress = AztecAddress.fromString(addresses.emitter);
  console.log(`Using emitter at ${emitterAddress.toString()}`);

  // Register the emitter contract with PXE
  console.log("🔄 Registering emitter contract with PXE...");
  const emitterInstance = await nodeClient.getContract(emitterAddress);
  if (!emitterInstance) {
    throw new Error(`Emitter contract instance not found at address ${emitterAddress.toString()}`);
  }
  await pxe.registerContract({
    instance: emitterInstance,
    artifact: EmitterContractArtifact
  });
  console.log("✅ Emitter contract registered with PXE");

  // EXISTING WORMHOLE AND TOKEN CONTRACT ADDRESSES
  const wormhole_address = AztecAddress.fromString(
    "0x2f5ca4d8ed6a45cc2c3edd56ee10a2d613e5791d2646196a61d6d4ef65483691"
  );
  const token_address = AztecAddress.fromString(
    "0x14875b1ac670f8a6c732f43465e0b72ed81429a3c0593d11d26518e3ab9e63d6");

  // Register wormhole contract with PXE
  console.log("🔄 Registering wormhole contract with PXE...");
  const wormholeInstance = await nodeClient.getContract(wormhole_address);
  if (!wormholeInstance) {
    throw new Error(`Wormhole contract instance not found at address ${wormhole_address.toString()}`);
  }
  // Note: We would need the wormhole artifact here, but since we're just calling it, we might not need to register it
  // If you have the WormholeJSON artifact, uncomment this:
  // const WormholeArtifact = loadContractArtifact(WormholeJSON);
  // await pxe.registerContract({
  //   instance: wormholeInstance,
  //   artifact: WormholeArtifact
  // });
  console.log("✅ Wormhole contract found");

  // Get token contract
  console.log("🔄 Getting token contract...");
  const TokenArtifact = loadContractArtifact(TokenJSON);
  const tokenInstance = await nodeClient.getContract(token_address);
  if (!tokenInstance) {
    throw new Error(`Token contract instance not found at address ${token_address.toString()}`);
  }
  
  // Register just the instance with PXE (without artifact to avoid bytecode issues)
  try {
    const existingInstance = await pxe.getContractInstance(token_address);
    if (!existingInstance) {
      console.log("🔄 Registering token contract instance with PXE...");
      await pxe.registerContract({ instance: tokenInstance });
      console.log("✅ Token contract instance registered");
    } else {
      console.log("✅ Token contract already in PXE");
    }
  } catch (error) {
    console.log("⚠️  Continuing without token registration:", error.message);
  }

  console.log("Creating token contract object...");
  const token = new Contract(tokenInstance, TokenArtifact, ownerWallet);

  const noncePath = join(__dirname, '../assets/nonce.json');
  const nonce_file_data = JSON.parse(readFileSync(noncePath, 'utf8'));

  // Safe BigInt handling
  const current_nonce = nonce_file_data.token_nonce
    ? BigInt(nonce_file_data.token_nonce)
    : 0n;

  const token_nonce = current_nonce + 1n;

  const new_nonce_data = { token_nonce: token_nonce.toString() };

  writeFileSync(noncePath, JSON.stringify(new_nonce_data, null, 2));  
  console.log(`Using token nonce: ${token_nonce}`);
  
  // First, set up the private auth witness for the Wormhole contract
  const tokenTransferAction = token.methods.transfer_in_private(
    ownerAddress, 
    receiverAddress,
    2n,
    token_nonce  
  ); 

  console.log("Generating private authwit for token transfer...");
  const wormholeWitness = await ownerWallet.createAuthWit(
    {
      caller: wormhole_address,
      action: tokenTransferAction
    },
    true
  );

  // Now create the donation action and private auth witness with dynamic amount
  const donationAction = token.methods.transfer_in_private(
    ownerWallet.address,
    receiverAddress,
    BigInt(userAmount), // Use dynamic amount instead of hardcoded 35n
    token_nonce 
  );
  console.log(`Generating private authwit for donation of ${userAmount} tokens...`);

  const donationWitness = await ownerWallet.createAuthWit({ 
    caller: emitterAddress, 
    action: donationAction 
  });

  console.log("Creating emitter contract object...");
  const contract = new Contract(emitterInstance, EmitterContractArtifact, ownerWallet);
  
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
  
  // Ensure proof data has the correct structure and sizes
  const validatedProofData = ensureValidProofData(verificationData?.formattedProofs);
  
  console.log("📊 Validated proof structure (NESTED, UltraHonk):");
  console.log(`  vkey_a length: ${validatedProofData.vkeys.vkey_a.length} (expected: 115)`);
  console.log(`  proof_a length: ${validatedProofData.proofs.proof_a.length} (expected: 508)`);
  console.log(`  input_a length: ${validatedProofData.public_inputs.input_a.length} (expected: 2)`);
  console.log(`  vkey_a[0] type: ${typeof validatedProofData.vkeys.vkey_a[0]}`);
  
  console.log("\n📊 Message arrays:");
  console.log(`  msgArrays length: ${msgArrays.length} (expected: 7)`);
  console.log(`  msgArrays[0] length: ${msgArrays[0].length} (expected: 31)`);
  console.log(`  msgArrays[0][0] type: ${typeof msgArrays[0][0]}`);
  
  try {
    const tx = await contract.methods.verify_and_publish(
      validatedProofData,   // Validated proof data with correct sizes
      msgArrays,            // Message arrays (7 arrays of 31 bytes each)
      wormhole_address,     // Wormhole contract address
      token_address,        // Token contract address
      BigInt(userAmount),   // Amount (u128)
      new Fr(token_nonce)   // Token nonce (Field) - wrapped in Fr
    ).send({ 
      from: ownerWallet.address,
      authWitnesses: [wormholeWitness, donationWitness] 
    }).wait();

    console.log("Transaction sent! Hash:", tx.txHash);
    console.log("Block number:", tx.blockNumber);
    
    console.log("Transaction completed successfully!");
    console.log(`✅ Amount ${userAmount} sent successfully via cross-chain transaction`);
    
    // Final summary of what was processed
    if (verificationData?.formattedProofs) {
      console.log("\n✅ SUMMARY:");
      console.log("   - User data sent to contract");
      console.log(`   - Amount ${userAmount} transferred`);
      console.log("   - ZK proofs formatted and logged");
      console.log("   - Ready for future ZK verification integration");
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
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error in send-message script: ${err}`);
  if (err.stack) {
    console.error("Error stack:", err.stack);
  }
  process.exit(1);
});
