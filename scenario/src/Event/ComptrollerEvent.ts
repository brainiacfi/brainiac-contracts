import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {decodeCall, getPastEvents} from '../Contract';
import {Comptroller} from '../Contract/Comptroller';
import {ComptrollerImpl} from '../Contract/ComptrollerImpl';
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
import {buildComptrollerImpl} from '../Builder/ComptrollerImplBuilder';
import {ComptrollerErrorReporter} from '../ErrorReporter';
import {getComptroller, getComptrollerImpl} from '../ContractLookup';
import {getLiquidity} from '../Value/ComptrollerValue';
import {getBRTokenV} from '../Value/BRTokenValue';
import {encodedNumber} from '../Encoding';
import {encodeABI, rawValues} from "../Utils";

async function genComptroller(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, comptrollerImpl: comptroller, comptrollerImplData: comptrollerData} = await buildComptrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Comptroller (${comptrollerData.description}) at address ${comptroller._address}`,
    comptrollerData.invokation
  );

  return world;
};

async function setProtocolPaused(world: World, from: string, comptroller: Comptroller, isPaused: boolean): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setProtocolPaused(isPaused), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Comptroller: set protocol paused to ${isPaused}`,
    invokation
  );

  return world;
}

async function setMaxAssets(world: World, from: string, comptroller: Comptroller, numberOfAssets: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setMaxAssets(numberOfAssets.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set max assets to ${numberOfAssets.show()}`,
    invokation
  );

  return world;
}

async function setLiquidationIncentive(world: World, from: string, comptroller: Comptroller, liquidationIncentive: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setLiquidationIncentive(liquidationIncentive.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set liquidation incentive to ${liquidationIncentive.show()}`,
    invokation
  );

  return world;
}

async function setLiquidatorContract(world: World, from: string, comptroller: Comptroller, newLiquidatorContract_: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setLiquidatorContract(newLiquidatorContract_), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set liquidator contract to ${newLiquidatorContract_}`,
    invokation
  );

  return world;
}

async function supportMarket(world: World, from: string, comptroller: Comptroller, brToken: BRToken): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(`Dry run: Supporting market  \`${brToken._address}\``);
    return world;
  }

  let invokation = await invoke(world, comptroller.methods._supportMarket(brToken._address), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Supported market ${brToken.name}`,
    invokation
  );

  return world;
}

async function unlistMarket(world: World, from: string, comptroller: Comptroller, brToken: BRToken): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.unlist(brToken._address), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Unlisted market ${brToken.name}`,
    invokation
  );

  return world;
}

