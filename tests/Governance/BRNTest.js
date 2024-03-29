const {
  address,
  minerStart,
  minerStop,
  unlockedAccount,
  mineBlock
} = require('../Utils/BSC');
const { expect } = require("chai");
const { ethers } = require("hardhat");
const EIP712 = require('../Utils/EIP712');

describe('BRN', () => {
  const name = 'Brainiac';
  const symbol = 'BRN';

  let root, a1, a2, accounts, chainId;
  let brn;

  beforeEach(async () => {
    [root, a1, a2, ...accounts] = await ethers.getSigners();;
    chainId = 1; // await web3.eth.net.getId(); See: https://github.com/trufflesuite/ganache-core/issues/515
    const Token = await ethers.getContractFactory("BRN");

    brn = await Token.deploy();
  
  });

  describe('metadata', () => {
    it('has given name', async () => {
      expect(await call(brn, 'name')).toEqual(name);
    });

    it('has given symbol', async () => {
      expect(await call(brn, 'symbol')).toEqual(symbol);
    });
  });

  describe('balanceOf', () => {
    it('grants to initial account', async () => {
      expect(await call(brn, 'balanceOf', [root])).toEqual("30000000000000000000000000");
    });
  });

  describe('delegateBySig', () => {
    const Domain = (brn) => ({ name, chainId, verifyingContract: brn._address });
    const Types = {
      Delegation: [
        { name: 'delegatee', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' }
      ]
    };

    it('reverts if the signatory is invalid', async () => {
      const delegatee = root, nonce = 0, expiry = 0;
      await expect(send(brn, 'delegateBySig', [delegatee, nonce, expiry, 0, '0xbad', '0xbad'])).rejects.toRevert("revert BRN::delegateBySig: invalid signature");
    });

    it('reverts if the nonce is bad ', async () => {
      const delegatee = root, nonce = 1, expiry = 0;
      const { v, r, s } = EIP712.sign(Domain(brn), 'Delegation', { delegatee, nonce, expiry }, Types, unlockedAccount(a1).secretKey);
      await expect(send(brn, 'delegateBySig', [delegatee, nonce, expiry, v, r, s])).rejects.toRevert("revert BRN::delegateBySig: invalid nonce");
    });

    it('reverts if the signature has expired', async () => {
      const delegatee = root, nonce = 0, expiry = 0;
      const { v, r, s } = EIP712.sign(Domain(brn), 'Delegation', { delegatee, nonce, expiry }, Types, unlockedAccount(a1).secretKey);
      await expect(send(brn, 'delegateBySig', [delegatee, nonce, expiry, v, r, s])).rejects.toRevert("revert BRN::delegateBySig: signature expired");
    });

    it('delegates on behalf of the signatory', async () => {
      const delegatee = root, nonce = 0, expiry = 10e9;
      const { v, r, s } = EIP712.sign(Domain(brn), 'Delegation', { delegatee, nonce, expiry }, Types, unlockedAccount(a1).secretKey);
      expect(await call(brn, 'delegates', [a1])).toEqual(address(0));
      const tx = await send(brn, 'delegateBySig', [delegatee, nonce, expiry, v, r, s]);
      expect(tx.gasUsed < 80000);
      expect(await call(brn, 'delegates', [a1])).toEqual(root);
    });
  });

  describe('numCheckpoints', () => {
    it('returns the number of checkpoints for a delegate', async () => {
      let guy = accounts[0];
      await send(brn, 'transfer', [guy, '100']); //give an account a few tokens for readability
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('0');

      const t1 = await send(brn, 'delegate', [a1], { from: guy });
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('1');

      const t2 = await send(brn, 'transfer', [a2, 10], { from: guy });
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('2');

      const t3 = await send(brn, 'transfer', [a2, 10], { from: guy });
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('3');

      const t4 = await send(brn, 'transfer', [guy, 20], { from: root });
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('4');

      await expect(call(brn, 'checkpoints', [a1, 0])).resolves.toEqual(expect.objectContaining({ fromBlock: t1.blockNumber.toString(), votes: '100' }));
      await expect(call(brn, 'checkpoints', [a1, 1])).resolves.toEqual(expect.objectContaining({ fromBlock: t2.blockNumber.toString(), votes: '90' }));
      await expect(call(brn, 'checkpoints', [a1, 2])).resolves.toEqual(expect.objectContaining({ fromBlock: t3.blockNumber.toString(), votes: '80' }));
      await expect(call(brn, 'checkpoints', [a1, 3])).resolves.toEqual(expect.objectContaining({ fromBlock: t4.blockNumber.toString(), votes: '100' }));
    });

    it('does not add more than one checkpoint in a block', async () => {
      let guy = accounts[0];

      await send(brn, 'transfer', [guy, '100']); //give an account a few tokens for readability
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('0');
      await minerStop();

      let t1 = send(brn, 'delegate', [a1], { from: guy });
      let t2 = send(brn, 'transfer', [a2, 10], { from: guy });
      let t3 = send(brn, 'transfer', [a2, 10], { from: guy });

      await minerStart();
      t1 = await t1;
      t2 = await t2;
      t3 = await t3;

      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('1');

      await expect(call(brn, 'checkpoints', [a1, 0])).resolves.toEqual(expect.objectContaining({ fromBlock: t1.blockNumber.toString(), votes: '80' }));
      await expect(call(brn, 'checkpoints', [a1, 1])).resolves.toEqual(expect.objectContaining({ fromBlock: '0', votes: '0' }));
      await expect(call(brn, 'checkpoints', [a1, 2])).resolves.toEqual(expect.objectContaining({ fromBlock: '0', votes: '0' }));

      const t4 = await send(brn, 'transfer', [guy, 20], { from: root });
      await expect(call(brn, 'numCheckpoints', [a1])).resolves.toEqual('2');
      await expect(call(brn, 'checkpoints', [a1, 1])).resolves.toEqual(expect.objectContaining({ fromBlock: t4.blockNumber.toString(), votes: '100' }));
    });
  });

  describe('getPriorVotes', () => {
    it('reverts if block number >= current block', async () => {
      await expect(call(brn, 'getPriorVotes', [a1, 5e10])).rejects.toRevert("revert BRN::getPriorVotes: not yet determined");
    });

    it('returns 0 if there are no checkpoints', async () => {
      expect(await call(brn, 'getPriorVotes', [a1, 0])).toEqual('0');
    });

    it('returns the latest block if >= last checkpoint block', async () => {
      const t1 = await send(brn, 'delegate', [a1], { from: root });
      await mineBlock();
      await mineBlock();

      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber])).toEqual('30000000000000000000000000');
      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber + 1])).toEqual('30000000000000000000000000');
    });

    it('returns zero if < first checkpoint block', async () => {
      await mineBlock();
      const t1 = await send(brn, 'delegate', [a1], { from: root });
      await mineBlock();
      await mineBlock();

      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber - 1])).toEqual('0');
      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber + 1])).toEqual('30000000000000000000000000');
    });

    it('generally returns the voting balance at the appropriate checkpoint', async () => {
      const t1 = await send(brn, 'delegate', [a1], { from: root });
      await mineBlock();
      await mineBlock();
      const t2 = await send(brn, 'transfer', [a2, 10], { from: root });
      await mineBlock();
      await mineBlock();
      const t3 = await send(brn, 'transfer', [a2, 10], { from: root });
      await mineBlock();
      await mineBlock();
      const t4 = await send(brn, 'transfer', [root, 20], { from: a2 });
      await mineBlock();
      await mineBlock();

      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber - 1])).toEqual('0');
      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber])).toEqual('30000000000000000000000000');
      expect(await call(brn, 'getPriorVotes', [a1, t1.blockNumber + 1])).toEqual('30000000000000000000000000');
      expect(await call(brn, 'getPriorVotes', [a1, t2.blockNumber])).toEqual('29999999999999999999999990');
      expect(await call(brn, 'getPriorVotes', [a1, t2.blockNumber + 1])).toEqual('29999999999999999999999990');
      expect(await call(brn, 'getPriorVotes', [a1, t3.blockNumber])).toEqual('29999999999999999999999980');
      expect(await call(brn, 'getPriorVotes', [a1, t3.blockNumber + 1])).toEqual('29999999999999999999999980');
      expect(await call(brn, 'getPriorVotes', [a1, t4.blockNumber])).toEqual('30000000000000000000000000');
      expect(await call(brn, 'getPriorVotes', [a1, t4.blockNumber + 1])).toEqual('30000000000000000000000000');
    });
  });
});
