const {
  ckbGasCost,
  ckbMantissa,
  ckbUnsigned,
  sendFallback
} = require('../Utils/BSC');

const {
  makeBRToken,
  balanceOf,
  fastForward,
  setBalance,
  setCKBBalance,
  getBalances,
  adjustBalances,
} = require('../Utils/Brainiac');

const exchangeRate = 5;
const mintAmount = ckbUnsigned(1e5);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = ckbUnsigned(10e3);
const redeemAmount = redeemTokens.mul(exchangeRate);
const redeemedAmount = redeemAmount.mul(ckbUnsigned(9999e14)).div(ckbUnsigned(1e18));
const feeAmount = redeemAmount.mul(ckbUnsigned(1e14)).div(ckbUnsigned(1e18));

async function preMint(brToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(brToken.comptroller, 'setMintAllowed', [true]);
  await send(brToken.comptroller, 'setMintVerify', [true]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(exchangeRate)]);
}

async function mintExplicit(brToken, minter, mintAmount) {
  return send(brToken, 'mint', [], {from: minter, value: mintAmount});
}

async function mintFallback(brToken, minter, mintAmount) {
  return sendFallback(brToken, {from: minter, value: mintAmount});
}

async function preRedeem(brToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await send(brToken.comptroller, 'setRedeemAllowed', [true]);
  await send(brToken.comptroller, 'setRedeemVerify', [true]);
  await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(exchangeRate)]);
  await setCKBBalance(brToken, redeemAmount);
  await send(brToken, 'harnessSetTotalSupply', [redeemTokens]);
  await setBalance(brToken, redeemer, redeemTokens);
}

async function redeemBRTokens(brToken, redeemer, redeemTokens, redeemAmount) {
  return send(brToken, 'redeem', [redeemTokens], {from: redeemer});
}

async function redeemUnderlying(brToken, redeemer, redeemTokens, redeemAmount) {
  return send(brToken, 'redeemUnderlying', [redeemAmount], {from: redeemer});
}

describe('BRCKB', () => {
  let root, minter, redeemer, accounts;
  let brToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({kind: 'brckb', comptrollerOpts: {kind: 'boolFee'}});
    await fastForward(brToken, 1);
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(brToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(mint(brToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([brToken], [minter]);
        const receipt = await mint(brToken, minter, mintAmount);
        const afterBalances = await getBalances([brToken], [minter]);
        expect(receipt).toSucceed();
        expect(mintTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [brToken, 'ckb', mintAmount],
          [brToken, 'tokens', mintTokens],
          [brToken, minter, 'ckb', -mintAmount.add(await ckbGasCost(receipt))],
          [brToken, minter, 'tokens', mintTokens]
        ]));
      });
    });
  });

  [redeemBRTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(brToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(redeem(brToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        expect(await redeem(brToken, redeemer, redeemTokens.mul(5), redeemAmount.mul(5))).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(brToken);
        const beforeBalances = await getBalances([brToken], [redeemer]);
        const receipt = await redeem(brToken, redeemer, redeemTokens, redeemAmount);
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([brToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [brToken, 'ckb', -redeemAmount],
          [brToken, 'tokens', -redeemTokens],
          [brToken, redeemer, 'ckb', redeemedAmount.sub(await ckbGasCost(receipt))],
          [brToken, redeemer, 'tokens', -redeemTokens]
        ]));
      });
    });
  });
});
