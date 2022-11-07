import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';

interface BAIUnitrollerMethods {
  admin(): Callable<string>;
  pendingAdmin(): Callable<string>;
  _acceptAdmin(): Sendable<number>;
  _setPendingAdmin(pendingAdmin: string): Sendable<number>;
  _setPendingImplementation(pendingImpl: string): Sendable<number>;
  baicontrollerImplementation(): Callable<string>;
  pendingBAIControllerImplementation(): Callable<string>;
}

export interface BAIUnitroller extends Contract {
  methods: BAIUnitrollerMethods;
}
