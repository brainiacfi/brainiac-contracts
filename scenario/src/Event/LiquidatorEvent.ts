import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {Liquidator} from '../Contract/Liquidator';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getStringV,
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
} from '../Value';
import {Arg, Command, processCommandEvent} from '../Command';
import {buildLiquidator} from '../Builder/LiquidatorBuilder';
import {getLiquidator} from '../ContractLookup';
import {encodedNumber} from '../Encoding';

function showTrxValue(world: World): string {
  return new NumberV(world.trxInvokationOpts.get('value')).show();
}

async function genLiquidator(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, liquidator, liquidatorData} = await buildLiquidator(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Maximillion (${liquidatorData.description}) at address ${liquidator._address}`,
    liquidatorData.invokation
  );

  return world;
}

async function liquidateBorrow(
    world: World,
    from: string,
    liquidator: Liquidator,
    brToken: string,
    borrower: string,
    repayAmount: encodedNumber,
    brTokenCollateral: string
): Promise<World> {
  let invokation = await invoke(world, liquidator.methods.liquidateBorrow(brToken, borrower, repayAmount, brTokenCollateral), from);

  world = addAction(
    world,
    `Liquidator: liquidate borrow (brToken=${brToken}, borrower=${borrower}, repayAmount=${repayAmount}, brTokenCollateral=${brTokenCollateral}`,
    invokation
  );

  return world;
}

export function liquidatorCommands() {
  return [
    new Command<{liquidatorParams: EventV}>(`
        #### Deploy

        * "Liquidator Deploy ...liquidatorParams" - Generates a new Liquidator
      `,
      "Deploy",
      [new Arg("liquidatorParams", getEventV, {variadic: true})],
      (world, from, {liquidatorParams}) => genLiquidator(world, from, liquidatorParams.val)
    ),
    new Command<{
        liquidator: Liquidator,
        brToken: AddressV,
        borrower: AddressV,
        repayAmount: NumberV,
        brTokenCollateral: AddressV
    }>(`
        #### LiquidateBorrow

        * "LiquidateBorrow behalf:<User>" - Repays up to given value of given user's borrow
          * E.g. "From Jeoff (Liquidator LiquidateBorrow (Address vBAT) Torrey 1e18 (Address vBAT))"
      `,
      "LiquidateBorrow",
      [
        new Arg("liquidator", getLiquidator, {implicit: true}),
        new Arg("brToken", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("repayAmount", getNumberV),
        new Arg("brTokenCollateral", getAddressV)
      ],
      (world, from, {liquidator, brToken, borrower, repayAmount, brTokenCollateral}) =>
          liquidateBorrow(world, from, liquidator, brToken.val, borrower.val, repayAmount.encode(), brTokenCollateral.val)
    )
  ];
}

export async function processLiquidatorEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Liquidator", liquidatorCommands(), world, event, from);
}
