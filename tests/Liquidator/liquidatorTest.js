const BigNumber = require('bignumber.js');
const {
  ckbGasCost,
  ckbUnsigned,
  ckbMantissa
} = require('../Utils/BSC');

const { dfn } = require('../Utils/JS');
const {
  makeBRToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow
} = require('../Utils/Brainiac');

const repayAmount = ckbUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.mul(4); // forced
const announcedIncentive = ckbMantissa('1.10');
const treasuryPercent = ckbMantissa('0.05');

async function preApprove(brToken, from, spender, amount, opts = {}) {

  if (dfn(opts.faucet, true)) {
    expect(await send(brToken.underlying, 'harnessSetBalance', [from, amount], { from })).toSucceed();
  }

  return send(brToken.underlying, 'approve', [spender, amount], { from });
}

async function preLiquidate(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral) {
  // setup for success in liquidating
  await send(brToken.comptroller, 'setLiquidateBorrowAllowed', [true]);
  await send(brToken.comptroller, 'setLiquidateBorrowVerify', [true]);
  await send(brToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(brToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(brToken.comptroller, 'setSeizeAllowed', [true]);
  await send(brToken.comptroller, 'setSeizeVerify', [true]);
  await send(brToken.comptroller, 'setFailCalculateSeizeTokens', [false]);
  await send(brToken.comptroller, 'setAnnouncedLiquidationIncentiveMantissa', [announcedIncentive]);

  if (brToken.underlying) {
    await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  }
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brTokenCollateral.comptroller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await setBalance(brTokenCollateral, liquidator, 0);
  await setBalance(brTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(brTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(brToken, borrower, 1, 1, repayAmount);
  if (brToken.underlying) {
    await preApprove(brToken, liquidator, liquidatorContract._address, repayAmount);
  }
}

async function liquidate(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(brToken, 1);
  await fastForward(brTokenCollateral, 1);
  return send(
    liquidatorContract,
    'liquidateBorrow',
    [brToken._address, borrower, repayAmount, brTokenCollateral._address],
    { from: liquidator }
  );
}

async function liquidatebrCkb(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(brToken, 1);
  await fastForward(brTokenCollateral, 1);
  return send(
    liquidatorContract,
    'liquidateBorrow',
    [brToken._address, borrower, repayAmount, brTokenCollateral._address],
    { from: liquidator, value: repayAmount }
  );
}

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
      'Liquidator', [
      root,
      brCkb._address,
      brToken.comptroller._address,
      brToken.comptroller.baicontroller._address,
      treasury,
      treasuryPercent
    ]
    );
  });

  describe('liquidateBorrow', () => {

    beforeEach(async () => {
      await preLiquidate(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral);
    });

    it('returns success from liquidateBorrow and transfers the correct amounts', async () => {
      await send(brToken.comptroller, '_setLiquidatorContract', [liquidatorContract._address]);
      const beforeBalances = await getBalances([brToken, brTokenCollateral], [treasury, liquidator, borrower]);
      const result = await liquidate(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral);
      const gasCost = await ckbGasCost(result);
      const afterBalances = await getBalances([brToken, brTokenCollateral], [treasury, liquidator, borrower]);

      const { treasuryDelta, liquidatorDelta } = calculateSplitSeizedTokens(seizeTokens);

      expect(result).toHaveLog('LiquidateBorrowedTokens', {
        liquidator,
        borrower,
        repayAmount: repayAmount.toString(),
        brTokenCollateral: brTokenCollateral._address,
        seizeTokensForTreasury: treasuryDelta.toString(),
        seizeTokensForLiquidator: liquidatorDelta.toString()
      });

      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brToken, 'cash', repayAmount],
        [brToken, 'borrows', -repayAmount],
        [brToken, liquidator, 'ckb', -gasCost],
        [brToken, liquidator, 'cash', -repayAmount],
        [brTokenCollateral, liquidator, 'ckb', -gasCost],
        [brTokenCollateral, liquidator, 'tokens', liquidatorDelta],
        [brTokenCollateral, treasury, 'tokens', treasuryDelta],
        [brToken, borrower, 'borrows', -repayAmount],
        [brTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });

  });

  describe('liquidate brCKB-Borrow', () => {

    beforeEach(async () => {
      await preLiquidate(liquidatorContract, brCkb, liquidator, borrower, repayAmount, brTokenCollateral);
      await send(brToken.comptroller, '_setLiquidatorContract', [liquidatorContract._address]);
    });

    it('liquidate-brCKB and returns success from liquidateBorrow and transfers the correct amounts', async () => {
      const beforeBalances = await getBalances([brCkb, brTokenCollateral], [treasury, liquidator, borrower]);
      const result = await liquidatebrCkb(liquidatorContract, brCkb, liquidator, borrower, repayAmount, brTokenCollateral);
      const gasCost = await ckbGasCost(result);
      const afterBalances = await getBalances([brCkb, brTokenCollateral], [treasury, liquidator, borrower]);

      const { treasuryDelta, liquidatorDelta } = calculateSplitSeizedTokens(seizeTokens);
      expect(result).toHaveLog('LiquidateBorrowedTokens', {
        liquidator,
        borrower,
        repayAmount: repayAmount.toString(),
        brTokenCollateral: brTokenCollateral._address,
        seizeTokensForTreasury: treasuryDelta.toString(),
        seizeTokensForLiquidator: liquidatorDelta.toString()
      });

      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brCkb, 'ckb', repayAmount],
        [brCkb, 'borrows', -repayAmount],
        [brCkb, liquidator, 'ckb', -(gasCost.add(repayAmount))],
        [brTokenCollateral, liquidator, 'ckb', -(gasCost.add(repayAmount))],
        [brTokenCollateral, liquidator, 'tokens', liquidatorDelta],
        [brTokenCollateral, treasury, 'tokens', treasuryDelta],
        [brCkb, borrower, 'borrows', -repayAmount],
        [brTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });

    it('liquidate-brCKB and repay-CKB should return success from liquidateBorrow and transfers the correct amounts', async () => {
      await setBalance(brCkb, borrower, seizeTokens.add(1000));
      const beforeBalances = await getBalances([brCkb, brCkb], [treasury, liquidator, borrower]);
      const result = await liquidatebrCkb(liquidatorContract, brCkb, liquidator, borrower, repayAmount, brCkb);
      const gasCost = await ckbGasCost(result);
      const afterBalances = await getBalances([brCkb], [treasury, liquidator, borrower]);

      const { treasuryDelta, liquidatorDelta } = calculateSplitSeizedTokens(seizeTokens);
      expect(result).toHaveLog('LiquidateBorrowedTokens', {
        liquidator,
        borrower,
        repayAmount: repayAmount.toString(),
        brTokenCollateral: brCkb._address,
        seizeTokensForTreasury: treasuryDelta.toString(),
        seizeTokensForLiquidator: liquidatorDelta.toString()
      });

      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brCkb, 'ckb', repayAmount],
        [brCkb, 'borrows', -repayAmount],
        [brCkb, liquidator, 'ckb', -(gasCost.add(repayAmount))],
        [brCkb, liquidator, 'tokens', liquidatorDelta],
        [brCkb, treasury, 'tokens', treasuryDelta],
        [brCkb, borrower, 'borrows', -repayAmount],
        [brCkb, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('setTreasuryPercent', () => {
    it('updates treasury percent in storage', async () => {
      const result =
        await liquidatorContract.methods.setTreasuryPercent(ckbMantissa('0.08')).send({ from: root });
      expect(result).toHaveLog('NewLiquidationTreasuryPercent', {
        oldPercent: treasuryPercent,
        newPercent: ckbMantissa('0.08')
      });
      const newPercent = await liquidatorContract.methods.treasuryPercentMantissa().call();
      expect(newPercent).toEqual(ckbMantissa('0.08').toString());
    });

    it('fails when called from non-admin', async () => {
      await expect(
        liquidatorContract.methods.setTreasuryPercent(ckbMantissa('0.08')).send({ from: borrower })
      ).rejects.toRevert("revert only admin allowed");
    });

    it('uses the new treasury percent during distributions', async () => {
      await send(brToken.comptroller, '_setLiquidatorContract', [liquidatorContract._address]);
      await preLiquidate(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral);
      await liquidatorContract.methods.setTreasuryPercent(ckbMantissa('0.08')).send({ from: root });
      const result = await liquidate(liquidatorContract, brToken, liquidator, borrower, repayAmount, brTokenCollateral);
      const treasuryDelta =
        seizeTokens
          .mul(ckbMantissa('1')).div(announcedIncentive)  // / 1.1
          .mul(ckbMantissa('0.08')).div(ckbMantissa('1')) // * 0.08
          .toFixed(0, BigNumber.ROUND_FLOOR);
      const liquidatorDelta = seizeTokens.sub(treasuryDelta);
      expect(result).toHaveLog('LiquidateBorrowedTokens', {
        liquidator,
        borrower,
        repayAmount: repayAmount.toString(),
        brTokenCollateral: brTokenCollateral._address,
        seizeTokensForTreasury: treasuryDelta.toString(),
        seizeTokensForLiquidator: liquidatorDelta.toString()
      });
    });
  });

  describe('_setPendingAdmin', () => {
    it('updates pending admin', async () => {
      const result =
        await liquidatorContract.methods._setPendingAdmin(borrower).send({ from: root });
      expect(await liquidatorContract.methods.pendingAdmin().call()).toEqual(borrower);
      expect(result).toHaveLog('NewPendingAdmin', {
        oldPendingAdmin: '0x0000000000000000000000000000000000000000',
        newPendingAdmin: borrower
      });
    });

    it('fails when called from non-admin', async () => {
      await expect(
        liquidatorContract.methods._setPendingAdmin(borrower).send({ from: borrower })
      ).rejects.toRevert("revert only admin allowed");
    });
  })
});