import { Event } from "../Event";
import { World } from "../World";
import { Invokation } from "../Invokation";
import { Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract } from "../Contract";
import { BRNVaultProxy } from "../Contract/BRNVault";

const BRNVaultProxyContract = getContract("BRNVaultProxy");

export interface BRNVaultProxyData {
  invokation: Invokation<BRNVaultProxy>;
  name: string;
  contract: string;
  address?: string;
}

export async function buildBRNVaultProxy(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; brnVaultProxy: BRNVaultProxy; brnVaultData: BRNVaultProxyData }> {
  const fetchers = [
    new Fetcher<{}, BRNVaultProxyData>(
      `
      #### BRNVaultProxy
      * "BRNVaultProxy Deploy" - Deploys BRN Vault proxy contract
      * E.g. "BRNVaultProxy Deploy"
      `,
      "BRNVaultProxy",
      [],
      async (world, {}) => {
        return {
          invokation: await BRNVaultProxyContract.deploy<BRNVaultProxy>(world, from, []),
          name: "BRNVaultProxy",
          contract: "BRNVaultProxy"
        };
      },
      { catchall: true }
    )
  ];

  let brnVaultData = await getFetcherValue<any, BRNVaultProxyData>(
    "DeployBRNVaultProxy",
    fetchers,
    world,
    params
  );
  let invokation = brnVaultData.invokation!;
  delete brnVaultData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const brnVaultProxy = invokation.value!;
  brnVaultData.address = brnVaultProxy._address;

  world = await storeAndSaveContract(
    world,
    brnVaultProxy,
    brnVaultData.name,
    invokation,
    [
      { index: ["BRNVaultProxy", brnVaultData.name], data: brnVaultData },
    ]
  );

  return { world, brnVaultProxy, brnVaultData };
}
