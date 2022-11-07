import {Contract} from '../Contract';
import {Callable, Sendable} from '../Invokation';
import { encodedNumber } from '../Encoding';

interface LiquidatorMethods {
  liquidateBorrow(
    brToken: string,
    borrower: string,
    repayAmount: encodedNumber,
    brTokenCollateral: string
  ): Sendable<void>
}

export interface Liquidator extends Contract {
  methods: LiquidatorMethods
}
