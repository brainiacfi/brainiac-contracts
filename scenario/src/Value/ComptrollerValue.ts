import {Event} from '../Event';
import {World} from '../World';
import {Comptroller} from '../Contract/Comptroller';
import {BRToken} from '../Contract/BRToken';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getComptroller} from '../ContractLookup';
import {encodedNumber} from '../Encoding';
import {getBRTokenV} from '../Value/BRTokenValue';
import { encodeParameters, encodeABI } from '../Utils';

export async function getComptrollerAddress(world: World, comptroller: Comptroller): Promise<AddressV> {
  return new AddressV(comptroller._address);
}

export async function getLiquidity(world: World, comptroller: Comptroller, user: string): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await comptroller.methods.getAccountLiquidity(user).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

export async function getHypotheticalLiquidity(world: World, comptroller: Comptroller, account: string, asset: string, redeemTokens: encodedNumber, borrowAmount: encodedNumber): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await comptroller.methods.getHypotheticalAccountLiquidity(account, asset, redeemTokens, borrowAmount).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account hypothetical liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

async function getPriceOracle(world: World, comptroller: Comptroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.oracle().call());
}

async function getCloseFactor(world: World, comptroller: Comptroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.closeFactorMantissa().call(), 1e18);
}

async function getMaxAssets(world: World, comptroller: Comptroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.maxAssets().call());
}

async function getLiquidationIncentive(world: World, comptroller: Comptroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.liquidationIncentiveMantissa().call(), 1e18);
}

async function getImplementation(world: World, comptroller: Comptroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.comptrollerImplementation().call());
}

async function getBlockNumber(world: World, comptroller: Comptroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.getBlockNumber().call());
}

async function getAdmin(world: World, comptroller: Comptroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.admin().call());
}

async function getPendingAdmin(world: World, comptroller: Comptroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.pendingAdmin().call());
}

async function getCollateralFactor(world: World, comptroller: Comptroller, brToken: BRToken): Promise<NumberV> {
  let {0: _isListed, 1: collateralFactorMantissa} = await comptroller.methods.markets(brToken._address).call();
  return new NumberV(collateralFactorMantissa, 1e18);
}

async function membershipLength(world: World, comptroller: Comptroller, user: string): Promise<NumberV> {
  return new NumberV(await comptroller.methods.membershipLength(user).call());
}

async function checkMembership(world: World, comptroller: Comptroller, user: string, brToken: BRToken): Promise<BoolV> {
  return new BoolV(await comptroller.methods.checkMembership(user, brToken._address).call());
}

async function getAssetsIn(world: World, comptroller: Comptroller, user: string): Promise<ListV> {
  let assetsList = await comptroller.methods.getAssetsIn(user).call();

  return new ListV(assetsList.map((a) => new AddressV(a)));
}

async function getBrainiacMarkets(world: World, comptroller: Comptroller): Promise<ListV> {
  let mkts = await comptroller.methods.getBrainiacMarkets().call();

  return new ListV(mkts.map((a) => new AddressV(a)));
}

async function checkListed(world: World, comptroller: Comptroller, brToken: BRToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa} = await comptroller.methods.markets(brToken._address).call();

  return new BoolV(isListed);
}

async function checkIsBrainiac(world: World, comptroller: Comptroller, brToken: BRToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa, 2: isBrainiac} = await comptroller.methods.markets(brToken._address).call();
  return new BoolV(isBrainiac);
}

async function mintedBAIs(world: World, comptroller: Comptroller, user: string): Promise<NumberV> {
  return new NumberV(await comptroller.methods.mintedBAIs(user).call());
}

