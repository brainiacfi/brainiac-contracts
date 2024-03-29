import { Event } from "../Event";
import { World } from "../World";
import { GovernorBravo } from "../Contract/GovernorBravo";
import { Invokation } from "../Invokation";
import { getAddressV, getNumberV, getStringV } from "../CoreValue";
import { AddressV, NumberV, StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract } from "../Contract";

const GovernorBravoDelegate = getContract("GovernorBravoDelegate");
const GovernorBravoDelegateHarness = getContract("GovernorBravoDelegateHarness");
const GovernorBravoDelegator = getContract("GovernorBravoDelegator");
const GovernorBravoImmutable = getContract("GovernorBravoImmutable");

export interface GovernorBravoData {
  invokation: Invokation<GovernorBravo>;
  name: string;
  contract: string;
  address?: string;
}

export async function buildGovernor(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; governor: GovernorBravo; govData: GovernorBravoData }> {
  const fetchers = [
    new Fetcher<
      {
        name: StringV,
        timelock: AddressV,
        brnVault: AddressV,
        admin: AddressV,
        implementation: AddressV,
        votingPeriod: NumberV,
        votingDelay: NumberV,
        proposalThreshold: NumberV,
        guardian: AddressV
      },
      GovernorBravoData
    >(
      `
      #### GovernorBravoDelegator
      * "GovernorBravo Deploy BravoDelegator name:<String> timelock:<Address> brnVault:<Address> admin:<Address> implementation:<Address> votingPeriod:<Number> votingDelay:<Number> guardian:<Address>" - Deploys Brainiac Governor Bravo with a given parameters
        * E.g. "GovernorBravo Deploy BravoDelegator GovernorBravo (Address Timelock) (Address BRNVault) Admin (Address impl) 86400 1 Guardian"
    `,
      "BravoDelegator",
      [
        new Arg("name", getStringV),
        new Arg("timelock", getAddressV),
        new Arg("brnVault", getAddressV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("votingPeriod", getNumberV),
        new Arg("votingDelay", getNumberV),
        new Arg("proposalThreshold", getNumberV),
        new Arg("guardian", getAddressV)
      ],
      async (world, {name, timelock, brnVault, admin, implementation, votingPeriod, votingDelay, proposalThreshold, guardian }) => {
        return {
          invokation: await GovernorBravoDelegator.deploy<GovernorBravo>(
            world,
            from,
            [
              timelock.val, brnVault.val, admin.val, implementation.val, votingPeriod.encode(),
              votingDelay.encode(), proposalThreshold.encode(), guardian.val
            ]
          ),
          name: name.val,
          contract: "GovernorBravoDelegator"
        };
      }
    ),
    new Fetcher<
      {
        name: StringV,
        timelock: AddressV,
        brnVault: AddressV,
        admin: AddressV,
        votingPeriod: NumberV,
        votingDelay: NumberV,
        proposalThreshold: NumberV,
        guardian: AddressV
      },
      GovernorBravoData
    >(
      `
      #### GovernorBravoImmutable
      * "GovernorBravoImmut Deploy BravoImmutable name:<String> timelock:<Address> brnVault:<Address> admin:<Address> votingPeriod:<Number> votingDelay:<Number> guardian:<Address>" - Deploys Brainiac Governor Bravo Immutable with a given parameters
        * E.g. "GovernorBravo Deploy BravoImmutable GovernorBravo (Address Timelock) (Address BRNVault) Admin 86400 1 Guardian"
    `,
      "BravoImmutable",
      [
        new Arg("name", getStringV),
        new Arg("timelock", getAddressV),
        new Arg("brnVault", getAddressV),
        new Arg("admin", getAddressV),
        new Arg("votingPeriod", getNumberV),
        new Arg("votingDelay", getNumberV),
        new Arg("proposalThreshold", getNumberV),
        new Arg("guardian", getAddressV)
      ],
      async (world, { name, timelock, brnVault, admin, votingPeriod, votingDelay, proposalThreshold, guardian }) => {
        return {
          invokation: await GovernorBravoImmutable.deploy<GovernorBravo>(
            world,
            from,
            [
              timelock.val, brnVault.val, admin.val, votingPeriod.encode(),
              votingDelay.encode(), proposalThreshold.encode(), guardian.val
            ]
          ),
          name: name.val,
          contract: "GovernorBravoImmutable"
        };
      }
    ),
    new Fetcher<
      { name: StringV },
      GovernorBravoData
    >(
      `
      #### GovernorBravoDelegate
      * "Governor Deploy BravoDelegate name:<String>" - Deploys Brainiac Governor Bravo Delegate
        * E.g. "Governor Deploy BravoDelegate GovernorBravoDelegate"
    `,
      "BravoDelegate",
      [
        new Arg("name", getStringV)
      ],
      async (world, { name }) => {
        return {
          invokation: await GovernorBravoDelegate.deploy<GovernorBravo>(
            world,
            from,
            []
          ),
          name: name.val,
          contract: "GovernorBravoDelegate"
        };
      }
    ),
    new Fetcher<
      { name: StringV },
      GovernorBravoData
    >(
      `
      #### GovernorBravoDelegateHarness
      * "Governor Deploy BravoDelegateHarness name:<String>" - Deploys Brainiac Governor Bravo Delegate Harness
        * E.g. "Governor Deploy BravoDelegateHarness GovernorBravoDelegateHarness"
    `,
      "BravoDelegateHarness",
      [
        new Arg("name", getStringV)
      ],
      async (world, { name }) => {
        return {
          invokation: await GovernorBravoDelegateHarness.deploy<GovernorBravo>(
            world,
            from,
            []
          ),
          name: name.val,
          contract: "GovernorBravoDelegateHarness"
        };
      }
    )
  ];

  let govData = await getFetcherValue<any, GovernorBravoData>(
    "DeployGovernor",
    fetchers,
    world,
    params
  );
  let invokation = govData.invokation;
  delete govData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const governor = invokation.value!;
  govData.address = governor._address;

  world = await storeAndSaveContract(
    world,
    governor,
    govData.name,
    invokation,
    [
      { index: ["Governor", govData.name], data: govData },
    ]
  );

  return { world, governor, govData };
}
