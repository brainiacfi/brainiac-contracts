import { Event } from '../Event';
import { World } from '../World';
import { BRN } from '../Contract/BRN';
import {
  getAddressV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getBRN } from '../ContractLookup';

export function brnFetchers() {
  return [
    new Fetcher<{ brn: BRN }, AddressV>(`
        #### Address

        * "<BRN> Address" - Returns the address of BRN token
          * E.g. "BRN Address"
      `,
      "Address",
      [
        new Arg("brn", getBRN, { implicit: true })
      ],
      async (world, { brn }) => new AddressV(brn._address)
    ),

    new Fetcher<{ brn: BRN }, StringV>(`
        #### Name

        * "<BRN> Name" - Returns the name of the BRN token
          * E.g. "BRN Name"
      `,
      "Name",
      [
        new Arg("brn", getBRN, { implicit: true })
      ],
      async (world, { brn }) => new StringV(await brn.methods.name().call())
    ),

    new Fetcher<{ brn: BRN }, StringV>(`
        #### Symbol

        * "<BRN> Symbol" - Returns the symbol of the BRN token
          * E.g. "BRN Symbol"
      `,
      "Symbol",
      [
        new Arg("brn", getBRN, { implicit: true })
      ],
      async (world, { brn }) => new StringV(await brn.methods.symbol().call())
    ),

    new Fetcher<{ brn: BRN }, NumberV>(`
        #### Decimals

        * "<BRN> Decimals" - Returns the number of decimals of the BRN token
          * E.g. "BRN Decimals"
      `,
      "Decimals",
      [
        new Arg("brn", getBRN, { implicit: true })
      ],
      async (world, { brn }) => new NumberV(await brn.methods.decimals().call())
    ),

    new Fetcher<{ brn: BRN }, NumberV>(`
        #### TotalSupply

        * "BRN TotalSupply" - Returns BRN token's total supply
      `,
      "TotalSupply",
      [
        new Arg("brn", getBRN, { implicit: true })
      ],
      async (world, { brn }) => new NumberV(await brn.methods.totalSupply().call())
    ),

    new Fetcher<{ brn: BRN, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "BRN TokenBalance <Address>" - Returns the BRN token balance of a given address
          * E.g. "BRN TokenBalance Geoff" - Returns Geoff's BRN balance
      `,
      "TokenBalance",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { brn, address }) => new NumberV(await brn.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ brn: BRN, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "BRN Allowance owner:<Address> spender:<Address>" - Returns the BRN allowance from owner to spender
          * E.g. "BRN Allowance Geoff Torrey" - Returns the BRN allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { brn, owner, spender }) => new NumberV(await brn.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ brn: BRN, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "BRN GetCurrentVotes account:<Address>" - Returns the current BRN votes balance for an account
          * E.g. "BRN GetCurrentVotes Geoff" - Returns the current BRN vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { brn, account }) => new NumberV(await brn.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ brn: BRN, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "BRN GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current BRN votes balance at given block
          * E.g. "BRN GetPriorVotes Geoff 5" - Returns the BRN vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { brn, account, blockNumber }) => new NumberV(await brn.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ brn: BRN, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "BRN GetCurrentVotesBlock account:<Address>" - Returns the current BRN votes checkpoint block for an account
          * E.g. "BRN GetCurrentVotesBlock Geoff" - Returns the current BRN votes checkpoint block for Geoff
      `,
      "GetCurrentVotesBlock",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { brn, account }) => {
        const numCheckpoints = Number(await brn.methods.numCheckpoints(account.val).call());
        const checkpoint = await brn.methods.checkpoints(account.val, numCheckpoints - 1).call();

        return new NumberV(checkpoint.fromBlock);
      }
    ),

    new Fetcher<{ brn: BRN, account: AddressV }, NumberV>(`
        #### VotesLength

        * "BRN VotesLength account:<Address>" - Returns the BRN vote checkpoint array length
          * E.g. "BRN VotesLength Geoff" - Returns the BRN vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { brn, account }) => new NumberV(await brn.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ brn: BRN, account: AddressV }, ListV>(`
        #### AllVotes

        * "BRN AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "BRN AllVotes Geoff" - Returns the BRN vote checkpoint array
      `,
      "AllVotes",
      [
        new Arg("brn", getBRN, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { brn, account }) => {
        const numCheckpoints = Number(await brn.methods.numCheckpoints(account.val).call());
        const checkpoints = await Promise.all(new Array(numCheckpoints).fill(undefined).map(async (_, i) => {
          const {fromBlock, votes} = await brn.methods.checkpoints(account.val, i).call();

          return new StringV(`Block ${fromBlock}: ${votes} vote${votes !== 1 ? "s" : ""}`);
        }));

        return new ListV(checkpoints);
      }
    )
  ];
}

export async function getBRNValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("BRN", brnFetchers(), world, event);
}
