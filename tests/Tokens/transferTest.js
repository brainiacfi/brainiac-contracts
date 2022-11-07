const {makeBRToken} = require('../Utils/Brainiac');

describe('BRToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('transfer', () => {
    it("cannot transfer from a zero balance", async () => {
      const brToken = await makeBRToken({supportMarket: true});
      expect(await call(brToken, 'balanceOf', [root])).toEqualNumber(0);
      expect(await send(brToken, 'transfer', [accounts[0], 100])).toHaveTokenFailure('MATH_ERROR', 'TRANSFER_NOT_ENOUGH');
    });

    it("transfers 50 tokens", async () => {
      const brToken = await makeBRToken({supportMarket: true});
      await send(brToken, 'harnessSetBalance', [root, 100]);
      expect(await call(brToken, 'balanceOf', [root])).toEqualNumber(100);
      await send(brToken, 'transfer', [accounts[0], 50]);
      expect(await call(brToken, 'balanceOf', [root])).toEqualNumber(50);
      expect(await call(brToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const brToken = await makeBRToken({supportMarket: true});
      await send(brToken, 'harnessSetBalance', [root, 100]);
      expect(await call(brToken, 'balanceOf', [root])).toEqualNumber(100);
      expect(await send(brToken, 'transfer', [root, 50])).toHaveTokenFailure('BAD_INPUT', 'TRANSFER_NOT_ALLOWED');
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const brToken = await makeBRToken({comptrollerOpts: {kind: 'bool'}});
      await send(brToken, 'harnessSetBalance', [root, 100]);
      expect(await call(brToken, 'balanceOf', [root])).toEqualNumber(100);

      await send(brToken.comptroller, 'setTransferAllowed', [false])
      expect(await send(brToken, 'transfer', [root, 50])).toHaveTrollReject('TRANSFER_COMPTROLLER_REJECTION');

      await send(brToken.comptroller, 'setTransferAllowed', [true])
      await send(brToken.comptroller, 'setTransferVerify', [false])
      await expect(send(brToken, 'transfer', [accounts[0], 50])).rejects.toRevert("revert transferVerify rejected transfer");
    });
  });
});