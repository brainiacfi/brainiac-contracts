import { Map } from 'immutable';

import { Event } from './Event';
import { World } from './World';
import { Contract } from './Contract';
import { mustString } from './Utils';

import { BRErc20Delegate } from './Contract/BRErc20Delegate';
import { BRN } from './Contract/BRN';
import { SXP } from './Contract/SXP';
import { BAI } from './Contract/BAI';
import { Comptroller } from './Contract/Comptroller';
import { ComptrollerImpl } from './Contract/ComptrollerImpl';
import { BAIController } from './Contract/BAIController';
import { BAIControllerImpl } from './Contract/BAIControllerImpl';
import { BRToken } from './Contract/BRToken';
import { Governor } from './Contract/Governor';
import { GovernorBravo } from './Contract/GovernorBravo'
import { Erc20 } from './Contract/Erc20';
import { InterestRateModel } from './Contract/InterestRateModel';
import { PriceOracle } from './Contract/PriceOracle';
import { Timelock } from './Contract/Timelock';
import { BRNVaultImpl, BRNVaultProxy, BRNVault } from './Contract/BRNVault';

type ContractDataEl = string | Map<string, object> | undefined;

function getContractData(world: World, indices: string[][]): ContractDataEl {
  return indices.reduce((value: ContractDataEl, index) => {
    if (value) {
      return value;
    } else {
      return index.reduce((data: ContractDataEl, el) => {
        let lowerEl = el.toLowerCase();

        if (!data) {
          return;
        } else if (typeof data === 'string') {
          return data;
        } else {
          return (data as Map<string, ContractDataEl>).find((_v, key) => key.toLowerCase().trim() === lowerEl.trim());
        }
      }, world.contractData);
    }
  }, undefined);
}

function getContractDataString(world: World, indices: string[][]): string {
  const value: ContractDataEl = getContractData(world, indices);

  if (!value || typeof value !== 'string') {
    throw new Error(
      `Failed to find string value by index (got ${value}): ${JSON.stringify(
        indices
      )}, index contains: ${JSON.stringify(world.contractData.toJSON())}`
    );
  }

  return value;
}

export function getWorldContract<T>(world: World, indices: string[][]): T {
  const address = getContractDataString(world, indices);

  return getWorldContractByAddress<T>(world, address);
}

export function getWorldContractByAddress<T>(world: World, address: string): T {
  const contract = world.contractIndex[address.toLowerCase()];

  if (!contract) {
    throw new Error(
      `Failed to find world contract by address: ${address}, index contains: ${JSON.stringify(
        Object.keys(world.contractIndex)
      )}`
    );
  }

  return <T>(<unknown>contract);
}

export async function getTimelock(world: World): Promise<Timelock> {
  return getWorldContract(world, [['Contracts', 'Timelock']]);
}

export async function getUnitroller(world: World): Promise<Comptroller> {
  return getWorldContract(world, [['Contracts', 'Unitroller']]);
}

export async function getBAIUnitroller(world: World): Promise<BAIController> {
  return getWorldContract(world, [['Contracts', 'BAIUnitroller']]);
}

export async function getMaximillion(world: World): Promise<Comptroller> {
  return getWorldContract(world, [['Contracts', 'Maximillion']]);
}

export async function getLiquidator(world: World): Promise<Comptroller> {
  return getWorldContract(world, [['Contracts', 'Liquidator']]);
}

export async function getComptroller(world: World): Promise<Comptroller> {
  return getWorldContract(world, [['Contracts', 'Comptroller']]);
}

export async function getComptrollerImpl(world: World, comptrollerImplArg: Event): Promise<ComptrollerImpl> {
  return getWorldContract(world, [['Comptroller', mustString(comptrollerImplArg), 'address']]);
}

export async function getBAIController(world: World): Promise<BAIController> {
  return getWorldContract(world, [['Contracts', 'BAIController']]);
}

export async function getBAIControllerImpl(world: World, baicontrollerImplArg: Event): Promise<BAIControllerImpl> {
  return getWorldContract(world, [['BAIController', mustString(baicontrollerImplArg), 'address']]);
}

export function getBRTokenAddress(world: World, brTokenArg: string): string {
  return getContractDataString(world, [['brTokens', brTokenArg, 'address']]);
}

export function getBRTokenDelegateAddress(world: World, brTokenDelegateArg: string): string {
  return getContractDataString(world, [['BRTokenDelegate', brTokenDelegateArg, 'address']]);
}

export function getErc20Address(world: World, erc20Arg: string): string {
  return getContractDataString(world, [['Tokens', erc20Arg, 'address']]);
}

export function getGovernorAddress(world: World, governorArg: string): string {
  return getContractDataString(world, [['Contracts', governorArg]]);
}

export function getGovernorBravo(world: World, governoBravoArg: string): Promise<GovernorBravo> {
  return getWorldContract(world, [['Contracts', 'GovernorBravo']])
}

export function getBRNVault(world: World): Promise<BRNVault> {
  return getWorldContract(world, [['Contracts', 'BRNVault']])
}

export function getBRNVaultProxy(world: World): Promise<BRNVaultProxy> {
  return getWorldContract(world, [['Contracts', 'BRNVaultProxy']])
}

export async function getBRNVaultImpl(world: World, brnVaultImplArg: Event): Promise<BRNVaultImpl> {
  return getWorldContract(world, [['BRNVault', mustString(brnVaultImplArg), 'address']]);
}

export async function getPriceOracleProxy(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracleProxy']]);
}

export async function getPriceOracle(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracle']]);
}

