import { Event } from '../Event';
import { World } from '../World';
import { BRToken } from '../Contract/BRToken';
import { BRErc20Delegator } from '../Contract/BRErc20Delegator';
import { Erc20 } from '../Contract/Erc20';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  NumberV,
  Value,
  StringV
} from '../Value';
import { getWorldContractByAddress, getBRTokenAddress } from '../ContractLookup';

export async function getBRTokenV(world: World, event: Event): Promise<BRToken> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getBRTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<BRToken>(world, address.val);
}

export async function getBRErc20DelegatorV(world: World, event: Event): Promise<BRErc20Delegator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getBRTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<BRErc20Delegator>(world, address.val);
}

async function getInterestRateModel(world: World, brToken: BRToken): Promise<AddressV> {
  return new AddressV(await brToken.methods.interestRateModel().call());
}

async function brTokenAddress(world: World, brToken: BRToken): Promise<AddressV> {
  return new AddressV(brToken._address);
}

async function getBRTokenAdmin(world: World, brToken: BRToken): Promise<AddressV> {
  return new AddressV(await brToken.methods.admin().call());
}

async function getBRTokenPendingAdmin(world: World, brToken: BRToken): Promise<AddressV> {
  return new AddressV(await brToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(world: World, brToken: BRToken, user: string): Promise<NumberV> {
  return new NumberV(await brToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(world: World, brToken: BRToken, user): Promise<NumberV> {
  return new NumberV(await brToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(world: World, brToken: BRToken, user): Promise<NumberV> {
  return new NumberV(await brToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.reserveFactorMantissa().call(), 1.0e18);
}

async function getTotalReserves(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.totalReserves().call());
}

async function getComptroller(world: World, brToken: BRToken): Promise<AddressV> {
  return new AddressV(await brToken.methods.comptroller().call());
}

async function getExchangeRateStored(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.getCash().call());
}

async function getInterestRate(world: World, brToken: BRToken): Promise<NumberV> {
  return new NumberV(await brToken.methods.borrowRatePerBlock().call(), 1.0e18 / 2102400);
}

async function getImplementation(world: World, brToken: BRToken): Promise<AddressV> {
  return new AddressV(await (brToken as BRErc20Delegator).methods.implementation().call());
}

export function brTokenFetchers() {
  return [
    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### Address

        * "BRToken <BRToken> Address" - Returns address of BRToken contract
          * E.g. "BRToken vZRX Address" - Returns vZRX's address
      `,
      "Address",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => brTokenAddress(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### InterestRateModel

        * "BRToken <BRToken> InterestRateModel" - Returns the interest rate model of BRToken contract
          * E.g. "BRToken vZRX InterestRateModel" - Returns vZRX's interest rate model
      `,
      "InterestRateModel",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getInterestRateModel(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### Admin

        * "BRToken <BRToken> Admin" - Returns the admin of BRToken contract
          * E.g. "BRToken vZRX Admin" - Returns vZRX's admin
      `,
      "Admin",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getBRTokenAdmin(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### PendingAdmin

        * "BRToken <BRToken> PendingAdmin" - Returns the pending admin of BRToken contract
          * E.g. "BRToken vZRX PendingAdmin" - Returns vZRX's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getBRTokenPendingAdmin(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### Underlying

        * "BRToken <BRToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "BRToken vZRX Underlying"
      `,
      "Underlying",
      [
        new Arg("brToken", getBRTokenV)
      ],
      async (world, { brToken }) => new AddressV(await brToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken, address: AddressV }, NumberV>(`
        #### UnderlyingBalance

        * "BRToken <BRToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "BRToken vZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("brToken", getBRTokenV),
        new Arg<AddressV>("address", getAddressV)
      ],
      (world, { brToken, address }) => balanceOfUnderlying(world, brToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken, address: AddressV }, NumberV>(`
        #### BorrowBalance

        * "BRToken <BRToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "BRToken vZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { brToken, address }) => getBorrowBalance(world, brToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken, address: AddressV }, NumberV>(`
        #### BorrowBalanceStored

        * "BRToken <BRToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "BRToken vZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { brToken, address }) => getBorrowBalanceStored(world, brToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### TotalBorrows

        * "BRToken <BRToken> TotalBorrows" - Returns the brToken's total borrow balance
          * E.g. "BRToken vZRX TotalBorrows"
      `,
      "TotalBorrows",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getTotalBorrows(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### TotalBorrowsCurrent

        * "BRToken <BRToken> TotalBorrowsCurrent" - Returns the brToken's total borrow balance with interest
          * E.g. "BRToken vZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getTotalBorrowsCurrent(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### Reserves

        * "BRToken <BRToken> Reserves" - Returns the brToken's total reserves
          * E.g. "BRToken vZRX Reserves"
      `,
      "Reserves",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getTotalReserves(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### ReserveFactor

        * "BRToken <BRToken> ReserveFactor" - Returns reserve factor of BRToken contract
          * E.g. "BRToken vZRX ReserveFactor" - Returns vZRX's reserve factor
      `,
      "ReserveFactor",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getReserveFactor(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### Comptroller

        * "BRToken <BRToken> Comptroller" - Returns the brToken's comptroller
          * E.g. "BRToken vZRX Comptroller"
      `,
      "Comptroller",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getComptroller(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### ExchangeRateStored

        * "BRToken <BRToken> ExchangeRateStored" - Returns the brToken's exchange rate (based on balances stored)
          * E.g. "BRToken vZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getExchangeRateStored(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### ExchangeRate

        * "BRToken <BRToken> ExchangeRate" - Returns the brToken's current exchange rate
          * E.g. "BRToken vZRX ExchangeRate"
      `,
      "ExchangeRate",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getExchangeRate(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### Cash

        * "BRToken <BRToken> Cash" - Returns the brToken's current cash
          * E.g. "BRToken vZRX Cash"
      `,
      "Cash",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getCash(world, brToken),
      { namePos: 1 }
    ),

    new Fetcher<{ brToken: BRToken }, NumberV>(`
        #### InterestRate

        * "BRToken <BRToken> InterestRate" - Returns the brToken's current interest rate
          * E.g. "BRToken vZRX InterestRate"
      `,
      "InterestRate",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, {brToken}) => getInterestRate(world, brToken),
      {namePos: 1}
    ),
    new Fetcher<{brToken: BRToken, signature: StringV}, NumberV>(`
        #### CallNum

        * "BRToken <BRToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "BRToken vZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [
        new Arg("brToken", getBRTokenV),
        new Arg("signature", getStringV),
      ],
      async (world, {brToken, signature}) => {
        const res = await world.web3.eth.call({
            to: brToken._address,
            data: world.web3.eth.abi.encodeFunctionSignature(signature.val)
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
      ,
      {namePos: 1}
    ),
    new Fetcher<{ brToken: BRToken }, AddressV>(`
        #### Implementation

        * "BRToken <BRToken> Implementation" - Returns the brToken's current implementation
          * E.g. "BRToken vDAI Implementation"
      `,
      "Implementation",
      [
        new Arg("brToken", getBRTokenV)
      ],
      (world, { brToken }) => getImplementation(world, brToken),
      { namePos: 1 }
    )
  ];
}

export async function getBRTokenValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("brToken", brTokenFetchers(), world, event);
}
