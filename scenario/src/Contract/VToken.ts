import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

export interface BRTokenMethods {
  _resignImplementation(): Sendable<void>;
  balanceOfUnderlying(address: string): Callable<number>;
  borrowBalanceCurrent(address: string): Callable<string>;
  borrowBalanceStored(address: string): Callable<string>;
  totalBorrows(): Callable<string>;
  totalBorrowsCurrent(): Callable<number>;
  totalReserves(): Callable<string>;
  reserveFactorMantissa(): Callable<string>;
  comptroller(): Callable<string>;
  exchangeRateStored(): Sendable<number>;
  exchangeRateCurrent(): Callable<number>;
  getCash(): Callable<number>;
  accrueInterest(): Sendable<number>;
  mint(): Sendable<number>;
  mint(amount: encodedNumber): Sendable<number>;
  mintBehalf(address: string): Sendable<number>;
  mintBehalf(address: string, amount: encodedNumber): Sendable<number>;
  redeem(amount: encodedNumber): Sendable<number>;
  redeemUnderlying(amount: encodedNumber): Sendable<number>;
  borrow(amount: encodedNumber): Sendable<number>;
  repayBorrow(): Sendable<number>;
  repayBorrow(amount: encodedNumber): Sendable<number>;
  repayBorrowBehalf(address: string): Sendable<number>;
  repayBorrowBehalf(address: string, amount: encodedNumber): Sendable<number>;
  liquidateBorrow(borrower: string, brTokenCollateral: string): Sendable<number>;
  liquidateBorrow(borrower: string, repayAmount: encodedNumber, brTokenCollateral: string): Sendable<number>;
  seize(liquidator: string, borrower: string, seizeTokens: encodedNumber): Sendable<number>;
  evilSeize(
    treasure: string,
    liquidator: string,
    borrower: string,
    seizeTokens: encodedNumber
  ): Sendable<number>;
  _addReserves(amount: encodedNumber): Sendable<number>;
  _reduceReserves(amount: encodedNumber): Sendable<number>;
  _setReserveFactor(reserveFactor: encodedNumber): Sendable<number>;
  _setInterestRateModel(address: string): Sendable<number>;
  _setComptroller(address: string): Sendable<number>;
  underlying(): Callable<string>;
  interestRateModel(): Callable<string>;
  borrowRatePerBlock(): Callable<number>;
  donate(): Sendable<void>;
  admin(): Callable<string>;
  pendingAdmin(): Callable<string>;
  _setPendingAdmin(address: string): Sendable<number>;
  _acceptAdmin(): Sendable<number>;
}

export interface BRTokenScenarioMethods extends BRTokenMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface BRToken extends Contract {
  methods: BRTokenMethods;
  name: string;
}

export interface BRTokenScenario extends Contract {
  methods: BRTokenScenarioMethods;
  name: string;
}
