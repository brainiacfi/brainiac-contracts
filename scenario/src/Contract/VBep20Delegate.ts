import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { BRTokenMethods, BRTokenScenarioMethods } from './BRToken';

interface BRErc20DelegateMethods extends BRTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface BRErc20DelegateScenarioMethods extends BRTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface BRErc20Delegate extends Contract {
  methods: BRErc20DelegateMethods;
  name: string;
}

export interface BRErc20DelegateScenario extends Contract {
  methods: BRErc20DelegateScenarioMethods;
  name: string;
}
