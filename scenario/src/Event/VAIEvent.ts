import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { BAI, BAIScenario } from '../Contract/BAI';
import { buildBAI } from '../Builder/BAIBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getStringV,
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getBAI } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { verify } from '../Verify';
import { encodedNumber } from '../Encoding';

async function genBAI(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, bai, tokenData } = await buildBAI(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed BAI (${bai.name}) to address ${bai._address}`,
    tokenData.invokation
  );

  return world;
}

async function verifyBAI(world: World, bai: BAI, apiKey: string, modelName: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, modelName, contractName, bai._address);
  }

  return world;
}

async function approve(world: World, from: string, bai: BAI, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, bai.methods.approve(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Approved BAI token for ${from} of ${amount.show()}`,
    invokation
  );

  return world;
}

async function faucet(world: World, from: string, bai: BAI, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, bai.methods.allocateTo(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Fauceted ${amount.show()} BAI tokens to ${address}`,
    invokation
  );

  return world;
}

async function transfer(world: World, from: string, bai: BAI, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, bai.methods.transfer(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} BAI tokens from ${from} to ${address}`,
    invokation
  );

  return world;
}

async function transferFrom(world: World, from: string, bai: BAI, owner: string, spender: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, bai.methods.transferFrom(owner, spender, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `"Transferred from" ${amount.show()} BAI tokens from ${owner} to ${spender}`,
    invokation
  );

  return world;
}

async function transferScenario(world: World, from: string, bai: BAIScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, bai.methods.transferScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} BAI tokens from ${from} to ${addresses}`,
    invokation
  );

  return world;
}

async function transferFromScenario(world: World, from: string, bai: BAIScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, bai.methods.transferFromScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} BAI tokens from ${addresses} to ${from}`,
    invokation
  );

  return world;
}

async function rely(world: World, from: string, bai: BAI, address: string): Promise<World> {
  let invokation = await invoke(world, bai.methods.rely(address), from, NoErrorReporter);

  world = addAction(
    world,
    `Add rely to BAI token to ${address}`,
    invokation
  );

  return world;
}

export function baiCommands() {
  return [
    new Command<{ params: EventV }>(`
        #### Deploy

        * "Deploy ...params" - Generates a new BAI token
          * E.g. "BAI Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genBAI(world, from, params.val)
    ),

    new View<{ bai: BAI, apiKey: StringV, contractName: StringV }>(`
        #### Verify

        * "<BAI> Verify apiKey:<String> contractName:<String>=BAI" - Verifies BAI token in BscScan
          * E.g. "BAI Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, { default: new StringV("BAI") })
      ],
      async (world, { bai, apiKey, contractName }) => {
        return await verifyBAI(world, bai, apiKey.val, bai.name, contractName.val)
      }
    ),

    new Command<{ bai: BAI, spender: AddressV, amount: NumberV }>(`
        #### Approve

        * "BAI Approve spender:<Address> <Amount>" - Adds an allowance between user and address
          * E.g. "BAI Approve Geoff 1.0e18"
      `,
      "Approve",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { bai, spender, amount }) => {
        return approve(world, from, bai, spender.val, amount)
      }
    ),

    new Command<{ bai: BAI, recipient: AddressV, amount: NumberV}>(`
        #### Faucet

        * "BAI Faucet recipient:<User> <Amount>" - Adds an arbitrary balance to given user
          * E.g. "BAI Faucet Geoff 1.0e18"
      `,
      "Faucet",
      [ 
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, {bai, recipient, amount}) => {
        return faucet(world, from, bai, recipient.val, amount)
      }
    ),

    new Command<{ bai: BAI, recipient: AddressV, amount: NumberV }>(`
        #### Transfer

        * "BAI Transfer recipient:<User> <Amount>" - Transfers a number of tokens via "transfer" as given user to recipient (this does not depend on allowance)
          * E.g. "BAI Transfer Torrey 1.0e18"
      `,
      "Transfer",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { bai, recipient, amount }) => transfer(world, from, bai, recipient.val, amount)
    ),

    new Command<{ bai: BAI, owner: AddressV, spender: AddressV, amount: NumberV }>(`
        #### TransferFrom

        * "BAI TransferFrom owner:<User> spender:<User> <Amount>" - Transfers a number of tokens via "transfeFrom" to recipient (this depends on allowances)
          * E.g. "BAI TransferFrom Geoff Torrey 1.0e18"
      `,
      "TransferFrom",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { bai, owner, spender, amount }) => transferFrom(world, from, bai, owner.val, spender.val, amount)
    ),

    new Command<{ bai: BAIScenario, recipients: AddressV[], amount: NumberV }>(`
        #### TransferScenario

        * "BAI TransferScenario recipients:<User[]> <Amount>" - Transfers a number of tokens via "transfer" to the given recipients (this does not depend on allowance)
          * E.g. "BAI TransferScenario (Jared Torrey) 10"
      `,
      "TransferScenario",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("recipients", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { bai, recipients, amount }) => transferScenario(world, from, bai, recipients.map(recipient => recipient.val), amount)
    ),

    new Command<{ bai: BAIScenario, froms: AddressV[], amount: NumberV }>(`
        #### TransferFromScenario

        * "BAI TransferFromScenario froms:<User[]> <Amount>" - Transfers a number of tokens via "transferFrom" from the given users to msg.sender (this depends on allowance)
          * E.g. "BAI TransferFromScenario (Jared Torrey) 10"
      `,
      "TransferFromScenario",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("froms", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { bai, froms, amount }) => transferFromScenario(world, from, bai, froms.map(_from => _from.val), amount)
    ),

    new Command<{ bai: BAI, address: AddressV, amount: NumberV }>(`
        #### Rely

        * "BAI Rely rely:<Address>" - Adds rely address
          * E.g. "BAI Rely 0xXX..."
      `,
      "Rely",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      (world, from, { bai, address }) => {
        return rely(world, from, bai, address.val)
      }
    ),
  ];
}

export async function processBAIEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BAI", baiCommands(), world, event, from);
}