export async function getBRN(
  world: World,
  brainiacArg: Event
): Promise<BRN> {
  return getWorldContract(world, [['BRN', 'address']]);
}

export async function getBRNData(
  world: World,
  brainiacArg: string
): Promise<[BRN, string, Map<string, string>]> {
  let contract = await getBRN(world, <Event>(<any>brainiacArg));
  let data = getContractData(world, [['BRN', brainiacArg]]);

  return [contract, brainiacArg, <Map<string, string>>(<any>data)];
}

export async function getSXP(
  world: World,
  brainiacArg: Event
): Promise<SXP> {
  return getWorldContract(world, [['SXP', 'address']]);
}

export async function getSXPData(
  world: World,
  brainiacArg: string
): Promise<[SXP, string, Map<string, string>]> {
  let contract = await getSXP(world, <Event>(<any>brainiacArg));
  let data = getContractData(world, [['SXP', brainiacArg]]);

  return [contract, brainiacArg, <Map<string, string>>(<any>data)];
}

export async function getBAI(
  world: World,
  brainiacArg: Event
): Promise<BAI> {
  return getWorldContract(world, [['BAI', 'address']]);
}

export async function getBAIData(
  world: World,
  brainiacArg: string
): Promise<[BAI, string, Map<string, string>]> {
  let contract = await getBAI(world, <Event>(<any>brainiacArg));
  let data = getContractData(world, [['BAI', brainiacArg]]);

  return [contract, brainiacArg, <Map<string, string>>(<any>data)];
}

export async function getGovernorData(
  world: World,
  governorArg: string
): Promise<[Governor, string, Map<string, string>]> {
  let contract = getWorldContract<Governor>(world, [['Governor', governorArg, 'address']]);
  let data = getContractData(world, [['Governor', governorArg]]);

  return [contract, governorArg, <Map<string, string>>(<any>data)];
}

export async function getInterestRateModel(
  world: World,
  interestRateModelArg: Event
): Promise<InterestRateModel> {
  return getWorldContract(world, [['InterestRateModel', mustString(interestRateModelArg), 'address']]);
}

export async function getInterestRateModelData(
  world: World,
  interestRateModelArg: string
): Promise<[InterestRateModel, string, Map<string, string>]> {
  let contract = await getInterestRateModel(world, <Event>(<any>interestRateModelArg));
  let data = getContractData(world, [['InterestRateModel', interestRateModelArg]]);

  return [contract, interestRateModelArg, <Map<string, string>>(<any>data)];
}

export async function getErc20Data(
  world: World,
  erc20Arg: string
): Promise<[Erc20, string, Map<string, string>]> {
  let contract = getWorldContract<Erc20>(world, [['Tokens', erc20Arg, 'address']]);
  let data = getContractData(world, [['Tokens', erc20Arg]]);

  return [contract, erc20Arg, <Map<string, string>>(<any>data)];
}

export async function getBRTokenData(
  world: World,
  brTokenArg: string
): Promise<[BRToken, string, Map<string, string>]> {
  let contract = getWorldContract<BRToken>(world, [['brTokens', brTokenArg, 'address']]);
  let data = getContractData(world, [['BRTokens', brTokenArg]]);

  return [contract, brTokenArg, <Map<string, string>>(<any>data)];
}

export async function getBRTokenDelegateData(
  world: World,
  brTokenDelegateArg: string
): Promise<[BRErc20Delegate, string, Map<string, string>]> {
  let contract = getWorldContract<BRErc20Delegate>(world, [['BRTokenDelegate', brTokenDelegateArg, 'address']]);
  let data = getContractData(world, [['BRTokenDelegate', brTokenDelegateArg]]);

  return [contract, brTokenDelegateArg, <Map<string, string>>(<any>data)];
}

export async function getComptrollerImplData(
  world: World,
  comptrollerImplArg: string
): Promise<[ComptrollerImpl, string, Map<string, string>]> {
  let contract = await getComptrollerImpl(world, <Event>(<any>comptrollerImplArg));
  let data = getContractData(world, [['Comptroller', comptrollerImplArg]]);

  return [contract, comptrollerImplArg, <Map<string, string>>(<any>data)];
}

export async function getBAIControllerImplData(
  world: World,
  baicontrollerImplArg: string
): Promise<[BAIControllerImpl, string, Map<string, string>]> {
  let contract = await getComptrollerImpl(world, <Event>(<any>baicontrollerImplArg));
  let data = getContractData(world, [['BAIController', baicontrollerImplArg]]);

  return [contract, baicontrollerImplArg, <Map<string, string>>(<any>data)];
}

export function getAddress(world: World, addressArg: string): string {
  if (addressArg.toLowerCase() === 'zero') {
    return '0x0000000000000000000000000000000000000000';
  }

  if (addressArg.startsWith('0x')) {
    return addressArg;
  }

  let alias = Object.entries(world.settings.aliases).find(
    ([alias, addr]) => alias.toLowerCase() === addressArg.toLowerCase()
  );
  if (alias) {
    return alias[1];
  }

  let account = world.accounts.find(account => account.name.toLowerCase() === addressArg.toLowerCase());
  if (account) {
    return account.address;
  }

  return getContractDataString(world, [
    ['Contracts', addressArg],
    ['brTokens', addressArg, 'address'],
    ['BRTokenDelegate', addressArg, 'address'],
    ['Tokens', addressArg, 'address'],
    ['Comptroller', addressArg, 'address']
  ]);
}

export function getContractByName(world: World, name: string): Contract {
  return getWorldContract(world, [['Contracts', name]]);
}
