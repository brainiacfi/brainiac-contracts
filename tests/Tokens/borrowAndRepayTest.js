const {
  ckbUnsigned,
  ckbMantissa
} = require('../Utils/BSC');

const {
  makeBRToken,
  balanceOf,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  setBalance,
  preApprove,
  pretendBorrow
} = require('../Utils/Brainiac');

const borrowAmount = ckbUnsigned(10e3);
const repayAmount = ckbUnsigned(10e2);

async function preBorrow(brToken, borrower, borrowAmount) {
  await send(brToken.comptroller, 'setBorrowAllowed', [true]);
  await send(brToken.comptroller, 'setBorrowVerify', [true]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken.underlying, 'harnessSetBalance', [brToken._address, borrowAmount]);
  await send(brToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(brToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(brToken, 'harnessSetTotalBorrows', [0]);
}

async function borrowFresh(brToken, borrower, borrowAmount) {
  return send(brToken, 'harnessBorrowFresh', [borrower, borrowAmount]);
}

async function borrow(brToken, borrower, borrowAmount, opts = {}) {
  // make sure to have a block delta so we accrue interest
  await send(brToken, 'harnessFastForward', [1]);
  return send(brToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(brToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(brToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(brToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [benefactor, false]);
  await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [borrower, false]);
  await pretendBorrow(brToken, borrower, 1, 1, repayAmount);
  await preApprove(brToken, benefactor, repayAmount);
  await preApprove(brToken, borrower, repayAmount);
}

async function repayBorrowFresh(brToken, payer, borrower, repayAmount) {
  return send(brToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer});
}

async function repayBorrow(brToken, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(brToken, 'harnessFastForward', [1]);
  return send(brToken, 'repayBorrow', [repayAmount], {from: borrower});
}

async function repayBorrowBehalf(brToken, payer, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(brToken, 'harnessFastForward', [1]);
  return send(brToken, 'repayBorrowBehalf', [borrower, repayAmount], {from: payer});
}

describe('BRToken', function () {
  let brToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({comptrollerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', () => {
    beforeEach(async () => await preBorrow(brToken, borrower, borrowAmount));

    it("fails if comptroller tells it to", async () => {
      await send(brToken.comptroller, 'setBorrowAllowed', [false]);
      expect(await borrowFresh(brToken, borrower, borrowAmount)).toHaveTrollReject('BORROW_COMPTROLLER_REJECTION');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await borrowFresh(brToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(brToken);
      expect(await borrowFresh(brToken, borrower, borrowAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'BORROW_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(brToken, 'accrueInterest')).toSucceed();
      await expect(await borrowFresh(brToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if error if protocol has less than borrowAmount of underlying", async () => {
      expect(await borrowFresh(brToken, borrower, borrowAmount.add(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_ABAILABLE');
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(brToken, borrower, 0, 3e18, 5e18);
      expect(await borrowFresh(brToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(brToken, borrower, 1e-18, 1e-18, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
      expect(await borrowFresh(brToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await send(brToken, 'harnessSetTotalBorrows', ['0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF']);
      expect(await borrowFresh(brToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED');
    });

    it("reverts if transfer out fails", async () => {
      await send(brToken, 'harnessSetFailTransferToAddress', [borrower, true]);
      await expect(borrowFresh(brToken, borrower, borrowAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
    });

    it("reverts if borrowVerify fails", async() => {
      await send(brToken.comptroller, 'setBorrowVerify', [false]);
      await expect(borrowFresh(brToken, borrower, borrowAmount)).rejects.toRevert("revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Transfer, Borrow events", async () => {
      const beforeProtocolCash = await balanceOf(brToken.underlying, brToken._address);
      const beforeProtocolBorrows = await totalBorrows(brToken);
      const beforeAccountCash = await balanceOf(brToken.underlying, borrower);
      const result = await borrowFresh(brToken, borrower, borrowAmount);
      expect(result).toSucceed();
      expect(await balanceOf(brToken.underlying, borrower)).toEqualNumber(beforeAccountCash.add(borrowAmount));
      expect(await balanceOf(brToken.underlying, brToken._address)).toEqualNumber(beforeProtocolCash.sub(borrowAmount));
      expect(await totalBorrows(brToken)).toEqualNumber(beforeProtocolBorrows.add(borrowAmount));
      expect(result).toHaveLog('Transfer', {
        from: brToken._address,
        to: borrower,
        amount: borrowAmount.toString()
      });
      expect(result).toHaveLog('Borrow', {
        borrower: borrower,
        borrowAmount: borrowAmount.toString(),
        accountBorrows: borrowAmount.toString(),
        totalBorrows: beforeProtocolBorrows.add(borrowAmount).toString()
      });
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(brToken);
      await pretendBorrow(brToken, borrower, 0, 3, 0);
      await borrowFresh(brToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(brToken, borrower);
      expect(borrowSnap.principal).toEqualNumber(borrowAmount);
      expect(borrowSnap.interestIndex).toEqualNumber(ckbMantissa(3));
      expect(await totalBorrows(brToken)).toEqualNumber(beforeProtocolBorrows.add(borrowAmount));
    });
  });

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(brToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(borrow(brToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      expect(await borrow(brToken, borrower, borrowAmount.add(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_ABAILABLE');
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeAccountCash = await balanceOf(brToken.underlying, borrower);
      await fastForward(brToken);
      expect(await borrow(brToken, borrower, borrowAmount)).toSucceed();
      expect(await balanceOf(brToken.underlying, borrower)).toEqualNumber(beforeAccountCash.add(borrowAmount));
    });
  });

  describe('repayBorrowFresh', () => {
    [true, false].forEach((benefactorIsPayer) => {
      let payer;
      const label = benefactorIsPayer ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorIsPayer ? benefactor : borrower;
          await preRepay(brToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          await send(brToken.comptroller, 'setRepayBorrowAllowed', [false]);
          expect(await repayBorrowFresh(brToken, payer, borrower, repayAmount)).toHaveTrollReject('REPAY_BORROW_COMPTROLLER_REJECTION', 'MATH_ERROR');
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(brToken);
          expect(await repayBorrowFresh(brToken, payer, borrower, repayAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REPAY_BORROW_FRESHNESS_CHECK');
        });

        it("fails if insufficient approval", async() => {
          await preApprove(brToken, payer, 1);
          await expect(repayBorrowFresh(brToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient allowance');
        });

        it("fails if insufficient balance", async() => {
          await setBalance(brToken.underlying, payer, 1);
          await expect(repayBorrowFresh(brToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
        });


        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(brToken, borrower, 1, 1, 1);
          await expect(repayBorrowFresh(brToken, payer, borrower, repayAmount)).rejects.toRevert("revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED");
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(brToken, 'harnessSetTotalBorrows', [1]);
          await expect(repayBorrowFresh(brToken, payer, borrower, repayAmount)).rejects.toRevert("revert REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED");
        });


        it("reverts if doTransferIn fails", async () => {
          await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [payer, true]);
          await expect(repayBorrowFresh(brToken, payer, borrower, repayAmount)).rejects.toRevert("revert TOKEN_TRANSFER_IN_FAILED");
        });

        it("reverts if repayBorrowVerify fails", async() => {
          await send(brToken.comptroller, 'setRepayBorrowVerify', [false]);
          await expect(repayBorrowFresh(brToken, payer, borrower, repayAmount)).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits Transfer, RepayBorrow events", async () => {
          const beforeProtocolCash = await balanceOf(brToken.underlying, brToken._address);
          const result = await repayBorrowFresh(brToken, payer, borrower, repayAmount);
          expect(await balanceOf(brToken.underlying, brToken._address)).toEqualNumber(beforeProtocolCash.add(repayAmount));
          expect(result).toHaveLog('Transfer', {
            from: payer,
            to: brToken._address,
            amount: repayAmount.toString()
          });
          expect(result).toHaveLog('RepayBorrow', {
            payer: payer,
            borrower: borrower,
            repayAmount: repayAmount.toString(),
            accountBorrows: "0",
            totalBorrows: "0"
          });
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(brToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(brToken, borrower);
          expect(await repayBorrowFresh(brToken, payer, borrower, repayAmount)).toSucceed();
          const afterAccountBorrows = await borrowSnapshot(brToken, borrower);
          expect(afterAccountBorrows.principal).toEqualNumber(beforeAccountBorrowSnap.principal.sub(repayAmount));
          expect(afterAccountBorrows.interestIndex).toEqualNumber(ckbMantissa(1));
          expect(await totalBorrows(brToken)).toEqualNumber(beforeProtocolBorrows.sub(repayAmount));
        });
      });
    });
  });

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(brToken, borrower, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(brToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(brToken.underlying, borrower, 1);
      await expect(repayBorrow(brToken, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(brToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(brToken, borrower);
      expect(await repayBorrow(brToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(brToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.sub(repayAmount));
    });

    it("repays the full amount owed if payer has enough", async () => {
      await fastForward(brToken);
      expect(await repayBorrow(brToken, borrower, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(brToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(0);
    });

    it("fails gracefully if payer does not have enough", async () => {
      await setBalance(brToken.underlying, borrower, 3);
      await fastForward(brToken);
      await expect(repayBorrow(brToken, borrower, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).rejects.toRevert('revert Insufficient balance');
    });
  });

  describe('repayBorrowBehalf', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(brToken, payer, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalf(brToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(brToken.underlying, payer, 1);
      await expect(repayBorrowBehalf(brToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(brToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(brToken, borrower);
      expect(await repayBorrowBehalf(brToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(brToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.sub(repayAmount));
    });
  });
});