async function enterMarkets(world: World, from: string, comptroller: Comptroller, assets: string[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.enterMarkets(assets), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Called enter assets ${assets} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function exitMarket(world: World, from: string, comptroller: Comptroller, asset: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.exitMarket(asset), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Called exit market ${asset} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setPriceOracle(world: World, from: string, comptroller: Comptroller, priceOracleAddr: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setPriceOracle(priceOracleAddr), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set price oracle for to ${priceOracleAddr} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setCollateralFactor(world: World, from: string, comptroller: Comptroller, brToken: BRToken, collateralFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setCollateralFactor(brToken._address, collateralFactor.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set collateral factor for ${brToken.name} to ${collateralFactor.show()}`,
    invokation
  );

  return world;
}

async function setCloseFactor(world: World, from: string, comptroller: Comptroller, closeFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setCloseFactor(closeFactor.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set close factor to ${closeFactor.show()}`,
    invokation
  );

  return world;
}

async function setBAIMintRate(world: World, from: string, comptroller: Comptroller, baiMintRate: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setBAIMintRate(baiMintRate.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set bai mint rate to ${baiMintRate.show()}`,
    invokation
  );

  return world;
}

async function setBAIController(world: World, from: string, comptroller: Comptroller, baicontroller: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setBAIController(baicontroller), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set BAIController to ${baicontroller} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function fastForward(world: World, from: string, comptroller: Comptroller, blocks: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.fastForward(blocks.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Fast forward ${blocks.show()} blocks to #${invokation.value}`,
    invokation
  );

  return world;
}

async function sendAny(world: World, from:string, comptroller: Comptroller, signature: string, callArgs: string[]): Promise<World> {
  const fnData = encodeABI(world, signature, callArgs);
  await world.web3.eth.sendTransaction({
      to: comptroller._address,
      data: fnData,
      from: from
    })
  return world;
}

async function addBrainiacMarkets(world: World, from: string, comptroller: Comptroller, brTokens: BRToken[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._addBrainiacMarkets(brTokens.map(c => c._address)), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Added Brainiac markets ${brTokens.map(c => c.name)}`,
    invokation
  );

  return world;
}

async function dropBrainiacMarket(world: World, from: string, comptroller: Comptroller, brToken: BRToken): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._dropBrainiacMarket(brToken._address), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Drop Brainiac market ${brToken.name}`,
    invokation
  );

  return world;
}

async function refreshBrainiacSpeeds(world: World, from: string, comptroller: Comptroller): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.refreshBrainiacSpeeds(), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Refreshed Brainiac speeds`,
    invokation
  );

  return world;
}

async function claimBrainiac(world: World, from: string, comptroller: Comptroller, holder: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.claimBrainiac(holder), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `BRN claimed by ${holder}`,
    invokation
  );

  return world;
}

async function grantBRN(world: World, from: string, comptroller: Comptroller, recipient: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._grantBRN(recipient, amount.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `${amount.show()} brn granted to ${recipient}`,
    invokation
  );

  return world;
}

async function setBrainiacRate(world: World, from: string, comptroller: Comptroller, rate: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setBrainiacRate(rate.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `BRN rate set to ${rate.show()}`,
    invokation
  );

  return world;
}

async function setBrainiacSpeed(world: World, from: string, comptroller: Comptroller, brToken: BRToken, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setBrainiacSpeed(brToken._address, speed.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Brainiac speed for market ${brToken._address} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function printLiquidity(world: World, comptroller: Comptroller): Promise<World> {
  let enterEvents = await getPastEvents(world, comptroller, 'StdComptroller', 'MarketEntered');
  let addresses = enterEvents.map((event) => event.returnValues['account']);
  let uniq = [...new Set(addresses)];

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

async function setPendingAdmin(world: World, from: string, comptroller: Comptroller, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setPendingAdmin(newPendingAdmin), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Comptroller: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, comptroller: Comptroller): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._acceptAdmin(), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Comptroller: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function setMarketBorrowCaps(world: World, from: string, comptroller: Comptroller, brTokens: BRToken[], borrowCaps: NumberV[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setMarketBorrowCaps(brTokens.map(c => c._address), borrowCaps.map(c => c.encode())), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Borrow caps on ${brTokens} set to ${borrowCaps}`,
    invokation
  );

  return world;
}

async function setBorrowCapGuardian(world: World, from: string, comptroller: Comptroller, newBorrowCapGuardian: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setBorrowCapGuardian(newBorrowCapGuardian), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Comptroller: ${describeUser(world, from)} sets borrow cap guardian to ${newBorrowCapGuardian}`,
    invokation
  );

  return world;
}

async function setComptrollerLens(world: World, from: string, comptroller: Comptroller, newComptrollerLens: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setComptrollerLens(newComptrollerLens), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Comptroller: ${describeUser(world, from)} sets comptroller lens to ${newComptrollerLens}`,
    invokation
  );

  return world;
}

async function setTreasuryData(
  world: World,
  from: string,
  comptroller: Comptroller,
  guardian: string,
  address: string,
  percent: NumberV,
): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setTreasuryData(guardian, address, percent.encode()), from, ComptrollerErrorReporter);

  world = addAction(
    world,
    `Set treasury data to guardian: ${guardian}, address: ${address}, percent: ${percent.show()}`,
    invokation
  );

  return world;
}

