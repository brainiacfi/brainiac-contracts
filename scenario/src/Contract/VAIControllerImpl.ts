import { Contract } from '../Contract';
import { Sendable } from '../Invokation';

interface BAIControllerImplMethods {
  _become(
    controller: string
  ): Sendable<string>;
}

export interface BAIControllerImpl extends Contract {
  methods: BAIControllerImplMethods;
}
