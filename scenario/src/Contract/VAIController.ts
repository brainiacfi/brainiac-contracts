import {Contract} from '../Contract';
import {Callable, Sendable} from '../Invokation';
import {encodedNumber} from '../Encoding';

interface BAIControllerMethods {
  admin(): Callable<string>
  pendingAdmin(): Callable<string>
  _setPendingAdmin(string): Sendable<number>
  _acceptAdmin(): Sendable<number>
  _setComptroller(string): Sendable<number>
  mintBAI(amount: encodedNumber): Sendable<number>
  repayBAI(amount: encodedNumber): Sendable<{0: number, 1: number}>
  getMintableBAI(string): Callable<{0: number, 1: number}>
  liquidateBAI(borrower: string, repayAmount: encodedNumber, brTokenCollateral: string): Sendable<{0: number, 1: number}>
  _setTreasuryData(guardian, address, percent: encodedNumber): Sendable<number>
  initialize(): Sendable<void>
}

export interface BAIController extends Contract {
  methods: BAIControllerMethods
}
