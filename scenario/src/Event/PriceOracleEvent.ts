import {Event} from '../Event';
import {addAction, World} from '../World';
import {PriceOracle} from '../Contract/PriceOracle';
import {buildPriceOracle, setPriceOracle} from '../Builder/PriceOracleBuilder';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getStringV
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, processCommandEvent, View} from '../Command';
import {getPriceOracle} from '../ContractLookup';
import {verify} from '../Verify';
import {encodedNumber} from '../Encoding';

async function genPriceOracle(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, priceOracle, priceOracleData} = await buildPriceOracle(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed PriceOracle (${priceOracleData.description}) to address ${priceOracle._address}`,
    priceOracleData.invokation!
  );

  return world;
}

async function setPriceOracleFn(world: World, params: Event): Promise<World> {
  let {world: nextWorld, priceOracle, priceOracleData} = await setPriceOracle(world, params);

  return nextWorld;
}

async function setPrice(world: World, from: string, priceOracle: PriceOracle, brToken: string, amount: NumberV): Promise<World> {
  return addAction(
    world,
    `Set price oracle price for ${brToken} to ${amount.show()}`,
    await invoke(world, priceOracle.methods.setUnderlyingPrice(brToken, amount.encode()), from)
  );
}

async function setDirectPrice(world: World, from: string, priceOracle: PriceOracle, address: string, amount: NumberV): Promise<World> {
  return addAction(
    world,
    `Set price oracle price for ${address} to ${amount.show()}`,
    await invoke(world, priceOracle.methods.setDirectPrice(address, amount.encode()), from)
  );
}

async function verifyPriceOracle(world: World, priceOracle: PriceOracle, apiKey: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, "PriceOracle", contractName, priceOracle._address);
  }

  return world;
}

export function priceOracleCommands() {
  return [
    new Command<{params: EventV}>(`
        #### Deploy

        * "Deploy ...params" - Generates a new price oracle
          * E.g. "PriceOracle Deploy Fixed 1.0"
          * E.g. "PriceOracle Deploy Simple"
          * E.g. "PriceOracle Deploy NotPriceOracle"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, {variadic: true})
      ],
      (world, from, {params}) => genPriceOracle(world, from, params.val)
    ),
    new Command<{params: EventV}>(`
        #### Set

        * "Set ...params" - Sets the price oracle to given deployed contract
          * E.g. "PriceOracle Set Standard \"0x...\" \"My Already Deployed Oracle\""
      `,
      "Set",
      [
        new Arg("params", getEventV, {variadic: true})
      ],
      (world, from, {params}) => setPriceOracleFn(world, params.val)
    ),

    new Command<{priceOracle: PriceOracle, brToken: AddressV, amount: NumberV}>(`
        #### SetPrice

        * "SetPrice <BRToken> <Amount>" - Sets the per-ckb price for the given brToken
          * E.g. "PriceOracle SetPrice vZRX 1.0"
      `,
      "SetPrice",
      [
        new Arg("priceOracle", getPriceOracle, {implicit: true}),
        new Arg("brToken", getAddressV),
        new Arg("amount", getExpNumberV)
      ],
      (world, from, {priceOracle, brToken, amount}) => setPrice(world, from, priceOracle, brToken.val, amount)
    ),

    new Command<{priceOracle: PriceOracle, address: AddressV, amount: NumberV}>(`
        #### SetDirectPrice

        * "SetDirectPrice <Address> <Amount>" - Sets the per-ckb price for the given brToken
          * E.g. "PriceOracle SetDirectPrice (Address Zero) 1.0"
      `,
      "SetDirectPrice",
      [
        new Arg("priceOracle", getPriceOracle, {implicit: true}),
        new Arg("address", getAddressV),
        new Arg("amount", getExpNumberV)
      ],
      (world, from, {priceOracle, address, amount}) => setDirectPrice(world, from, priceOracle, address.val, amount)
    ),

    new View<{priceOracle: PriceOracle, apiKey: StringV, contractName: StringV}>(`
        #### Verify

        * "Verify apiKey:<String> contractName:<String>=PriceOracle" - Verifies PriceOracle in BscScan
          * E.g. "PriceOracle Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("priceOracle", getPriceOracle, {implicit: true}),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, {default: new StringV("PriceOracle")})
      ],
      (world, {priceOracle, apiKey, contractName}) => verifyPriceOracle(world, priceOracle, apiKey.val, contractName.val)
    )
  ];
}

export async function processPriceOracleEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("PriceOracle", priceOracleCommands(), world, event, from);
}
