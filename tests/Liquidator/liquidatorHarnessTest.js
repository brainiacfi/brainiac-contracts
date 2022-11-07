const BigNumber = require('bignumber.js');
const {
  ckbUnsigned,
  ckbMantissa,
} = require('../Utils/BSC');
const {
  makeBRToken,
  setBalance,
} = require('../Utils/Brainiac');

const repayAmount = ckbUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.mul(4); // forced
const announcedIncentive = ckbMantissa('1.10');
const treasuryPercent = ckbMantissa('0.05');

// There are fractional divisions in corresponding calculation in Liquidator.sol, which is 
// equivalate to `toFixed(0, ROUND_FLOOR)` when the results are positive, so we must reproduce this effect
function calculateSplitSeizedTokens(amount) {
  const seizedForRepayment = ckbUnsigned(amount.mul(ckbMantissa('1')).div(announcedIncentive).toFixed(0, BigNumber.ROUND_FLOOR));
  const treasuryDelta = ckbUnsigned(seizedForRepayment.mul(treasuryPercent).div(ckbMantissa('1')).toFixed(0, BigNumber.ROUND_FLOOR));
  const liquidatorDelta = amount.sub(treasuryDelta);
  return { treasuryDelta, liquidatorDelta };
}

describe('Liquidator', function () {
  let root, liquidator, borrower, treasury, accounts;
  let brToken, brTokenCollateral, liquidatorContract, brCkb;

  beforeEach(async () => {
    [root, liquidator, borrower, treasury, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({ comptrollerOpts: { kind: 'bool' } });
    brTokenCollateral = await makeBRToken({ comptroller: brToken.comptroller });
    brCkb = await makeBRToken({ kind: 'brckb', comptroller: brToken.comptroller });
    liquidatorContract = await deploy(
      'LiquidatorHarness', [
      root,
      brCkb._address,
      brToken.comptroller._address,
      brToken.comptroller.baicontroller._address,
      treasury,
      treasuryPercent
    ]
    );
  });

  describe('splitLiquidationIncentive', () => {

    it('split liquidationIncentive between Treasury and Liquidator with correct amounts', async () => {
      const splitResponse = await call(liquidatorContract, 'splitLiquidationIncentive', [seizeTokens]);
      const expectedData = calculateSplitSeizedTokens(seizeTokens);
      expect(splitResponse["ours"]).toEqual(expectedData.treasuryDelta.toString());
      expect(splitResponse["theirs"]).toEqual(expectedData.liquidatorDelta.toString());
    });
  });

  describe('distributeLiquidationIncentive', () => {
    
    it('distribute the liquidationIncentive between Treasury and Liquidator with correct amounts', async () => {
      await setBalance(brTokenCollateral, liquidatorContract._address, seizeTokens.add(4e5));
      const distributeLiquidationIncentiveResponse = 
      await send(liquidatorContract, 'distributeLiquidationIncentive', [brTokenCollateral._address, seizeTokens]);
      const expectedData = calculateSplitSeizedTokens(seizeTokens);
      expect(distributeLiquidationIncentiveResponse).toHaveLog('DistributeLiquidationIncentive', {
        seizeTokensForTreasury: expectedData.treasuryDelta.toString(),
        seizeTokensForLiquidator: expectedData.liquidatorDelta.toString()
      });
    });

  });

  describe('Fails to distribute LiquidationIncentive', () => {
    
    it('Insufficient Collateral in LiquidatorContract - Error for transfer to Liquidator', async () => {

      await expect(send(liquidatorContract, 'distributeLiquidationIncentive', [brTokenCollateral._address, seizeTokens]))
      .rejects.toRevert("revert failed to transfer to liquidator");

    });

    it('Insufficient Collateral in LiquidatorContract - Error for transfer to Treasury', async () => {
      const expectedData = calculateSplitSeizedTokens(seizeTokens);
      await setBalance(brTokenCollateral, liquidatorContract._address, expectedData.liquidatorDelta);
      await expect(send(liquidatorContract, 'distributeLiquidationIncentive', [brTokenCollateral._address, seizeTokens]))
      .rejects.toRevert("revert failed to transfer to treasury");

    });

  });

});