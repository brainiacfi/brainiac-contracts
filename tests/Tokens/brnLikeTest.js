const {
  makeBRToken,
} = require('../Utils/Brainiac');
  
describe('VBrnLikeDelegate', function () {
  describe("_delegateBrnLikeTo", () => {
    it("does not delegate if not the admin", async () => {
      const [root, a1] = saddle.accounts;
      const brToken = await makeBRToken({kind: 'brbrn'});
      await expect(send(brToken, '_delegateBrnLikeTo', [a1], {from: a1})).rejects.toRevert('revert only the admin may set the brn-like delegate');
    });

    it("delegates successfully if the admin", async () => {
      const [root, a1] = saddle.accounts, amount = 1;
      const brBRN = await makeBRToken({kind: 'brbrn'}), BRN = brBRN.underlying;
      const tx1 = await send(brBRN, '_delegateBrnLikeTo', [a1]);
      const tx2 = await send(BRN, 'transfer', [brBRN._address, amount]);
      await expect(await call(BRN, 'getCurrentVotes', [a1])).toEqualNumber(amount);
    });
  });
});
