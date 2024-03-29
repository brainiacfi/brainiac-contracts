const {
  ckbUnsigned,
  ckbMantissa
} = require('../Utils/BSC');

const {
  makeBRToken,
  balanceOf,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  preApprove,
  quickMint,
  preSupply,
  quickRedeem,
  quickRedeemUnderlying
} = require('../Utils/Brainiac');

const exchangeRate = 50e3;
const mintAmount = ckbUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = ckbUnsigned(10e3);
const redeemAmount = redeemTokens.mul(exchangeRate);
const redeemedAmount = redeemAmount.mul(ckbUnsigned(9999e14)).div(ckbUnsigned(1e18));
const feeAmount = redeemAmount.mul(ckbUnsigned(1e14)).div(ckbUnsigned(1e18));

async function preMint(brToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(brToken, minter, mintAmount);
  await send(brToken.comptroller, 'setMintAllowed', [true]);
  await send(brToken.comptroller, 'setMintVerify', [true]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(brToken, 'harnessSetBalance', [minter, 0]);
  await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(exchangeRate)]);
}

async function mintFresh(brToken, minter, mintAmount) {
  return send(brToken, 'harnessMintFresh', [minter, mintAmount]);
}

async function preRedeem(brToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await preSupply(brToken, redeemer, redeemTokens);
  await send(brToken.comptroller, 'setRedeemAllowed', [true]);
  await send(brToken.comptroller, 'setRedeemVerify', [true]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken.underlying, 'harnessSetBalance', [brToken._address, redeemAmount]);
  await send(brToken.underlying, 'harnessSetBalance', [redeemer, 0]);
  await send(brToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, false]);
  await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(exchangeRate)]);
}

