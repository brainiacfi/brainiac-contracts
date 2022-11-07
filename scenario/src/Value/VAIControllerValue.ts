import {Event} from '../Event';
import {World} from '../World';
import {BAIController} from '../Contract/BAIController';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getBAIController} from '../ContractLookup';
import {encodedNumber} from '../Encoding';
import {getBRTokenV} from './BRTokenValue';
import { encodeParameters, encodeABI } from '../Utils';

export async function getBAIControllerAddress(world: World, baicontroller: BAIController): Promise<AddressV> {
  return new AddressV(baicontroller._address);
}

async function getMintableBAI(world: World, baicontroller: BAIController, account: string): Promise<NumberV> {
  let {0: error, 1: amount} = await baicontroller.methods.getMintableBAI(account).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to get mintable bai: error code = ${error}`);
  }
  return new NumberV(Number(amount));
}

async function getAdmin(world: World, baicontroller: BAIController): Promise<AddressV> {
  return new AddressV(await baicontroller.methods.admin().call());
}

async function getPendingAdmin(world: World, baicontroller: BAIController): Promise<AddressV> {
  return new AddressV(await baicontroller.methods.pendingAdmin().call());
}


export function baicontrollerFetchers() {
  return [
    new Fetcher<{baicontroller: BAIController}, AddressV>(`
        #### Address

        * "BAIController Address" - Returns address of baicontroller
      `,
      "Address",
      [new Arg("baicontroller", getBAIController, {implicit: true})],
      (world, {baicontroller}) => getBAIControllerAddress(world, baicontroller)
    ),
    new Fetcher<{baicontroller: BAIController, account: AddressV}, NumberV>(`
        #### MintableBAI

        * "BAIController MintableBAI <User>" - Returns a given user's mintable bai amount
          * E.g. "BAIController MintableBAI Geoff"
      `,
      "MintableBAI",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {baicontroller, account}) => getMintableBAI(world, baicontroller, account.val)
    ),
    new Fetcher<{baicontroller: BAIController}, AddressV>(`
        #### Admin

        * "BAIController Admin" - Returns the BAIControllers's admin
          * E.g. "BAIController Admin"
      `,
      "Admin",
      [new Arg("baicontroller", getBAIController, {implicit: true})],
      (world, {baicontroller}) => getAdmin(world, baicontroller)
    ),
    new Fetcher<{baicontroller: BAIController}, AddressV>(`
        #### PendingAdmin

        * "BAIController PendingAdmin" - Returns the pending admin of the BAIController
          * E.g. "BAIController PendingAdmin" - Returns BAIController's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
      ],
      (world, {baicontroller}) => getPendingAdmin(world, baicontroller)
    ),
  ];
}

export async function getBAIControllerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("BAIController", baicontrollerFetchers(), world, event);
}
