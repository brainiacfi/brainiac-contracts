const {
  ckbGasCost,
  ckbUnsigned
} = require('../Utils/BSC');

const {
  makeBRToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove
} = require('../Utils/Brainiac');

const repayAmount = ckbUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.mul(4); // forced

async function preLiquidate(brToken, liquidator, borrower, repayAmount, brTokenCollateral) {
  // setup for success in liquidating
  await send(brToken.comptroller, 'setLiquidateBorrowAllowed', [true]);
  await send(brToken.comptroller, 'setLiquidateBorrowVerify', [true]);
  await send(brToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(brToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(brToken.comptroller, 'setSeizeAllowed', [true]);
  await send(brToken.comptroller, 'setSeizeVerify', [true]);
  await send(brToken.comptroller, 'setFailCalculateSeizeTokens', [false]);
  await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brTokenCollateral.comptroller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await setBalance(brTokenCollateral, liquidator, 0);
  await setBalance(brTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(brTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(brToken, borrower, 1, 1, repayAmount);
  await preApprove(brToken, liquidator, repayAmount);
}

async function liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral) {
  return send(brToken, 'harnessLiquidateBorrowFresh', [liquidator, borrower, repayAmount, brTokenCollateral._address]);
}

async function liquidate(brToken, liquidator, borrower, repayAmount, brTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(brToken, 1);
  await fastForward(brTokenCollateral, 1);
  return send(brToken, 'liquidateBorrow', [borrower, repayAmount, brTokenCollateral._address], {from: liquidator});
}

async function seize(brToken, liquidator, borrower, seizeAmount) {
  return send(brToken, 'seize', [liquidator, borrower, seizeAmount]);
}

describe('BRToken', function () {
  let root, liquidator, borrower, accounts;
  let brToken, brTokenCollateral;

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({comptrollerOpts: {kind: 'bool'}});
    brTokenCollateral = await makeBRToken({comptroller: brToken.comptroller});
  });

  beforeEach(async () => {
    await preLiquidate(brToken, liquidator, borrower, repayAmount, brTokenCollateral);
  });

  describe('liquidateBorrowFresh', () => {
    it("fails if comptroller tells it to", async () => {
      await send(brToken.comptroller, 'setLiquidateBorrowAllowed', [false]);
      expect(
        await liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if comptroller tells it to", async () => {
      expect(
        await liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(brToken);
      expect(
        await liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_FRESHNESS_CHECK');
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(brToken);
      await fastForward(brTokenCollateral);
      await send(brToken, 'accrueInterest');
      expect(
        await liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK');
    });

    it("fails if borrower is equal to liquidator", async () => {
      expect(
        await liquidateFresh(brToken, borrower, borrower, repayAmount, brTokenCollateral)
      ).toHaveTokenFailure('INVALID_ACCOUNT_PAIR', 'LIQUIDATE_LIQUIDATOR_IS_BORROWER');
    });

    it("fails if repayAmount = 0", async () => {
      expect(await liquidateFresh(brToken, liquidator, borrower, 0, brTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([brToken, brTokenCollateral], [liquidator, borrower]);
      await send(brToken.comptroller, 'setFailCalculateSeizeTokens', [true]);
      await expect(
        liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).rejects.toRevert('revert LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED');
      const afterBalances = await getBalances([brToken, brTokenCollateral], [liquidator, borrower]);
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(brToken.comptroller, 'setRepayBorrowAllowed', [false]);
      expect(
        await liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_REPAY_BORROW_FRESH_FAILED');
    });

    it("reverts if seize fails", async () => {
      await send(brToken.comptroller, 'setSeizeAllowed', [false]);
      await expect(
        liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).rejects.toRevert("revert token seizure failed");
    });

    it("reverts if liquidateBorrowVerify fails", async() => {
      await send(brToken.comptroller, 'setLiquidateBorrowVerify', [false]);
      await expect(
        liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral)
      ).rejects.toRevert("revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([brToken, brTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(brToken, liquidator, borrower, repayAmount, brTokenCollateral);
      const afterBalances = await getBalances([brToken, brTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        brTokenCollateral: brTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 0], {
        from: liquidator,
        to: brToken._address,
        amount: repayAmount.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brToken, 'cash', repayAmount],
        [brToken, 'borrows', -repayAmount],
        [brToken, liquidator, 'cash', -repayAmount],
        [brTokenCollateral, liquidator, 'tokens', seizeTokens],
        [brToken, borrower, 'borrows', -repayAmount],
        [brTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('liquidateBorrow', () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(brToken, liquidator, borrower, repayAmount, brTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(brTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(brToken, liquidator, borrower, repayAmount, brTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      expect(await liquidate(brToken, liquidator, borrower, 0, brTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([brToken, brTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(brToken, liquidator, borrower, repayAmount, brTokenCollateral);
      const gasCost = await ckbGasCost(result);
      const afterBalances = await getBalances([brToken, brTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brToken, 'cash', repayAmount],
        [brToken, 'borrows', -repayAmount],
        [brToken, liquidator, 'ckb', -gasCost],
        [brToken, liquidator, 'cash', -repayAmount],
        [brTokenCollateral, liquidator, 'ckb', -gasCost],
        [brTokenCollateral, liquidator, 'tokens', seizeTokens],
        [brToken, borrower, 'borrows', -repayAmount],
        [brTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('seize', () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(brToken.comptroller, 'setSeizeAllowed', [false]);
      expect(await seize(brTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTrollReject('LIQUIDATE_SEIZE_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("fails if brTokenBalances[borrower] < amount", async () => {
      await setBalance(brTokenCollateral, borrower, 1);
      expect(await seize(brTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED', 'INTEGER_UNDERFLOW');
    });

    it("fails if brTokenBalances[liquidator] overflows", async () => {
      await setBalance(brTokenCollateral, liquidator, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
      expect(await seize(brTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED', 'INTEGER_OVERFLOW');
    });

    it("succeeds, updates balances, and emits Transfer event", async () => {
      const beforeBalances = await getBalances([brTokenCollateral], [liquidator, borrower]);
      const result = await seize(brTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([brTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Transfer', {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brTokenCollateral, liquidator, 'tokens', seizeTokens],
        [brTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });
});
