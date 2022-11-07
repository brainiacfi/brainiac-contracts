import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { BRToken, BRTokenScenario } from '../Contract/BRToken';
import { BRErc20Delegate } from '../Contract/BRErc20Delegate'
import { BRErc20Delegator } from '../Contract/BRErc20Delegator'
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
import { getContract } from '../Contract';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { BRTokenErrorReporter } from '../ErrorReporter';
import { getComptroller, getBRTokenData } from '../ContractLookup';
import { getExpMantissa } from '../Encoding';
import { buildBRToken } from '../Builder/BRTokenBuilder';
import { verify } from '../Verify';
import { getLiquidity } from '../Value/ComptrollerValue';
import { encodedNumber } from '../Encoding';
import { getBRTokenV, getBRErc20DelegatorV } from '../Value/BRTokenValue';

function showTrxValue(world: World): string {
  return new NumberV(world.trxInvokationOpts.get('value')).show();
}

async function genBRToken(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, brToken, tokenData } = await buildBRToken(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added brToken ${tokenData.name} (${tokenData.contract}<decimals=${tokenData.decimals}>) at address ${brToken._address}`,
    tokenData.invokation
  );

  return world;
}

async function accrueInterest(world: World, from: string, brToken: BRToken): Promise<World> {
  let invokation = await invoke(world, brToken.methods.accrueInterest(), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: Interest accrued`,
    invokation
  );

  return world;
}

async function mint(world: World, from: string, brToken: BRToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, brToken.methods.mint(amount.encode()), from, BRTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, brToken.methods.mint(), from, BRTokenErrorReporter);
  }

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function mintBehalf(world: World, from: string, brToken: BRToken, receiver: string, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, brToken.methods.mintBehalf(receiver, amount.encode()), from, BRTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, brToken.methods.mintBehalf(receiver), from, BRTokenErrorReporter);
  }

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function redeem(world: World, from: string, brToken: BRToken, tokens: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods.redeem(tokens.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} redeems ${tokens.show()} tokens`,
    invokation
  );

  return world;
}

async function redeemUnderlying(world: World, from: string, brToken: BRToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods.redeemUnderlying(amount.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} redeems ${amount.show()} underlying`,
    invokation
  );

  return world;
}

async function borrow(world: World, from: string, brToken: BRToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods.borrow(amount.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function repayBorrow(world: World, from: string, brToken: BRToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, brToken.methods.repayBorrow(amount.encode()), from, BRTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, brToken.methods.repayBorrow(), from, BRTokenErrorReporter);
  }

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}

async function repayBorrowBehalf(world: World, from: string, behalf: string, brToken: BRToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, brToken.methods.repayBorrowBehalf(behalf, amount.encode()), from, BRTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, brToken.methods.repayBorrowBehalf(behalf), from, BRTokenErrorReporter);
  }

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow on behalf of ${describeUser(world, behalf)}`,
    invokation
  );

  return world;
}

async function liquidateBorrow(world: World, from: string, brToken: BRToken, borrower: string, collateral: BRToken, repayAmount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (repayAmount instanceof NumberV) {
    showAmount = repayAmount.show();
    invokation = await invoke(world, brToken.methods.liquidateBorrow(borrower, repayAmount.encode(), collateral._address), from, BRTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, brToken.methods.liquidateBorrow(borrower, collateral._address), from, BRTokenErrorReporter);
  }

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} liquidates ${showAmount} from of ${describeUser(world, borrower)}, seizing ${collateral.name}.`,
    invokation
  );

  return world;
}

