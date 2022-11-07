import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { BRTokenMethods } from './BRToken';
import { encodedNumber } from '../Encoding';

interface BRErc20DelegatorMethods extends BRTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface BRErc20DelegatorScenarioMethods extends BRErc20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface BRErc20Delegator extends Contract {
  methods: BRErc20DelegatorMethods;
  name: string;
}

export interface BRErc20DelegatorScenario extends Contract {
  methods: BRErc20DelegatorMethods;
  name: string;
}
