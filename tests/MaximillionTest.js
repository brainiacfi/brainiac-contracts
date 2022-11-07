const {
  ckbBalance,
  ckbGasCost,
  getContract
} = require('./Utils/BSC');

const {
  makeComptroller,
  makeBRToken,
  makePriceOracle,
  pretendBorrow,
  borrowSnapshot
} = require('./Utils/Brainiac');

describe('Maximillion', () => {
  let root, borrower;
  let maximillion, brCkb;
  beforeEach(async () => {
    [root, borrower] = saddle.accounts;
    brCkb = await makeBRToken({kind: "brckb", supportMarket: true});
    maximillion = await deploy('Maximillion', [brCkb._address]);
  });

  describe("constructor", () => {
    it("sets address of brCkb", async () => {
      expect(await call(maximillion, "brCkb")).toEqual(brCkb._address);
    });
  });

  describe("repayBehalf", () => {
    it("refunds the entire amount with no borrows", async () => {
      const beforeBalance = await ckbBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await ckbGasCost(result);
      const afterBalance = await ckbBalance(root);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.sub(gasCost));
    });

    it("repays part of a borrow", async () => {
      await pretendBorrow(brCkb, borrower, 1, 1, 150);
      const beforeBalance = await ckbBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await ckbGasCost(result);
      const afterBalance = await ckbBalance(root);
      const afterBorrowSnap = await borrowSnapshot(brCkb, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.sub(gasCost).sub(100));
      expect(afterBorrowSnap.principal).toEqualNumber(50);
    });

    it("repays a full borrow and refunds the rest", async () => {
      await pretendBorrow(brCkb, borrower, 1, 1, 90);
      const beforeBalance = await ckbBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await ckbGasCost(result);
      const afterBalance = await ckbBalance(root);
      const afterBorrowSnap = await borrowSnapshot(brCkb, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.sub(gasCost).sub(90));
      expect(afterBorrowSnap.principal).toEqualNumber(0);
    });
  });
});
