import { Event } from '../Event';
import { addAction, World } from '../World';
import { BAIControllerImpl } from '../Contract/BAIControllerImpl';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const BAIControllerScenarioContract = getTestContract('BAIControllerScenario');
const BAIControllerContract = getContract('BAIController');

const BAIControllerBorkedContract = getTestContract('BAIControllerBorked');

export interface BAIControllerImplData {
  invokation: Invokation<BAIControllerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildBAIControllerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; baicontrollerImpl: BAIControllerImpl; baicontrollerImplData: BAIControllerImplData }> {
  const fetchers = [

    new Fetcher<{ name: StringV }, BAIControllerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The BAIController Scenario for local testing
          * E.g. "BAIControllerImpl Deploy Scenario MyScen"
      `,
      'Scenario',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await BAIControllerScenarioContract.deploy<BAIControllerImpl>(world, from, []),
        name: name.val,
        contract: 'BAIControllerScenario',
        description: 'Scenario BAIController Impl'
      })
    ),

    new Fetcher<{ name: StringV }, BAIControllerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard BAIController contract
          * E.g. "BAIControllerImpl Deploy Standard MyStandard"
      `,
      'Standard',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await BAIControllerContract.deploy<BAIControllerImpl>(world, from, []),
          name: name.val,
          contract: 'BAIController',
          description: 'Standard BAIController Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, BAIControllerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked BAIController for testing
          * E.g. "BAIControllerImpl Deploy Borked MyBork"
      `,
      'Borked',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await BAIControllerBorkedContract.deploy<BAIControllerImpl>(world, from, []),
        name: name.val,
        contract: 'BAIControllerBorked',
        description: 'Borked BAIController Impl'
      })
    ),
    new Fetcher<{ name: StringV }, BAIControllerImplData>(
      `
        #### Default

        * "name:<String>" - The standard BAIController contract
          * E.g. "BAIControllerImpl Deploy MyDefault"
      `,
      'Default',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await BAIControllerScenarioContract.deploy<BAIControllerImpl>(world, from, []),
            name: name.val,
            contract: 'BAIControllerScenario',
            description: 'Scenario BAIController Impl'
          };
        } else {
          return {
            invokation: await BAIControllerContract.deploy<BAIControllerImpl>(world, from, []),
            name: name.val,
            contract: 'BAIController',
            description: 'Standard BAIController Impl'
          };
        }
      },
      { catchall: true }
    )
  ];

  let baicontrollerImplData = await getFetcherValue<any, BAIControllerImplData>(
    'DeployBAIControllerImpl',
    fetchers,
    world,
    event
  );
  let invokation = baicontrollerImplData.invokation;
  delete baicontrollerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const baicontrollerImpl = invokation.value!;

  world = await storeAndSaveContract(world, baicontrollerImpl, baicontrollerImplData.name, invokation, [
    {
      index: ['BAIController', baicontrollerImplData.name],
      data: {
        address: baicontrollerImpl._address,
        contract: baicontrollerImplData.contract,
        description: baicontrollerImplData.description
      }
    }
  ]);

  return { world, baicontrollerImpl, baicontrollerImplData };
}
