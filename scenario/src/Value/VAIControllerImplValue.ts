import {Event} from '../Event';
import {World} from '../World';
import {BAIControllerImpl} from '../Contract/BAIControllerImpl';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getBAIControllerImpl} from '../ContractLookup';

export async function getBAIControllerImplAddress(world: World, baicontrollerImpl: BAIControllerImpl): Promise<AddressV> {
  return new AddressV(baicontrollerImpl._address);
}

export function baicontrollerImplFetchers() {
  return [
    new Fetcher<{baicontrollerImpl: BAIControllerImpl}, AddressV>(`
        #### Address

        * "BAIControllerImpl Address" - Returns address of baicontroller implementation
      `,
      "Address",
      [new Arg("baicontrollerImpl", getBAIControllerImpl)],
      (world, {baicontrollerImpl}) => getBAIControllerImplAddress(world, baicontrollerImpl),
      {namePos: 1}
    )
  ];
}

export async function getBAIControllerImplValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("BAIControllerImpl", baicontrollerImplFetchers(), world, event);
}
