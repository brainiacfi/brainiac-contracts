import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { BRNVault } from '../Contract/BRNVault';
import { buildBRNVaultImpl } from '../Builder/BRNVaultImplBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getBoolV
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  BoolV
} from '../Value';
import { Arg, Command, processCommandEvent } from '../Command';
import { getBRNVault } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';

async function genBRNVault(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, brnVaultImpl, brnVaultData } = await buildBRNVaultImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed immutable BRN Vault (${brnVaultImpl.name}) to address ${brnVaultImpl._address}`,
    brnVaultData.invokation
  );

  return world;
}

async function delegate(world: World, from: string, brnVault: BRNVault, account: string): Promise<World> {
  let invokation = await invoke(world, brnVault.methods.delegate(account), from, NoErrorReporter);

  world = addAction(
    world,
    `"Delegated from" ${from} to ${account}`,
    invokation
  );

  return world;
}

async function setBrnStore(
  world: World,
  from: string,
  brnVault: BRNVault,
  brn: string,
  brnStore: string
): Promise<World> {
  let invokation = await invoke(world, brnVault.methods.setBrnStore(brn, brnStore), from, NoErrorReporter);

  world = addAction(
    world,
    `Configured BRN=${brn}, BRNStore=${brnStore} in the BRNVault (${brnVault._address})`,
    invokation
  );

  return world;
}

async function addPool(
  world: World,
  from: string,
  brnVault: BRNVault,
  rewardToken: string,
  allocPoint: NumberV,
  token: string,
  rewardPerBlock: NumberV,
  lockPeriod: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    brnVault.methods.add(
      rewardToken, allocPoint.encode(), token,
      rewardPerBlock.encode(), lockPeriod.encode()
    ),
    from,
    NoErrorReporter
  );

  world = addAction(
    world,
    `Added new (${token}, ${rewardToken}) pool to BRNVault (${brnVault._address})`,
    invokation
  );

  return world;
}

async function deposit(
  world: World,
  from: string,
  brnVault: BRNVault,
  rewardToken: string,
  pid: NumberV,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    brnVault.methods.deposit(rewardToken, pid.toNumber(), amount.encode()),
    from,
    NoErrorReporter
  );

  world = addAction(
    world,
    `Deposited ${amount.toString()} tokens to pool (${rewardToken}, ${pid.toNumber()})
     in the BRNVault (${brnVault._address})`,
    invokation
  );

  return world;
}

async function requestWithdrawal(
  world: World,
  from: string,
  brnVault: BRNVault,
  rewardToken: string,
  pid: NumberV,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    brnVault.methods.requestWithdrawal(rewardToken, pid.toNumber(), amount.encode()),
    from,
    NoErrorReporter
  );

  world = addAction(
    world,
    `Requested withdrawal of ${amount.toString()} tokens from pool (${rewardToken}, ${pid.toNumber()})
     in the BRNVault (${brnVault._address})`,
    invokation
  );

  return world;
}

async function executeWithdrawal(
  world: World,
  from: string,
  brnVault: BRNVault,
  rewardToken: string,
  pid: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    brnVault.methods.executeWithdrawal(rewardToken, pid.toNumber()),
    from,
    NoErrorReporter
  );

  world = addAction(
    world,
    `Executed withdrawal of tokens from pool (${rewardToken}, ${pid.toNumber()})
     in the BRNVault (${brnVault._address})`,
    invokation
  );

  return world;
}

async function setWithdrawalLockingPeriod(
  world: World,
  from: string,
  brnVault: BRNVault,
  rewardToken: string,
  pid: NumberV,
  newPeriod: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    brnVault.methods.setWithdrawalLockingPeriod(rewardToken, pid.toNumber(), newPeriod.toNumber()),
    from,
    NoErrorReporter
  );

  world = addAction(
    world,
    `Set lock period to ${newPeriod.toString()} in the BRNVault (${brnVault._address})`,
    invokation
  );

  return world;
}

export function brnVaultCommands() {
  return [
    new Command<{ params: EventV }>(
      `
        #### Deploy

        * "Deploy ...params" - Generates a new BRN Vault (non-proxy version)
        * E.g. "BRNVault Deploy MyVaultImpl"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genBRNVault(world, from, params.val)
    ),

    new Command<{ brnVault: BRNVault, account: AddressV }>(
      `
        #### Delegate

        * "BRNVault Delegate account:<Address>" - Delegates votes to a given account
        * E.g. "BRNVault Delegate Torrey"
      `,
      "Delegate",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, from, { brnVault, account }) => delegate(world, from, brnVault, account.val)
    ),

    new Command<{ brnVault: BRNVault, brn: AddressV, brnStore: AddressV }>(
      `
        #### SetBrnStore

        * "BRNVault SetBrnStore brn:<Address> brnStore:<Address>" - Configures BRN and BRNStore addresses in the vault
        * E.g. "BRNVault SetBrnStore (Address BRN) (Address BRNStore)"
      `,
      "SetBrnStore",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("brn", getAddressV),
        new Arg("brnStore", getAddressV),
      ],
      (world, from, { brnVault, brn, brnStore }) =>
          setBrnStore(world, from, brnVault, brn.val, brnStore.val)
    ),

    new Command<{
      brnVault: BRNVault,
      rewardToken: AddressV,
      allocPoint: NumberV,
      token: AddressV,
      rewardPerBlock: NumberV,
      lockPeriod: NumberV
    }>(
      `
        #### Add

        * "BRNVault Add rewardToken:<Address> allocPoint:<Number> token:<Address> rewardPerBlock:<Number>"
            - Adds a new token pool
        * E.g. "BRNVault Add (Address BRN) 1000 (Address BRN) 12345"
      `,
      "Add",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("rewardToken", getAddressV),
        new Arg("allocPoint", getNumberV),
        new Arg("token", getAddressV),
        new Arg("rewardPerBlock", getNumberV),
        new Arg("lockPeriod", getNumberV)
      ],
      (world, from, { brnVault, rewardToken, allocPoint, token, rewardPerBlock, lockPeriod }) =>
          addPool(
            world, from, brnVault, rewardToken.val, allocPoint,
            token.val, rewardPerBlock, lockPeriod
          )
    ),

    new Command<{
      brnVault: BRNVault,
      rewardToken: AddressV,
      pid: NumberV,
      amount: NumberV
    }>(
      `
        #### Deposit

        * "BRNVault Deposit rewardToken:<Address> pid:<Number> amount:<Number>"
            - Deposits tokens to the pool identified by (rewardToken, pid) pair
        * E.g. "BRNVault Deposit (Address BRN) 42 12345"
      `,
      "Deposit",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("rewardToken", getAddressV),
        new Arg("pid", getNumberV),
        new Arg("amount", getNumberV),
      ],
      (world, from, { brnVault, rewardToken, pid, amount }) =>
          deposit(world, from, brnVault, rewardToken.val, pid, amount)
    ),

    new Command<{
      brnVault: BRNVault,
      rewardToken: AddressV,
      pid: NumberV,
      amount: NumberV
    }>(
      `
        #### RequestWithdrawal

        * "BRNVault RequestWithdrawal rewardToken:<Address> pid:<Number> amount:<Number>"
            - Submits a withdrawal request
        * E.g. "BRNVault RequestWithdrawal (Address BRN) 42 12345"
      `,
      "RequestWithdrawal",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("rewardToken", getAddressV),
        new Arg("pid", getNumberV),
        new Arg("amount", getNumberV),
      ],
      (world, from, { brnVault, rewardToken, pid, amount }) =>
          requestWithdrawal(world, from, brnVault, rewardToken.val, pid, amount)
    ),

    new Command<{
      brnVault: BRNVault,
      rewardToken: AddressV,
      pid: NumberV
    }>(
      `
        #### ExecuteWithdrawal

        * "BRNVault ExecuteWithdrawal rewardToken:<Address> pid:<Number>"
            - Executes all requests eligible for withdrawal in a certain pool
        * E.g. "BRNVault ExecuteWithdrawal (Address BRN) 42"
      `,
      "ExecuteWithdrawal",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("rewardToken", getAddressV),
        new Arg("pid", getNumberV),
      ],
      (world, from, { brnVault, rewardToken, pid }) =>
          executeWithdrawal(world, from, brnVault, rewardToken.val, pid)
    ),

    new Command<{
      brnVault: BRNVault,
      rewardToken: AddressV,
      pid: NumberV,
      newPeriod: NumberV
    }>(
      `
        #### SetWithdrawalLockingPeriod

        * "BRNVault SetWithdrawalLockingPeriod rewardToken:<Address> pid:<Number> newPeriod:<Number>"
            - Sets the locking period for withdrawals
        * E.g. "BRNVault SetWithdrawalLockingPeriod (Address BRN) 0 42"
      `,
      "SetWithdrawalLockingPeriod",
      [
        new Arg("brnVault", getBRNVault, { implicit: true }),
        new Arg("rewardToken", getAddressV),
        new Arg("pid", getNumberV),
        new Arg("newPeriod", getNumberV),
      ],
      (world, from, { brnVault, rewardToken, pid, newPeriod }) =>
        setWithdrawalLockingPeriod(world, from, brnVault, rewardToken.val, pid, newPeriod)
    ),
  ];
}

export async function processBRNVaultEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("BRNVault", brnVaultCommands(), world, event, from);
}
