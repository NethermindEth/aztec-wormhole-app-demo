import { AccountManager, BaseWallet } from '@aztec/aztec.js/wallet';
import { Fr } from '@aztec/aztec.js/fields';
import { SchnorrAccountContract } from '@aztec/accounts/schnorr';
import { getInitialTestAccountsData } from '@aztec/accounts/testing';

class SandboxAccountWallet extends BaseWallet {
  constructor(pxe, aztecNode, account, alias = '') {
    super(pxe, aztecNode);
    this.account = account;
    this.alias = alias;
    this.ready = null;
  }

  async init() {
    if (this.ready) {
      return this.ready;
    }

    this.ready = (async () => {
      this.completeAddress = await this.account.getCompleteAddress();
      this.address = this.completeAddress.address;
      await this.pxe.registerAccount(this.account.getSecretKey(), this.completeAddress.partialAddress);
    })();

    return this.ready;
  }

  async getAccounts() {
    await this.init();
    return [{ alias: this.alias, item: this.address }];
  }

  // BaseWallet requirement
  async getAccountFromAddress(address) {
    await this.init();
    if (!this.address.equals(address)) {
      throw new Error(`Wallet can only operate on ${this.address.toString()}, received ${address.toString()}`);
    }
    return this.account;
  }
}

async function getChainInfo(nodeClient) {
  if (!nodeClient) {
    return { chainId: Fr.ZERO, version: Fr.ZERO };
  }

  try {
    const { l1ChainId, rollupVersion } = await nodeClient.getNodeInfo();
    return {
      chainId: new Fr(l1ChainId),
      version: new Fr(rollupVersion),
    };
  } catch (error) {
    console.warn('Unable to fetch chain info from node, defaulting to zeroed values', error?.message ?? error);
    return { chainId: Fr.ZERO, version: Fr.ZERO };
  }
}

async function createAccountWithWallet(pxe, nodeClient, accountData, chainInfo) {
  const dummyWallet = { getChainInfo: async () => chainInfo };
  const { secret, signingKey, salt } = accountData;
  const manager = await AccountManager.create(dummyWallet, secret, new SchnorrAccountContract(signingKey), salt);
  const account = await manager.getAccount();
  const wallet = new SandboxAccountWallet(pxe, nodeClient, account);
  await wallet.init();
  return wallet;
}

export async function getInitialTestAccountsManagers(pxe, nodeClient) {
  const chainInfo = await getChainInfo(nodeClient);
  const accounts = await getInitialTestAccountsData();
  return Promise.all(
    accounts.map(async account => {
      const dummyWallet = { getChainInfo: async () => chainInfo };
      return AccountManager.create(dummyWallet, account.secret, new SchnorrAccountContract(account.signingKey), account.salt);
    }),
  );
}

export async function getInitialTestAccountsWallets(pxe, nodeClient) {
  if (!nodeClient) {
    throw new Error('getInitialTestAccountsWallets requires a connected Aztec node client');
  }

  const chainInfo = await getChainInfo(nodeClient);
  const accounts = await getInitialTestAccountsData();
  return Promise.all(accounts.map(account => createAccountWithWallet(pxe, nodeClient, account, chainInfo)));
}
