import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable } from '../Invokation';

export interface ComptrollerLensMethods {
  liquidateCalculateSeizeTokens(
    comptroller: string,
    brTokenBorrowed: string,
    brTokenCollateral: string,
    actualRepayAmount: encodedNumber
  ): Callable<{0: number, 1: number}>

  liquidateBAICalculateSeizeTokens(
    comptroller: string,
    brTokenCollateral: string,
    actualRepayAmount: encodedNumber
  ): Callable<{0: number, 1: number}>

  getHypotheticalAccountLiquidity(
    comptroller: string,
    account: string, 
    brTokenModify: string, 
    redeemTokens: encodedNumber, 
    borrowAmount: encodedNumber
  ): Callable<{0: number, 1: number, 2: number}>
}

export interface ComptrollerLens extends Contract {
  methods: ComptrollerLensMethods;
  name: string;
}
