import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

export interface BrainiacLensMethods {
  brTokenBalances(brToken: string, account: string): Sendable<[string,number,number,number,number,number]>;
  brTokenBalancesAll(brTokens: string[], account: string): Sendable<[string,number,number,number,number,number][]>;
  brTokenMetadata(brToken: string): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number,number,number,number,number]>;
  brTokenMetadataAll(brTokens: string[]): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number,number,number,number,number][]>;
  brTokenUnderlyingPrice(brToken: string): Sendable<[string,number]>;
  brTokenUnderlyingPriceAll(brTokens: string[]): Sendable<[string,number][]>;
  getAccountLimits(comptroller: string, account: string): Sendable<[string[],number,number]>;
}

export interface BrainiacLens extends Contract {
  methods: BrainiacLensMethods;
  name: string;
}
