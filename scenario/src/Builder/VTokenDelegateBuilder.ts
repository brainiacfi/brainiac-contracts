import { Event } from '../Event';
import { World } from '../World';
import { BRErc20Delegate, BRErc20DelegateScenario } from '../Contract/BRErc20Delegate';
import { BRToken } from '../Contract/BRToken';
import { Invokation } from '../Invokation';
import { getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const VDaiDelegateContract = getContract('VDaiDelegate');
const VDaiDelegateScenarioContract = getTestContract('VDaiDelegateScenario');
const BRErc20DelegateContract = getContract('BRErc20Delegate');
const BRErc20DelegateScenarioContract = getTestContract('BRErc20DelegateScenario');


export interface BRTokenDelegateData {
  invokation: Invokation<BRErc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildBRTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; brTokenDelegate: BRErc20Delegate; delegateData: BRTokenDelegateData }> {
  const fetchers = [
    new Fetcher<{ name: StringV; }, BRTokenDelegateData>(
      `
        #### VDaiDelegate

        * "VDaiDelegate name:<String>"
          * E.g. "BRTokenDelegate Deploy VDaiDelegate vDAIDelegate"
      `,
      'VDaiDelegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await VDaiDelegateContract.deploy<BRErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'VDaiDelegate',
          description: 'Standard VDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BRTokenDelegateData>(
      `
        #### VDaiDelegateScenario

        * "VDaiDelegateScenario name:<String>" - A VDaiDelegate Scenario for local testing
          * E.g. "BRTokenDelegate Deploy VDaiDelegateScenario vDAIDelegate"
      `,
      'VDaiDelegateScenario',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await VDaiDelegateScenarioContract.deploy<BRErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'VDaiDelegateScenario',
          description: 'Scenario VDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BRTokenDelegateData>(
      `
        #### BRErc20Delegate

        * "BRErc20Delegate name:<String>"
          * E.g. "BRTokenDelegate Deploy BRErc20Delegate vDAIDelegate"
      `,
      'BRErc20Delegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BRErc20DelegateContract.deploy<BRErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'BRErc20Delegate',
          description: 'Standard BRErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BRTokenDelegateData>(
      `
        #### BRErc20DelegateScenario

        * "BRErc20DelegateScenario name:<String>" - A BRErc20Delegate Scenario for local testing
          * E.g. "BRTokenDelegate Deploy BRErc20DelegateScenario vDAIDelegate"
      `,
      'BRErc20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BRErc20DelegateScenarioContract.deploy<BRErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'BRErc20DelegateScenario',
          description: 'Scenario BRErc20 Delegate'
        };
      }
    )
  ];

  let delegateData = await getFetcherValue<any, BRTokenDelegateData>("DeployBRToken", fetchers, world, params);
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const brTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    brTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ['BRTokenDelegate', delegateData.name],
        data: {
          address: brTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description
        }
      }
    ]
  );

  return { world, brTokenDelegate, delegateData };
}
