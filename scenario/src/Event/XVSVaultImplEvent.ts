import { Event } from '../Event';
import { addAction, World } from '../World';
import { BRNVault, BRNVaultImpl, BRNVaultProxy } from '../Contract/BRNVault';
import { buildBRNVaultImpl } from '../Builder/BRNVaultImplBuilder';
import { invoke } from '../Invokation';
import { getEventV } from '../CoreValue';
import { EventV } from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getBRNVaultImpl, getBRNVaultProxy } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { mergeContractABI } from '../Networks';

async function genBRNVault(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, brnVaultImpl, brnVaultData } = await buildBRNVaultImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed BRN Vault implementation (${brnVaultImpl.name}) to address ${brnVaultImpl._address}`,
    brnVaultData.invokation
  );

  return world;
}

async function become(
    world: World,
    from: string,
    impl: BRNVaultImpl,
    proxy: BRNVaultProxy
  ): Promise<World> {
  let invokation = await invoke(
    world,
    impl.methods._become(proxy._address),
    from,
    NoErrorReporter // TODO: Change to vault reporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons

    // ^ I copied this comment from other parts of the code that merge ABIs but I have no idea
    // what exactly the "number of reasons" means here. So let me just hate people who write
    // these kinds of comments.

    world = await mergeContractABI(world, 'BRNVault', proxy, proxy.name, impl.name);
  }

  world = addAction(world, `Become ${proxy._address}'s BRN Vault Implementation`, invokation);

  return world;
}

export function brnVaultImplCommands() {
  return [
    new Command<{ params: EventV }>(
      `
        #### Deploy

        * "Deploy ...params" - Generates a new BRN Vault implementation contract
        * E.g. "BRNVaultImpl Deploy MyVaultImpl"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genBRNVault(world, from, params.val)
    ),

    new Command<{ proxy: BRNVault, impl: BRNVaultImpl }>(
      `
        #### Become

        * "BRNVaultImpl <Impl> Become" - Become the new BRN Vault implementation
        * E.g. "BRNVaultImpl MyVoteImpl Become"
      `,
      "Become",
      [
        new Arg("proxy", getBRNVaultProxy, { implicit: true }),
        new Arg("impl", getBRNVaultImpl),
      ],
      (world, from, { proxy, impl }) => become(world, from, impl, proxy),
      { namePos: 1 }
    )
  ];
}

export async function processBRNVaultImplEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BRNVaultImpl", brnVaultImplCommands(), world, event, from);
}
