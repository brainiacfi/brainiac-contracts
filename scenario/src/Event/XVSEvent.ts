import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { BRN, BRNScenario } from '../Contract/BRN';
import { buildBRN } from '../Builder/BRNBuilder';
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
import { getBRN } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { verify } from '../Verify';
import { encodedNumber } from '../Encoding';

async function genBRN(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, brn, tokenData } = await buildBRN(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed BRN (${brn.name}) to address ${brn._address}`,
    tokenData.invokation
  );

  return world;
}

async function verifyBRN(world: World, brn: BRN, apiKey: string, modelName: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, modelName, contractName, brn._address);
  }

  return world;
}

async function approve(world: World, from: string, brn: BRN, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brn.methods.approve(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Approved BRN token for ${from} of ${amount.show()}`,
    invokation
  );

  return world;
}

async function transfer(world: World, from: string, brn: BRN, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brn.methods.transfer(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} BRN tokens from ${from} to ${address}`,
    invokation
  );

  return world;
}

async function transferFrom(world: World, from: string, brn: BRN, owner: string, spender: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brn.methods.transferFrom(owner, spender, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `"Transferred from" ${amount.show()} BRN tokens from ${owner} to ${spender}`,
    invokation
  );

  return world;
}

async function transferScenario(world: World, from: string, brn: BRNScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brn.methods.transferScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} BRN tokens from ${from} to ${addresses}`,
    invokation
  );

  return world;
}

async function transferFromScenario(world: World, from: string, brn: BRNScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brn.methods.transferFromScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} BRN tokens from ${addresses} to ${from}`,
    invokation
  );

  return world;
}

async function delegate(world: World, from: string, brn: BRN, account: string): Promise<World> {
  let invokation = await invoke(world, brn.methods.delegate(account), from, NoErrorReporter);

  world = addAction(
    world,
    `"Delegated from" ${from} to ${account}`,
    invokation
  );

  return world;
}

async function setBlockNumber(
  world: World,
  from: string,
  brn: BRN,
  blockNumber: NumberV
): Promise<World> {
  return addAction(
    world,
    `Set BRN blockNumber to ${blockNumber.show()}`,
    await invoke(world, brn.methods.setBlockNumber(blockNumber.encode()), from)
  );
}

export function brnCommands() {
  return [
    new Command<{ params: EventV }>(`
        #### Deploy

        * "Deploy ...params" - Generates a new BRN token
          * E.g. "BRN Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genBRN(world, from, params.val)
    ),

    new View<{ brn: BRN, apiKey: StringV, contractName: StringV }>(`
        #### Verify

        * "<BRN> Verify apiKey:<String> contractName:<String>=BRN" - Verifies BRN token in BscScan
          * E.g. "BRN Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, { default: new StringV("BRN") })
      ],
      async (world, { brn, apiKey, contractName }) => {
        return await verifyBRN(world, brn, apiKey.val, brn.name, contractName.val)
      }
    ),

    new Command<{ brn: BRN, spender: AddressV, amount: NumberV }>(`
        #### Approve

        * "BRN Approve spender:<Address> <Amount>" - Adds an allowance between user and address
          * E.g. "BRN Approve Geoff 1.0e18"
      `,
      "Approve",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brn, spender, amount }) => {
        return approve(world, from, brn, spender.val, amount)
      }
    ),

    new Command<{ brn: BRN, recipient: AddressV, amount: NumberV }>(`
        #### Transfer

        * "BRN Transfer recipient:<User> <Amount>" - Transfers a number of tokens via "transfer" as given user to recipient (this does not depend on allowance)
          * E.g. "BRN Transfer Torrey 1.0e18"
      `,
      "Transfer",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brn, recipient, amount }) => transfer(world, from, brn, recipient.val, amount)
    ),

    new Command<{ brn: BRN, owner: AddressV, spender: AddressV, amount: NumberV }>(`
        #### TransferFrom

        * "BRN TransferFrom owner:<User> spender:<User> <Amount>" - Transfers a number of tokens via "transfeFrom" to recipient (this depends on allowances)
          * E.g. "BRN TransferFrom Geoff Torrey 1.0e18"
      `,
      "TransferFrom",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brn, owner, spender, amount }) => transferFrom(world, from, brn, owner.val, spender.val, amount)
    ),

    new Command<{ brn: BRNScenario, recipients: AddressV[], amount: NumberV }>(`
        #### TransferScenario

        * "BRN TransferScenario recipients:<User[]> <Amount>" - Transfers a number of tokens via "transfer" to the given recipients (this does not depend on allowance)
          * E.g. "BRN TransferScenario (Jared Torrey) 10"
      `,
      "TransferScenario",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("recipients", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brn, recipients, amount }) => transferScenario(world, from, brn, recipients.map(recipient => recipient.val), amount)
    ),

    new Command<{ brn: BRNScenario, froms: AddressV[], amount: NumberV }>(`
        #### TransferFromScenario

        * "BRN TransferFromScenario froms:<User[]> <Amount>" - Transfers a number of tokens via "transferFrom" from the given users to msg.sender (this depends on allowance)
          * E.g. "BRN TransferFromScenario (Jared Torrey) 10"
      `,
      "TransferFromScenario",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("froms", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brn, froms, amount }) => transferFromScenario(world, from, brn, froms.map(_from => _from.val), amount)
    ),

    new Command<{ brn: BRN, account: AddressV }>(`
        #### Delegate

        * "BRN Delegate account:<Address>" - Delegates votes to a given account
          * E.g. "BRN Delegate Torrey"
      `,
      "Delegate",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, from, { brn, account }) => delegate(world, from, brn, account.val)
    ),
    new Command<{ brn: BRN, blockNumber: NumberV }>(`
      #### SetBlockNumber

      * "SetBlockNumber <Seconds>" - Sets the blockTimestamp of the BRN Harness
      * E.g. "BRN SetBlockNumber 500"
      `,
        'SetBlockNumber',
        [new Arg('brn', getBRN, { implicit: true }), new Arg('blockNumber', getNumberV)],
        (world, from, { brn, blockNumber }) => setBlockNumber(world, from, brn, blockNumber)
      )
  ];
}

export async function processBRNEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BRN", brnCommands(), world, event, from);
}
