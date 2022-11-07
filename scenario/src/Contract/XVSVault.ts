import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

interface Checkpoint {
  fromBlock: number;
  votes: number;
}

export interface BRNStoreMethods {
  admin(): Callable<string>;
  setRewardToken(tokenAddress: string, status: boolean): Sendable<void>;
}

export interface BRNStore extends Contract {
  methods: BRNStoreMethods;
  name: string;
}

export interface BRNVaultProxyMethods {
  admin(): Callable<string>;
  pendingAdmin(): Callable<string>;
  brnVaultImplementation(): Callable<string>;
  pendingBRNVaultImplementation(): Callable<string>;
  _setPendingImplementation(newPendingImplementation: string): Sendable<number>;
  _acceptImplementation(): Sendable<number>;
  _setPendingAdmin(newPendingAdmin: string): Sendable<number>;
  _acceptAdmin(): Sendable<number>;
}

export interface BRNVaultProxy extends Contract {
  methods: BRNVaultProxyMethods;
  name: string;
}

export interface BRNVaultImplMethods {
  _become(brnVaultProxy: string): Sendable<void>;
  setBrnStore(brn: string, brnStore: string): Sendable<void>;
  add(
    rewardToken: string, allocPoint: encodedNumber, token: string,
    rewardPerBlock: encodedNumber, lockPeriod: encodedNumber
  ): Sendable<void>;
  deposit(rewardToken: string, pid: number, amount: encodedNumber): Sendable<void>;
  requestWithdrawal(rewardToken: string, pid: number, amount: encodedNumber): Sendable<void>;
  executeWithdrawal(rewardToken: string, pid: number): Sendable<void>;
  setWithdrawalLockingPeriod(rewardToken: string, pid: number, newPeriod: number): Sendable<void>;
  checkpoints(account: string, index: number): Callable<Checkpoint>;
  numCheckpoints(account: string): Callable<number>;
  delegate(account: string): Sendable<void>;
  getCurrentVotes(account: string): Callable<number>;
  getPriorVotes(account: string, blockNumber: encodedNumber): Callable<number>;
}

export interface BRNVaultImpl extends Contract {
  methods: BRNVaultImplMethods;
  name: string;
}

export interface BRNVaultMethods extends BRNVaultProxyMethods, BRNVaultImplMethods { }

export interface BRNVault extends Contract {
  methods: BRNVaultMethods;
  name: string;
}

interface BRNVaultHarnessMethods extends BRNVaultMethods {
  getPriorVotesHarness(account: string, blockNumber: encodedNumber, votePower: encodedNumber): Callable<number>;
}

export interface BRNVaultHarness extends Contract {
  methods: BRNVaultHarnessMethods;
  name: string;
}
