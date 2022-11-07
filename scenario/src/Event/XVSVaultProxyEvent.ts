import { Event } from '../Event';
import { addAction, World } from '../World';
import { BRNVaultProxy } from '../Contract/BRNVault';
import { buildBRNVaultProxy } from '../Builder/BRNVaultProxyBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV
} from '../CoreValue';
import {
  AddressV,
  EventV
} from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getBRNVaultProxy } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';

async function genBRNVaultProxy(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, brnVaultProxy, brnVaultData } = await buildBRNVaultProxy(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed BRN Vault Proxy to address ${brnVaultProxy._address}`,
    brnVaultData.invokation
  );

  return world;
}

async function setPendingImplementation(world: World, from: string, brnVault: BRNVaultProxy, impl: string): Promise<World> {
  let invokation = await invoke(world, brnVault.methods._setPendingImplementation(impl), from, NoErrorReporter);

  world = addAction(
    world,
    `Set pending implementation of ${brnVault.name} to ${impl}`,
    invokation
  );

  return world;
}

export function brnVaultProxyCommands() {
  return [
    new Command<{ params: EventV }>(
      `
        #### Deploy

        * "Deploy ...params" - Generates a new BRN Vault (non-proxy version)
        * E.g. "BRNVaultProxy Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genBRNVaultProxy(world, from, params.val)
    ),

    new Command<{ brnVaultProxy: BRNVaultProxy, newImpl: AddressV }>(
      `
        #### SetPendingImplementation

        * "BRNVault SetPendingImplementation newImpl:<Address>" - Sets the new pending implementation
        * E.g. "BRNVault SetPendingImplementation (Address BRNVaultImplementation)"
      `,
      "SetPendingImplementation",
      [
        new Arg("brnVaultProxy", getBRNVaultProxy, { implicit: true }),
        new Arg("newImpl", getAddressV),
      ],
      (world, from, { brnVaultProxy, newImpl }) =>
            setPendingImplementation(world, from, brnVaultProxy, newImpl.val)
    )
  ];
}

export async function processBRNVaultProxyEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BRNVaultProxy", brnVaultProxyCommands(), world, event, from);
}
