const {
  makeBRToken,
  getBalances,
  adjustBalances
} = require('../Utils/Brainiac');

const exchangeRate = 5;

describe('BRCKB', function () {
  let root, nonRoot, accounts;
  let brToken;
  beforeEach(async () => {
    [root, nonRoot, ...accounts] = saddle.accounts;
    brToken = await makeBRToken({kind: 'brckb', comptrollerOpts: {kind: 'bool'}});
  });

  describe("getCashPrior", () => {
    it("returns the amount of ckb held by the brCkb contract before the current message", async () => {
      expect(await call(brToken, 'harnessGetCashPrior', [], {value: 100})).toEqualNumber(0);
    });
  });

  describe("doTransferIn", () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      expect(await call(brToken, 'harnessDoTransferIn', [root, 100], {value: 100})).toEqualNumber(100);
    });

    it("reverts if from != msg.sender", async () => {
      await expect(call(brToken, 'harnessDoTransferIn', [nonRoot, 100], {value: 100})).rejects.toRevert("revert sender mismatch");
    });

    it("reverts if amount != msg.value", async () => {
      await expect(call(brToken, 'harnessDoTransferIn', [root, 77], {value: 100})).rejects.toRevert("revert value mismatch");
    });

    describe("doTransferOut", () => {
      it("transfers ckb out", async () => {
        const beforeBalances = await getBalances([brToken], [nonRoot]);
        const receipt = await send(brToken, 'harnessDoTransferOut', [nonRoot, 77], {value: 77});
        const afterBalances = await getBalances([brToken], [nonRoot]);
        expect(receipt).toSucceed();
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [brToken, nonRoot, 'ckb', 77]
        ]));
      });

      it("reverts if it fails", async () => {
        await expect(call(brToken, 'harnessDoTransferOut', [root, 77], {value: 0})).rejects.toRevert();
      });
    });
  });
});
