import { Event } from '../Event';
import { World } from '../World';
import { BRErc20Delegate } from '../Contract/BRErc20Delegate';
import {
  getCoreValue,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  Value,
} from '../Value';
import { getWorldContractByAddress, getBRTokenDelegateAddress } from '../ContractLookup';

export async function getBRTokenDelegateV(world: World, event: Event): Promise<BRErc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getBRTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<BRErc20Delegate>(world, address.val);
}

async function brTokenDelegateAddress(world: World, brTokenDelegate: BRErc20Delegate): Promise<AddressV> {
  return new AddressV(brTokenDelegate._address);
}

export function brTokenDelegateFetchers() {
  return [
    new Fetcher<{ brTokenDelegate: BRErc20Delegate }, AddressV>(`
        #### Address

        * "BRTokenDelegate <BRTokenDelegate> Address" - Returns address of BRTokenDelegate contract
          * E.g. "BRTokenDelegate vDaiDelegate Address" - Returns vDaiDelegate's address
      `,
      "Address",
      [
        new Arg("brTokenDelegate", getBRTokenDelegateV)
      ],
      (world, { brTokenDelegate }) => brTokenDelegateAddress(world, brTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getBRTokenDelegateValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("BRTokenDelegate", brTokenDelegateFetchers(), world, event);
}
