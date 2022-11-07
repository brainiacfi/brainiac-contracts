import { Event } from '../Event';
import { addAction, World } from '../World';
import { BAIControllerImpl } from '../Contract/BAIControllerImpl';
import { BAIUnitroller } from '../Contract/BAIUnitroller';
import { invoke } from '../Invokation';
import { getEventV, getStringV } from '../CoreValue';
import { EventV, StringV } from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { buildBAIControllerImpl } from '../Builder/BAIControllerImplBuilder';
import { BAIControllerErrorReporter } from '../ErrorReporter';
import { getBAIControllerImpl, getBAIControllerImplData, getBAIUnitroller } from '../ContractLookup';
import { verify } from '../Verify';
import { mergeContractABI } from '../Networks';

async function genBAIControllerImpl(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, baicontrollerImpl, baicontrollerImplData } = await buildBAIControllerImpl(
    world,
    from,
    params
  );
  world = nextWorld;

  world = addAction(
    world,
    `Added BAIController Implementation (${baicontrollerImplData.description}) at address ${baicontrollerImpl._address}`,
    baicontrollerImplData.invokation
  );

  return world;
}

async function mergeABI(
  world: World,
  from: string,
  baicontrollerImpl: BAIControllerImpl,
  baiunitroller: BAIUnitroller
): Promise<World> {
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'BAIController', baiunitroller, baiunitroller.name, baicontrollerImpl.name);
  }

  return world;
}

async function becomeG1(
  world: World,
  from: string,
  baicontrollerImpl: BAIControllerImpl,
  baiunitroller: BAIUnitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    baicontrollerImpl.methods._become(baiunitroller._address),
    from,
    BAIControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'BAIController', baiunitroller, baiunitroller.name, baicontrollerImpl.name);
  }

  world = addAction(world, `Become ${baiunitroller._address}'s BAIController Impl`, invokation);

  return world;
}

async function becomeG2(
  world: World,
  from: string,
  baicontrollerImpl: BAIControllerImpl,
  baiunitroller: BAIUnitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    baicontrollerImpl.methods._become(baiunitroller._address),
    from,
    BAIControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'BAIController', baiunitroller, baiunitroller.name, baicontrollerImpl.name);
  }

  world = addAction(world, `Become ${baiunitroller._address}'s BAIController Impl`, invokation);

  return world;
}

async function become(
  world: World,
  from: string,
  baicontrollerImpl: BAIControllerImpl,
  baiunitroller: BAIUnitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    baicontrollerImpl.methods._become(baiunitroller._address),
    from,
    BAIControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'BAIController', baiunitroller, baiunitroller.name, baicontrollerImpl.name);
  }

  world = addAction(world, `Become ${baiunitroller._address}'s BAIController Impl`, invokation);

  return world;
}

async function verifyBAIControllerImpl(
  world: World,
  baicontrollerImpl: BAIControllerImpl,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, baicontrollerImpl._address);
  }

  return world;
}

export function baicontrollerImplCommands() {
  return [
    new Command<{ baicontrollerImplParams: EventV }>(
      `
        #### Deploy

        * "BAIControllerImpl Deploy ...baicontrollerImplParams" - Generates a new BAIController Implementation
          * E.g. "BAIControllerImpl Deploy MyScen Scenario"
      `,
      'Deploy',
      [new Arg('baicontrollerImplParams', getEventV, { variadic: true })],
      (world, from, { baicontrollerImplParams }) => genBAIControllerImpl(world, from, baicontrollerImplParams.val)
    ),
    new View<{ baicontrollerImplArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "BAIControllerImpl <Impl> Verify apiKey:<String>" - Verifies BAIController Implemetation in BscScan
          * E.g. "BAIControllerImpl Verify "myApiKey"
      `,
      'Verify',
      [new Arg('baicontrollerImplArg', getStringV), new Arg('apiKey', getStringV)],
      async (world, { baicontrollerImplArg, apiKey }) => {
        let [baicontrollerImpl, name, data] = await getBAIControllerImplData(world, baicontrollerImplArg.val);

        return await verifyBAIControllerImpl(world, baicontrollerImpl, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),

    new Command<{
      baiunitroller: BAIUnitroller;
      baicontrollerImpl: BAIControllerImpl;
    }>(
      `
        #### BecomeG1
        * "BAIControllerImpl <Impl> BecomeG1" - Become the baicontroller, if possible.
          * E.g. "BAIControllerImpl MyImpl BecomeG1
      `,
      'BecomeG1',
      [
        new Arg('baiunitroller', getBAIUnitroller, { implicit: true }),
        new Arg('baicontrollerImpl', getBAIControllerImpl)
      ],
      (world, from, { baiunitroller, baicontrollerImpl }) => {
        return becomeG1(world, from, baicontrollerImpl, baiunitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      baiunitroller: BAIUnitroller;
      baicontrollerImpl: BAIControllerImpl;
    }>(
      `
        #### BecomeG2
        * "BAIControllerImpl <Impl> BecomeG2" - Become the baicontroller, if possible.
          * E.g. "BAIControllerImpl MyImpl BecomeG2
      `,
      'BecomeG2',
      [
        new Arg('baiunitroller', getBAIUnitroller, { implicit: true }),
        new Arg('baicontrollerImpl', getBAIControllerImpl)
      ],
      (world, from, { baiunitroller, baicontrollerImpl }) => {
        return becomeG2(world, from, baicontrollerImpl, baiunitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      baiunitroller: BAIUnitroller;
      baicontrollerImpl: BAIControllerImpl;
    }>(
      `
        #### Become

        * "BAIControllerImpl <Impl> Become" - Become the baicontroller, if possible.
          * E.g. "BAIControllerImpl MyImpl Become
      `,
      'Become',
      [
        new Arg('baiunitroller', getBAIUnitroller, { implicit: true }),
        new Arg('baicontrollerImpl', getBAIControllerImpl)
      ],
      (world, from, { baiunitroller, baicontrollerImpl }) => {
        return become(world, from, baicontrollerImpl, baiunitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      baiunitroller: BAIUnitroller;
      baicontrollerImpl: BAIControllerImpl;
    }>(
      `
        #### MergeABI

        * "BAIControllerImpl <Impl> MergeABI" - Merges the ABI, as if it was a become.
          * E.g. "BAIControllerImpl MyImpl MergeABI
      `,
      'MergeABI',
      [
        new Arg('baiunitroller', getBAIUnitroller, { implicit: true }),
        new Arg('baicontrollerImpl', getBAIControllerImpl)
      ],
      (world, from, { baiunitroller, baicontrollerImpl }) => mergeABI(world, from, baicontrollerImpl, baiunitroller),
      { namePos: 1 }
    )
  ];
}

export async function processBAIControllerImplEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>('BAIControllerImpl', baicontrollerImplCommands(), world, event, from);
}