export function comptrollerFetchers() {
  return [
    new Fetcher<{comptroller: Comptroller}, AddressV>(`
        #### Address

        * "Comptroller Address" - Returns address of comptroller
      `,
      "Address",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getComptrollerAddress(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller, account: AddressV}, NumberV>(`
        #### Liquidity

        * "Comptroller Liquidity <User>" - Returns a given user's trued up liquidity
          * E.g. "Comptroller Liquidity Geoff"
      `,
      "Liquidity",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {comptroller, account}) => getLiquidity(world, comptroller, account.val)
    ),
    new Fetcher<{comptroller: Comptroller, account: AddressV, action: StringV, amount: NumberV, brToken: BRToken}, NumberV>(`
        #### Hypothetical

        * "Comptroller Hypothetical <User> <Action> <Asset> <Number>" - Returns a given user's trued up liquidity given a hypothetical change in asset with redeeming a certain number of tokens and/or borrowing a given amount.
          * E.g. "Comptroller Hypothetical Geoff Redeems 6.0 vZRX"
          * E.g. "Comptroller Hypothetical Geoff Borrows 5.0 vZRX"
      `,
      "Hypothetical",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("action", getStringV),
        new Arg("amount", getNumberV),
        new Arg("brToken", getBRTokenV)
      ],
      async (world, {comptroller, account, action, brToken, amount}) => {
        let redeemTokens: NumberV;
        let borrowAmount: NumberV;

        switch (action.val.toLowerCase()) {
          case "borrows":
            redeemTokens = new NumberV(0);
            borrowAmount = amount;
            break;
          case "redeems":
            redeemTokens = amount;
            borrowAmount = new NumberV(0);
            break;
          default:
            throw new Error(`Unknown hypothetical: ${action.val}`);
        }

        return await getHypotheticalLiquidity(world, comptroller, account.val, brToken._address, redeemTokens.encode(), borrowAmount.encode());
      }
    ),
    new Fetcher<{comptroller: Comptroller}, AddressV>(`
        #### Admin

        * "Comptroller Admin" - Returns the Comptrollers's admin
          * E.g. "Comptroller Admin"
      `,
      "Admin",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getAdmin(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, AddressV>(`
        #### PendingAdmin

        * "Comptroller PendingAdmin" - Returns the pending admin of the Comptroller
          * E.g. "Comptroller PendingAdmin" - Returns Comptroller's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
      ],
      (world, {comptroller}) => getPendingAdmin(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, AddressV>(`
        #### PriceOracle

        * "Comptroller PriceOracle" - Returns the Comptrollers's price oracle
          * E.g. "Comptroller PriceOracle"
      `,
      "PriceOracle",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getPriceOracle(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, NumberV>(`
        #### CloseFactor

        * "Comptroller CloseFactor" - Returns the Comptrollers's close factor
          * E.g. "Comptroller CloseFactor"
      `,
      "CloseFactor",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getCloseFactor(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, NumberV>(`
        #### MaxAssets

        * "Comptroller MaxAssets" - Returns the Comptrollers's max assets
          * E.g. "Comptroller MaxAssets"
      `,
      "MaxAssets",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getMaxAssets(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, NumberV>(`
        #### LiquidationIncentive

        * "Comptroller LiquidationIncentive" - Returns the Comptrollers's liquidation incentive
          * E.g. "Comptroller LiquidationIncentive"
      `,
      "LiquidationIncentive",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getLiquidationIncentive(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, AddressV>(`
        #### Implementation

        * "Comptroller Implementation" - Returns the Comptrollers's implementation
          * E.g. "Comptroller Implementation"
      `,
      "Implementation",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getImplementation(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller}, NumberV>(`
        #### BlockNumber

        * "Comptroller BlockNumber" - Returns the Comptrollers's mocked block number (for scenario runner)
          * E.g. "Comptroller BlockNumber"
      `,
      "BlockNumber",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      (world, {comptroller}) => getBlockNumber(world, comptroller)
    ),
    new Fetcher<{comptroller: Comptroller, brToken: BRToken}, NumberV>(`
        #### CollateralFactor

        * "Comptroller CollateralFactor <BRToken>" - Returns the collateralFactor associated with a given asset
          * E.g. "Comptroller CollateralFactor vZRX"
      `,
      "CollateralFactor",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, {comptroller, brToken}) => getCollateralFactor(world, comptroller, brToken)
    ),
    new Fetcher<{comptroller: Comptroller, account: AddressV}, NumberV>(`
        #### MembershipLength

        * "Comptroller MembershipLength <User>" - Returns a given user's length of membership
          * E.g. "Comptroller MembershipLength Geoff"
      `,
      "MembershipLength",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {comptroller, account}) => membershipLength(world, comptroller, account.val)
    ),
    new Fetcher<{comptroller: Comptroller, account: AddressV, brToken: BRToken}, BoolV>(`
        #### CheckMembership

        * "Comptroller CheckMembership <User> <BRToken>" - Returns one if user is in asset, zero otherwise.
          * E.g. "Comptroller CheckMembership Geoff vZRX"
      `,
      "CheckMembership",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("brToken", getBRTokenV)
      ],
      (world, {comptroller, account, brToken}) => checkMembership(world, comptroller, account.val, brToken)
    ),
    new Fetcher<{comptroller: Comptroller, account: AddressV}, ListV>(`
        #### AssetsIn

        * "Comptroller AssetsIn <User>" - Returns the assets a user is in
          * E.g. "Comptroller AssetsIn Geoff"
      `,
      "AssetsIn",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {comptroller, account}) => getAssetsIn(world, comptroller, account.val)
    ),
    new Fetcher<{comptroller: Comptroller, brToken: BRToken}, BoolV>(`
        #### CheckListed

        * "Comptroller CheckListed <BRToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Comptroller CheckListed vZRX"
      `,
      "CheckListed",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, {comptroller, brToken}) => checkListed(world, comptroller, brToken)
    ),
    new Fetcher<{comptroller: Comptroller, brToken: BRToken}, BoolV>(`
        #### CheckIsBrainiac

        * "Comptroller CheckIsBrainiac <BRToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Comptroller CheckIsBrainiac vZRX"
      `,
      "CheckIsBrainiac",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("brToken", getBRTokenV)
      ],
      (world, {comptroller, brToken}) => checkIsBrainiac(world, comptroller, brToken)
    ),

    new Fetcher<{comptroller: Comptroller}, BoolV>(`
        #### _ProtocolPaused

        * "_ProtocolPaused" - Returns the Comptrollers's original protocol paused status
        * E.g. "Comptroller _ProtocolPaused"
        `,
        "_ProtocolPaused",
        [new Arg("comptroller", getComptroller, {implicit: true})],
        async (world, {comptroller}) => new BoolV(await comptroller.methods.protocolPaused().call())
    ),
    new Fetcher<{comptroller: Comptroller}, ListV>(`
      #### GetBrainiacMarkets

      * "GetBrainiacMarkets" - Returns an array of the currently enabled Brainiac markets. To use the auto-gen array getter brainiacMarkets(uint), use BrainiacMarkets
      * E.g. "Comptroller GetBrainiacMarkets"
      `,
      "GetBrainiacMarkets",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      async(world, {comptroller}) => await getBrainiacMarkets(world, comptroller)
     ),

    new Fetcher<{comptroller: Comptroller}, NumberV>(`
      #### BrainiacRate

      * "BrainiacRate" - Returns the current brn rate.
      * E.g. "Comptroller BrainiacRate"
      `,
      "BrainiacRate",
      [new Arg("comptroller", getComptroller, {implicit: true})],
      async(world, {comptroller}) => new NumberV(await comptroller.methods.brainiacRate().call())
    ),

    new Fetcher<{comptroller: Comptroller, signature: StringV, callArgs: StringV[]}, NumberV>(`
        #### CallNum

        * "CallNum signature:<String> ...callArgs<CoreValue>" - Simple direct call method
          * E.g. "Comptroller CallNum \"brainiacSpeeds(address)\" (Address Coburn)"
      `,
      "CallNum",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      async (world, {comptroller, signature, callArgs}) => {
        const fnData = encodeABI(world, signature.val, callArgs.map(a => a.val));
        const res = await world.web3.eth.call({
            to: comptroller._address,
            data: fnData
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
    ),
    new Fetcher<{comptroller: Comptroller, BRToken: BRToken, key: StringV}, NumberV>(`
        #### BrainiacSupplyState(address)

        * "Comptroller BrainiacBorrowState vZRX "index"
      `,
      "BrainiacSupplyState",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("BRToken", getBRTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {comptroller, BRToken, key}) => {
        const result = await comptroller.methods.brainiacSupplyState(BRToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{comptroller: Comptroller, BRToken: BRToken, key: StringV}, NumberV>(`
        #### BrainiacBorrowState(address)

        * "Comptroller BrainiacBorrowState vZRX "index"
      `,
      "BrainiacBorrowState",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("BRToken", getBRTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {comptroller, BRToken, key}) => {
        const result = await comptroller.methods.brainiacBorrowState(BRToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{comptroller: Comptroller, account: AddressV, key: StringV}, NumberV>(`
        #### BrainiacAccrued(address)

        * "Comptroller BrainiacAccrued Coburn
      `,
      "BrainiacAccrued",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller,account}) => {
        const result = await comptroller.methods.brainiacAccrued(account.val).call();
        return new NumberV(result);
      }
    ),
    new Fetcher<{comptroller: Comptroller, BRToken: BRToken, account: AddressV}, NumberV>(`
        #### brainiacSupplierIndex

        * "Comptroller BrainiacSupplierIndex vZRX Coburn
      `,
      "BrainiacSupplierIndex",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("BRToken", getBRTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller, BRToken, account}) => {
        return new NumberV(await comptroller.methods.brainiacSupplierIndex(BRToken._address, account.val).call());
      }
    ),
    new Fetcher<{comptroller: Comptroller, BRToken: BRToken, account: AddressV}, NumberV>(`
        #### BrainiacBorrowerIndex

        * "Comptroller BrainiacBorrowerIndex vZRX Coburn
      `,
      "BrainiacBorrowerIndex",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("BRToken", getBRTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller, BRToken, account}) => {
        return new NumberV(await comptroller.methods.brainiacBorrowerIndex(BRToken._address, account.val).call());
      }
    ),
    new Fetcher<{comptroller: Comptroller, BRToken: BRToken}, NumberV>(`
        #### BrainiacSpeed

        * "Comptroller BrainiacSpeed vZRX
      `,
      "BrainiacSpeed",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("BRToken", getBRTokenV),
      ],
      async (world, {comptroller, BRToken}) => {
        return new NumberV(await comptroller.methods.brainiacSpeeds(BRToken._address).call());
      }
    ),
    new Fetcher<{ comptroller: Comptroller, address: AddressV }, NumberV>(`
        #### MintedBAI

        * "Comptroller MintedBAI <User>" - Returns a user's minted bai amount
          * E.g. "Comptroller MintedBAI Geoff"
      `,
      "MintedBAI",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg<AddressV>("address", getAddressV)
      ],
      (world, { comptroller, address }) => mintedBAIs(world, comptroller, address.val),
    ),
    new Fetcher<{comptroller: Comptroller}, AddressV>(`
        #### BorrowCapGuardian
        * "BorrowCapGuardian" - Returns the Comptrollers's BorrowCapGuardian
        * E.g. "Comptroller BorrowCapGuardian"
        `,
        "BorrowCapGuardian",
        [
          new Arg("comptroller", getComptroller, {implicit: true})
        ],
        async (world, {comptroller}) => new AddressV(await comptroller.methods.borrowCapGuardian().call())
    ),
    new Fetcher<{comptroller: Comptroller, BRToken: BRToken}, NumberV>(`
        #### BorrowCaps
        * "Comptroller BorrowCaps vZRX
      `,
      "BorrowCaps",
      [
        new Arg("comptroller", getComptroller, {implicit: true}),
        new Arg("BRToken", getBRTokenV),
      ],
      async (world, {comptroller, BRToken}) => {
        return new NumberV(await comptroller.methods.borrowCaps(BRToken._address).call());
      }
    )
  ];
}

export async function getComptrollerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Comptroller", comptrollerFetchers(), world, event);
}
