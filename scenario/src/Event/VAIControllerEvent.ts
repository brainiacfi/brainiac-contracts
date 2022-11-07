import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {decodeCall, getPastEvents} from '../Contract';
import {BAIController} from '../Contract/BAIController';
import {BAIControllerImpl} from '../Contract/BAIControllerImpl';
import {BRToken} from '../Contract/BRToken';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getBoolV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
  getCoreValue
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, View, processCommandEvent} from '../Command';
import {buildBAIControllerImpl} from '../Builder/BAIControllerImplBuilder';
import {BAIControllerErrorReporter} from '../ErrorReporter';
import {getBAIController, getBAIControllerImpl} from '../ContractLookup';
// import {getLiquidity} from '../Value/BAIControllerValue';
import {getBRTokenV} from '../Value/BRTokenValue';
import {encodedNumber} from '../Encoding';
import {encodeABI, rawValues} from "../Utils";

async function genBAIController(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, baicontrollerImpl: baicontroller, baicontrollerImplData: baicontrollerData} = await buildBAIControllerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added BAIController (${baicontrollerData.description}) at address ${baicontroller._address}`,
    baicontrollerData.invokation
  );

  return world;
};

async function setPendingAdmin(world: World, from: string, baicontroller: BAIController, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, baicontroller.methods._setPendingAdmin(newPendingAdmin), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `BAIController: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, baicontroller: BAIController): Promise<World> {
  let invokation = await invoke(world, baicontroller.methods._acceptAdmin(), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `BAIController: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function sendAny(world: World, from:string, baicontroller: BAIController, signature: string, callArgs: string[]): Promise<World> {
  const fnData = encodeABI(world, signature, callArgs);
  await world.web3.eth.sendTransaction({
      to: baicontroller._address,
      data: fnData,
      from: from
    })
  return world;
}

async function setComptroller(world: World, from: string, baicontroller: BAIController, comptroller: string): Promise<World> {
  let invokation = await invoke(world, baicontroller.methods._setComptroller(comptroller), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `Set Comptroller to ${comptroller} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function mint(world: World, from: string, baicontroller: BAIController, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, baicontroller.methods.mintBAI(amount.encode()), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `BAIController: ${describeUser(world, from)} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function repay(world: World, from: string, baicontroller: BAIController, amount: NumberV): Promise<World> {
  let invokation;
  let showAmount;

  showAmount = amount.show();
  invokation = await invoke(world, baicontroller.methods.repayBAI(amount.encode()), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `BAIController: ${describeUser(world, from)} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}


async function liquidateBAI(world: World, from: string, baicontroller: BAIController, borrower: string, collateral: BRToken, repayAmount: NumberV): Promise<World> {
  let invokation;
  let showAmount;

  showAmount = repayAmount.show();
  invokation = await invoke(world, baicontroller.methods.liquidateBAI(borrower, repayAmount.encode(), collateral._address), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `BAIController: ${describeUser(world, from)} liquidates ${showAmount} from of ${describeUser(world, borrower)}, seizing ${collateral.name}.`,
    invokation
  );

  return world;
}

async function setTreasuryData(
  world: World,
  from: string,
  baicontroller: BAIController,
  guardian: string,
  address: string,
  percent: NumberV,
): Promise<World> {
  let invokation = await invoke(world, baicontroller.methods._setTreasuryData(guardian, address, percent.encode()), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `Set treasury data to guardian: ${guardian}, address: ${address}, percent: ${percent.show()}`,
    invokation
  );

  return world;
}

async function initialize(
  world: World,
  from: string,
  baicontroller: BAIController
): Promise<World> {
  let invokation = await invoke(world, baicontroller.methods.initialize(), from, BAIControllerErrorReporter);

  world = addAction(
    world,
    `Initizlied the BAIController`,
    invokation
  );

  return world;
}

export function baicontrollerCommands() {
  return [
    new Command<{baicontrollerParams: EventV}>(`
        #### Deploy

        * "BAIController Deploy ...baicontrollerParams" - Generates a new BAIController (not as Impl)
          * E.g. "BAIController Deploy YesNo"
      `,
      "Deploy",
      [new Arg("baicontrollerParams", getEventV, {variadic: true})],
      (world, from, {baicontrollerParams}) => genBAIController(world, from, baicontrollerParams.val)
    ),

    new Command<{baicontroller: BAIController, signature: StringV, callArgs: StringV[]}>(`
      #### Send
      * BAIController Send functionSignature:<String> callArgs[] - Sends any transaction to baicontroller
      * E.g: BAIController Send "setBAIAddress(address)" (Address BAI)
      `,
      "Send",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      (world, from, {baicontroller, signature, callArgs}) => sendAny(world, from, baicontroller, signature.val, rawValues(callArgs))
    ),

    new Command<{ baicontroller: BAIController, comptroller: AddressV}>(`
        #### SetComptroller

        * "BAIController SetComptroller comptroller:<Address>" - Sets the comptroller address
          * E.g. "BAIController SetComptroller 0x..."
      `,
      "SetComptroller",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("comptroller", getAddressV)
      ],
      (world, from, {baicontroller, comptroller}) => setComptroller(world, from, baicontroller, comptroller.val)
    ),

    new Command<{ baicontroller: BAIController, amount: NumberV }>(`
        #### Mint

        * "BAIController Mint amount:<Number>" - Mint the given amount of BAI as specified user
          * E.g. "BAIController Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("amount", getNumberV)
      ],
      // Note: we override from
      (world, from, { baicontroller, amount }) => mint(world, from, baicontroller, amount),
    ),

    new Command<{ baicontroller: BAIController, amount: NumberV }>(`
        #### Repay

        * "BAIController Repay amount:<Number>" - Repays BAI in the given amount as specified user
          * E.g. "BAIController Repay 1.0e18"
      `,
      "Repay",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { baicontroller, amount }) => repay(world, from, baicontroller, amount),
    ),

    new Command<{ baicontroller: BAIController, borrower: AddressV, brToken: BRToken, collateral: BRToken, repayAmount: NumberV }>(`
        #### LiquidateBAI

        * "BAIController LiquidateBAI borrower:<User> brTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of BAI seizing collateral token
          * E.g. "BAIController LiquidateBAI Geoff vBAT 1.0e18"
      `,
      "LiquidateBAI",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getBRTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true })
      ],
      (world, from, { baicontroller, borrower, collateral, repayAmount }) => liquidateBAI(world, from, baicontroller, borrower.val, collateral, repayAmount),
    ),

    new Command<{baicontroller: BAIController, guardian: AddressV, address: AddressV, percent: NumberV}>(`
      #### SetTreasuryData
      * "BAIController SetTreasuryData <guardian> <address> <rate>" - Sets Treasury Data
      * E.g. "BAIController SetTreasuryData 0x.. 0x.. 1e18
      `,
      "SetTreasuryData",
      [
        new Arg("baicontroller", getBAIController, {implicit: true}),
        new Arg("guardian", getAddressV),
        new Arg("address", getAddressV),
        new Arg("percent", getNumberV)
      ],
      (world, from, {baicontroller, guardian, address, percent}) => setTreasuryData(world, from, baicontroller, guardian.val, address.val, percent)
    ),

    new Command<{baicontroller: BAIController}>(`
      #### Initialize
      * "BAIController Initialize" - Call Initialize
      * E.g. "BAIController Initialize
      `,
      "Initialize",
      [
        new Arg("baicontroller", getBAIController, {implicit: true})
      ],
      (world, from, {baicontroller}) => initialize(world, from, baicontroller)
    )
  ];
}

export async function processBAIControllerEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BAIController", baicontrollerCommands(), world, event, from);
}