async function seize(world: World, from: string, brToken: BRToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods.seize(liquidator, borrower, seizeTokens.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} initiates seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function evilSeize(world: World, from: string, brToken: BRToken, treasure: BRToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods.evilSeize(treasure._address, liquidator, borrower, seizeTokens.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} initiates illegal seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function setPendingAdmin(world: World, from: string, brToken: BRToken, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, brToken.methods._setPendingAdmin(newPendingAdmin), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, brToken: BRToken): Promise<World> {
  let invokation = await invoke(world, brToken.methods._acceptAdmin(), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function addReserves(world: World, from: string, brToken: BRToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods._addReserves(amount.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} adds to reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function reduceReserves(world: World, from: string, brToken: BRToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods._reduceReserves(amount.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} reduces reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function setReserveFactor(world: World, from: string, brToken: BRToken, reserveFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, brToken.methods._setReserveFactor(reserveFactor.encode()), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(world, from)} sets reserve factor to ${reserveFactor.show()}`,
    invokation
  );

  return world;
}

async function setInterestRateModel(world: World, from: string, brToken: BRToken, interestRateModel: string): Promise<World> {
  let invokation = await invoke(world, brToken.methods._setInterestRateModel(interestRateModel), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `Set interest rate for ${brToken.name} to ${interestRateModel} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setComptroller(world: World, from: string, brToken: BRToken, comptroller: string): Promise<World> {
  let invokation = await invoke(world, brToken.methods._setComptroller(comptroller), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `Set comptroller for ${brToken.name} to ${comptroller} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function becomeImplementation(
  world: World,
  from: string,
  brToken: BRToken,
  becomeImplementationData: string
): Promise<World> {

  const brErc20Delegate = getContract('BRErc20Delegate');
  const brErc20DelegateContract = await brErc20Delegate.at<BRErc20Delegate>(world, brToken._address);

  let invokation = await invoke(
    world,
    brErc20DelegateContract.methods._becomeImplementation(becomeImplementationData),
    from,
    BRTokenErrorReporter
  );

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(
      world,
      from
    )} initiates _becomeImplementation with data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function resignImplementation(
  world: World,
  from: string,
  brToken: BRToken,
): Promise<World> {

  const brErc20Delegate = getContract('BRErc20Delegate');
  const brErc20DelegateContract = await brErc20Delegate.at<BRErc20Delegate>(world, brToken._address);

  let invokation = await invoke(
    world,
    brErc20DelegateContract.methods._resignImplementation(),
    from,
    BRTokenErrorReporter
  );

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(
      world,
      from
    )} initiates _resignImplementation.`,
    invokation
  );

  return world;
}

async function setImplementation(
  world: World,
  from: string,
  brToken: BRErc20Delegator,
  implementation: string,
  allowResign: boolean,
  becomeImplementationData: string
): Promise<World> {
  let invokation = await invoke(
    world,
    brToken.methods._setImplementation(
      implementation,
      allowResign,
      becomeImplementationData
    ),
    from,
    BRTokenErrorReporter
  );

  world = addAction(
    world,
    `BRToken ${brToken.name}: ${describeUser(
      world,
      from
    )} initiates setImplementation with implementation:${implementation} allowResign:${allowResign} data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function donate(world: World, from: string, brToken: BRToken): Promise<World> {
  let invokation = await invoke(world, brToken.methods.donate(), from, BRTokenErrorReporter);

  world = addAction(
    world,
    `Donate for ${brToken.name} as ${describeUser(world, from)} with value ${showTrxValue(world)}`,
    invokation
  );

  return world;
}

async function setBRTokenMock(world: World, from: string, brToken: BRTokenScenario, mock: string, value: NumberV): Promise<World> {
  let mockMethod: (number) => Sendable<void>;

  switch (mock.toLowerCase()) {
    case "totalborrows":
      mockMethod = brToken.methods.setTotalBorrows;
      break;
    case "totalreserves":
      mockMethod = brToken.methods.setTotalReserves;
      break;
    default:
      throw new Error(`Mock "${mock}" not defined for brToken`);
  }

  let invokation = await invoke(world, mockMethod(value.encode()), from);

  world = addAction(
    world,
    `Mocked ${mock}=${value.show()} for ${brToken.name}`,
    invokation
  );

  return world;
}

async function verifyBRToken(world: World, brToken: BRToken, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, brToken._address);
  }

  return world;
}

async function printMinters(world: World, brToken: BRToken): Promise<World> {
  let events = await getPastEvents(world, brToken, brToken.name, 'Mint');
  let addresses = events.map((event) => event.returnValues['minter']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Minters:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printBorrowers(world: World, brToken: BRToken): Promise<World> {
  let events = await getPastEvents(world, brToken, brToken.name, 'Borrow');
  let addresses = events.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Borrowers:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printLiquidity(world: World, brToken: BRToken): Promise<World> {
  let mintEvents = await getPastEvents(world, brToken, brToken.name, 'Mint');
  let mintAddresses = mintEvents.map((event) => event.returnValues['minter']);
  let borrowEvents = await getPastEvents(world, brToken, brToken.name, 'Borrow');
  let borrowAddresses = borrowEvents.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(mintAddresses.concat(borrowAddresses))];
  let comptroller = await getComptroller(world);

  world.printer.printLine("Liquidity:")

  const liquidityMap = await Promise.all(uniq.map(async (address) => {
    let userLiquidity = await getLiquidity(world, comptroller, address);

    return [address, userLiquidity.val];
  }));

  liquidityMap.forEach(([address, liquidity]) => {
    world.printer.printLine(`\t${world.settings.lookupAlias(address)}: ${liquidity / 1e18}e18`)
  });

  return world;
}

export function brTokenCommands() {
  return [
    new Command<{ brTokenParams: EventV }>(`
        #### Deploy

        * "BRToken Deploy ...brTokenParams" - Generates a new BRToken
          * E.g. "BRToken vZRX Deploy"
      `,
      "Deploy",
      [new Arg("brTokenParams", getEventV, { variadic: true })],
      (world, from, { brTokenParams }) => genBRToken(world, from, brTokenParams.val)
    ),
    new View<{ brTokenArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "BRToken <brToken> Verify apiKey:<String>" - Verifies BRToken in BscScan
          * E.g. "BRToken vZRX Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("brTokenArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { brTokenArg, apiKey }) => {
        let [brToken, name, data] = await getBRTokenData(world, brTokenArg.val);

        return await verifyBRToken(world, brToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken }>(`
        #### AccrueInterest

        * "BRToken <brToken> AccrueInterest" - Accrues interest for given token
          * E.g. "BRToken vZRX AccrueInterest"
      `,
      "AccrueInterest",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, { brToken }) => accrueInterest(world, from, brToken),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, amount: NumberV | NothingV }>(`
        #### Mint

        * "BRToken <brToken> Mint amount:<Number>" - Mints the given amount of brToken as specified user
          * E.g. "BRToken vZRX Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { brToken, amount }) => mint(world, from, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, receiver: AddressV, amount: NumberV | NothingV }>(`
        #### MintBehalf

        * "BRToken <brToken> MintBehalf receiver:<User> amount:<Number>" - Mints the given amount of brToken as specified user
          * E.g. "BRToken vZRX MintBehalf Torrey 1.0e18"
      `,
      "MintBehalf",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("receiver", getAddressV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { brToken, receiver, amount }) => mintBehalf(world, from, brToken, receiver.val, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, tokens: NumberV }>(`
        #### Redeem

        * "BRToken <brToken> Redeem tokens:<Number>" - Redeems the given amount of brTokens as specified user
          * E.g. "BRToken vZRX Redeem 1.0e9"
      `,
      "Redeem",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("tokens", getNumberV)
      ],
      (world, from, { brToken, tokens }) => redeem(world, from, brToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, amount: NumberV }>(`
        #### RedeemUnderlying

        * "BRToken <brToken> RedeemUnderlying amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "BRToken vZRX RedeemUnderlying 1.0e18"
      `,
      "RedeemUnderlying",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brToken, amount }) => redeemUnderlying(world, from, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, amount: NumberV }>(`
        #### Borrow

        * "BRToken <brToken> Borrow amount:<Number>" - Borrows the given amount of this brToken as specified user
          * E.g. "BRToken vZRX Borrow 1.0e18"
      `,
      "Borrow",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("amount", getNumberV)
      ],
      // Note: we override from
      (world, from, { brToken, amount }) => borrow(world, from, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, amount: NumberV | NothingV }>(`
        #### RepayBorrow

        * "BRToken <brToken> RepayBorrow underlyingAmount:<Number>" - Repays borrow in the given underlying amount as specified user
          * E.g. "BRToken vZRX RepayBorrow 1.0e18"
      `,
      "RepayBorrow",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { brToken, amount }) => repayBorrow(world, from, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, behalf: AddressV, amount: NumberV | NothingV }>(`
        #### RepayBorrowBehalf

        * "BRToken <brToken> RepayBorrowBehalf behalf:<User> underlyingAmount:<Number>" - Repays borrow in the given underlying amount on behalf of another user
          * E.g. "BRToken vZRX RepayBorrowBehalf Geoff 1.0e18"
      `,
      "RepayBorrowBehalf",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("behalf", getAddressV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { brToken, behalf, amount }) => repayBorrowBehalf(world, from, behalf.val, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ borrower: AddressV, brToken: BRToken, collateral: BRToken, repayAmount: NumberV | NothingV }>(`
        #### Liquidate

        * "BRToken <brToken> Liquidate borrower:<User> brTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of given token seizing collateral token
          * E.g. "BRToken vZRX Liquidate Geoff vBAT 1.0e18"
      `,
      "Liquidate",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getBRTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true })
      ],
      (world, from, { borrower, brToken, collateral, repayAmount }) => liquidateBorrow(world, from, brToken, borrower.val, collateral, repayAmount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### Seize

        * "BRToken <brToken> Seize liquidator:<User> borrower:<User> seizeTokens:<Number>" - Seizes a given number of tokens from a user (to be called from other BRToken)
          * E.g. "BRToken vZRX Seize Geoff Torrey 1.0e18"
      `,
      "Seize",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { brToken, liquidator, borrower, seizeTokens }) => seize(world, from, brToken, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, treasure: BRToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### EvilSeize

        * "BRToken <brToken> EvilSeize treasure:<Token> liquidator:<User> borrower:<User> seizeTokens:<Number>" - Improperly seizes a given number of tokens from a user
          * E.g. "BRToken vEVL EvilSeize vZRX Geoff Torrey 1.0e18"
      `,
      "EvilSeize",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("treasure", getBRTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { brToken, treasure, liquidator, borrower, seizeTokens }) => evilSeize(world, from, brToken, treasure, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, amount: NumberV }>(`
        #### ReduceReserves

        * "BRToken <brToken> ReduceReserves amount:<Number>" - Reduces the reserves of the brToken
          * E.g. "BRToken vZRX ReduceReserves 1.0e18"
      `,
      "ReduceReserves",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brToken, amount }) => reduceReserves(world, from, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, amount: NumberV }>(`
    #### AddReserves

    * "BRToken <brToken> AddReserves amount:<Number>" - Adds reserves to the brToken
      * E.g. "BRToken vZRX AddReserves 1.0e18"
  `,
      "AddReserves",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { brToken, amount }) => addReserves(world, from, brToken, amount),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, newPendingAdmin: AddressV }>(`
        #### SetPendingAdmin

        * "BRToken <brToken> SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the brToken
          * E.g. "BRToken vZRX SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, { brToken, newPendingAdmin }) => setPendingAdmin(world, from, brToken, newPendingAdmin.val),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken }>(`
        #### AcceptAdmin

        * "BRToken <brToken> AcceptAdmin" - Accepts admin for the brToken
          * E.g. "From Geoff (BRToken vZRX AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, { brToken }) => acceptAdmin(world, from, brToken),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, reserveFactor: NumberV }>(`
        #### SetReserveFactor

        * "BRToken <brToken> SetReserveFactor reserveFactor:<Number>" - Sets the reserve factor for the brToken
          * E.g. "BRToken vZRX SetReserveFactor 0.1"
      `,
      "SetReserveFactor",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("reserveFactor", getExpNumberV)
      ],
      (world, from, { brToken, reserveFactor }) => setReserveFactor(world, from, brToken, reserveFactor),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, interestRateModel: AddressV }>(`
        #### SetInterestRateModel

        * "BRToken <brToken> SetInterestRateModel interestRateModel:<Contract>" - Sets the interest rate model for the given brToken
          * E.g. "BRToken vZRX SetInterestRateModel (FixedRate 1.5)"
      `,
      "SetInterestRateModel",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("interestRateModel", getAddressV)
      ],
      (world, from, { brToken, interestRateModel }) => setInterestRateModel(world, from, brToken, interestRateModel.val),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, comptroller: AddressV }>(`
        #### SetComptroller

        * "BRToken <brToken> SetComptroller comptroller:<Contract>" - Sets the comptroller for the given brToken
          * E.g. "BRToken vZRX SetComptroller Comptroller"
      `,
      "SetComptroller",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("comptroller", getAddressV)
      ],
      (world, from, { brToken, comptroller }) => setComptroller(world, from, brToken, comptroller.val),
      { namePos: 1 }
    ),
    new Command<{
      brToken: BRToken;
      becomeImplementationData: StringV;
    }>(
      `
        #### BecomeImplementation

        * "BRToken <brToken> BecomeImplementation becomeImplementationData:<String>"
          * E.g. "BRToken vDAI BecomeImplementation "0x01234anyByTeS56789""
      `,
      'BecomeImplementation',
      [
        new Arg('brToken', getBRTokenV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { brToken, becomeImplementationData }) =>
        becomeImplementation(
          world,
          from,
          brToken,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{brToken: BRToken;}>(
      `
        #### ResignImplementation

        * "BRToken <brToken> ResignImplementation"
          * E.g. "BRToken vDAI ResignImplementation"
      `,
      'ResignImplementation',
      [new Arg('brToken', getBRTokenV)],
      (world, from, { brToken }) =>
        resignImplementation(
          world,
          from,
          brToken
        ),
      { namePos: 1 }
    ),
    new Command<{
      brToken: BRErc20Delegator;
      implementation: AddressV;
      allowResign: BoolV;
      becomeImplementationData: StringV;
    }>(
      `
        #### SetImplementation

        * "BRToken <brToken> SetImplementation implementation:<Address> allowResign:<Bool> becomeImplementationData:<String>"
          * E.g. "BRToken vDAI SetImplementation (BRToken vDAIDelegate Address) True "0x01234anyByTeS56789"
      `,
      'SetImplementation',
      [
        new Arg('brToken', getBRErc20DelegatorV),
        new Arg('implementation', getAddressV),
        new Arg('allowResign', getBoolV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { brToken, implementation, allowResign, becomeImplementationData }) =>
        setImplementation(
          world,
          from,
          brToken,
          implementation.val,
          allowResign.val,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken }>(`
        #### Donate

        * "BRToken <brToken> Donate" - Calls the donate (payable no-op) function
          * E.g. "(Trx Value 5.0e18 (BRToken brCKB Donate))"
      `,
      "Donate",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, { brToken }) => donate(world, from, brToken),
      { namePos: 1 }
    ),
    new Command<{ brToken: BRToken, variable: StringV, value: NumberV }>(`
        #### Mock

        * "BRToken <brToken> Mock variable:<String> value:<Number>" - Mocks a given value on brToken. Note: value must be a supported mock and this will only work on a "BRTokenScenario" contract.
          * E.g. "BRToken vZRX Mock totalBorrows 5.0e18"
          * E.g. "BRToken vZRX Mock totalReserves 0.5e18"
      `,
      "Mock",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("variable", getStringV),
        new Arg("value", getNumberV),
      ],
      (world, from, { brToken, variable, value }) => setBRTokenMock(world, from, <BRTokenScenario>brToken, variable.val, value),
      { namePos: 1 }
    ),
    new View<{ brToken: BRToken }>(`
        #### Minters

        * "BRToken <brToken> Minters" - Print address of all minters
      `,
      "Minters",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => printMinters(world, brToken),
      { namePos: 1 }
    ),
    new View<{ brToken: BRToken }>(`
        #### Borrowers

        * "BRToken <brToken> Borrowers" - Print address of all borrowers
      `,
      "Borrowers",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => printBorrowers(world, brToken),
      { namePos: 1 }
    ),
    new View<{ brToken: BRToken }>(`
        #### Liquidity

        * "BRToken <brToken> Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => printLiquidity(world, brToken),
      { namePos: 1 }
    ),
    new View<{ brToken: BRToken, input: StringV }>(`
        #### Decode

        * "Decode <brToken> input:<String>" - Prints information about a call to a brToken contract
      `,
      "Decode",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("input", getStringV)

      ],
      (world, { brToken, input }) => decodeCall(world, brToken, input.val),
      { namePos: 1 }
    )
  ];
}

export async function processBRTokenEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BRToken", brTokenCommands(), world, event, from);
}