async function redeemFreshTokens(brToken, redeemer, redeemTokens, redeemAmount) {
  return send(brToken, 'harnessRedeemFresh', [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(brToken, redeemer, redeemTokens, redeemAmount) {
  return send(brToken, 'harnessRedeemFresh', [redeemer, 0, redeemAmount]);
}

describe('BRToken', function () {
  let root, minter, redeemer, user1, devFee, accounts;
  let brToken;
  beforeEach(async () => {
    [root, minter, redeemer, user1, devFee, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({comptrollerOpts: {kind: 'boolFee'}, exchangeRate});
  });

  describe('mintFresh', () => {
    beforeEach(async () => {
      await preMint(brToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if comptroller tells it to", async () => {
      await send(brToken.comptroller, 'setMintAllowed', [false]);
      expect(await mintFresh(brToken, minter, mintAmount)).toHaveTrollReject('MINT_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await mintFresh(brToken, minter, mintAmount)).toSucceed();
    });

    it("fails if not fresh", async () => {
      await fastForward(brToken);
      expect(await mintFresh(brToken, minter, mintAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'MINT_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(brToken, 'accrueInterest')).toSucceed();
      expect(await mintFresh(brToken, minter, mintAmount)).toSucceed();
    });

    it("fails if insufficient approval", async () => {
      expect(
        await send(brToken.underlying, 'approve', [brToken._address, 1], {from: minter})
      ).toSucceed();
      await expect(mintFresh(brToken, minter, mintAmount)).rejects.toRevert('revert Insufficient allowance');
    });

    it("fails if insufficient balance", async() => {
      await setBalance(brToken.underlying, minter, 1);
      await expect(mintFresh(brToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("proceeds if sufficient approval and balance", async () =>{
      expect(await mintFresh(brToken, minter, mintAmount)).toSucceed();
    });

    it("fails if exchange calculation fails", async () => {
      expect(await send(brToken, 'harnessSetExchangeRate', [0])).toSucceed();
      await expect(mintFresh(brToken, minter, mintAmount)).rejects.toRevert('revert MINT_EXCHANGE_CALCULATION_FAILED');
    });

    it("fails if transferring in fails", async () => {
      await send(brToken.underlying, 'harnessSetFailTransferFromAddress', [minter, true]);
      await expect(mintFresh(brToken, minter, mintAmount)).rejects.toRevert('revert TOKEN_TRANSFER_IN_FAILED');
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([brToken], [minter]);
      const result = await mintFresh(brToken, minter, mintAmount);
      const afterBalances = await getBalances([brToken], [minter]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Mint', {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: brToken._address,
        to: minter,
        amount: mintTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [brToken, minter, 'cash', -mintAmount],
        [brToken, minter, 'tokens', mintTokens],
        [brToken, 'cash', mintAmount],
        [brToken, 'tokens', mintTokens]
      ]));
    });
  });

  describe('mint', () => {
    beforeEach(async () => {
      await preMint(brToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickMint(brToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(brToken.underlying, 'harnessSetBalance', [minter, 1]);
      await expect(mintFresh(brToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      expect(await quickMint(brToken, minter, mintAmount)).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(await balanceOf(brToken, minter)).toEqualNumber(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(brToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "0",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preRedeem(brToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("fails if comptroller tells it to", async () =>{
        await send(brToken.comptroller, 'setRedeemAllowed', [false]);
        expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTrollReject('REDEEM_COMPTROLLER_REJECTION');
      });

      it("fails if not fresh", async () => {
        await fastForward(brToken);
        expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REDEEM_FRESHNESS_CHECK');
      });

      it("continues if fresh", async () => {
        await expect(await send(brToken, 'accrueInterest')).toSucceed();
        expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toSucceed();
      });

      it("fails if insufficient protocol cash to transfer out", async() => {
        await send(brToken.underlying, 'harnessSetBalance', [brToken._address, 1]);
        expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE');
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          expect(await send(brToken, 'harnessSetExchangeRate', ['0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'])).toSucceed();
          expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_EXCHANGE_TOKENS_CALCULATION_FAILED');
        } else {
          expect(await send(brToken, 'harnessSetExchangeRate', [0])).toSucceed();
          expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED');
        }
      });

      it("fails if transferring out fails", async () => {
        await send(brToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, true]);
        await expect(redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(brToken, 'harnessExchangeRateDetails', [0, 0, 0]);
        expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("reverts if new account balance underflows", async () => {
        await send(brToken, 'harnessSetBalance', [redeemer, 0]);
        expect(await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED');
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([brToken], [redeemer]);
        const result = await redeemFresh(brToken, redeemer, redeemTokens, redeemAmount);
        const afterBalances = await getBalances([brToken], [redeemer]);
        expect(result).toSucceed();
        expect(result).toHaveLog('Redeem', {
          redeemer,
          redeemAmount: redeemedAmount.toString(),
          redeemTokens: redeemTokens.toString()
        });
        expect(result).toHaveLog('RedeemFee', {
          redeemer,
          feeAmount: feeAmount.toString(),
          redeemTokens: redeemTokens.toString()
        });
        expect(result).toHaveLog(['Transfer', 2], {
          from: redeemer,
          to: brToken._address,
          amount: redeemTokens.toString()
        });
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [brToken, redeemer, 'cash', redeemedAmount],
          [brToken, redeemer, 'tokens', -redeemTokens],
          [brToken, 'cash', -redeemAmount],
          [brToken, 'tokens', -redeemTokens]
        ]));
      });
    });
  });

  describe('redeem', () => {
    beforeEach(async () => {
      await preRedeem(brToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickRedeem(brToken, redeemer, redeemTokens)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(brToken.underlying, brToken._address, 0);
      expect(await quickRedeem(brToken, redeemer, redeemTokens, {exchangeRate})).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE');
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      expect(
        await send(brToken.underlying, 'harnessSetBalance', [brToken._address, redeemAmount])
      ).toSucceed();
      expect(await quickRedeem(brToken, redeemer, redeemTokens, {exchangeRate})).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(brToken.underlying, redeemer)).toEqualNumber(redeemedAmount);
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      expect(
        await send(brToken.underlying, 'harnessSetBalance', [brToken._address, redeemAmount])
      ).toSucceed();
      expect(
        await quickRedeemUnderlying(brToken, redeemer, redeemAmount, {exchangeRate})
      ).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(brToken.underlying, redeemer)).toEqualNumber(redeemedAmount);
      expect(await balanceOf(brToken.underlying, devFee)).toEqualNumber(feeAmount);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(brToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "500000000",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });
});