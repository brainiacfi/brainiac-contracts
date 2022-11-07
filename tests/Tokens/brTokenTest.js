const {
  ckbUnsigned,
  ckbMantissa
} = require('../Utils/BSC');

const {
  makeBRToken,
  setBorrowRate,
  pretendBorrow
} = require('../Utils/Brainiac');

describe('BRToken', function () {
  let root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
  });

  describe('constructor', () => {
    it("fails when non bep-20 underlying", async () => {
      await expect(makeBRToken({ underlying: { _address: root } })).rejects.toRevert("revert");
    });

    it("fails when 0 initial exchange rate", async () => {
      await expect(makeBRToken({ exchangeRate: 0 })).rejects.toRevert("revert initial exchange rate must be greater than zero.");
    });

    it("succeeds with bep-20 underlying and non-zero exchange rate", async () => {
      const brToken = await makeBRToken();
      expect(await call(brToken, 'underlying')).toEqual(brToken.underlying._address);
      expect(await call(brToken, 'admin')).toEqual(root);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const brToken = await makeBRToken({ admin: admin });
      expect(await call(brToken, 'admin')).toEqual(admin);
    });
  });

  describe('name, symbol, decimals', () => {
    let brToken;

    beforeEach(async () => {
      brToken = await makeBRToken({ name: "BRToken Foo", symbol: "cFOO", decimals: 10 });
    });

    it('should return correct name', async () => {
      expect(await call(brToken, 'name')).toEqual("BRToken Foo");
    });

    it('should return correct symbol', async () => {
      expect(await call(brToken, 'symbol')).toEqual("cFOO");
    });

    it('should return correct decimals', async () => {
      expect(await call(brToken, 'decimals')).toEqualNumber(10);
    });
  });

  describe('balanceOfUnderlying', () => {
    it("has an underlying balance", async () => {
      const brToken = await makeBRToken({ supportMarket: true, exchangeRate: 2 });
      await send(brToken, 'harnessSetBalance', [root, 100]);
      expect(await call(brToken, 'balanceOfUnderlying', [root])).toEqualNumber(200);
    });
  });

  describe('borrowRatePerBlock', () => {
    it("has a borrow rate", async () => {
      const brToken = await makeBRToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const blocksPerYear = await call(brToken.interestRateModel, 'blocksPerYear');
      const perBlock = await call(brToken, 'borrowRatePerBlock');
      expect(Math.abs(perBlock * blocksPerYear - 5e16)).toBeLessThanOrEqual(1e8);
    });
  });

  describe('supplyRatePerBlock', () => {
    it("returns 0 if there's no supply", async () => {
      const brToken = await makeBRToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(brToken, 'supplyRatePerBlock');
      await expect(perBlock).toEqualNumber(0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5 * multiplier;
      const brToken = await makeBRToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate, multiplier, kink, jump } });
      await send(brToken, 'harnessSetReserveFactorFresh', [ckbMantissa(.01)]);
      await send(brToken, 'harnessExchangeRateDetails', [1, 1, 0]);
      await send(brToken, 'harnessSetExchangeRate', [ckbMantissa(1)]);
      // Full utilization (Over the kink so jump is included), 1% reserves
      const borrowRate = baseRate + multiplier * kink + jump * .05;
      const expectedSuplyRate = borrowRate * .99;

      const blocksPerYear = await call(brToken.interestRateModel, 'blocksPerYear');
      const perBlock = await call(brToken, 'supplyRatePerBlock');
      expect(Math.abs(perBlock * blocksPerYear - expectedSuplyRate * 1e18)).toBeLessThanOrEqual(1e8);
    });
  });

  describe("borrowBalanceCurrent", () => {
    let borrower;
    let brToken;

    beforeEach(async () => {
      borrower = accounts[0];
      brToken = await makeBRToken();
    });

    beforeEach(async () => {
      await setBorrowRate(brToken, .001)
      await send(brToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("reverts if interest accrual fails", async () => {
      await send(brToken.interestRateModel, 'setFailBorrowRate', [true]);
      // make sure we accrue interest
      await send(brToken, 'harnessFastForward', [1]);
      await expect(send(brToken, 'borrowBalanceCurrent', [borrower])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(brToken, 0);
      await pretendBorrow(brToken, borrower, 1, 1, 5e18);
      expect(await call(brToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18)
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(brToken, 0);
      await pretendBorrow(brToken, borrower, 1, 3, 5e18);
      expect(await send(brToken, 'harnessFastForward', [5])).toSucceed();
      expect(await call(brToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18 * 3)
    });
  });

  describe("borrowBalanceStored", () => {
    let borrower;
    let brToken;

    beforeEach(async () => {
      borrower = accounts[0];
      brToken = await makeBRToken({ comptrollerOpts: { kind: 'bool' } });
    });

    it("returns 0 for account with no borrows", async () => {
      expect(await call(brToken, 'borrowBalanceStored', [borrower])).toEqualNumber(0)
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(brToken, borrower, 1, 1, 5e18);
      expect(await call(brToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18);
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(brToken, borrower, 1, 3, 5e18);
      expect(await call(brToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18 * 3);
    });

    it("has undefined behavior when market index is lower than account index", async () => {
      // The market index < account index should NEVER happen, so we don't test this case
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(brToken, borrower, 1, 3, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
      await expect(call(brToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(brToken, borrower, 0, 3, 5);
      await expect(call(brToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });
  });

  describe('exchangeRateStored', () => {
    let brToken, exchangeRate = 2;

    beforeEach(async () => {
      brToken = await makeBRToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero brTokenSupply", async () => {
      const result = await call(brToken, 'exchangeRateStored');
      expect(result).toEqualNumber(ckbMantissa(exchangeRate));
    });

    it("calculates with single brTokenSupply and single total borrow", async () => {
      const brTokenSupply = 1, totalBorrows = 1, totalReserves = 0;
      await send(brToken, 'harnessExchangeRateDetails', [brTokenSupply, totalBorrows, totalReserves]);
      const result = await call(brToken, 'exchangeRateStored');
      expect(result).toEqualNumber(ckbMantissa(1));
    });

    it("calculates with brTokenSupply and total borrows", async () => {
      const brTokenSupply = 100e18, totalBorrows = 10e18, totalReserves = 0;
      await send(brToken, 'harnessExchangeRateDetails', [brTokenSupply, totalBorrows, totalReserves].map(ckbUnsigned));
      const result = await call(brToken, 'exchangeRateStored');
      expect(result).toEqualNumber(ckbMantissa(.1));
    });

    it("calculates with cash and brTokenSupply", async () => {
      const brTokenSupply = 5e18, totalBorrows = 0, totalReserves = 0;
      expect(
        await send(brToken.underlying, 'transfer', [brToken._address, ckbMantissa(500)])
      ).toSucceed();
      await send(brToken, 'harnessExchangeRateDetails', [brTokenSupply, totalBorrows, totalReserves].map(ckbUnsigned));
      const result = await call(brToken, 'exchangeRateStored');
      expect(result).toEqualNumber(ckbMantissa(100));
    });

    it("calculates with cash, borrows, reserves and brTokenSupply", async () => {
      const brTokenSupply = 500e18, totalBorrows = 500e18, totalReserves = 5e18;
      expect(
        await send(brToken.underlying, 'transfer', [brToken._address, ckbMantissa(500)])
      ).toSucceed();
      await send(brToken, 'harnessExchangeRateDetails', [brTokenSupply, totalBorrows, totalReserves].map(ckbUnsigned));
      const result = await call(brToken, 'exchangeRateStored');
      expect(result).toEqualNumber(ckbMantissa(1.99));
    });
  });

  describe('getCash', () => {
    it("gets the cash", async () => {
      const brToken = await makeBRToken();
      const result = await call(brToken, 'getCash');
      expect(result).toEqualNumber(0);
    });
  });
});
