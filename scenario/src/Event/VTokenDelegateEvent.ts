import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { BRToken, BRTokenScenario } from '../Contract/BRToken';
import { BRErc20Delegate } from '../Contract/BRErc20Delegate'
import { invoke, Sendable } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
  getBoolV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NothingV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { getBRTokenDelegateData } from '../ContractLookup';
import { buildBRTokenDelegate } from '../Builder/BRTokenDelegateBuilder';
import { verify } from '../Verify';

async function genBRTokenDelegate(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, brTokenDelegate, delegateData } = await buildBRTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added brToken ${delegateData.name} (${delegateData.contract}) at address ${brTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyBRTokenDelegate(world: World, brTokenDelegate: BRErc20Delegate, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, brTokenDelegate._address);
  }

  return world;
}

export function brTokenDelegateCommands() {
  return [
    new Command<{ brTokenDelegateParams: EventV }>(`
        #### Deploy

        * "BRTokenDelegate Deploy ...brTokenDelegateParams" - Generates a new BRTokenDelegate
          * E.g. "BRTokenDelegate Deploy VDaiDelegate vDAIDelegate"
      `,
      "Deploy",
      [new Arg("brTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { brTokenDelegateParams }) => genBRTokenDelegate(world, from, brTokenDelegateParams.val)
    ),
    new View<{ brTokenDelegateArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "BRTokenDelegate <brTokenDelegate> Verify apiKey:<String>" - Verifies BRTokenDelegate in BscScan
          * E.g. "BRTokenDelegate vDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("brTokenDelegateArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { brTokenDelegateArg, apiKey }) => {
        let [brToken, name, data] = await getBRTokenDelegateData(world, brTokenDelegateArg.val);

        return await verifyBRTokenDelegate(world, brToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
  ];
}

export async function processBRTokenDelegateEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BRTokenDelegate", brTokenDelegateCommands(), world, event, from);
}
