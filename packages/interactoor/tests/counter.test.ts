/**
 * Counter Contract Tests
 * 
 * Comprehensive test suite for the Counter contract
 * Demonstrates testing patterns for Aztec contracts
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { 
  createAztecNodeClient, 
  waitForPXE,
  Contract,
  Fr,
} from '@aztec/aztec.js';
import { createStore } from '@aztec/kv-store/lmdb';
import { createPXE, getPXEConfig } from '@aztec/pxe/server';
import { TestWallet } from '@aztec/test-wallet/server';
import { getInitialTestAccountsData } from '@aztec/accounts/testing';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shared test context
let pxe: any;
let wallet: any;
let alice: any;
let bob: any;
let contract: any;

describe('Counter Contract Tests', () => {
  
  before(async () => {
    console.log('Setting up test environment...');
    
    // Connect to sandbox
    const node = createAztecNodeClient('http://localhost:8080');
    const l1Contracts = await node.getL1ContractAddresses();
    
    const config = getPXEConfig();
    const fullConfig = { ...config, l1Contracts };
    fullConfig.proverEnabled = false;
    
    const store = await createStore('pxe-test', {
      dataDirectory: './data-test',
      dataStoreMapSizeKb: 1e6,
    });
    
    pxe = await createPXE(node, fullConfig, { store });
    await waitForPXE(pxe);
    
    // Create test accounts
    wallet = await TestWallet.create(pxe, node);
    const testAccounts = await getInitialTestAccountsData();
    
    await wallet.createSchnorrAccount(testAccounts[0].secret, testAccounts[0].salt);
    await wallet.createSchnorrAccount(testAccounts[1].secret, testAccounts[1].salt);
    
    alice = wallet.getAccount(0);
    bob = wallet.getAccount(1);
    
    // Deploy contract
    const artifactPath = join(__dirname, '../src/artifacts/Counter.json');
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
    
    const deploymentTx = Contract.deploy(alice, artifact, [alice.getAddress()]);
    const deployment = await deploymentTx.send().wait();
    contract = deployment.contract;
    
    console.log('✅ Test environment ready');
  });
  
  describe('Deployment', () => {
    it('should deploy with correct admin', async () => {
      const admin = await contract.methods.get_admin().simulate();
      assert.equal(admin.toString(), alice.getAddress().toString());
    });
    
    it('should initialize with zero counters', async () => {
      const publicCount = await contract.methods.get_public_count().simulate();
      const privateTotal = await contract.methods.get_private_total().simulate();
      
      assert.equal(publicCount, 0n);
      assert.equal(privateTotal, 0n);
    });
  });
  
  describe('Public Counter', () => {
    it('should increment public counter', async () => {
      const before = await contract.methods.get_public_count().simulate();
      await contract.methods.increment_public().send().wait();
      const after = await contract.methods.get_public_count().simulate();
      
      assert.equal(after, before + 1n);
    });
    
    it('should increment by amount (admin only)', async () => {
      const before = await contract.methods.get_public_count().simulate();
      await contract.methods.increment_public_by(5n).send().wait();
      const after = await contract.methods.get_public_count().simulate();
      
      assert.equal(after, before + 5n);
    });
    
    it('should reject non-admin increment by amount', async () => {
      const contractAsBob = contract.withWallet(bob);
      
      await assert.rejects(
        async () => {
          await contractAsBob.methods.increment_public_by(5n).send().wait();
        },
        /Only admin can increment by amount/
      );
    });
    
    it('should reset counter (admin only)', async () => {
      await contract.methods.increment_public().send().wait();
      await contract.methods.reset_public().send().wait();
      const count = await contract.methods.get_public_count().simulate();
      
      assert.equal(count, 0n);
    });
  });
  
  describe('Private Counter', () => {
    it('should increment private counter for Alice', async () => {
      const before = await contract.methods.get_private_count(alice.getAddress()).simulate();
      await contract.methods.increment_private().send().wait();
      const after = await contract.methods.get_private_count(alice.getAddress()).simulate();
      
      assert.equal(after, before + 1n);
    });
    
    it('should increment private counter by amount', async () => {
      const before = await contract.methods.get_private_count(alice.getAddress()).simulate();
      await contract.methods.increment_private_by(3n).send().wait();
      const after = await contract.methods.get_private_count(alice.getAddress()).simulate();
      
      assert.equal(after, before + 3n);
    });
    
    it('should maintain separate private counters per user', async () => {
      // Alice increments
      await contract.methods.increment_private().send().wait();
      const aliceCount = await contract.methods.get_private_count(alice.getAddress()).simulate();
      
      // Bob increments
      const contractAsBob = contract.withWallet(bob);
      await contractAsBob.methods.increment_private().send().wait();
      const bobCount = await contractAsBob.methods.get_private_count(bob.getAddress()).simulate();
      
      // Each should have their own count
      assert.notEqual(aliceCount, bobCount);
    });
    
    it('should reset private counter', async () => {
      await contract.methods.increment_private().send().wait();
      await contract.methods.reset_private().send().wait();
      const count = await contract.methods.get_private_count(alice.getAddress()).simulate();
      
      assert.equal(count, 0n);
    });
  });
  
  describe('View Functions', () => {
    it('should read public count without transaction', async () => {
      const count = await contract.methods.get_public_count().simulate();
      assert.equal(typeof count, 'bigint');
    });
    
    it('should read admin address', async () => {
      const admin = await contract.methods.get_admin().simulate();
      assert.equal(admin.toString(), alice.getAddress().toString());
    });
  });
  
  describe('Simulation', () => {
    it('should simulate without changing state', async () => {
      const before = await contract.methods.get_public_count().simulate();
      await contract.methods.increment_public().simulate(); // Just simulate
      const after = await contract.methods.get_public_count().simulate();
      
      assert.equal(before, after); // Should be unchanged
    });
    
    it('should detect failed transactions in simulation', async () => {
      const contractAsBob = contract.withWallet(bob);
      
      await assert.rejects(
        async () => {
          await contractAsBob.methods.increment_public_by(5n).simulate();
        }
      );
    });
  });
});

console.log('\n🧪 Running Counter Contract Tests...\n');

