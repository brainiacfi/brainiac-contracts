import { Event } from '../Event';
import { World, addAction } from '../World';
import { BRN, BRNScenario } from '../Contract/BRN';
import { Invokation } from '../Invokation';
import { getAddressV } from '../CoreValue';
import { StringV, AddressV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract } from '../Contract';

const BRNContract = getContract('BRN');
const BRNScenarioContract = getContract('BRNScenario');

export interface TokenData {
  invokation: Invokation<BRN>;
  contract: string;
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export async function buildBRN(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; brn: BRN; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Scenario

      * "BRN Deploy Scenario account:<Address>" - Deploys Scenario BRN Token
        * E.g. "BRN Deploy Scenario Geoff"
    `,
      'Scenario',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        return {
          invokation: await BRNScenarioContract.deploy<BRNScenario>(world, from, [account.val]),
          contract: 'BRNScenario',
          symbol: 'BRN',
          name: 'Brainiac Governance Token',
          decimals: 18
        };
      }
    ),

    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### BRN

      * "BRN Deploy account:<Address>" - Deploys BRN Token
        * E.g. "BRN Deploy Geoff"
    `,
      'BRN',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        if (world.isLocalNetwork()) {
          return {
            invokation: await BRNScenarioContract.deploy<BRNScenario>(world, from, [account.val]),
            contract: 'BRNScenario',
            symbol: 'BRN',
            name: 'Brainiac Governance Token',
            decimals: 18
          };
        } else {
          return {
            invokation: await BRNContract.deploy<BRN>(world, from, [account.val]),
            contract: 'BRN',
            symbol: 'BRN',
            name: 'Brainiac Governance Token',
            decimals: 18
          };
        }
      },
      { catchall: true }
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployBRN", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const brn = invokation.value!;
  tokenData.address = brn._address;

  world = await storeAndSaveContract(
    world,
    brn,
    'BRN',
    invokation,
    [
      { index: ['BRN'], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  tokenData.invokation = invokation;

  return { world, brn, tokenData };
}
