import {Event} from '../Event';
import {addAction, World} from '../World';
import {BAIUnitroller} from '../Contract/BAIUnitroller';
import {Invokation} from '../Invokation';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {storeAndSaveContract} from '../Networks';
import {getContract} from '../Contract';

const BAIUnitrollerContract = getContract("BAIUnitroller");

export interface BAIUnitrollerData {
  invokation: Invokation<BAIUnitroller>,
  description: string,
  address?: string
}

export async function buildBAIUnitroller(world: World, from: string, event: Event): Promise<{world: World, baiunitroller: BAIUnitroller, baiunitrollerData: BAIUnitrollerData}> {
  const fetchers = [
    new Fetcher<{}, BAIUnitrollerData>(`
        #### BAIUnitroller

        * "" - The Upgradable Comptroller
          * E.g. "BAIUnitroller Deploy"
      `,
      "BAIUnitroller",
      [],
      async (world, {}) => {
        return {
          invokation: await BAIUnitrollerContract.deploy<BAIUnitroller>(world, from, []),
          description: "BAIUnitroller"
        };
      },
      {catchall: true}
    )
  ];

  let baiunitrollerData = await getFetcherValue<any, BAIUnitrollerData>("DeployBAIUnitroller", fetchers, world, event);
  let invokation = baiunitrollerData.invokation;
  delete baiunitrollerData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const baiunitroller = invokation.value!;
  baiunitrollerData.address = baiunitroller._address;

  world = await storeAndSaveContract(
    world,
    baiunitroller,
    'BAIUnitroller',
    invokation,
    [
      { index: ['BAIUnitroller'], data: baiunitrollerData }
    ]
  );

  return {world, baiunitroller, baiunitrollerData};
}
