import { Event } from '../Event';
import { World } from '../World';
import { BAI } from '../Contract/BAI';
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
import { getBAI } from '../ContractLookup';

export function baiFetchers() {
  return [
    new Fetcher<{ bai: BAI }, AddressV>(`
        #### Address

        * "<BAI> Address" - Returns the address of BAI token
          * E.g. "BAI Address"
      `,
      "Address",
      [
        new Arg("bai", getBAI, { implicit: true })
      ],
      async (world, { bai }) => new AddressV(bai._address)
    ),

    new Fetcher<{ bai: BAI }, StringV>(`
        #### Name

        * "<BAI> Name" - Returns the name of the BAI token
          * E.g. "BAI Name"
      `,
      "Name",
      [
        new Arg("bai", getBAI, { implicit: true })
      ],
      async (world, { bai }) => new StringV(await bai.methods.name().call())
    ),

    new Fetcher<{ bai: BAI }, StringV>(`
        #### Symbol

        * "<BAI> Symbol" - Returns the symbol of the BAI token
          * E.g. "BAI Symbol"
      `,
      "Symbol",
      [
        new Arg("bai", getBAI, { implicit: true })
      ],
      async (world, { bai }) => new StringV(await bai.methods.symbol().call())
    ),

    new Fetcher<{ bai: BAI }, NumberV>(`
        #### Decimals

        * "<BAI> Decimals" - Returns the number of decimals of the BAI token
          * E.g. "BAI Decimals"
      `,
      "Decimals",
      [
        new Arg("bai", getBAI, { implicit: true })
      ],
      async (world, { bai }) => new NumberV(await bai.methods.decimals().call())
    ),

    new Fetcher<{ bai: BAI }, NumberV>(`
        #### TotalSupply

        * "BAI TotalSupply" - Returns BAI token's total supply
      `,
      "TotalSupply",
      [
        new Arg("bai", getBAI, { implicit: true })
      ],
      async (world, { bai }) => new NumberV(await bai.methods.totalSupply().call())
    ),

    new Fetcher<{ bai: BAI, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "BAI TokenBalance <Address>" - Returns the BAI token balance of a given address
          * E.g. "BAI TokenBalance Geoff" - Returns Geoff's BAI balance
      `,
      "TokenBalance",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { bai, address }) => new NumberV(await bai.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ bai: BAI, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "BAI Allowance owner:<Address> spender:<Address>" - Returns the BAI allowance from owner to spender
          * E.g. "BAI Allowance Geoff Torrey" - Returns the BAI allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("bai", getBAI, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { bai, owner, spender }) => new NumberV(await bai.methods.allowance(owner.val, spender.val).call())
    )
  ];
}

export async function getBAIValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("BAI", baiFetchers(), world, event);
}
