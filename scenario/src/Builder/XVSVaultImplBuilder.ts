import { Event } from "../Event";
import { World } from "../World";
import { Invokation } from "../Invokation";
import { getStringV } from "../CoreValue";
import { StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract } from "../Contract";
import { BRNVaultImpl } from "../Contract/BRNVault";

const BRNVaultImplementation = getContract("BRNVault");

export interface BRNVaultImplData {
  invokation: Invokation<BRNVaultImpl>;
  name: string;
  contract: string;
  address?: string;
}

export async function buildBRNVaultImpl(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; brnVaultImpl: BRNVaultImpl; brnVaultData: BRNVaultImplData }> {
  const fetchers = [
    new Fetcher<{ name: StringV }, BRNVaultImplData>(
      `
      #### BRNVaultImpl
      * "BRNVaultImpl Deploy name:<String>" - Deploys BRN Vault implementation contract
      * E.g. "BRNVaultImpl Deploy MyVaultImpl"
      `,
      "BRNVaultImpl",
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await BRNVaultImplementation.deploy<BRNVaultImpl>(world, from, []),
          name: name.val,
          contract: "BRNVault"
        };
      },
      { catchall: true }
    )
  ];

  let brnVaultData = await getFetcherValue<any, BRNVaultImplData>(
    "DeployBRNVaultImpl",
    fetchers,
    world,
    params
  );
  let invokation = brnVaultData.invokation!;
  delete brnVaultData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const brnVaultImpl = invokation.value!;
  brnVaultData.address = brnVaultImpl._address;

  world = await storeAndSaveContract(
    world,
    brnVaultImpl,
    brnVaultData.name,
    invokation,
    [
      { index: ["BRNVault", brnVaultData.name], data: brnVaultData },
    ]
  );

  return { world, brnVaultImpl, brnVaultData };
}
