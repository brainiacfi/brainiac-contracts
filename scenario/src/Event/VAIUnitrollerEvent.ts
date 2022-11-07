import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { BAIUnitroller } from '../Contract/BAIUnitroller';
import { BAIControllerImpl } from '../Contract/BAIControllerImpl';
import { invoke } from '../Invokation';
import { getEventV, getStringV, getAddressV } from '../CoreValue';
import { EventV, StringV, AddressV } from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { BAIControllerErrorReporter } from '../ErrorReporter';
import { buildBAIUnitroller } from '../Builder/BAIUnitrollerBuilder';
import { getBAIControllerImpl, getBAIUnitroller } from '../ContractLookup';
import { verify } from '../Verify';

async function genBAIUnitroller(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, baiunitroller, baiunitrollerData } = await buildBAIUnitroller(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added BAIUnitroller (${baiunitrollerData.description}) at address ${baiunitroller._address}`,
    baiunitrollerData.invokation
  );

  return world;
}

async function verifyBAIUnitroller(world: World, baiunitroller: BAIUnitroller, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, 'BAIUnitroller', 'BAIUnitroller', baiunitroller._address);
  }

  return world;
}

async function acceptAdmin(world: World, from: string, baiunitroller: BAIUnitroller): Promise<World> {
  let invokation = await invoke(world, baiunitroller.methods._acceptAdmin(), from, BAIControllerErrorReporter);

  world = addAction(world, `Accept admin as ${from}`, invokation);

  return world;
}

async function setPendingAdmin(
  world: World,
  from: string,
  baiunitroller: BAIUnitroller,
  pendingAdmin: string
): Promise<World> {
  let invokation = await invoke(
    world,
    baiunitroller.methods._setPendingAdmin(pendingAdmin),
    from,
    BAIControllerErrorReporter
  );

  world = addAction(world, `Set pending admin to ${pendingAdmin}`, invokation);

  return world;
}

async function setPendingImpl(
  world: World,
  from: string,
  baiunitroller: BAIUnitroller,
  baicontrollerImpl: BAIControllerImpl
): Promise<World> {
  let invokation = await invoke(
    world,
    baiunitroller.methods._setPendingImplementation(baicontrollerImpl._address),
    from,
    BAIControllerErrorReporter
  );

  world = addAction(world, `Set pending baicontroller impl to ${baicontrollerImpl.name}`, invokation);

  return world;
}

export function baiunitrollerCommands() {
  return [
    new Command<{ baiunitrollerParams: EventV }>(
      `
        #### Deploy

        * "BAIUnitroller Deploy ...baiunitrollerParams" - Generates a new BAIUnitroller
          * E.g. "BAIUnitroller Deploy"
      `,
      'Deploy',
      [new Arg('baiunitrollerParams', getEventV, { variadic: true })],
      (world, from, { baiunitrollerParams }) => genBAIUnitroller(world, from, baiunitrollerParams.val)
    ),
    new View<{ baiunitroller: BAIUnitroller; apiKey: StringV }>(
      `
        #### Verify

        * "BAIUnitroller Verify apiKey:<String>" - Verifies BAIUnitroller in BscScan
          * E.g. "BAIUnitroller Verify "myApiKey"
      `,
      'Verify',
      [new Arg('baiunitroller', getBAIUnitroller, { implicit: true }), new Arg('apiKey', getStringV)],
      (world, { baiunitroller, apiKey }) => verifyBAIUnitroller(world, baiunitroller, apiKey.val)
    ),
    new Command<{ baiunitroller: BAIUnitroller; pendingAdmin: AddressV }>(
      `
        #### AcceptAdmin

        * "AcceptAdmin" - Accept admin for this baiunitroller
          * E.g. "BAIUnitroller AcceptAdmin"
      `,
      'AcceptAdmin',
      [new Arg('baiunitroller', getBAIUnitroller, { implicit: true })],
      (world, from, { baiunitroller }) => acceptAdmin(world, from, baiunitroller)
    ),
    new Command<{ baiunitroller: BAIUnitroller; pendingAdmin: AddressV }>(
      `
        #### SetPendingAdmin

        * "SetPendingAdmin admin:<Admin>" - Sets the pending admin for this baiunitroller
          * E.g. "BAIUnitroller SetPendingAdmin Jared"
      `,
      'SetPendingAdmin',
      [new Arg('baiunitroller', getBAIUnitroller, { implicit: true }), new Arg('pendingAdmin', getAddressV)],
      (world, from, { baiunitroller, pendingAdmin }) =>
        setPendingAdmin(world, from, baiunitroller, pendingAdmin.val)
    ),
    new Command<{ baiunitroller: BAIUnitroller; baicontrollerImpl: BAIControllerImpl }>(
      `
        #### SetPendingImpl

        * "SetPendingImpl impl:<Impl>" - Sets the pending baicontroller implementation for this baiunitroller
          * E.g. "BAIUnitroller SetPendingImpl MyScenImpl" - Sets the current baicontroller implementation to MyScenImpl
      `,
      'SetPendingImpl',
      [
        new Arg('baiunitroller', getBAIUnitroller, { implicit: true }),
        new Arg('baicontrollerImpl', getBAIControllerImpl)
      ],
      (world, from, { baiunitroller, baicontrollerImpl }) =>
        setPendingImpl(world, from, baiunitroller, baicontrollerImpl)
    )
  ];
}

export async function processBAIUnitrollerEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>('BAIUnitroller', baiunitrollerCommands(), world, event, from);
}