export function comptrollerCommands() {
  return [
    new Command<{comptrollerParams: EventV}>(`
        #### Deploy

        * "Comptroller Deploy ...comptrollerParams" - Generates a new Comptroller (not as Impl)
          * E.g. "Comptroller Deploy YesNo"
      `,
      "Deploy",
      [new Arg("comptrollerParams", getEventV, {variadic: true})],
      (world, from, {comptrollerParams}) => genComptroller(world, from, comptrollerParams.val)
    ),
    new Command<{comptroller: Comptroller, isPaused: BoolV}>(`
        #### SetProtocolPaused

        * "Comptroller SetProtocolPaused <Bool>" - Pauses or unpaused protocol
          * E.g. "Comptroller SetProtocolPaused True"
      `,
      "SetProtocolPaused",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("isPaused", getBoolV)
      ],
      (world, from, {comptroller, isPaused}) => setProtocolPaused(world, from, comptroller, isPaused.val)
    ),
    new Command<{comptroller: Comptroller, brToken: BRToken}>(`
        #### SupportMarket

        * "Comptroller SupportMarket <BRToken>" - Adds support in the Comptroller for the given brToken
          * E.g. "Comptroller SupportMarket vZRX"
      `,
      "SupportMarket",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, {comptroller, brToken}) => supportMarket(world, from, comptroller, brToken)
    ),
    new Command<{comptroller: Comptroller, brToken: BRToken}>(`
        #### UnList

        * "Comptroller UnList <BRToken>" - Mock unlists a given market in tests
          * E.g. "Comptroller UnList vZRX"
      `,
      "UnList",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, {comptroller, brToken}) => unlistMarket(world, from, comptroller, brToken)
    ),
    new Command<{comptroller: Comptroller, brTokens: BRToken[]}>(`
        #### EnterMarkets

        * "Comptroller EnterMarkets (<BRToken> ...)" - User enters the given markets
          * E.g. "Comptroller EnterMarkets (vZRX brCKB)"
      `,
      "EnterMarkets",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brTokens", getBRTokenV, {mapped: true})
      ],
      (world, from, {comptroller, brTokens}) => enterMarkets(world, from, comptroller, brTokens.map((c) => c._address))
    ),
    new Command<{comptroller: Comptroller, brToken: BRToken}>(`
        #### ExitMarket

        * "Comptroller ExitMarket <BRToken>" - User exits the given markets
          * E.g. "Comptroller ExitMarket vZRX"
      `,
      "ExitMarket",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, {comptroller, brToken}) => exitMarket(world, from, comptroller, brToken._address)
    ),
    new Command<{comptroller: Comptroller, maxAssets: NumberV}>(`
        #### SetMaxAssets

        * "Comptroller SetMaxAssets <Number>" - Sets (or resets) the max allowed asset count
          * E.g. "Comptroller SetMaxAssets 4"
      `,
      "SetMaxAssets",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("maxAssets", getNumberV)
      ],
      (world, from, {comptroller, maxAssets}) => setMaxAssets(world, from, comptroller, maxAssets)
    ),
    new Command<{comptroller: Comptroller, liquidationIncentive: NumberV}>(`
        #### LiquidationIncentive

        * "Comptroller LiquidationIncentive <Number>" - Sets the liquidation incentive
          * E.g. "Comptroller LiquidationIncentive 1.1"
      `,
      "LiquidationIncentive",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("liquidationIncentive", getExpNumberV)
      ],
      (world, from, {comptroller, liquidationIncentive}) => setLiquidationIncentive(world, from, comptroller, liquidationIncentive)
    ),
    new Command<{comptroller: Comptroller, newLiquidatorContract: AddressV}>(`
        #### SetLiquidatorContract

        * "Comptroller SetLiquidatorContract <Address>" - Sets the liquidator contract address
          * E.g. "Comptroller SetLiquidatorContract (Address Liquidator)"
      `,
      "SetLiquidatorContract",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("newLiquidatorContract", getAddressV)
      ],
      (world, from, {comptroller, newLiquidatorContract}) => setLiquidatorContract(world, from, comptroller, newLiquidatorContract.val)
    ),

    new Command<{comptroller: Comptroller, newComptrollerLens: AddressV}>(`
        #### SetComptrollerLens

        * "Comptroller SetComptrollerLens <Address>" - Sets the comptroller lens contract address
          * E.g. "Comptroller SetComptrollerLens (Address ComptrollerLens)"
      `,
      "SetComptrollerLens",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("newComptrollerLens", getAddressV)
      ],
      (world, from, {comptroller, newComptrollerLens}) => setComptrollerLens(world, from, comptroller, newComptrollerLens.val)
    ),

    new Command<{comptroller: Comptroller, priceOracle: AddressV}>(`
        #### SetPriceOracle

        * "Comptroller SetPriceOracle oracle:<Address>" - Sets the price oracle address
          * E.g. "Comptroller SetPriceOracle 0x..."
      `,
      "SetPriceOracle",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("priceOracle", getAddressV)
      ],
      (world, from, {comptroller, priceOracle}) => setPriceOracle(world, from, comptroller, priceOracle.val)
    ),
    new Command<{comptroller: Comptroller, brToken: BRToken, collateralFactor: NumberV}>(`
        #### SetCollateralFactor

        * "Comptroller SetCollateralFactor <BRToken> <Number>" - Sets the collateral factor for given brToken to number
          * E.g. "Comptroller SetCollateralFactor vZRX 0.1"
      `,
      "SetCollateralFactor",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV),
        new Arg("collateralFactor", getExpNumberV)
      ],
      (world, from, {comptroller, brToken, collateralFactor}) => setCollateralFactor(world, from, comptroller, brToken, collateralFactor)
    ),
    new Command<{comptroller: Comptroller, closeFactor: NumberV}>(`
        #### SetCloseFactor

        * "Comptroller SetCloseFactor <Number>" - Sets the close factor to given percentage
          * E.g. "Comptroller SetCloseFactor 0.2"
      `,
      "SetCloseFactor",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("closeFactor", getPercentV)
      ],
      (world, from, {comptroller, closeFactor}) => setCloseFactor(world, from, comptroller, closeFactor)
    ),
    new Command<{comptroller: Comptroller, baiMintRate: NumberV}>(`
        #### SetBAIMintRate

        * "Comptroller SetBAIMintRate <Number>" - Sets the bai mint rate to given value
          * E.g. "Comptroller SetBAIMintRate 5e4"
      `,
      "SetBAIMintRate",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("baiMintRate", getNumberV)
      ],
      (world, from, {comptroller, baiMintRate}) => setBAIMintRate(world, from, comptroller, baiMintRate)
    ),
    new Command<{comptroller: Comptroller, baicontroller: AddressV}>(`
        #### SetBAIController

        * "Comptroller SetBAIController baicontroller:<Address>" - Sets the bai controller address
          * E.g. "Comptroller SetBAIController 0x..."
      `,
      "SetBAIController",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("baicontroller", getAddressV)
      ],
      (world, from, {comptroller, baicontroller}) => setBAIController(world, from, comptroller, baicontroller.val)
    ),
    new Command<{comptroller: Comptroller, newPendingAdmin: AddressV}>(`
        #### SetPendingAdmin

        * "Comptroller SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the Comptroller
          * E.g. "Comptroller SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, {comptroller, newPendingAdmin}) => setPendingAdmin(world, from, comptroller, newPendingAdmin.val)
    ),
    new Command<{comptroller: Comptroller}>(`
        #### AcceptAdmin

        * "Comptroller AcceptAdmin" - Accepts admin for the Comptroller
          * E.g. "From Geoff (Comptroller AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
      ],
      (world, from, {comptroller}) => acceptAdmin(world, from, comptroller)
    ),
    new Command<{comptroller: Comptroller, blocks: NumberV, _keyword: StringV}>(`
        #### FastForward

        * "FastForward n:<Number> Blocks" - Moves the block number forward "n" blocks. Note: in "BRTokenScenario" and "ComptrollerScenario" the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
          * E.g. "Comptroller FastForward 5 Blocks" - Move block number forward 5 blocks.
      `,
      "FastForward",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("blocks", getNumberV),
        new Arg("_keyword", getStringV)
      ],
      (world, from, {comptroller, blocks}) => fastForward(world, from, comptroller, blocks)
    ),
    new View<{comptroller: Comptroller}>(`
        #### Liquidity

        * "Comptroller Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
      ],
      (world, {comptroller}) => printLiquidity(world, comptroller)
    ),
    new View<{comptroller: Comptroller, input: StringV}>(`
        #### Decode

        * "Decode input:<String>" - Prints information about a call to a Comptroller contract
      `,
      "Decode",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("input", getStringV)

      ],
      (world, {comptroller, input}) => decodeCall(world, comptroller, input.val)
    ),

    new Command<{comptroller: Comptroller, signature: StringV, callArgs: StringV[]}>(`
      #### Send
      * Comptroller Send functionSignature:<String> callArgs[] - Sends any transaction to comptroller
      * E.g: Comptroller Send "setBRNAddress(address)" (Address BRN)
      `,
      "Send",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      (world, from, {comptroller, signature, callArgs}) => sendAny(world, from, comptroller, signature.val, rawValues(callArgs))
    ),
    new Command<{comptroller: Comptroller, brTokens: BRToken[]}>(`
      #### AddBrainiacMarkets

      * "Comptroller AddBrainiacMarkets (<Address> ...)" - Makes a market BRN-enabled
      * E.g. "Comptroller AddBrainiacMarkets (vZRX vBAT)
      `,
      "AddBrainiacMarkets",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brTokens", getBRTokenV, {mapped: true})
      ],
      (world, from, {comptroller, brTokens}) => addBrainiacMarkets(world, from, comptroller, brTokens)
     ),
    new Command<{comptroller: Comptroller, brToken: BRToken}>(`
      #### DropBrainiacMarket

      * "Comptroller DropBrainiacMarket <Address>" - Makes a market BRN
      * E.g. "Comptroller DropBrainiacMarket vZRX
      `,
      "DropBrainiacMarket",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, from, {comptroller, brToken}) => dropBrainiacMarket(world, from, comptroller, brToken)
     ),

    new Command<{comptroller: Comptroller}>(`
      #### RefreshBrainiacSpeeds

      * "Comptroller RefreshBrainiacSpeeds" - Recalculates all the Brainiac market speeds
      * E.g. "Comptroller RefreshBrainiacSpeeds
      `,
      "RefreshBrainiacSpeeds",
      [
        new Arg("comptroller", getComptroller, {implicit: true})
      ],
      (world, from, {comptroller}) => refreshBrainiacSpeeds(world, from, comptroller)
    ),
    new Command<{comptroller: Comptroller, holder: AddressV}>(`
      #### ClaimBrainiac

      * "Comptroller ClaimBrainiac <holder>" - Claims brn
      * E.g. "Comptroller ClaimBrainiac Geoff
      `,
      "ClaimBrainiac",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("holder", getAddressV)
      ],
      (world, from, {comptroller, holder}) => claimBrainiac(world, from, comptroller, holder.val)
    ),
    new Command<{comptroller: Comptroller, recipient: AddressV, amount: NumberV}>(`
      #### GrantBRN
      * "Comptroller GrantBRN <recipient> <amount>" - Grants BRN to a recipient
      * E.g. "Comptroller GrantBRN Geoff 1e18
      `,
      "GrantBRN",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, {comptroller, recipient, amount}) => grantBRN(world, from, comptroller, recipient.val, amount)
    ),
    new Command<{comptroller: Comptroller, rate: NumberV}>(`
      #### SetBrainiacRate

      * "Comptroller SetBrainiacRate <rate>" - Sets Brainiac rate
      * E.g. "Comptroller SetBrainiacRate 1e18
      `,
      "SetBrainiacRate",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("rate", getNumberV)
      ],
      (world, from, {comptroller, rate}) => setBrainiacRate(world, from, comptroller, rate)
    ),
    new Command<{comptroller: Comptroller, brToken: BRToken, speed: NumberV}>(`
      #### SetBrainiacSpeed
      * "Comptroller SetBrainiacSpeed <brToken> <rate>" - Sets BRN speed for market
      * E.g. "Comptroller SetBrainiacSpeed brToken 1000
      `,
      "SetBrainiacSpeed",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {comptroller, brToken, speed}) => setBrainiacSpeed(world, from, comptroller, brToken, speed)
    ),
    new Command<{comptroller: Comptroller, brTokens: BRToken[], borrowCaps: NumberV[]}>(`
      #### SetMarketBorrowCaps
      * "Comptroller SetMarketBorrowCaps (<BRToken> ...) (<borrowCap> ...)" - Sets Market Borrow Caps
      * E.g "Comptroller SetMarketBorrowCaps (vZRX vUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketBorrowCaps",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brTokens", getBRTokenV, {mapped: true}),
        new Arg("borrowCaps", getNumberV, {mapped: true})
      ],
      (world, from, {comptroller,brTokens,borrowCaps}) => setMarketBorrowCaps(world, from, comptroller, brTokens, borrowCaps)
    ),
    new Command<{comptroller: Comptroller, newBorrowCapGuardian: AddressV}>(`
        #### SetBorrowCapGuardian
        * "Comptroller SetBorrowCapGuardian newBorrowCapGuardian:<Address>" - Sets the Borrow Cap Guardian for the Comptroller
          * E.g. "Comptroller SetBorrowCapGuardian Geoff"
      `,
      "SetBorrowCapGuardian",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("newBorrowCapGuardian", getAddressV)
      ],
      (world, from, {comptroller, newBorrowCapGuardian}) => setBorrowCapGuardian(world, from, comptroller, newBorrowCapGuardian.val)
    ),
    new Command<{comptroller: Comptroller, guardian: AddressV, address: AddressV, percent: NumberV}>(`
      #### SetTreasuryData
      * "Comptroller SetTreasuryData <guardian> <address> <rate>" - Sets Treasury Data
      * E.g. "Comptroller SetTreasuryData 0x.. 0x.. 1e18
      `,
      "SetTreasuryData",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("guardian", getAddressV),
        new Arg("address", getAddressV),
        new Arg("percent", getNumberV)
      ],
      (world, from, {comptroller, guardian, address, percent}) => setTreasuryData(world, from, comptroller, guardian.val, address.val, percent)
    )
  ];
}

export async function processComptrollerEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Comptroller", comptrollerCommands(), world, event, from);
}
