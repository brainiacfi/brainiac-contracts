const {
  ckbMantissa,
  ckbUnsigned
} = require('../Utils/BSC');
const {
  makeBRToken,
  setBorrowRate
} = require('../Utils/Brainiac');

const blockNumber = 2e7;
const borrowIndex = 1e18;
const borrowRate = .000001;

async function pretendBlock(brToken, accrualBlock = blockNumber, deltaBlocks = 1) {
  await send(brToken, 'harnessSetAccrualBlockNumber', [ckbUnsigned(blockNumber)]);
  await send(brToken, 'harnessSetBlockNumber', [ckbUnsigned(blockNumber + deltaBlocks)]);
  await send(brToken, 'harnessSetBorrowIndex', [ckbUnsigned(borrowIndex)]);
}

async function preAccrue(brToken) {
  await setBorrowRate(brToken, borrowRate);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken, 'harnessExchangeRateDetails', [0, 0, 0]);
}

describe('BRToken', () => {
  let root, accounts;
  let brToken;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({comptrollerOpts: {kind: 'bool'}});
  });

  beforeEach(async () => {
    await preAccrue(brToken);
  });

  describe('accrueInterest', () => {
    it('reverts if the interest rate is absurdly high', async () => {
      await pretendBlock(brToken, blockNumber, 1);
      expect(await call(brToken, 'getBorrowRateMaxMantissa')).toEqualNumber(ckbMantissa(0.000005)); // 0.0005% per block
      await setBorrowRate(brToken, 0.001e-2); // 0.0010% per block
      await expect(send(brToken, 'accrueInterest')).rejects.toRevert("revert borrow rate is absurdly high");
    });

    it('fails if new borrow rate calculation fails', async () => {
      await pretendBlock(brToken, blockNumber, 1);
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(send(brToken, 'accrueInterest')).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it('fails if simple interest factor calculation fails', async () => {
      await pretendBlock(brToken, blockNumber, 5e70);
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_SIMPLE_INTEREST_FACTOR_CALCULATION_FAILED');
    });

    it('fails if new borrow index calculation fails', async () => {
      await pretendBlock(brToken, blockNumber, 5e60);
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED');
    });

    it('fails if new borrow interest index calculation fails', async () => {
      await pretendBlock(brToken)
      await send(brToken, 'harnessSetBorrowIndex', ['0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF']);
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED');
    });

    it('fails if interest accumulated calculation fails', async () => {
      await send(brToken, 'harnessExchangeRateDetails', [0, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 0]);
      await pretendBlock(brToken)
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_ACCUMULATED_INTEREST_CALCULATION_FAILED');
    });

    it('fails if new total borrows calculation fails', async () => {
      await setBorrowRate(brToken, 1e-18);
      await pretendBlock(brToken)
      await send(brToken, 'harnessExchangeRateDetails', [0, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 0]);
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_BORROWS_CALCULATION_FAILED');
    });

    it('fails if interest accumulated for reserves calculation fails', async () => {
      await setBorrowRate(brToken, .000001);
      await send(brToken, 'harnessExchangeRateDetails', [0, ckbUnsigned(1e30), '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF']);
      await send(brToken, 'harnessSetReserveFactorFresh', [ckbUnsigned(1e10)]);
      await pretendBlock(brToken, blockNumber, 5e20)
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED');
    });

    it('fails if new total reserves calculation fails', async () => {
      await setBorrowRate(brToken, 1e-18);
      await send(brToken, 'harnessExchangeRateDetails', [0, ckbUnsigned(1e56), '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF']);
      await send(brToken, 'harnessSetReserveFactorFresh', [ckbUnsigned(1e17)]);
      await pretendBlock(brToken)
      expect(await send(brToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED');
    });

    it('succeeds and saves updated values in storage on success', async () => {
      const startingTotalBorrows = 1e22;
      const startingTotalReserves = 1e20;
      const reserveFactor = 1e17;

      await send(brToken, 'harnessExchangeRateDetails', [0, ckbUnsigned(startingTotalBorrows), ckbUnsigned(startingTotalReserves)]);
      await send(brToken, 'harnessSetReserveFactorFresh', [ckbUnsigned(reserveFactor)]);
      await pretendBlock(brToken)

      const expectedAccrualBlockNumber = blockNumber + 1;
      const expectedBorrowIndex = borrowIndex + borrowIndex * borrowRate;
      const expectedTotalBorrows = startingTotalBorrows + startingTotalBorrows * borrowRate;
      const expectedTotalReserves = startingTotalReserves + startingTotalBorrows *  borrowRate * reserveFactor / 1e18;

      const receipt = await send(brToken, 'accrueInterest')
      expect(receipt).toSucceed();
      expect(receipt).toHaveLog('AccrueInterest', {
        cashPrior: 0,
        interestAccumulated: ckbUnsigned(expectedTotalBorrows).sub(ckbUnsigned(startingTotalBorrows)).toFixed(),
        borrowIndex: ckbUnsigned(expectedBorrowIndex).toFixed(),
        totalBorrows: ckbUnsigned(expectedTotalBorrows).toFixed()
      })
      expect(await call(brToken, 'accrualBlockNumber')).toEqualNumber(expectedAccrualBlockNumber);
      expect(await call(brToken, 'borrowIndex')).toEqualNumber(expectedBorrowIndex);
      expect(await call(brToken, 'totalBorrows')).toEqualNumber(expectedTotalBorrows);
      expect(await call(brToken, 'totalReserves')).toEqualNumber(expectedTotalReserves);
    });
  });
});
